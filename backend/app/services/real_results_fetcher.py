"""Auto-fetch real F1 race results using FastF1."""

import logging
import os
from datetime import date, timedelta

from sqlalchemy import select

from ..config import settings
from ..constants import POINTS_SYSTEM, REAL_RESULTS_2026, TEAM_COLORS_2026
from ..database import get_sync_db
from ..models import ChampionshipStanding, RaceWeekend, Season

logger = logging.getLogger(__name__)

# Map calendar track names to FastF1 grand prix names
TRACK_TO_GP: dict[str, str] = {
    "Albert Park": "Australian Grand Prix",
    "Shanghai": "Chinese Grand Prix",
    "Suzuka": "Japanese Grand Prix",
    "Bahrain": "Bahrain Grand Prix",
    "Jeddah": "Saudi Arabian Grand Prix",
    "Miami": "Miami Grand Prix",
    "Montreal": "Canadian Grand Prix",
    "Monaco": "Monaco Grand Prix",
    "Barcelona": "Spanish Grand Prix",
    "Red Bull Ring": "Austrian Grand Prix",
    "Silverstone": "British Grand Prix",
    "Spa-Francorchamps": "Belgian Grand Prix",
    "Hungaroring": "Hungarian Grand Prix",
    "Zandvoort": "Dutch Grand Prix",
    "Monza": "Italian Grand Prix",
    "Madrid": "Spanish Grand Prix",
    "Baku": "Azerbaijan Grand Prix",
    "Singapore": "Singapore Grand Prix",
    "COTA": "United States Grand Prix",
    "Mexico City": "Mexico City Grand Prix",
    "Interlagos": "São Paulo Grand Prix",
    "Las Vegas": "Las Vegas Grand Prix",
    "Lusail": "Qatar Grand Prix",
    "Yas Marina": "Abu Dhabi Grand Prix",
}


def fetch_race_results_fastf1(year: int, grand_prix: str) -> list[dict] | None:
    """Fetch race results from FastF1. Returns list of result dicts or None on failure."""
    try:
        import fastf1

        cache_dir = settings.FASTF1_CACHE_DIR
        os.makedirs(cache_dir, exist_ok=True)
        fastf1.Cache.enable_cache(cache_dir)

        session = fastf1.get_session(year, grand_prix, "Race")
        session.load()

        results = session.results
        if results is None or results.empty:
            return None

        race_results = []
        for _, row in results.iterrows():
            driver_name = row.get("FullName") or f"{row.get('FirstName', '')} {row.get('LastName', '')}".strip()
            team = row.get("TeamName", "")
            position = row.get("Position")
            status_raw = str(row.get("Status", "")).strip()

            # Normalize team names to match our constants
            team = _normalize_team_name(team)

            if status_raw.lower() in ("finished", "+1 lap", "+2 laps", "+3 laps") or status_raw.startswith("+"):
                status = "finished"
            elif "dns" in status_raw.lower() or "did not start" in status_raw.lower():
                status = "dns"
            else:
                status = "dnf"

            pos = int(position) if position and not _is_nan(position) else len(race_results) + 1

            race_results.append({
                "driver": driver_name,
                "team": team,
                "position": pos,
                "status": status,
            })

        # Sort by position
        race_results.sort(key=lambda x: x["position"])
        return race_results

    except Exception as e:
        logger.warning("FastF1 fetch failed for %s %d: %s", grand_prix, year, e)
        return None


def _is_nan(val) -> bool:
    try:
        import math
        return math.isnan(float(val))
    except (TypeError, ValueError):
        return False


def _normalize_team_name(team: str) -> str:
    """Map FastF1 team names to our constant names."""
    team_map = {
        "Red Bull Racing": "Red Bull",
        "Scuderia Ferrari": "Ferrari",
        "Mercedes-AMG Petronas": "Mercedes",
        "Mercedes": "Mercedes",
        "McLaren": "McLaren",
        "Aston Martin": "Aston Martin",
        "Alpine": "Alpine",
        "Williams": "Williams",
        "RB": "Racing Bulls",
        "Racing Bulls": "Racing Bulls",
        "AlphaTauri": "Racing Bulls",
        "Kick Sauber": "Audi",
        "Sauber": "Audi",
        "Audi": "Audi",
        "Haas F1 Team": "Haas",
        "Haas": "Haas",
        "Cadillac": "Cadillac",
        "Andretti Cadillac": "Cadillac",
    }
    for key, val in team_map.items():
        if key.lower() in team.lower():
            return val
    # Fallback: check if team exists in our known teams
    if team in TEAM_COLORS_2026:
        return team
    return team


