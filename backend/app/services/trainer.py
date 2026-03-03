import csv
import json
import logging
import threading
import time
from datetime import datetime
from pathlib import Path

import torch
from ultralytics import YOLO

from ..config import settings
from ..database import get_sync_db
from ..models import TrainingRun

logger = logging.getLogger(__name__)


def start_training(training_run_id: int, data_yaml_path: str, config: dict):
    """Start YOLO training in a background thread."""
    thread = threading.Thread(
        target=_train_sync,
        args=(training_run_id, data_yaml_path, config),
        daemon=True,
    )
    thread.start()
    return thread


def _train_sync(training_run_id: int, data_yaml_path: str, config: dict):
    db = get_sync_db()
    try:
        run = db.query(TrainingRun).filter(TrainingRun.id == training_run_id).first()
        if not run:
            return

        run.status = "training"
        db.commit()

        start_time = time.time()

        # Load base model
        model = YOLO(config["base_model"])

        # Output directory
        project_dir = Path(settings.MODELS_DIR) / run.model_name
        project_dir.mkdir(parents=True, exist_ok=True)

        # Auto-detect device
        device = ""
        if torch.cuda.is_available():
            device = "0"
            logger.info(f"Training on GPU: {torch.cuda.get_device_name(0)}")
        else:
            device = "cpu"
            logger.info("Training on CPU")

        # Adjust batch size for CPU
        batch_size = config["batch_size"]
        if device == "cpu" and batch_size > 8:
            batch_size = 8

        results = model.train(
            data=data_yaml_path,
            epochs=config["epochs"],
            batch=batch_size,
            imgsz=config["image_size"],
            project=str(project_dir),
            name="train",
            exist_ok=True,
            patience=config.get("patience", 20),
            save=True,
            save_period=config.get("save_period", 10),
            device=device,
            workers=config.get("workers", 2),
            pretrained=True,
            optimizer=config.get("optimizer", "auto"),
            lr0=config.get("lr0", 0.01),
            lrf=config.get("lrf", 0.01),
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            translate=0.1,
            scale=0.5,
            fliplr=0.5,
            mosaic=1.0,
        )

        elapsed = time.time() - start_time

        best_weights = project_dir / "train" / "weights" / "best.pt"

        run.status = "completed"
        run.weights_path = str(best_weights) if best_weights.exists() else None
        run.training_time_sec = round(elapsed, 1)
        run.completed_at = datetime.utcnow()

        # Extract metrics
        if hasattr(results, "results_dict"):
            metrics = results.results_dict
            run.best_map50 = metrics.get("metrics/mAP50(B)")
            run.best_map50_95 = metrics.get("metrics/mAP50-95(B)")
            run.precision = metrics.get("metrics/precision(B)")
            run.recall = metrics.get("metrics/recall(B)")

        run.config_json = json.dumps(config)
        db.commit()
        logger.info(f"Training run {training_run_id} completed in {elapsed:.0f}s")

    except Exception as e:
        logger.exception(f"Training run {training_run_id} failed")
        try:
            run = db.query(TrainingRun).filter(TrainingRun.id == training_run_id).first()
            if run:
                run.status = "failed"
                run.error_message = str(e)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def get_training_progress(training_run_id: int) -> dict:
    """Parse results.csv for live training progress."""
    db = get_sync_db()
    try:
        run = db.query(TrainingRun).filter(TrainingRun.id == training_run_id).first()
        if not run:
            return {"status": "not_found", "current_epoch": 0, "total_epochs": 0, "progress_pct": 0}

        if run.status in ("completed", "failed"):
            return {
                "status": run.status,
                "current_epoch": run.epochs if run.status == "completed" else run.current_epoch,
                "total_epochs": run.epochs,
                "progress_pct": 100 if run.status == "completed" else 0,
                "train_loss": None,
                "val_map50": run.best_map50,
                "val_map50_95": run.best_map50_95,
                "loss_history": None,
            }

        results_csv = Path(settings.MODELS_DIR) / run.model_name / "train" / "results.csv"

        if not results_csv.exists():
            return {
                "status": run.status,
                "current_epoch": 0,
                "total_epochs": run.epochs,
                "progress_pct": 0,
            }

        with open(results_csv) as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            return {
                "status": run.status,
                "current_epoch": 0,
                "total_epochs": run.epochs,
                "progress_pct": 0,
            }

        last = rows[-1]
        current_epoch = int(last.get("epoch", "0").strip()) + 1
        progress = round(current_epoch / run.epochs * 100, 1)

        # Update DB
        run.current_epoch = current_epoch
        db.commit()

        def safe_float(val):
            try:
                return round(float(val.strip()), 6) if val and val.strip() else None
            except (ValueError, AttributeError):
                return None

        loss_history = []
        for r in rows:
            loss_history.append({
                "epoch": int(r.get("epoch", "0").strip()) + 1,
                "box_loss": safe_float(r.get("train/box_loss", "0")) or 0,
                "cls_loss": safe_float(r.get("train/cls_loss", "0")) or 0,
                "map50": safe_float(r.get("metrics/mAP50(B)", "0")) or 0,
            })

        return {
            "status": run.status,
            "current_epoch": current_epoch,
            "total_epochs": run.epochs,
            "progress_pct": min(progress, 100),
            "train_loss": safe_float(last.get("train/box_loss", "0")),
            "val_map50": safe_float(last.get("metrics/mAP50(B)", "0")),
            "val_map50_95": safe_float(last.get("metrics/mAP50-95(B)", "0")),
            "loss_history": loss_history,
        }
    finally:
        db.close()
