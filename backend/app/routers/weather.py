"""Weather API — fetch and compare weather conditions."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import RaceWeekend
from ..schemas import WeatherOut
from ..services.weather_service import fetch_race_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/{race_weekend_id}", response_model=WeatherOut)
async def get_race_weather(
    race_weekend_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get cached or fetched weather for a race weekend."""
    rw = await _get_rw(race_weekend_id, db)

    if rw.weather_data:
        return WeatherOut(**rw.weather_data)

    # Fetch and cache
    weather = await fetch_race_weather(rw.lat or 0, rw.lon or 0, rw.race_date)
    rw.weather_data = weather
    await db.commit()
    return WeatherOut(**weather)


@router.post("/{race_weekend_id}/refresh", response_model=WeatherOut)
async def refresh_weather(
    race_weekend_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Force-refresh weather from API."""
    rw = await _get_rw(race_weekend_id, db)
    weather = await fetch_race_weather(rw.lat or 0, rw.lon or 0, rw.race_date)
    rw.weather_data = weather
    await db.commit()
    return WeatherOut(**weather)


@router.get("/{race_weekend_id}/impact")
async def get_weather_impact(
    race_weekend_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Compare dry vs wet prediction impact (if predictions exist)."""
    from ..models import PredictionResult, RacePrediction

    await _get_rw(race_weekend_id, db)

    # Find dry and wet predictions
    results = {}
    for condition in ["dry", "wet"]:
        pred_q = await db.execute(
            select(RacePrediction).where(
                RacePrediction.race_weekend_id == race_weekend_id,
                RacePrediction.prediction_type == "race",
                RacePrediction.weather_condition == condition,
                RacePrediction.status == "completed",
            ).order_by(RacePrediction.created_at.desc())
        )
        pred = pred_q.scalar_one_or_none()
        if pred:
            pr_q = await db.execute(
                select(PredictionResult)
                .where(PredictionResult.prediction_id == pred.id)
                .order_by(PredictionResult.win_pct.desc(), PredictionResult.podium_pct.desc(), PredictionResult.predicted_position)
            )
            results[condition] = [
                {"driver_name": r.driver_name, "team": r.team, "position": r.predicted_position}
                for r in pr_q.scalars().all()
            ]

    # Compute position deltas
    rain_changers = []
    if "dry" in results and "wet" in results:
        dry_map = {r["driver_name"]: r["position"] for r in results["dry"]}
        for wet_r in results["wet"]:
            dry_pos = dry_map.get(wet_r["driver_name"], wet_r["position"])
            delta = round(dry_pos - wet_r["position"], 1)
            rain_changers.append({
                "driver_name": wet_r["driver_name"],
                "team": wet_r["team"],
                "dry_position": dry_pos,
                "wet_position": wet_r["position"],
                "delta": delta,
            })
        rain_changers.sort(key=lambda x: x["delta"], reverse=True)

    return {
        "dry_prediction": results.get("dry"),
        "wet_prediction": results.get("wet"),
        "rain_changers": rain_changers,
    }


async def _get_rw(race_weekend_id: int, db: AsyncSession) -> RaceWeekend:
    result = await db.execute(
        select(RaceWeekend).where(RaceWeekend.id == race_weekend_id)
    )
    rw = result.scalar_one_or_none()
    if not rw:
        raise HTTPException(404, "Race weekend not found")
    return rw