def auto_fetch_completed_races() -> dict[int, list[dict]]:
    """Check for completed races and fetch results via FastF1.

    Returns dict of round -> results for newly fetched races.
    """
    today = date.today()
    new_results: dict[int, list[dict]] = {}

    db = get_sync_db()
    try:
        season = db.execute(
            select(Season).where(Season.year == 2026)
        ).scalar_one_or_none()
        if not season:
            return new_results

        weekends = db.execute(
            select(RaceWeekend)
            .where(RaceWeekend.season_id == season.id)
            .order_by(RaceWeekend.round_number)
        ).scalars().all()

        for rw in weekends:
            round_num = rw.round_number

            # Skip if already in hardcoded results
            if round_num in REAL_RESULTS_2026:
                continue

            # Skip if race hasn't happened yet (give 1 day buffer for data availability)
            race_date = date.fromisoformat(rw.race_date) if isinstance(rw.race_date, str) else rw.race_date
            if race_date + timedelta(days=1) > today:
                continue

            # Skip if already completed
            if rw.status == "completed":
                continue

            # Try to fetch from FastF1
            gp_name = TRACK_TO_GP.get(rw.track_name, rw.name)
            logger.info("Auto-fetching results for Round %d: %s", round_num, gp_name)
            results = fetch_race_results_fastf1(2026, gp_name)

            if results:
                new_results[round_num] = results
                logger.info("Fetched %d results for Round %d", len(results), round_num)
            else:
                logger.info("No results available yet for Round %d", round_num)

    finally:
        db.close()

    return new_results


def rebuild_real_standings(extra_results: dict[int, list[dict]] | None = None):
    """Rebuild all real championship standings from REAL_RESULTS_2026 + any extra fetched results."""
    all_results = dict(REAL_RESULTS_2026)
    if extra_results:
        all_results.update(extra_results)

    if not all_results:
        return

    db = get_sync_db()
    try:
        season = db.execute(
            select(Season).where(Season.year == 2026)
        ).scalar_one_or_none()
        if not season:
            return

        # Delete existing real standings
        existing = db.execute(
            select(ChampionshipStanding).where(
                ChampionshipStanding.season_id == season.id,
                ChampionshipStanding.is_predicted == False,  # noqa: E712
            )
        ).scalars().all()
        for s in existing:
            db.delete(s)
        db.flush()

        # Aggregate standings
        driver_stats: dict[str, dict] = {}
        constructor_stats: dict[str, dict] = {}
        max_round = 0

        for round_num in sorted(all_results.keys()):
            results = all_results[round_num]
            max_round = max(max_round, round_num)

            # Mark race weekend as completed
            rw = db.execute(
                select(RaceWeekend).where(
                    RaceWeekend.season_id == season.id,
                    RaceWeekend.round_number == round_num,
                )
            ).scalar_one_or_none()
            if rw and rw.status != "completed":
                rw.status = "completed"

            for entry in results:
                driver = entry["driver"]
                team = entry["team"]
                pos = entry["position"]
                status = entry["status"]

                pts = POINTS_SYSTEM.get(pos, 0) if status == "finished" else 0
                is_win = pos == 1 and status == "finished"
                is_podium = pos <= 3 and status == "finished"

                if driver not in driver_stats:
                    driver_stats[driver] = {"points": 0, "wins": 0, "podiums": 0}
                driver_stats[driver]["points"] += pts
                driver_stats[driver]["wins"] += int(is_win)
                driver_stats[driver]["podiums"] += int(is_podium)

                if team not in constructor_stats:
                    constructor_stats[team] = {"points": 0, "wins": 0, "podiums": 0}
                constructor_stats[team]["points"] += pts
                constructor_stats[team]["wins"] += int(is_win)
                constructor_stats[team]["podiums"] += int(is_podium)

        # Insert driver standings
        for driver, stats in driver_stats.items():
            db.add(ChampionshipStanding(
                season_id=season.id,
                standing_type="driver",
                entity_name=driver,
                points=stats["points"],
                wins=stats["wins"],
                podiums=stats["podiums"],
                through_round=max_round,
                is_predicted=False,
            ))

        # Insert constructor standings
        for team, stats in constructor_stats.items():
            db.add(ChampionshipStanding(
                season_id=season.id,
                standing_type="constructor",
                entity_name=team,
                points=stats["points"],
                wins=stats["wins"],
                podiums=stats["podiums"],
                through_round=max_round,
                is_predicted=False,
            ))

        db.commit()
        logger.info("Rebuilt real standings through Round %d", max_round)

    finally:
        db.close()
