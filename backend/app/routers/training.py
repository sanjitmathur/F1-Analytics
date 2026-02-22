import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import TrainingRun, Dataset
from ..schemas import (
    TrainingStartRequest,
    TrainingStartResponse,
    TrainingRunOut,
    TrainingProgress,
)
from ..services.trainer import start_training, get_training_progress

router = APIRouter(prefix="/api/training", tags=["training"])


@router.post("/start", response_model=TrainingStartResponse, status_code=202)
async def start_training_run(body: TrainingStartRequest, db: AsyncSession = Depends(get_db)):
    # Verify dataset exists
    result = await db.execute(select(Dataset).filter(Dataset.id == body.dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")

    # Check data.yaml exists
    data_yaml = Path(settings.DATASETS_DIR) / dataset.directory_path / "data.yaml"
    if not data_yaml.exists():
        raise HTTPException(400, "Dataset must be split before training (data.yaml not found)")

    # Create training run record
    run = TrainingRun(
        dataset_id=body.dataset_id,
        model_name=body.model_name,
        base_model=body.base_model,
        epochs=body.epochs,
        batch_size=body.batch_size,
        image_size=body.image_size,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Start background training
    config = {
        "base_model": body.base_model,
        "epochs": body.epochs,
        "batch_size": body.batch_size,
        "image_size": body.image_size,
        "patience": body.patience,
    }
    start_training(run.id, str(data_yaml), config)

    return TrainingStartResponse(training_run_id=run.id, message="Training started")


@router.get("/{run_id}/status", response_model=TrainingProgress)
async def training_status(run_id: int):
    progress = get_training_progress(run_id)
    if progress.get("status") == "not_found":
        raise HTTPException(404, "Training run not found")
    return progress


@router.get("", response_model=list[TrainingRunOut])
async def list_runs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrainingRun).order_by(TrainingRun.created_at.desc()))
    return result.scalars().all()


@router.get("/{run_id}", response_model=TrainingRunOut)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrainingRun).filter(TrainingRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Training run not found")
    return run
