"""Build simulation parameters from base presets + cached data + user overrides."""

from __future__ import annotations

from .entities import Driver, Track
from .strategy_generator import pick_random_strategy


def build_track(race_weekend_row) -> Track:
    """Build a simulation Track from a RaceWeekend DB row."""
    return Track(
        name=race_weekend_row.track_name,
        country=race_weekend_row.country,
        total_laps=race_weekend_row.total_laps,
        base_lap_time=race_weekend_row.base_lap_time,
        pit_loss_time=race_weekend_row.pit_loss_time,
        drs_zones=race_weekend_row.drs_zones,
        overtake_difficulty=race_weekend_row.overtake_difficulty,
        safety_car_probability=race_weekend_row.safety_car_probability,
    )


def build_drivers(
    driver_constants: list[dict],
    track_name: str,
    weather: str = "dry",
    total_laps: int = 50,
    performance_cache: dict | None = None,
    overrides: dict | None = None,
    grid_positions: dict[str, int] | None = None,
) -> list[Driver]:
    """Build Driver list from constants + cached performance + overrides.

    Args:
        driver_constants: DRIVERS_2026 list from constants
        track_name: current track for cache lookup
        weather: dry/wet/mixed
        total_laps: for strategy generation
        performance_cache: {driver_name: DriverPerformanceCache row}
        overrides: {driver_name: {skill: float, ...}}
        grid_positions: {driver_name: int} from qualifying results
    """
    drivers = []
    cache = performance_cache or {}
    override_map = overrides or {}
    grid = grid_positions or {}

    for i, d in enumerate(driver_constants):
        name = d["name"]
        skill = d["skill"]

        # Adjust by track-specific performance from cache
        if name in cache:
            perf = cache[name]
            skill += perf.get("avg_race_pace_delta", 0.0)
            if weather == "wet":
                skill += perf.get("wet_performance_delta", 0.0)

        # Apply user overrides
        if name in override_map:
            skill = override_map[name].get("skill", skill)

        # Grid position: from qualifying, overrides, or default order
        position = grid.get(name, i + 1)

        # Auto-generate strategy
        strategy = pick_random_strategy(total_laps, weather)

        drivers.append(Driver(
            name=name,
            team=d["team"],
            skill=skill,
            grid_position=position,
            strategy=strategy,
            dnf_chance_per_lap=0.001,
        ))

    return drivers
