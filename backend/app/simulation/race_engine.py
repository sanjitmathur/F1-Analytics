"""Main race simulation engine."""

from __future__ import annotations

import random
from dataclasses import dataclass, field

from .entities import Car, Driver, LapRecord, RaceResult, Track
from .lap_model import calculate_lap_time
from .overtake_model import attempt_overtakes
from .pit_strategy import execute_pit_stop, should_pit
from .safety_car import check_dnf, check_safety_car, compress_field


@dataclass
class RaceState:
    """Full state of a completed race."""
    results: list[RaceResult] = field(default_factory=list)
    lap_records: list[LapRecord] = field(default_factory=list)
    safety_car_laps: list[int] = field(default_factory=list)
    total_overtakes: int = 0


class Race:
    """Simulate a full F1 race lap by lap."""

    def __init__(
        self,
        track: Track,
        drivers: list[Driver],
        seed: int | None = None,
        weather: str = "dry",
        rain_intensity: float = 0.5,
    ):
        self.track = track
        self.drivers = drivers
        self.seed = seed
        self.weather = weather
        self.rain_intensity = rain_intensity
        self.cars: list[Car] = []

    def _init_cars(self) -> None:
        """Set up Car objects for each driver."""
        self.cars = []
        for driver in self.drivers:
            car = Car(driver=driver)
            car.reset()
            self.cars.append(car)

    def run(self) -> RaceState:
        """Execute the full race and return results."""
        if self.seed is not None:
            random.seed(self.seed)

        self._init_cars()
        state = RaceState()

        safety_car_active = False
        sc_laps_remaining = 0

        # Adjust SC probability for wet conditions
        effective_track = self.track
        if self.weather == "wet":
            from copy import copy
            effective_track = copy(self.track)
            effective_track.safety_car_probability = min(
                0.15, self.track.safety_car_probability * 3
            )
        elif self.weather == "mixed":
            from copy import copy
            effective_track = copy(self.track)
            effective_track.safety_car_probability = min(
                0.10, self.track.safety_car_probability * 2
            )

        for lap in range(1, self.track.total_laps + 1):
            # Check for safety car deployment
            if not safety_car_active and check_safety_car(effective_track):
                safety_car_active = True
                sc_laps_remaining = random.randint(2, 5)
                compress_field(self.cars)

            if safety_car_active:
                state.safety_car_laps.append(lap)
                sc_laps_remaining -= 1
                if sc_laps_remaining <= 0:
                    safety_car_active = False

            # Process each car
            for car in self.cars:
                if car.is_dnf:
                    continue

                # Check DNF
                if check_dnf(car):
                    car.is_dnf = True
                    car.laps_completed = lap - 1
                    continue

                # Check pit stop
                is_pit_lap = False
                if should_pit(car, lap):
                    pit_time = execute_pit_stop(car, self.track)
                    car.total_time += pit_time
                    is_pit_lap = True

                # Calculate traffic penalty (cars close ahead)
                traffic = self._calculate_traffic(car)

                # Calculate lap time
                lap_time = calculate_lap_time(
                    car, self.track,
                    traffic_penalty=traffic,
                    safety_car=safety_car_active,
                    weather=self.weather,
                    rain_intensity=self.rain_intensity,
                )

                car.total_time += lap_time
                car.lap_times.append(lap_time)
                car.tire.wear_one_lap()
                car.laps_completed = lap
                car.is_pitting = False

                # Record lap data
                state.lap_records.append(LapRecord(
                    lap=lap,
                    driver_name=car.driver.name,
                    position=car.position,
                    lap_time=lap_time,
                    total_time=car.total_time,
                    tire_compound=car.tire.compound.value,
                    tire_age=car.tire.age,
                    gap_to_leader=0.0,  # Updated after sorting
                    is_pit_lap=is_pit_lap,
                    is_safety_car=safety_car_active,
                ))

            # Update positions based on total time
            self._update_positions()

            # Attempt overtakes (only when not under safety car)
            if not safety_car_active:
                overtakes = attempt_overtakes(self.cars, self.track)
                state.total_overtakes += len(overtakes)

            # Record positions for this lap
            for car in self.cars:
                if not car.is_dnf:
                    car.positions_per_lap.append(car.position)

            # Update gap_to_leader in lap records for this lap
            leader_time = min(
                (c.total_time for c in self.cars if not c.is_dnf),
                default=0.0,
            )
            for record in state.lap_records:
                if record.lap == lap:
                    car_obj = next(
                        (c for c in self.cars if c.driver.name == record.driver_name),
                        None,
                    )
                    if car_obj and not car_obj.is_dnf:
                        record.gap_to_leader = car_obj.total_time - leader_time
                        record.position = car_obj.position

        # Build final results
        state.results = self._build_results()
        return state

    def _calculate_traffic(self, car: Car) -> float:
        """Calculate dirty air / traffic penalty."""
        traffic = 0.0
        for other in self.cars:
            if other is car or other.is_dnf:
                continue
            gap = abs(car.total_time - other.total_time)
            if gap < 1.5 and other.position < car.position:
                traffic += max(0, 0.3 - gap * 0.2)
        return traffic

    def _update_positions(self) -> None:
        """Sort cars by total time and assign positions."""
        active = [c for c in self.cars if not c.is_dnf]
        active.sort(key=lambda c: c.total_time)
        for i, car in enumerate(active):
            car.position = i + 1
            car.gap_to_leader = car.total_time - active[0].total_time

        # DNF cars get positions after active cars
        dnf_cars = [c for c in self.cars if c.is_dnf]
        for i, car in enumerate(dnf_cars):
            car.position = len(active) + i + 1

    def _build_results(self) -> list[RaceResult]:
        """Build sorted race results."""
        results = []
        for car in self.cars:
            best_lap = min(car.lap_times) if car.lap_times else None
            results.append(RaceResult(
                position=car.position,
                driver_name=car.driver.name,
                team=car.driver.team,
                total_time=car.total_time,
                gap_to_leader=car.gap_to_leader,
                laps_completed=car.laps_completed,
                pit_stops=car.pit_stops_done,
                is_dnf=car.is_dnf,
                best_lap_time=best_lap,
                positions_gained=car.driver.grid_position - car.position,
            ))
        results.sort(key=lambda r: r.position)
        return results
