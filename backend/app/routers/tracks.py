"""Track management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..constants import TRACK_HISTORY
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


@router.get("/{track_id}/history")
async def get_track_history(track_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(404, "Track not found")
    history = TRACK_HISTORY.get(track.name)
    if not history:
        return {
            "track_name": track.name,
            "first_gp": None,
            "circuit_length_km": None,
            "lap_record": None,
            "lap_record_holder": None,
            "lap_record_year": None,
            "past_winners": [],
        }
    return {
        "track_name": track.name,
        "first_gp": history["first_gp"],
        "circuit_length_km": history["circuit_length_km"],
        "lap_record": history["lap_record"],
        "lap_record_holder": history["lap_record_holder"],
        "lap_record_year": history["lap_record_year"],
        "past_winners": [
            {"year": w[0], "driver": w[1], "team": w[2]}
            for w in history["past_winners"]
        ],
    }


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
