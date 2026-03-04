"""Predictions API — start/poll/fetch race predictions."""

from __future__ import annotations

import threading

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PredictionResult, RacePrediction, RaceWeekend
from ..schemas import (
    PredictionCreate,
    PredictionFullOut,
    PredictionResultOut,
    PredictionStatusOut,
)
from ..services.prediction_runner import run_prediction_background

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.post("/race/{race_weekend_id}")
async def start_race_prediction(
    race_weekend_id: int,
    config: PredictionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Start qualifying + race predictions for a race weekend."""
    rw = await db.execute(
        select(RaceWeekend).where(RaceWeekend.id == race_weekend_id)
    )
    if not rw.scalar_one_or_none():
        raise HTTPException(404, "Race weekend not found")

    prediction_ids = []

    # Create qualifying prediction
    quali_pred = RacePrediction(
        race_weekend_id=race_weekend_id,
        prediction_type="qualifying",
        num_simulations=config.num_simulations,
        weather_condition=config.weather_override or "dry",
        parameter_overrides=config.parameter_overrides,
    )
    db.add(quali_pred)
    await db.flush()
    prediction_ids.append(quali_pred.id)

    # Create race prediction
    race_pred = RacePrediction(
        race_weekend_id=race_weekend_id,
        prediction_type="race",
        num_simulations=config.num_simulations,
        weather_condition=config.weather_override or "dry",
        parameter_overrides=config.parameter_overrides,
    )
    db.add(race_pred)
    await db.flush()
    prediction_ids.append(race_pred.id)

    await db.commit()

    # Launch background threads
    for pid in prediction_ids:
        thread = threading.Thread(
            target=run_prediction_background,
            args=(pid,),
            daemon=True,
        )
        thread.start()

    return {
        "qualifying_prediction_id": prediction_ids[0],
        "race_prediction_id": prediction_ids[1],
        "message": "Predictions started",
    }


@router.get("/{prediction_id}/status", response_model=PredictionStatusOut)
async def get_prediction_status(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RacePrediction).where(RacePrediction.id == prediction_id)
    )
    pred = result.scalar_one_or_none()
    if not pred:
        raise HTTPException(404, "Prediction not found")

    total = pred.num_simulations or 1
    completed = pred.completed_simulations or 0
    return PredictionStatusOut(
        id=pred.id,
        prediction_type=pred.prediction_type,
        status=pred.status,
        num_simulations=total,
        completed_simulations=completed,
        progress_pct=round(completed / total * 100, 1),
        weather_condition=pred.weather_condition,
    )


@router.get("/{prediction_id}/results", response_model=list[PredictionResultOut])
async def get_prediction_results(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PredictionResult)
        .where(PredictionResult.prediction_id == prediction_id)
        .order_by(PredictionResult.predicted_position)
    )
    results = result.scalars().all()
    if not results:
        raise HTTPException(404, "No results found")
    return results


@router.get("/race-weekend/{race_weekend_id}", response_model=list[PredictionFullOut])
async def get_race_weekend_predictions(
    race_weekend_id: int,
    db: AsyncSession = Depends(get_db),
):
    pred_result = await db.execute(
        select(RacePrediction)
        .where(RacePrediction.race_weekend_id == race_weekend_id)
        .order_by(RacePrediction.created_at.desc())
    )
    predictions = pred_result.scalars().all()

    output = []
    for pred in predictions:
        results_q = await db.execute(
            select(PredictionResult)
            .where(PredictionResult.prediction_id == pred.id)
            .order_by(PredictionResult.predicted_position)
        )
        results = results_q.scalars().all()
        output.append(PredictionFullOut(
            id=pred.id,
            race_weekend_id=pred.race_weekend_id,
            prediction_type=pred.prediction_type,
            status=pred.status,
            num_simulations=pred.num_simulations,
            weather_condition=pred.weather_condition,
            results=[PredictionResultOut.model_validate(r) for r in results],
            created_at=pred.created_at,
        ))
    return output
