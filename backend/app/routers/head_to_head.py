"""Head-to-head driver comparison API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..constants import DRIVERS_2026, HISTORICAL_STATS
from ..database import get_db
from ..models import ChampionshipStanding, PredictionResult, RacePrediction, RaceWeekend, Season
from ..schemas import HeadToHeadOut

router = APIRouter(prefix="/api/head-to-head", tags=["head-to-head"])


@router.get("", response_model=HeadToHeadOut)
async def get_head_to_head(
    driver1: str = Query(...),
    driver2: str = Query(...),
    track: str | None = Query(None),
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Compare two drivers, optionally at a specific track and year."""
    # For years 2020-2025, use real historical F1 data
    if 2020 <= year <= 2025:
        d1_stats = HISTORICAL_STATS.get((year, driver1), {})
        d2_stats = HISTORICAL_STATS.get((year, driver2), {})
        return HeadToHeadOut(
            driver1=driver1,
            driver2=driver2,
            track=track,
            driver1_avg_pos=d1_stats.get("avg_pos", 0),
            driver2_avg_pos=d2_stats.get("avg_pos", 0),
            driver1_wins=d1_stats.get("wins", 0),
            driver2_wins=d2_stats.get("wins", 0),
            driver1_podiums=d1_stats.get("podiums", 0),
            driver2_podiums=d2_stats.get("podiums", 0),
            driver1_points=d1_stats.get("points", 0),
            driver2_points=d2_stats.get("points", 0),
        )

    d1_info = next((d for d in DRIVERS_2026 if d["name"] == driver1), None)
    d2_info = next((d for d in DRIVERS_2026 if d["name"] == driver2), None)
    if not d1_info or not d2_info:
        # Driver not on 2026 grid — return zeros instead of error
        return HeadToHeadOut(
            driver1=driver1,
            driver2=driver2,
            track=track,
            driver1_avg_pos=0,
            driver2_avg_pos=0,
            driver1_wins=0,
            driver2_wins=0,
            driver1_podiums=0,
            driver2_podiums=0,
            driver1_points=0,
            driver2_points=0,
        )

    # Get all race predictions
    query = select(RacePrediction).where(
        RacePrediction.prediction_type == "race",
        RacePrediction.status == "completed",
    )
    pred_result = await db.execute(query)
    predictions = pred_result.scalars().all()

    d1_positions = []
    d2_positions = []
    d1_wins = 0
    d2_wins = 0

    for pred in predictions:
        # Filter by track if specified
        if track:
            rw_result = await db.execute(
                select(RaceWeekend).where(RaceWeekend.id == pred.race_weekend_id)
            )
            rw = rw_result.scalar_one_or_none()
            if not rw or rw.track_name != track:
                continue

        results = await db.execute(
            select(PredictionResult).where(PredictionResult.prediction_id == pred.id)
        )
        all_results = {r.driver_name: r for r in results.scalars().all()}

        r1 = all_results.get(driver1)
        r2 = all_results.get(driver2)
        if r1 and r2:
            d1_positions.append(r1.predicted_position)
            d2_positions.append(r2.predicted_position)
            if r1.predicted_position < r2.predicted_position:
                d1_wins += 1
            else:
                d2_wins += 1

    d1_avg = sum(d1_positions) / len(d1_positions) if d1_positions else 0
    d2_avg = sum(d2_positions) / len(d2_positions) if d2_positions else 0

    # Get championship points
    season_result = await db.execute(select(Season).where(Season.year == 2026))
    season = season_result.scalar_one_or_none()

    d1_points = 0.0
    d2_points = 0.0
    d1_podiums = 0
    d2_podiums = 0
    if season:
        for name, attr in [(driver1, "d1"), (driver2, "d2")]:
            standing = await db.execute(
                select(ChampionshipStanding).where(
                    ChampionshipStanding.season_id == season.id,
                    ChampionshipStanding.standing_type == "driver",
                    ChampionshipStanding.entity_name == name,
                )
            )
            s = standing.scalar_one_or_none()
            if s:
                if attr == "d1":
                    d1_points = s.points
                    d1_podiums = s.podiums
                else:
                    d2_points = s.points
                    d2_podiums = s.podiums

    return HeadToHeadOut(
        driver1=driver1,
        driver2=driver2,
        track=track,
        driver1_avg_pos=round(d1_avg, 2),
        driver2_avg_pos=round(d2_avg, 2),
        driver1_wins=d1_wins,
        driver2_wins=d2_wins,
        driver1_podiums=d1_podiums,
        driver2_podiums=d2_podiums,
        driver1_points=d1_points,
        driver2_points=d2_points,
    )


@router.get("/season", response_model=HeadToHeadOut)
async def get_season_head_to_head(
    driver1: str = Query(...),
    driver2: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Season-long comparison (wrapper without track filter)."""
    return await get_head_to_head(driver1=driver1, driver2=driver2, db=db)
