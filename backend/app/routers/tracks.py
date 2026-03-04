"""Track management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Track
from ..schemas import TrackCreate, TrackResponse

router = APIRouter(prefix="/api/tracks", tags=["tracks"])


@router.get("", response_model=list[TrackResponse])
async def list_tracks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).order_by(Track.name))
    return result.scalars().all()


@router.get("/{track_id}", response_model=TrackResponse)
async def get_track(track_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(404, "Track not found")
    return track


@router.post("", response_model=TrackResponse, status_code=201)
async def create_track(data: TrackCreate, db: AsyncSession = Depends(get_db)):
    track = Track(**data.model_dump(), is_preset=False)
    db.add(track)
    await db.commit()
    await db.refresh(track)
    return track


@router.delete("/{track_id}")
async def delete_track(track_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(404, "Track not found")
    if track.is_preset:
        raise HTTPException(400, "Cannot delete preset tracks")
    await db.delete(track)
    await db.commit()
    return {"message": "Track deleted"}
