"""Auto-generate plausible pit strategies based on track characteristics."""

from __future__ import annotations

import random
from dataclasses import dataclass

from .entities import PitStopPlan, Strategy, TireCompound


@dataclass
class StrategyOption:
    name: str
    starting_compound: TireCompound
    pit_stops: list[PitStopPlan]
    weight: float = 1.0  # selection probability weight


def generate_strategies(
    total_laps: int,
    weather: str = "dry",
) -> list[StrategyOption]:
    """Generate plausible pit strategies for a given race distance and weather."""

    if weather == "wet":
        return _wet_strategies(total_laps)
    if weather == "mixed":
        return _mixed_strategies(total_laps)
    return _dry_strategies(total_laps)


def _dry_strategies(total_laps: int) -> list[StrategyOption]:
    """Standard dry race strategies."""
    strategies = []

    # 1-stop: MEDIUM → HARD (most common, highest weight)
    stop1 = round(total_laps * 0.55)
    strategies.append(StrategyOption(
        name="1-stop M→H",
        starting_compound=TireCompound.MEDIUM,
        pit_stops=[PitStopPlan(lap=stop1, compound=TireCompound.HARD)],
        weight=3.0,
    ))

    # 1-stop: HARD → MEDIUM (undercut alternative)
    stop1_alt = round(total_laps * 0.6)
    strategies.append(StrategyOption(
        name="1-stop H→M",
        starting_compound=TireCompound.HARD,
        pit_stops=[PitStopPlan(lap=stop1_alt, compound=TireCompound.MEDIUM)],
        weight=1.5,
    ))

    # 2-stop: SOFT → MEDIUM → HARD
    stop2a = round(total_laps * 0.28)
    stop2b = round(total_laps * 0.58)
    strategies.append(StrategyOption(
        name="2-stop S→M→H",
        starting_compound=TireCompound.SOFT,
        pit_stops=[
            PitStopPlan(lap=stop2a, compound=TireCompound.MEDIUM),
            PitStopPlan(lap=stop2b, compound=TireCompound.HARD),
        ],
        weight=2.0,
    ))

    # Aggressive 2-stop: SOFT → SOFT → MEDIUM
    stop3a = round(total_laps * 0.25)
    stop3b = round(total_laps * 0.50)
    strategies.append(StrategyOption(
        name="Aggressive S→S→M",
        starting_compound=TireCompound.SOFT,
        pit_stops=[
            PitStopPlan(lap=stop3a, compound=TireCompound.SOFT),
            PitStopPlan(lap=stop3b, compound=TireCompound.MEDIUM),
        ],
        weight=1.0,
    ))

    return strategies


def _wet_strategies(total_laps: int) -> list[StrategyOption]:
    """Wet race strategies."""
    strategies = []

    # Full wet
    strategies.append(StrategyOption(
        name="Full WET",
        starting_compound=TireCompound.WET,
        pit_stops=[PitStopPlan(lap=round(total_laps * 0.5), compound=TireCompound.WET)],
        weight=2.0,
    ))

    # WET → INTER (rain easing)
    strategies.append(StrategyOption(
        name="WET→INTER",
        starting_compound=TireCompound.WET,
        pit_stops=[PitStopPlan(lap=round(total_laps * 0.45), compound=TireCompound.INTERMEDIATE)],
        weight=2.5,
    ))

    # INTER only (light rain)
    strategies.append(StrategyOption(
        name="INTER→INTER",
        starting_compound=TireCompound.INTERMEDIATE,
        pit_stops=[PitStopPlan(lap=round(total_laps * 0.5), compound=TireCompound.INTERMEDIATE)],
        weight=1.5,
    ))

    return strategies


def _mixed_strategies(total_laps: int) -> list[StrategyOption]:
    """Mixed conditions (rain starts or stops mid-race)."""
    strategies = []

    # Start dry, switch to INTER
    strategies.append(StrategyOption(
        name="DRY→INTER",
        starting_compound=TireCompound.MEDIUM,
        pit_stops=[PitStopPlan(lap=round(total_laps * 0.4), compound=TireCompound.INTERMEDIATE)],
        weight=2.0,
    ))

    # Start INTER, switch to dry
    strategies.append(StrategyOption(
        name="INTER→DRY",
        starting_compound=TireCompound.INTERMEDIATE,
        pit_stops=[PitStopPlan(lap=round(total_laps * 0.45), compound=TireCompound.MEDIUM)],
        weight=2.0,
    ))

    # 2-stop: INTER → MEDIUM → HARD
    strategies.append(StrategyOption(
        name="INTER→M→H",
        starting_compound=TireCompound.INTERMEDIATE,
        pit_stops=[
            PitStopPlan(lap=round(total_laps * 0.3), compound=TireCompound.MEDIUM),
            PitStopPlan(lap=round(total_laps * 0.6), compound=TireCompound.HARD),
        ],
        weight=1.5,
    ))

    return strategies


def pick_random_strategy(
    total_laps: int,
    weather: str = "dry",
) -> Strategy:
    """Pick a weighted-random strategy for a driver."""
    options = generate_strategies(total_laps, weather)
    weights = [o.weight for o in options]
    chosen = random.choices(options, weights=weights, k=1)[0]

    # Add small random variance to pit stop laps (±2 laps)
    varied_stops = []
    for stop in chosen.pit_stops:
        varied_lap = max(1, stop.lap + random.randint(-2, 2))
        varied_stops.append(PitStopPlan(lap=varied_lap, compound=stop.compound))

    return Strategy(
        starting_compound=chosen.starting_compound,
        pit_stops=varied_stops,
    )
