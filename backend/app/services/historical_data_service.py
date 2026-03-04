"""Historical data service — builds driver performance profiles from FastF1 data."""

from __future__ import annotations

import logging

from ..constants import DRIVERS_2026

logger = logging.getLogger(__name__)

# Hardcoded performance adjustments for rookies/drivers without F1 historical data
_ROOKIE_DEFAULTS = {
    "Isack Hadjar", "Andrea Kimi Antonelli", "Jack Doohan",
    "Arvid Lindblad", "Gabriel Bortoleto", "Oliver Bearman",
}


def build_driver_performance_profile(
    driver_name: str,
    track_name: str,
) -> dict:
    """Build a performance profile for a driver at a specific track.

    Returns dict with: avg_qualifying_delta, avg_race_pace_delta,
    avg_tire_degradation, wet_performance_delta, consistency_score
    """
    if driver_name in _ROOKIE_DEFAULTS:
        return _rookie_profile(driver_name)

    # For established drivers, return neutral profile
    # (to be enhanced with actual FastF1 data when available)
    return {
        "avg_qualifying_delta": 0.0,
        "avg_race_pace_delta": 0.0,
        "avg_tire_degradation": 0.0,
        "wet_performance_delta": 0.0,
        "consistency_score": 0.5,
    }


def _rookie_profile(driver_name: str) -> dict:
    """Rookies get slightly worse consistency, no track-specific data."""
    return {
        "avg_qualifying_delta": 0.1,
        "avg_race_pace_delta": 0.05,
        "avg_tire_degradation": 0.01,
        "wet_performance_delta": 0.1,
        "consistency_score": 0.35,
    }


def build_all_driver_profiles(track_name: str) -> dict[str, dict]:
    """Build performance profiles for all 2026 drivers at a given track."""
    profiles = {}
    for driver in DRIVERS_2026:
        profiles[driver["name"]] = build_driver_performance_profile(
            driver["name"], track_name
        )
    return profiles
