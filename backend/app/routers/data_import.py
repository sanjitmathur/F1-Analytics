"""FastF1 data import endpoints."""

import threading

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import ImportedRaceData
from ..schemas import ImportedRaceResponse, ImportRequest

router = APIRouter(prefix="/api/import", tags=["data_import"])


@router.get("", response_model=list[ImportedRaceResponse])
async def list_imports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImportedRaceData).order_by(ImportedRaceData.imported_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=dict, status_code=201)
async def import_race(data: ImportRequest, db: AsyncSession = Depends(get_db)):
    """Import real F1 race data via FastF1."""
    try:
        from ..services.fastf1_loader import import_session_sync
    except ImportError:
        raise HTTPException(
            501,
            "FastF1 not installed. Install with: pip install fastf1",
        )

    record = ImportedRaceData(
        year=data.year,
        grand_prix=data.grand_prix,
        session_type=data.session_type,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Run import in background
    thread = threading.Thread(
        target=import_session_sync,
        args=(record.id, data.year, data.grand_prix, data.session_type),
        daemon=True,
    )
    thread.start()

    return {"id": record.id, "message": "Import started"}


@router.get("/{import_id}", response_model=ImportedRaceResponse)
async def get_import(import_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ImportedRaceData).where(ImportedRaceData.id == import_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Import not found")
    return record
