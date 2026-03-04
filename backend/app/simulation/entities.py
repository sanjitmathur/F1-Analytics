"""Core data classes for the F1 simulation."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TireCompound(str, Enum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTER"
    WET = "WET"


# Degradation rate per lap (seconds added per lap of tire age)
TIRE_DEGRADATION: dict[TireCompound, float] = {
    TireCompound.SOFT: 0.08,
    TireCompound.MEDIUM: 0.05,
    TireCompound.HARD: 0.03,
    TireCompound.INTERMEDIATE: 0.06,
    TireCompound.WET: 0.07,
}

# Base pace advantage relative to MEDIUM (negative = faster)
TIRE_PACE_OFFSET: dict[TireCompound, float] = {
    TireCompound.SOFT: -0.6,
    TireCompound.MEDIUM: 0.0,
    TireCompound.HARD: 0.4,
    TireCompound.INTERMEDIATE: 1.5,
    TireCompound.WET: 3.0,
}


@dataclass
class Tire:
    compound: TireCompound
    age: int = 0  # laps since fitted

    @property
    def degradation_penalty(self) -> float:
        """Time penalty from tire wear."""
        return self.age * TIRE_DEGRADATION[self.compound]

    @property
    def pace_offset(self) -> float:
        """Inherent pace offset of compound."""
        return TIRE_PACE_OFFSET[self.compound]

    def wear_one_lap(self) -> None:
        self.age += 1


@dataclass
class PitStopPlan:
    """A single planned pit stop: which lap and what tire to switch to."""
    lap: int
    compound: TireCompound


@dataclass
class Strategy:
    """Full race strategy: starting tire + list of planned stops."""
    starting_compound: TireCompound
    pit_stops: list[PitStopPlan] = field(default_factory=list)

    @property
    def num_stops(self) -> int:
        return len(self.pit_stops)


@dataclass
class Driver:
    name: str
    team: str
    skill: float = 0.0  # seconds per lap delta (negative = faster)
    grid_position: int = 1
    strategy: Strategy = field(default_factory=lambda: Strategy(TireCompound.MEDIUM))
    dnf_chance_per_lap: float = 0.001  # ~0.1% per lap


@dataclass
class Car:
    """Runtime state for a driver during a race."""
    driver: Driver
    tire: Tire = field(default_factory=lambda: Tire(TireCompound.MEDIUM))
    position: int = 1
    total_time: float = 0.0
    gap_to_leader: float = 0.0
    laps_completed: int = 0
    is_pitting: bool = False
    is_dnf: bool = False
    lap_times: list[float] = field(default_factory=list)
    pit_stops_done: int = 0
    positions_per_lap: list[int] = field(default_factory=list)

    def reset(self) -> None:
        self.tire = Tire(self.driver.strategy.starting_compound)
        self.position = self.driver.grid_position
        self.total_time = 0.0
        self.gap_to_leader = 0.0
        self.laps_completed = 0
        self.is_pitting = False
        self.is_dnf = False
        self.lap_times.clear()
        self.pit_stops_done = 0
        self.positions_per_lap.clear()


@dataclass
class Track:
    name: str
    country: str
    total_laps: int
    base_lap_time: float  # seconds (e.g., 90.0 for ~1:30)
    pit_loss_time: float = 22.0  # time lost entering/exiting pits
    drs_zones: int = 1
    overtake_difficulty: float = 1.0  # multiplier: <1 easier, >1 harder
    safety_car_probability: float = 0.03  # per lap


@dataclass
class LapRecord:
    """Record of a single lap for a driver."""
    lap: int
    driver_name: str
    position: int
    lap_time: float
    total_time: float
    tire_compound: str
    tire_age: int
    gap_to_leader: float
    is_pit_lap: bool = False
    is_safety_car: bool = False


@dataclass
class RaceResult:
    """Final result for one driver."""
    position: int
    driver_name: str
    team: str
    total_time: float
    gap_to_leader: float
    laps_completed: int
    pit_stops: int
    is_dnf: bool = False
    best_lap_time: Optional[float] = None
    positions_gained: int = 0
