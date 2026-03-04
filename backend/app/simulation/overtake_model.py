"""Probabilistic overtaking model."""

from __future__ import annotations

import random

from .entities import Car, Track


def overtake_probability(gap: float, track: Track) -> float:
    """Calculate probability of an overtake given the gap (seconds).

    Uses a sigmoid-like curve:
    - gap <= 0.2s: 80%
    - gap ~0.3s: 70%
    - gap ~0.5s: 55%
    - gap ~0.8s: 30%
    - gap >= 1.0s: 15%
    - gap > 1.5s: ~0%

    Adjusted by track overtake difficulty and DRS zones.
    """
    if gap <= 0:
        return 0.0
    if gap > 2.0:
        return 0.0

    # Base probability curve
    base_prob = max(0.0, 0.85 - 0.7 * gap)

    # DRS bonus: each zone adds ~10% effectiveness
    drs_factor = 1.0 + (track.drs_zones - 1) * 0.1

    # Track difficulty adjustment
    prob = base_prob * drs_factor / track.overtake_difficulty

    return min(prob, 0.95)


def attempt_overtakes(cars: list[Car], track: Track) -> list[tuple[str, str]]:
    """Attempt overtakes between adjacent cars. Returns list of (overtaker, overtaken)."""
    overtakes: list[tuple[str, str]] = []

    # Sort by position
    sorted_cars = sorted(
        [c for c in cars if not c.is_dnf],
        key=lambda c: c.position,
    )

    for i in range(1, len(sorted_cars)):
        behind = sorted_cars[i]
        ahead = sorted_cars[i - 1]

        # Gap is based on cumulative time difference
        gap = behind.total_time - ahead.total_time

        if gap <= 0:
            # Already faster overall, swap positions
            behind.position, ahead.position = ahead.position, behind.position
            overtakes.append((behind.driver.name, ahead.driver.name))
            continue

        prob = overtake_probability(gap, track)
        if prob > 0 and random.random() < prob:
            behind.position, ahead.position = ahead.position, behind.position
            overtakes.append((behind.driver.name, ahead.driver.name))

    return overtakes
