"""Pit stop execution and strategy evaluation."""

from __future__ import annotations

from .entities import Car, Tire, Track


def execute_pit_stop(car: Car, track: Track) -> float:
    """Execute a pit stop for a car. Returns extra time added.

    Checks car's strategy for the next planned stop and changes tire.
    """
    strategy = car.driver.strategy
    stops = strategy.pit_stops

    if car.pit_stops_done >= len(stops):
        # No more planned stops — shouldn't happen but handle gracefully
        return 0.0

    stop = stops[car.pit_stops_done]
    car.tire = Tire(stop.compound)
    car.pit_stops_done += 1
    car.is_pitting = True

    return track.pit_loss_time


def should_pit(car: Car, current_lap: int) -> bool:
    """Check if the car should pit this lap based on strategy."""
    strategy = car.driver.strategy
    if car.pit_stops_done >= len(strategy.pit_stops):
        return False

    next_stop = strategy.pit_stops[car.pit_stops_done]
    return current_lap == next_stop.lap


def evaluate_undercut(
    car: Car,
    rival: Car,
    track: Track,
    current_lap: int,
    remaining_laps: int,
) -> float:
    """Estimate time gained/lost by pitting one lap early (undercut).

    Returns positive value if undercut is beneficial.
    """
    # Current tire degradation difference
    current_deg = car.tire.degradation_penalty

    # On fresh tires, estimate gain over next 3 laps
    fresh_tire_advantage = current_deg * 3  # laps saved on degradation
    pit_cost = track.pit_loss_time

    return fresh_tire_advantage - pit_cost
