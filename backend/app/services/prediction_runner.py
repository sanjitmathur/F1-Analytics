"""Prediction runner — runs qualifying + race predictions for 2026 season races.

Follows the same pattern as simulation_runner.py: background thread, sync DB, progress updates.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy import select

from ..constants import DRIVERS_2026, POINTS_SYSTEM
from ..database import get_sync_db
from ..models import (
    ChampionshipStanding,
    PredictionResult,
    RacePrediction,
    RaceWeekend,
    Season,
)
from ..simulation.entities import Track as SimTrack
from ..simulation.parameter_builder import build_drivers, build_track
from ..simulation.qualifying_engine import QualifyingSession
from ..simulation.race_engine import Race

logger = logging.getLogger(__name__)


def run_prediction_background(prediction_id: int) -> None:
    """Execute prediction in a background thread (sync DB)."""
    db = get_sync_db()
    try:
        prediction = db.execute(
            select(RacePrediction).where(RacePrediction.id == prediction_id)
        ).scalar_one_or_none()

        if not prediction:
            logger.error(f"Prediction {prediction_id} not found")
            return

        prediction.status = "running"
        db.commit()

        # Load race weekend
        rw = db.execute(
            select(RaceWeekend).where(RaceWeekend.id == prediction.race_weekend_id)
        ).scalar_one_or_none()

        if not rw:
            prediction.status = "failed"
            prediction.error_message = "Race weekend not found"
            db.commit()
            return

        weather = prediction.weather_condition or "dry"
        overrides = prediction.parameter_overrides or {}
        num_sims = prediction.num_simulations

        track = build_track(rw)

        if prediction.prediction_type == "qualifying":
            _run_qualifying_prediction(db, prediction, rw, track, weather, overrides, num_sims)
        else:
            _run_race_prediction(db, prediction, rw, track, weather, overrides, num_sims)

    except Exception as e:
        logger.exception(f"Prediction {prediction_id} failed: {e}")
        try:
            prediction.status = "failed"
            prediction.error_message = str(e)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _run_qualifying_prediction(
    db, prediction: RacePrediction, rw: RaceWeekend,
    track: SimTrack, weather: str, overrides: dict, num_sims: int,
) -> None:
    """Run N qualifying simulations, aggregate grid positions."""
    position_counts: dict[str, Counter] = defaultdict(Counter)
    q1_exits: Counter = Counter()
    q2_exits: Counter = Counter()

    for i in range(num_sims):
        drivers = build_drivers(
            DRIVERS_2026, rw.track_name, weather, rw.total_laps,
            overrides=overrides.get("drivers"),
        )
        session = QualifyingSession(track, drivers, weather=weather)
        state = session.run()

        for result in state.results:
            position_counts[result.driver_name][result.final_position] += 1
            if result.eliminated_in == "Q1":
                q1_exits[result.driver_name] += 1
            elif result.eliminated_in == "Q2":
                q2_exits[result.driver_name] += 1

        # Update progress
        if (i + 1) % max(1, num_sims // 20) == 0:
            prediction.completed_simulations = i + 1
            db.commit()

    # Build results
    for driver in DRIVERS_2026:
        name = driver["name"]
        counts = position_counts.get(name, Counter())
        total = sum(counts.values()) or 1

        pos_dist = {str(pos): round(cnt / total * 100, 1) for pos, cnt in sorted(counts.items())}
        avg_pos = sum(pos * cnt for pos, cnt in counts.items()) / total if counts else 22.0
        win_pct = counts.get(1, 0) / total * 100
        podium = sum(counts.get(p, 0) for p in [1, 2, 3]) / total * 100
        top5 = sum(counts.get(p, 0) for p in range(1, 6)) / total * 100
        top10 = sum(counts.get(p, 0) for p in range(1, 11)) / total * 100

        db.add(PredictionResult(
            prediction_id=prediction.id,
            driver_name=name,
            team=driver["team"],
            predicted_position=round(avg_pos, 2),
            win_pct=round(win_pct, 1),
            podium_pct=round(podium, 1),
            top5_pct=round(top5, 1),
            top10_pct=round(top10, 1),
            dnf_pct=0.0,
            position_distribution=pos_dist,
            q1_exit_pct=round(q1_exits.get(name, 0) / total * 100, 1),
            q2_exit_pct=round(q2_exits.get(name, 0) / total * 100, 1),
            q3_exit_pct=0.0,
        ))

    prediction.status = "completed"
    prediction.completed_simulations = num_sims
    prediction.completed_at = datetime.utcnow()
    db.commit()


def _run_race_prediction(
    db, prediction: RacePrediction, rw: RaceWeekend,
    track: SimTrack, weather: str, overrides: dict, num_sims: int,
) -> None:
    """Run N race simulations, aggregate positions and stats."""
    position_counts: dict[str, Counter] = defaultdict(Counter)
    win_counts: Counter = Counter()
    podium_counts: Counter = Counter()
    top5_counts: Counter = Counter()
    top10_counts: Counter = Counter()
    dnf_counts: Counter = Counter()
    points_total: dict[str, float] = defaultdict(float)

    # First run a quick qualifying to get grid order
    quali_drivers = build_drivers(
        DRIVERS_2026, rw.track_name, weather, rw.total_laps,
        overrides=overrides.get("drivers"),
    )
    quali = QualifyingSession(track, quali_drivers, weather=weather)
    quali_state = quali.run()
    grid_order = {r.driver_name: r.final_position for r in quali_state.results}

    for i in range(num_sims):
        drivers = build_drivers(
            DRIVERS_2026, rw.track_name, weather, rw.total_laps,
            overrides=overrides.get("drivers"),
            grid_positions=grid_order,
        )
        race = Race(track, drivers, weather=weather)
        state = race.run()

        for result in state.results:
            name = result.driver_name
            pos = result.position
            position_counts[name][pos] += 1

            if pos == 1:
                win_counts[name] += 1
            if pos <= 3:
                podium_counts[name] += 1
            if pos <= 5:
                top5_counts[name] += 1
            if pos <= 10:
                top10_counts[name] += 1
            if result.is_dnf:
                dnf_counts[name] += 1

            # Points
            points_total[name] += POINTS_SYSTEM.get(pos, 0)

        # Update progress
        if (i + 1) % max(1, num_sims // 20) == 0:
            prediction.completed_simulations = i + 1
            db.commit()

    # Build results
    for driver in DRIVERS_2026:
        name = driver["name"]
        counts = position_counts.get(name, Counter())
        total = sum(counts.values()) or 1

        pos_dist = {str(pos): round(cnt / total * 100, 1) for pos, cnt in sorted(counts.items())}
        avg_pos = sum(pos * cnt for pos, cnt in counts.items()) / total if counts else 22.0

        db.add(PredictionResult(
            prediction_id=prediction.id,
            driver_name=name,
            team=driver["team"],
            predicted_position=round(avg_pos, 2),
            win_pct=round(win_counts.get(name, 0) / total * 100, 1),
            podium_pct=round(podium_counts.get(name, 0) / total * 100, 1),
            top5_pct=round(top5_counts.get(name, 0) / total * 100, 1),
            top10_pct=round(top10_counts.get(name, 0) / total * 100, 1),
            dnf_pct=round(dnf_counts.get(name, 0) / total * 100, 1),
            position_distribution=pos_dist,
        ))

    prediction.status = "completed"
    prediction.completed_simulations = num_sims
    prediction.completed_at = datetime.utcnow()
    db.commit()

    # Update championship standings
    _update_championship_standings(db, rw, points_total, num_sims, win_counts, podium_counts)


def _update_championship_standings(
    db, rw: RaceWeekend, points_total: dict[str, float],
    num_sims: int, win_counts: Counter, podium_counts: Counter,
) -> None:
    """Update championship standings with average points from this race."""
    season = db.execute(
        select(Season).where(Season.id == rw.season_id)
    ).scalar_one_or_none()
    if not season:
        return

    # Driver standings
    for driver in DRIVERS_2026:
        name = driver["name"]
        avg_points = points_total.get(name, 0) / num_sims

        existing = db.execute(
            select(ChampionshipStanding).where(
                ChampionshipStanding.season_id == season.id,
                ChampionshipStanding.standing_type == "driver",
                ChampionshipStanding.entity_name == name,
            )
        ).scalar_one_or_none()

        if existing:
            existing.points = round(existing.points + avg_points, 1)
            existing.wins += round(win_counts.get(name, 0) / num_sims)
            existing.podiums += round(podium_counts.get(name, 0) / num_sims)
            existing.through_round = max(existing.through_round, rw.round_number)
        else:
            db.add(ChampionshipStanding(
                season_id=season.id,
                standing_type="driver",
                entity_name=name,
                points=round(avg_points, 1),
                wins=round(win_counts.get(name, 0) / num_sims),
                podiums=round(podium_counts.get(name, 0) / num_sims),
                through_round=rw.round_number,
                is_predicted=True,
            ))

    # Constructor standings
    team_points: dict[str, float] = defaultdict(float)
    team_wins: dict[str, int] = defaultdict(int)
    team_podiums: dict[str, int] = defaultdict(int)

    for driver in DRIVERS_2026:
        name = driver["name"]
        team = driver["team"]
        team_points[team] += points_total.get(name, 0) / num_sims
        team_wins[team] += round(win_counts.get(name, 0) / num_sims)
        team_podiums[team] += round(podium_counts.get(name, 0) / num_sims)

    for team, pts in team_points.items():
        existing = db.execute(
            select(ChampionshipStanding).where(
                ChampionshipStanding.season_id == season.id,
                ChampionshipStanding.standing_type == "constructor",
                ChampionshipStanding.entity_name == team,
            )
        ).scalar_one_or_none()

        if existing:
            existing.points = round(existing.points + pts, 1)
            existing.wins += team_wins[team]
            existing.podiums += team_podiums[team]
            existing.through_round = max(existing.through_round, rw.round_number)
        else:
            db.add(ChampionshipStanding(
                season_id=season.id,
                standing_type="constructor",
                entity_name=team,
                points=round(pts, 1),
                wins=team_wins[team],
                podiums=team_podiums[team],
                through_round=rw.round_number,
                is_predicted=True,
            ))

    # Update race weekend status
    rw.status = "predicted"
    db.commit()
