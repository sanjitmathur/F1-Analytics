"""Lap time calculation model."""

from __future__ import annotations

import random

from .entities import Car, TireCompound, Track


def calculate_lap_time(
    car: Car,
    track: Track,
    traffic_penalty: float = 0.0,
    safety_car: bool = False,
    randomness: float = 0.3,
    weather: str = "dry",
    rain_intensity: float = 0.5,
    fuel_adjusted: float = 0.0,
) -> float:
    """Calculate lap time for a car on a given lap.

    lap_time = base + tire_degradation + tire_pace + driver_skill + traffic + noise + weather + fuel

    Weather effects:
    - dry: no change
    - wet: +8-15% lap time, dry tire compounds get massive penalty, randomness x2
    - mixed: variable effect based on rain_intensity
    """
    if safety_car:
        return track.base_lap_time * 1.4 + random.gauss(0, 0.05)

    base = track.base_lap_time
    tire_deg = car.tire.degradation_penalty
    tire_pace = car.tire.pace_offset
    driver_skill = car.driver.skill
    noise_scale = randomness

    # Weather effects
    weather_penalty = 0.0
    if weather == "wet":
        # Wet track: lap times increase 8-15% based on intensity
        wet_pct = 0.08 + 0.07 * rain_intensity
        weather_penalty = base * wet_pct
        noise_scale *= 2.0  # much more variance in wet

        # Dry tire compound penalty in wet conditions
        compound = car.tire.compound
        if compound in (TireCompound.SOFT, TireCompound.MEDIUM, TireCompound.HARD):
            weather_penalty += 5.0 + 5.0 * rain_intensity  # 5-10s penalty on dry tires

    elif weather == "mixed":
        # Mixed: partial wet effect
        mix_factor = rain_intensity * 0.6
        weather_penalty = base * (0.04 * mix_factor)
        noise_scale *= (1.0 + 0.5 * mix_factor)

        compound = car.tire.compound
        if compound in (TireCompound.SOFT, TireCompound.MEDIUM, TireCompound.HARD):
            weather_penalty += 2.0 * mix_factor

    noise = random.gauss(0, noise_scale)

    lap_time = (
        base + tire_deg + tire_pace + driver_skill
        + traffic_penalty + weather_penalty + fuel_adjusted + noise
    )
    return max(lap_time, base * 0.95)
