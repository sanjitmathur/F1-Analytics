import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Dataset
from ..schemas import (
    AddFramesRequest,
    DatasetCreate,
    DatasetOut,
    DatasetStats,
    SplitRequest,
)
from ..services.dataset_manager import (
    add_frames_to_dataset_sync,
    create_dataset_sync,
    get_dataset_stats_sync,
    split_dataset_sync,
)

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("", response_model=DatasetOut, status_code=201)
async def create_dataset(body: DatasetCreate):
    dataset = create_dataset_sync(body.name, body.description, body.class_names)
    return _to_out(dataset)


@router.get("", response_model=list[DatasetOut])
async def list_datasets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).order_by(Dataset.created_at.desc()))
    return [_to_out(d) for d in result.scalars().all()]


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")
    return _to_out(dataset)


@router.post("/{dataset_id}/add-frames", status_code=200)
async def add_frames(dataset_id: int, body: AddFramesRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Dataset not found")

    add_frames_to_dataset_sync(dataset_id, body.frame_ids)
    return {"message": f"Added {len(body.frame_ids)} frames to dataset"}


@router.post("/{dataset_id}/split", status_code=200)
async def split(dataset_id: int, body: SplitRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Dataset not found")

    split_dataset_sync(dataset_id, body.train_ratio)
    return {"message": "Dataset split complete"}


@router.get("/{dataset_id}/stats", response_model=DatasetStats)
async def dataset_stats(dataset_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Dataset not found")

    return get_dataset_stats_sync(dataset_id)


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    import shutil
    from pathlib import Path

    from ..config import settings

    result = await db.execute(select(Dataset).filter(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(404, "Dataset not found")

    # Delete directory
    dir_path = Path(settings.DATASETS_DIR) / dataset.directory_path
    if dir_path.exists():
        shutil.rmtree(str(dir_path))

    await db.delete(dataset)
    await db.commit()


def _to_out(dataset: Dataset) -> DatasetOut:
    """Convert Dataset model to DatasetOut, parsing JSON class_names."""
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        version=dataset.version,
        description=dataset.description,
        class_names=json.loads(dataset.class_names) if isinstance(dataset.class_names, str) else dataset.class_names,
        total_images=dataset.total_images,
        total_labeled=dataset.total_labeled,
        train_count=dataset.train_count,
        val_count=dataset.val_count,
        created_at=dataset.created_at,
        updated_at=dataset.updated_at,
    )
