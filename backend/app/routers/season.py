"""Season API — calendar, drivers, standings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..constants import DRIVERS_2026, TEAM_COLORS_2026
from ..database import get_db
from ..models import ChampionshipStanding, RaceWeekend, Season
from ..schemas import (
    ChampionshipStandingOut,
    Driver2026Out,
    RaceWeekendOut,
    SeasonOut,
)

router = APIRouter(prefix="/api/season", tags=["season"])


@router.get("/{year}", response_model=SeasonOut)
async def get_season(year: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Season).where(Season.year == year))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    rw_result = await db.execute(
        select(RaceWeekend)
        .where(RaceWeekend.season_id == season.id)
        .order_by(RaceWeekend.round_number)
    )
    weekends = rw_result.scalars().all()

    return SeasonOut(
        id=season.id,
        year=season.year,
        is_active=season.is_active,
        race_weekends=[RaceWeekendOut.model_validate(rw) for rw in weekends],
    )


@router.get("/{year}/calendar", response_model=list[RaceWeekendOut])
async def get_calendar(year: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Season).where(Season.year == year))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    rw_result = await db.execute(
        select(RaceWeekend)
        .where(RaceWeekend.season_id == season.id)
        .order_by(RaceWeekend.round_number)
    )
    return rw_result.scalars().all()


@router.get("/{year}/drivers", response_model=list[Driver2026Out])
async def get_season_drivers(year: int):
    if year != 2026:
        raise HTTPException(404, "Only 2026 driver data available")
    return [Driver2026Out(**d) for d in DRIVERS_2026]


@router.get("/{year}/team-colors")
async def get_team_colors(year: int):
    if year != 2026:
        raise HTTPException(404, "Only 2026 team color data available")
    return TEAM_COLORS_2026


@router.get("/{year}/standings/driver", response_model=list[ChampionshipStandingOut])
async def get_driver_standings(year: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Season).where(Season.year == year))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    standings = await db.execute(
        select(ChampionshipStanding)
        .where(
            ChampionshipStanding.season_id == season.id,
            ChampionshipStanding.standing_type == "driver",
        )
        .order_by(ChampionshipStanding.points.desc())
    )
    return standings.scalars().all()


@router.get("/{year}/standings/constructor", response_model=list[ChampionshipStandingOut])
async def get_constructor_standings(year: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Season).where(Season.year == year))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    standings = await db.execute(
        select(ChampionshipStanding)
        .where(
            ChampionshipStanding.season_id == season.id,
            ChampionshipStanding.standing_type == "constructor",
        )
        .order_by(ChampionshipStanding.points.desc())
    )
    return standings.scalars().all()
