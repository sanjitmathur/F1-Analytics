"""Performance calibrator — derives team/driver pace from real 2026 race results.

After each completed race, this recalculates:
  1. Team pace delta (seconds per lap, car performance)
  2. Driver skill delta (individual ability vs teammate)

These replace the static DRIVERS_2026 skill ratings for predictions.
"""

import logging
from collections import defaultdict

from ..constants import DRIVERS_2026, REAL_RESULTS_2026

logger = logging.getLogger(__name__)

# Approximate pace delta per finishing position (seconds per lap slower than P1).
# Derived from typical F1 gaps: ~0.15s/pos at front, widening toward back.
_POSITION_TO_PACE: dict[int, float] = {
    1: 0.00, 2: 0.15, 3: 0.28, 4: 0.40, 5: 0.52,
    6: 0.63, 7: 0.75, 8: 0.87, 9: 0.98, 10: 1.08,
    11: 1.20, 12: 1.32, 13: 1.44, 14: 1.56, 15: 1.68,
    16: 1.82, 17: 1.96, 18: 2.12, 19: 2.30, 20: 2.50,
    21: 2.70, 22: 2.90,
}

# How much to trust real data vs priors (0 = full prior, 1 = full data).
# For 2026 with completely new regs, real data is very valuable.
_PRIOR_WEIGHT_PER_RACE = 0.15  # after N races, prior weight = _PRIOR_WEIGHT_PER_RACE ^ N


def _position_to_pace(pos: int) -> float:
    """Convert finishing position to pace delta (seconds/lap slower than P1)."""
    if pos in _POSITION_TO_PACE:
        return _POSITION_TO_PACE[pos]
    # Extrapolate for positions beyond 22
    return 2.50 + (pos - 20) * 0.20


def get_calibrated_performance() -> dict[str, dict]:
    """Analyze all real 2026 results and return calibrated performance.

    Returns:
        {driver_name: {"team_pace": float, "driver_delta": float, "effective_skill": float}}
        effective_skill = team_pace + driver_delta (negative = faster, like DRIVERS_2026)
    """
    if not REAL_RESULTS_2026:
        # No real data yet — fall back to original skills
        return {d["name"]: {"team_pace": 0.0, "driver_delta": d["skill"],
                            "effective_skill": d["skill"]} for d in DRIVERS_2026}

    num_races = len(REAL_RESULTS_2026)

    # Step 1: Collect pace estimates per driver per race
    # driver -> list of pace values across races
    driver_paces: dict[str, list[float]] = defaultdict(list)
    driver_teams: dict[str, str] = {}

    for round_num in sorted(REAL_RESULTS_2026.keys()):
        results = REAL_RESULTS_2026[round_num]

        for entry in results:
            driver = entry["driver"]
            team = entry["team"]
            status = entry["status"]
            pos = entry["position"]

            driver_teams[driver] = team

            if status == "dns":
                continue  # No data at all

            if status == "dnf":
                # DNF: use position but add uncertainty penalty
                # A DNF driver may have been fast, so give partial credit
                pace = _position_to_pace(min(pos, 15)) * 0.7 + 0.5
            else:
                pace = _position_to_pace(pos)

            driver_paces[driver].append(pace)

    # Step 2: Compute average pace per driver
    driver_avg_pace: dict[str, float] = {}
    for driver, paces in driver_paces.items():
        if paces:
            driver_avg_pace[driver] = sum(paces) / len(paces)

    # Step 3: Compute team pace = average of both teammates
    team_drivers: dict[str, list[str]] = defaultdict(list)
    for d in DRIVERS_2026:
        team_drivers[d["team"]].append(d["name"])

    team_pace: dict[str, float] = {}
    for team, drivers in team_drivers.items():
        paces = [driver_avg_pace[d] for d in drivers if d in driver_avg_pace]
        if paces:
            team_pace[team] = sum(paces) / len(paces)
        else:
            team_pace[team] = 1.5  # midfield default

    # Step 4: Normalize so midfield = 0, faster = negative
    # Find the median team pace as the reference
    pace_values = sorted(team_pace.values())
    midfield_pace = pace_values[len(pace_values) // 2] if pace_values else 1.0

    team_delta: dict[str, float] = {}
    for team, pace in team_pace.items():
        # Convert: lower pace value = faster car = more negative delta
        team_delta[team] = pace - midfield_pace

    # Step 5: Compute driver delta relative to their team
    driver_delta: dict[str, float] = {}
    for driver, avg_pace in driver_avg_pace.items():
        team = driver_teams[driver]
        tp = team_pace.get(team, midfield_pace)
        # How much faster/slower than their team average
        driver_delta[driver] = (avg_pace - tp) * 0.5  # dampen individual variance

    # Step 6: Blend with priors
    # prior_weight decreases exponentially with more races
    prior_weight = _PRIOR_WEIGHT_PER_RACE ** num_races

    original_skills = {d["name"]: d["skill"] for d in DRIVERS_2026}
    original_teams = {d["name"]: d["team"] for d in DRIVERS_2026}

    calibrated = {}
    for d in DRIVERS_2026:
        name = d["name"]
        team = d["team"]
        old_skill = d["skill"]

        td = team_delta.get(team, 0.0)
        dd = driver_delta.get(name, 0.0)
        data_skill = td + dd

        # Blend prior and data
        effective = prior_weight * old_skill + (1 - prior_weight) * data_skill

        calibrated[name] = {
            "team_pace": round(td, 3),
            "driver_delta": round(dd, 3),
            "effective_skill": round(effective, 3),
            "prior_skill": old_skill,
            "data_skill": round(data_skill, 3),
            "prior_weight": round(prior_weight, 3),
        }

    logger.info(
        "Calibrated performance from %d races (prior_weight=%.2f). "
        "Top teams: %s",
        num_races, prior_weight,
        ", ".join(f"{t}: {d:+.2f}s" for t, d in
                  sorted(team_delta.items(), key=lambda x: x[1])[:5])
    )

    return calibrated


def get_calibrated_drivers_2026() -> list[dict]:
    """Return a modified DRIVERS_2026 list with calibrated skill values.

    This is a drop-in replacement for DRIVERS_2026 in the prediction pipeline.
    """
    calibrated = get_calibrated_performance()

    drivers = []
    for d in DRIVERS_2026:
        perf = calibrated.get(d["name"], {})
        drivers.append({
            "name": d["name"],
            "team": d["team"],
            "skill": perf.get("effective_skill", d["skill"]),
            "number": d["number"],
        })

    return drivers
