"""Qualifying simulation — Q1/Q2/Q3 knockout format."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from .entities import Car, Driver, Tire, TireCompound, Track
from .lap_model import calculate_lap_time


@dataclass
class QualifyingResult:
    driver_name: str
    team: str
    q1_time: float | None = None
    q2_time: float | None = None
    q3_time: float | None = None
    final_position: int = 0
    eliminated_in: str | None = None  # "Q1", "Q2", or None (made Q3)


@dataclass
class QualifyingState:
    results: list[QualifyingResult] = field(default_factory=list)


class QualifyingSession:
    """Simulate a full qualifying session (Q1 → Q2 → Q3)."""

    def __init__(
        self,
        track: Track,
        drivers: list[Driver],
        weather: str = "dry",
        rain_intensity: float = 0.5,
        seed: int | None = None,
    ):
        self.track = track
        self.drivers = drivers
        self.weather = weather
        self.rain_intensity = rain_intensity
        self.seed = seed

    def _push_lap(self, driver: Driver, compound: TireCompound) -> float:
        """Simulate a single qualifying push lap (low fuel, fresh tires)."""
        car = Car(driver=driver)
        car.tire = Tire(compound, age=0)
        lap_time = calculate_lap_time(
            car, self.track,
            traffic_penalty=0.0,
            safety_car=False,
            randomness=0.15,  # less random in quali (shorter session)
            weather=self.weather,
            rain_intensity=self.rain_intensity,
            fuel_adjusted=-0.5,  # lighter fuel load in qualifying
        )
        return lap_time

    def run(self) -> QualifyingState:
        if self.seed is not None:
            random.seed(self.seed)

        num_drivers = len(self.drivers)
        # Determine cut lines based on grid size
        if num_drivers >= 20:
            q1_cut = 5   # bottom 5 eliminated
            q2_cut = 5
        else:
            q1_cut = max(1, num_drivers // 4)
            q2_cut = max(1, (num_drivers - q1_cut) // 3)

        results_map: dict[str, QualifyingResult] = {}
        for d in self.drivers:
            results_map[d.name] = QualifyingResult(
                driver_name=d.name, team=d.team
            )

        # Choose compound based on weather
        if self.weather == "wet":
            quali_compound = TireCompound.WET
        elif self.weather == "mixed":
            quali_compound = TireCompound.INTERMEDIATE
        else:
            quali_compound = TireCompound.SOFT

        # Q1: All drivers, 2 push laps each
        q1_times: dict[str, float] = {}
        remaining = list(self.drivers)
        for driver in remaining:
            times = [self._push_lap(driver, quali_compound) for _ in range(2)]
            best = min(times)
            q1_times[driver.name] = best
            results_map[driver.name].q1_time = best

        # Sort by Q1 time, eliminate bottom q1_cut
        sorted_q1 = sorted(remaining, key=lambda d: q1_times[d.name])
        eliminated_q1 = sorted_q1[-q1_cut:]
        remaining = sorted_q1[:-q1_cut]

        for d in eliminated_q1:
            results_map[d.name].eliminated_in = "Q1"

        # Q2: Remaining drivers
        q2_times: dict[str, float] = {}
        for driver in remaining:
            times = [self._push_lap(driver, quali_compound) for _ in range(2)]
            best = min(times)
            q2_times[driver.name] = best
            results_map[driver.name].q2_time = best

        sorted_q2 = sorted(remaining, key=lambda d: q2_times[d.name])
        eliminated_q2 = sorted_q2[-q2_cut:]
        remaining = sorted_q2[:-q2_cut]

        for d in eliminated_q2:
            results_map[d.name].eliminated_in = "Q2"

        # Q3: Remaining drivers fight for pole
        q3_times: dict[str, float] = {}
        for driver in remaining:
            times = [self._push_lap(driver, quali_compound) for _ in range(2)]
            best = min(times)
            q3_times[driver.name] = best
            results_map[driver.name].q3_time = best

        # Assign final positions
        # Q3 drivers: sorted by Q3 time
        sorted_q3 = sorted(remaining, key=lambda d: q3_times[d.name])
        for i, d in enumerate(sorted_q3):
            results_map[d.name].final_position = i + 1

        # Q2 eliminated: sorted by Q2 time
        start_pos = len(sorted_q3) + 1
        sorted_q2_elim = sorted(eliminated_q2, key=lambda d: q2_times[d.name])
        for i, d in enumerate(sorted_q2_elim):
            results_map[d.name].final_position = start_pos + i

        # Q1 eliminated: sorted by Q1 time
        start_pos += len(sorted_q2_elim)
        sorted_q1_elim = sorted(eliminated_q1, key=lambda d: q1_times[d.name])
        for i, d in enumerate(sorted_q1_elim):
            results_map[d.name].final_position = start_pos + i

        state = QualifyingState()
        state.results = sorted(results_map.values(), key=lambda r: r.final_position)
        return state
