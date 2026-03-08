"""Season API — calendar, drivers, standings."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..constants import DRIVERS_2026, HISTORICAL_STATS, REAL_RESULTS_2026, TEAM_COLORS_2026
from ..services.performance_calibrator import get_calibrated_performance
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
async def get_driver_standings(
    year: int,
    predicted: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Season).where(Season.year == year))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    query = select(ChampionshipStanding).where(
        ChampionshipStanding.season_id == season.id,
        ChampionshipStanding.standing_type == "driver",
    )
    if predicted is not None:
        query = query.where(ChampionshipStanding.is_predicted == predicted)
    query = query.order_by(ChampionshipStanding.points.desc(), ChampionshipStanding.wins.desc(), ChampionshipStanding.podiums.desc())

    standings = await db.execute(query)
    return standings.scalars().all()


@router.get("/{year}/standings/constructor", response_model=list[ChampionshipStandingOut])
async def get_constructor_standings(
    year: int,
    predicted: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Season).where(Season.year == year))
    season = result.scalar_one_or_none()
    if not season:
        raise HTTPException(404, f"Season {year} not found")

    query = select(ChampionshipStanding).where(
        ChampionshipStanding.season_id == season.id,
        ChampionshipStanding.standing_type == "constructor",
    )
    if predicted is not None:
        query = query.where(ChampionshipStanding.is_predicted == predicted)
    query = query.order_by(ChampionshipStanding.points.desc(), ChampionshipStanding.wins.desc(), ChampionshipStanding.podiums.desc())

    standings = await db.execute(query)
    return standings.scalars().all()


@router.get("/{year}/real-results/{round_number}")
async def get_real_race_results(year: int, round_number: int):
    """Return the actual race classification for a completed round."""
    if year != 2026:
        raise HTTPException(404, "Only 2026 real results available")
    results = REAL_RESULTS_2026.get(round_number)
    if not results:
        raise HTTPException(404, f"No real results for round {round_number}")
    return results


@router.get("/{year}/calibrated-performance")
async def get_calibrated_perf(year: int):
    """Return current calibrated team/driver performance derived from real results."""
    if year != 2026:
        raise HTTPException(404, "Only 2026 calibration available")
    return get_calibrated_performance()


@router.get("/{year}/driver-skills")
async def get_driver_skills(year: int):
    """Return skill profiles for drivers in a given year.

    For 2020-2025: derived from real HISTORICAL_STATS (wins, podiums, points, avg_pos).
    For 2026: derived from calibrated performance + real results.
    """
    profiles: dict[str, dict] = {}

    if 2020 <= year <= 2025:
        # Get all drivers who raced that year
        year_stats = {name: stats for (y, name), stats in HISTORICAL_STATS.items() if y == year}
        if not year_stats:
            raise HTTPException(404, f"No data for {year}")

        # Find max values for normalization
        max_wins = max((s["wins"] for s in year_stats.values()), default=1) or 1
        max_podiums = max((s["podiums"] for s in year_stats.values()), default=1) or 1
        max_points = max((s["points"] for s in year_stats.values()), default=1) or 1
        num_drivers = len(year_stats)

        for name, stats in year_stats.items():
            wins = stats["wins"]
            podiums = stats["podiums"]
            points = stats["points"]
            avg_pos = stats["avg_pos"]

            # Derive skill dimensions from season performance (0-100 scale)
            # Pace: based on avg finishing position (lower = better)
            pace = max(20, min(99, int(100 - (avg_pos - 1) * 5)))
            # Racecraft: wins per race opportunity + overtake implied by position gains
            racecraft = max(20, min(99, int(50 + (wins / max_wins) * 30 + (podiums / max_podiums) * 20)))
            # Consistency: points per race (normalized)
            num_races = {2020: 17, 2021: 22, 2022: 22, 2023: 22, 2024: 24, 2025: 24}.get(year, 22)
            pts_per_race = points / num_races
            max_pts_per_race = max_points / num_races
            consistency = max(20, min(99, int(40 + (pts_per_race / max_pts_per_race) * 55)))
            # Qualifying: correlated with pace but slightly different
            qualifying = max(20, min(99, pace + int((wins / max_wins) * 5) - 2))
            # Experience: based on position in grid (higher placed = more experienced usually)
            experience = max(20, min(99, int(100 - avg_pos * 4)))

            profiles[name] = {
                "pace": pace,
                "racecraft": racecraft,
                "consistency": consistency,
                "wet": max(20, min(99, int(pace * 0.85 + 10))),  # approximate
                "experience": experience,
                "qualifying": qualifying,
            }

    elif year == 2026:
        calibrated = get_calibrated_performance()

        # Get real results for additional context
        from ..constants import REAL_RESULTS_2026
        real_positions: dict[str, list[int]] = {}
        for results in REAL_RESULTS_2026.values():
            for entry in results:
                if entry["status"] == "finished":
                    real_positions.setdefault(entry["driver"], []).append(entry["position"])

        for d in DRIVERS_2026:
            name = d["name"]
            perf = calibrated.get(name, {})
            eff_skill = perf.get("effective_skill", d["skill"])
            team_pace = perf.get("team_pace", 0.0)

            # Convert skill delta to 0-100 scale (skill range roughly -1.0 to +1.0)
            # -1.0 = 99, 0.0 = 70, +1.0 = 40
            base = max(20, min(99, int(70 - eff_skill * 30)))

            # Adjust with real finishing data if available
            positions = real_positions.get(name, [])
            avg_pos = sum(positions) / len(positions) if positions else 11
            pos_score = max(20, min(99, int(100 - (avg_pos - 1) * 4.5)))

            # Blend base model with real position data
            if positions:
                pace = int(base * 0.4 + pos_score * 0.6)
            else:
                pace = base

            profiles[name] = {
                "pace": max(20, min(99, pace)),
                "racecraft": max(20, min(99, pace - 3 + int(abs(team_pace) * 5))),
                "consistency": max(20, min(99, pace - 2)),
                "wet": max(20, min(99, pace - 5)),
                "experience": max(20, min(99, int(pace * 0.8 + 10))),
                "qualifying": max(20, min(99, pace + 2)),
            }
    else:
        raise HTTPException(404, f"No skill data for {year}")

    return profiles
