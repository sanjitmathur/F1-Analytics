"""Background simulation runner using sync DB engine."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select

from ..database import get_sync_db
from ..models import LapData, MonteCarloData, SimulationResult, SimulationRun, Track
from ..simulation.entities import (
    Driver,
    PitStopPlan,
    Strategy,
    TireCompound,
)
from ..simulation.entities import Track as SimTrack
from ..simulation.monte_carlo import MonteCarloSimulator
from ..simulation.race_engine import Race

logger = logging.getLogger(__name__)


def _build_drivers(driver_configs: list[dict]) -> list[Driver]:
    """Convert JSON driver configs to simulation Driver objects."""
    drivers = []
    for cfg in driver_configs:
        pit_stops = []
        for ps in cfg.get("pit_stops", []):
            pit_stops.append(PitStopPlan(
                lap=ps["lap"],
                compound=TireCompound(ps["compound"]),
            ))

        strategy = Strategy(
            starting_compound=TireCompound(cfg.get("starting_compound", "MEDIUM")),
            pit_stops=pit_stops,
        )

        drivers.append(Driver(
            name=cfg["name"],
            team=cfg["team"],
            skill=cfg.get("skill", 0.0),
            grid_position=cfg.get("grid_position", 1),
            strategy=strategy,
            dnf_chance_per_lap=cfg.get("dnf_chance_per_lap", 0.001),
        ))
    return drivers


def _build_track(track_row: Track) -> SimTrack:
    """Convert DB Track to simulation Track."""
    return SimTrack(
        name=track_row.name,
        country=track_row.country,
        total_laps=track_row.total_laps,
        base_lap_time=track_row.base_lap_time,
        pit_loss_time=track_row.pit_loss_time or 22.0,
        drs_zones=track_row.drs_zones or 1,
        overtake_difficulty=track_row.overtake_difficulty or 1.0,
        safety_car_probability=track_row.safety_car_probability or 0.03,
    )


def run_simulation_background(run_id: int) -> None:
    """Execute simulation in a background thread."""
    db = get_sync_db()
    try:
        run = db.execute(
            select(SimulationRun).where(SimulationRun.id == run_id)
        ).scalar_one_or_none()

        if not run:
            logger.error(f"Simulation run {run_id} not found")
            return

        run.status = "running"
        db.commit()

        # Load track
        track_row = db.execute(
            select(Track).where(Track.id == run.track_id)
        ).scalar_one_or_none()

        if not track_row:
            run.status = "failed"
            run.error_message = "Track not found"
            db.commit()
            return

        sim_track = _build_track(track_row)

        # Extract weather and drivers from config
        config = run.driver_config
        if isinstance(config, dict) and "drivers" in config:
            driver_configs = config["drivers"]
            weather = config.get("weather", "dry")
            rain_intensity = config.get("rain_intensity", 0.5)
        else:
            driver_configs = config if isinstance(config, list) else []
            weather = "dry"
            rain_intensity = 0.5

        drivers = _build_drivers(driver_configs)

        if run.sim_type == "monte_carlo" and run.num_simulations > 1:
            _run_monte_carlo(db, run, sim_track, drivers, weather, rain_intensity)
        else:
            _run_single(db, run, sim_track, drivers, weather, rain_intensity)

    except Exception as e:
        logger.exception(f"Simulation {run_id} failed: {e}")
        try:
            run.status = "failed"
            run.error_message = str(e)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _run_single(
    db, run: SimulationRun, track: SimTrack, drivers: list[Driver],
    weather: str = "dry", rain_intensity: float = 0.5,
) -> None:
    """Run a single race simulation."""
    race = Race(track, drivers, weather=weather, rain_intensity=rain_intensity)
    state = race.run()

    # Store results
    for result in state.results:
        db.add(SimulationResult(
            run_id=run.id,
            position=result.position,
            driver_name=result.driver_name,
            team=result.team,
            total_time=result.total_time,
            gap_to_leader=result.gap_to_leader,
            laps_completed=result.laps_completed,
            pit_stops=result.pit_stops,
            is_dnf=result.is_dnf,
            best_lap_time=result.best_lap_time,
            positions_gained=result.positions_gained,
        ))

    # Store lap data
    for lap_rec in state.lap_records:
        db.add(LapData(
            run_id=run.id,
            lap=lap_rec.lap,
            driver_name=lap_rec.driver_name,
            position=lap_rec.position,
            lap_time=lap_rec.lap_time,
            total_time=lap_rec.total_time,
            tire_compound=lap_rec.tire_compound,
            tire_age=lap_rec.tire_age,
            gap_to_leader=lap_rec.gap_to_leader,
            is_pit_lap=lap_rec.is_pit_lap,
            is_safety_car=lap_rec.is_safety_car,
        ))

    run.status = "completed"
    run.completed_simulations = 1
    run.completed_at = datetime.utcnow()
    db.commit()


def _run_monte_carlo(
    db, run: SimulationRun, track: SimTrack, drivers: list[Driver],
    weather: str = "dry", rain_intensity: float = 0.5,
) -> None:
    """Run Monte Carlo simulations."""

    def progress_callback(completed: int, total: int) -> None:
        # Update progress periodically
        if completed % max(1, total // 20) == 0:
            run.completed_simulations = completed
            db.commit()

    mc = MonteCarloSimulator(
        track, drivers, run.num_simulations,
        weather=weather, rain_intensity=rain_intensity,
    )
    mc_result = mc.run(progress_callback=progress_callback)

    # Store MC probabilities
    for dp in mc_result.driver_probabilities:
        # Convert position_distribution keys to strings for JSON
        pos_dist = {str(k): v for k, v in dp.position_distribution.items()}
        db.add(MonteCarloData(
            run_id=run.id,
            driver_name=dp.driver_name,
            team=dp.team,
            win_pct=dp.win_pct,
            podium_pct=dp.podium_pct,
            top5_pct=dp.top5_pct,
            top10_pct=dp.top10_pct,
            dnf_pct=dp.dnf_pct,
            avg_position=dp.avg_position,
            avg_gap=dp.avg_gap,
            best_position=dp.best_position,
            worst_position=dp.worst_position,
            position_distribution=pos_dist,
        ))

    # Also store the last single-race result for display
    if mc.results:
        last_state = mc.results[-1]
        for result in last_state.results:
            db.add(SimulationResult(
                run_id=run.id,
                position=result.position,
                driver_name=result.driver_name,
                team=result.team,
                total_time=result.total_time,
                gap_to_leader=result.gap_to_leader,
                laps_completed=result.laps_completed,
                pit_stops=result.pit_stops,
                is_dnf=result.is_dnf,
                best_lap_time=result.best_lap_time,
                positions_gained=result.positions_gained,
            ))

    run.status = "completed"
    run.completed_simulations = run.num_simulations
    run.completed_at = datetime.utcnow()
    db.commit()
