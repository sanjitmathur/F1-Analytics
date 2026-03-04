"""Safety car and random race events."""

from __future__ import annotations

import random

from .entities import Car, Track


def check_safety_car(track: Track) -> bool:
    """Determine if a safety car is deployed this lap."""
    return random.random() < track.safety_car_probability


def compress_field(cars: list[Car]) -> None:
    """Compress gaps between cars during safety car.

    Brings all cars to within ~1-2 seconds of the leader.
    """
    active = sorted(
        [c for c in cars if not c.is_dnf],
        key=lambda c: c.total_time,
    )

    if not active:
        return

    leader_time = active[0].total_time
    for i, car in enumerate(active):
        # Compress to ~0.5s gaps
        car.total_time = leader_time + i * 0.5
        car.gap_to_leader = car.total_time - leader_time


def check_dnf(car: Car) -> bool:
    """Check if a car retires from the race."""
    return random.random() < car.driver.dnf_chance_per_lap
