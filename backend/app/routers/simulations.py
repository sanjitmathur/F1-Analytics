"""Simulation endpoints: start, poll status, get results."""

import threading

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import LapData, SimulationResult, SimulationRun, Track
from ..schemas import (
    LapDataResponse,
    SimulationCreate,
    SimulationResultResponse,
    SimulationRunResponse,
    SimulationStatus,
)
from ..services.simulation_runner import run_simulation_background

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


@router.get("", response_model=list[SimulationRunResponse])
async def list_simulations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SimulationRun).order_by(SimulationRun.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=dict, status_code=201)
async def start_simulation(data: SimulationCreate, db: AsyncSession = Depends(get_db)):
    # Validate track exists
    result = await db.execute(select(Track).where(Track.id == data.track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(404, "Track not found")

    # Create simulation run record — store weather in driver_config metadata
    config_data = [d.model_dump() for d in data.drivers]
    run = SimulationRun(
        name=data.name,
        track_id=data.track_id,
        track_name=track.name,
        status="pending",
        sim_type=data.sim_type,
        num_simulations=data.num_simulations if data.sim_type == "monte_carlo" else 1,
        driver_config=config_data,
        error_message=None,
    )
    # Store weather in a JSON-safe way via a metadata approach
    run.driver_config = {"drivers": config_data, "weather": data.weather, "rain_intensity": data.rain_intensity}
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Launch background thread
    thread = threading.Thread(
        target=run_simulation_background,
        args=(run.id,),
        daemon=True,
    )
    thread.start()

    return {"id": run.id, "message": "Simulation started"}


@router.get("/{run_id}", response_model=SimulationRunResponse)
async def get_simulation(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SimulationRun).where(SimulationRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Simulation not found")
    return run


@router.get("/{run_id}/status", response_model=SimulationStatus)
async def get_simulation_status(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SimulationRun).where(SimulationRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Simulation not found")

    total = run.num_simulations or 1
    completed = run.completed_simulations or 0
    pct = (completed / total * 100) if total > 0 else 0

    return SimulationStatus(
        id=run.id,
        status=run.status,
        completed_simulations=completed,
        num_simulations=total,
        progress_pct=round(pct, 1),
    )


@router.get("/{run_id}/results", response_model=list[SimulationResultResponse])
async def get_simulation_results(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SimulationResult)
        .where(SimulationResult.run_id == run_id)
        .order_by(SimulationResult.position)
    )
    return result.scalars().all()


@router.get("/{run_id}/laps", response_model=list[LapDataResponse])
async def get_lap_data(
    run_id: int,
    driver: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(LapData).where(LapData.run_id == run_id)
    if driver:
        query = query.where(LapData.driver_name == driver)
    query = query.order_by(LapData.lap, LapData.position)
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/{run_id}")
async def delete_simulation(run_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SimulationRun).where(SimulationRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Simulation not found")

    # Delete related data
    await db.execute(
        SimulationResult.__table__.delete().where(SimulationResult.run_id == run_id)
    )
    await db.execute(
        LapData.__table__.delete().where(LapData.run_id == run_id)
    )
    await db.delete(run)
    await db.commit()
    return {"message": "Simulation deleted"}
