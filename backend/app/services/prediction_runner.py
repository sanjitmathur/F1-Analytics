"""Prediction runner — runs qualifying + race predictions for 2026 season races.

Follows the same pattern as simulation_runner.py: background thread, sync DB, progress updates.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy import select

from ..constants import DRIVERS_2026, POINTS_SYSTEM
from ..services.performance_calibrator import get_calibrated_drivers_2026
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

        # Use calibrated driver data (derived from real race results)
        calibrated_drivers = get_calibrated_drivers_2026()
        logger.info("Using calibrated skills: %s",
                     {d["name"]: d["skill"] for d in calibrated_drivers[:5]})

        if prediction.prediction_type == "qualifying":
            _run_qualifying_prediction(db, prediction, rw, track, weather, overrides, num_sims, calibrated_drivers)
        else:
            _run_race_prediction(db, prediction, rw, track, weather, overrides, num_sims, calibrated_drivers)

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
    driver_data: list[dict] | None = None,
) -> None:
    """Run N qualifying simulations, aggregate grid positions."""
    driver_constants = driver_data or DRIVERS_2026
    position_counts: dict[str, Counter] = defaultdict(Counter)
    q1_exits: Counter = Counter()
    q2_exits: Counter = Counter()

    for i in range(num_sims):
        drivers = build_drivers(
            driver_constants, rw.track_name, weather, rw.total_laps,
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
    for driver in driver_constants:
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
    driver_data: list[dict] | None = None,
) -> None:
    """Run N race simulations, aggregate positions and stats."""
    driver_constants = driver_data or DRIVERS_2026
    position_counts: dict[str, Counter] = defaultdict(Counter)
    win_counts: Counter = Counter()
    podium_counts: Counter = Counter()
    top5_counts: Counter = Counter()
    top10_counts: Counter = Counter()
    dnf_counts: Counter = Counter()
    points_total: dict[str, float] = defaultdict(float)

    # First run a quick qualifying to get grid order
    quali_drivers = build_drivers(
        driver_constants, rw.track_name, weather, rw.total_laps,
        overrides=overrides.get("drivers"),
    )
    quali = QualifyingSession(track, quali_drivers, weather=weather)
    quali_state = quali.run()
    grid_order = {r.driver_name: r.final_position for r in quali_state.results}

    for i in range(num_sims):
        drivers = build_drivers(
            driver_constants, rw.track_name, weather, rw.total_laps,
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
    for driver in driver_constants:
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
    """Update race weekend status, then rebuild all standings from scratch."""
    rw.status = "predicted"
    db.commit()

    rebuild_championship_standings(db, rw.season_id)


def rebuild_championship_standings(db, season_id: int) -> None:
    """Rebuild all championship standings from completed race predictions.

    This is called after every prediction run and after deletions to ensure
    standings are always consistent with the current set of predictions.
    """
    from sqlalchemy import delete as sa_delete

    season = db.execute(
        select(Season).where(Season.id == season_id)
    ).scalar_one_or_none()
    if not season:
        return

    # Wipe existing PREDICTED standings for this season (preserve real standings)
    db.execute(
        sa_delete(ChampionshipStanding).where(
            ChampionshipStanding.season_id == season_id,
            ChampionshipStanding.is_predicted == True,  # noqa: E712
        )
    )

    # Find all completed race predictions for this season
    race_weekends = db.execute(
        select(RaceWeekend).where(RaceWeekend.season_id == season_id)
    ).scalars().all()

    # Accumulators
    driver_points: dict[str, float] = defaultdict(float)
    driver_wins: dict[str, int] = defaultdict(int)
    driver_podiums: dict[str, int] = defaultdict(int)
    max_round = 0

    for rw_item in race_weekends:
        # Get the latest completed race prediction for this weekend
        race_pred = db.execute(
            select(RacePrediction).where(
                RacePrediction.race_weekend_id == rw_item.id,
                RacePrediction.prediction_type == "race",
                RacePrediction.status == "completed",
            ).order_by(RacePrediction.created_at.desc()).limit(1)
        ).scalar_one_or_none()

        if not race_pred:
            continue

        max_round = max(max_round, rw_item.round_number)

        # Get results for this prediction
        results = db.execute(
            select(PredictionResult).where(
                PredictionResult.prediction_id == race_pred.id
            )
        ).scalars().all()

        for r in results:
            # Calculate average points from position distribution
            avg_pts = 0.0
            if r.position_distribution:
                for pos_str, pct in r.position_distribution.items():
                    pos = int(pos_str)
                    avg_pts += POINTS_SYSTEM.get(pos, 0) * (pct / 100)

            driver_points[r.driver_name] += avg_pts
            # Accumulate fractional wins/podiums (round only at display time)
            driver_wins[r.driver_name] += r.win_pct / 100
            driver_podiums[r.driver_name] += r.podium_pct / 100

    if max_round == 0:
        db.commit()
        return

    # Build driver-to-team mapping
    driver_team = {d["name"]: d["team"] for d in DRIVERS_2026}

    # Create driver standings
    for driver in DRIVERS_2026:
        name = driver["name"]
        if driver_points.get(name, 0) > 0 or name in driver_points:
            db.add(ChampionshipStanding(
                season_id=season_id,
                standing_type="driver",
                entity_name=name,
                points=round(driver_points.get(name, 0), 1),
                wins=round(driver_wins.get(name, 0)),
                podiums=round(driver_podiums.get(name, 0)),
                through_round=max_round,
                is_predicted=True,
            ))

    # Constructor standings
    team_points: dict[str, float] = defaultdict(float)
    team_wins: dict[str, int] = defaultdict(int)
    team_podiums: dict[str, int] = defaultdict(int)

    for name, team in driver_team.items():
        team_points[team] += driver_points.get(name, 0)
        team_wins[team] += driver_wins.get(name, 0)
        team_podiums[team] += driver_podiums.get(name, 0)

    for team, pts in team_points.items():
        db.add(ChampionshipStanding(
            season_id=season_id,
            standing_type="constructor",
            entity_name=team,
            points=round(pts, 1),
            wins=round(team_wins[team]),
            podiums=round(team_podiums[team]),
            through_round=max_round,
            is_predicted=True,
        ))

    db.commit()
