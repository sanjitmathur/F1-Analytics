import logging
import threading

import cv2
from sqlalchemy import func

from ..config import settings
from ..database import get_sync_db
from ..models import Detection, DetectionSummary, PitStop
from .yolo_detector import detector

logger = logging.getLogger(__name__)


def process_video(
    pit_stop_id: int,
    video_path: str,
    sample_rate: int | None = None,
    model_name: str | None = None,
):
    """Process a video file in a background thread.

    Opens video, samples every Nth frame, runs YOLO, stores results.
    """
    if sample_rate is None:
        sample_rate = settings.FRAME_SAMPLE_RATE

    thread = threading.Thread(
        target=_process_video_sync,
        args=(pit_stop_id, video_path, sample_rate, model_name),
        daemon=True,
    )
    thread.start()
    return thread


def _process_video_sync(pit_stop_id: int, video_path: str, sample_rate: int, model_name: str | None = None):
    db = get_sync_db()
    try:
        pit_stop = db.query(PitStop).filter(PitStop.id == pit_stop_id).first()
        if not pit_stop:
            logger.error(f"PitStop {pit_stop_id} not found")
            return

        # Resolve effective model name
        effective_model = model_name or detector.get_active_model_name() or "default"

        pit_stop.status = "processing"
        db.commit()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            pit_stop.status = "failed"
            pit_stop.error_message = "Could not open video file"
            db.commit()
            return

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        pit_stop.fps = fps
        pit_stop.total_frames = total_frames
        pit_stop.duration_sec = round(duration, 2)
        db.commit()

        frame_number = 0
        processed = 0
        detection_batch = []
        BATCH_SIZE = 100

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_number % sample_rate == 0:
                timestamp_sec = round(frame_number / fps, 3) if fps > 0 else 0
                detections = detector.detect_frame(frame, model_name=model_name)

                for det in detections:
                    detection_batch.append(Detection(
                        pit_stop_id=pit_stop_id,
                        frame_number=frame_number,
                        timestamp_sec=timestamp_sec,
                        class_name=det["class_name"],
                        confidence=det["confidence"],
                        bbox_x=det["bbox_x"],
                        bbox_y=det["bbox_y"],
                        bbox_w=det["bbox_w"],
                        bbox_h=det["bbox_h"],
                        model_name=effective_model,
                    ))

                processed += 1

                # Batch insert and update progress
                if len(detection_batch) >= BATCH_SIZE:
                    db.bulk_save_objects(detection_batch)
                    detection_batch.clear()
                    pit_stop.processed_frames = processed
                    db.commit()

            frame_number += 1

        cap.release()

        # Flush remaining detections
        if detection_batch:
            db.bulk_save_objects(detection_batch)
            detection_batch.clear()

        pit_stop.processed_frames = processed
        db.commit()

        # Compute summaries for this model
        _compute_summaries(db, pit_stop_id, effective_model)

        # Run pit stop analytics (non-fatal)
        try:
            from .pit_stop_analyzer import analyze_pit_stop
            analyze_pit_stop(db, pit_stop_id, effective_model)
            logger.info(f"PitStop {pit_stop_id} analytics complete")
        except Exception as e:
            logger.warning(f"Analytics failed for pit stop {pit_stop_id}: {e}")

        pit_stop.status = "completed"
        db.commit()
        logger.info(f"PitStop {pit_stop_id} processing complete: {processed} frames analyzed")

    except Exception as e:
        logger.exception(f"Error processing pit stop {pit_stop_id}")
        try:
            pit_stop = db.query(PitStop).filter(PitStop.id == pit_stop_id).first()
            if pit_stop:
                pit_stop.status = "failed"
                pit_stop.error_message = str(e)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _compute_summaries(db, pit_stop_id: int, model_name: str = "default"):
    """Aggregate detections into per-class summaries for a specific model."""

    # Delete old summaries only for this model
    db.query(DetectionSummary).filter(
        DetectionSummary.pit_stop_id == pit_stop_id,
        DetectionSummary.model_name == model_name,
    ).delete()

    rows = (
        db.query(
            Detection.class_name,
            func.count(Detection.id).label("total_count"),
            func.avg(Detection.confidence).label("avg_confidence"),
            func.min(Detection.confidence).label("min_confidence"),
            func.max(Detection.confidence).label("max_confidence"),
            func.min(Detection.timestamp_sec).label("first_seen_sec"),
            func.max(Detection.timestamp_sec).label("last_seen_sec"),
        )
        .filter(Detection.pit_stop_id == pit_stop_id)
        .filter(Detection.model_name == model_name)
        .group_by(Detection.class_name)
        .all()
    )

    per_frame_subq = (
        db.query(
            Detection.class_name,
            Detection.frame_number,
            func.count(Detection.id).label("frame_count"),
        )
        .filter(Detection.pit_stop_id == pit_stop_id)
        .filter(Detection.model_name == model_name)
        .group_by(Detection.class_name, Detection.frame_number)
        .subquery()
    )
    max_per_frame_rows = (
        db.query(
            per_frame_subq.c.class_name,
            func.max(per_frame_subq.c.frame_count).label("max_per_frame"),
        )
        .group_by(per_frame_subq.c.class_name)
        .all()
    )
    max_per_frame_map = {r.class_name: r.max_per_frame for r in max_per_frame_rows}

    for row in rows:
        summary = DetectionSummary(
            pit_stop_id=pit_stop_id,
            class_name=row.class_name,
            total_count=row.total_count,
            max_per_frame=max_per_frame_map.get(row.class_name, 0),
            avg_confidence=round(float(row.avg_confidence), 4),
            min_confidence=round(float(row.min_confidence), 4),
            max_confidence=round(float(row.max_confidence), 4),
            first_seen_sec=round(float(row.first_seen_sec), 3),
            last_seen_sec=round(float(row.last_seen_sec), 3),
            model_name=model_name,
        )
        db.add(summary)

    db.commit()
