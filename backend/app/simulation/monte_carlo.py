"""Monte Carlo simulation for race outcome predictions."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

from .entities import Driver, Track
from .race_engine import Race, RaceState


@dataclass
class DriverProbabilities:
    driver_name: str
    team: str
    win_pct: float = 0.0
    podium_pct: float = 0.0
    top5_pct: float = 0.0
    top10_pct: float = 0.0
    dnf_pct: float = 0.0
    avg_position: float = 0.0
    avg_gap: float = 0.0
    best_position: int = 20
    worst_position: int = 1
    position_distribution: dict[int, float] = field(default_factory=dict)


@dataclass
class MonteCarloResult:
    num_simulations: int
    driver_probabilities: list[DriverProbabilities]
    convergence_data: list[dict] = field(default_factory=list)


class MonteCarloSimulator:
    """Run N race simulations and aggregate probabilities."""

    def __init__(
        self,
        track: Track,
        drivers: list[Driver],
        num_simulations: int = 1000,
        weather: str = "dry",
        rain_intensity: float = 0.5,
    ):
        self.track = track
        self.drivers = drivers
        self.num_simulations = num_simulations
        self.weather = weather
        self.rain_intensity = rain_intensity
        self.results: list[RaceState] = []

    def run(
        self,
        progress_callback: callable | None = None,
    ) -> MonteCarloResult:
        """Run all simulations and compute probabilities."""
        self.results.clear()

        # Per-driver accumulators
        positions: dict[str, list[int]] = {d.name: [] for d in self.drivers}
        gaps: dict[str, list[float]] = {d.name: [] for d in self.drivers}
        wins: Counter = Counter()
        podiums: Counter = Counter()
        top5s: Counter = Counter()
        top10s: Counter = Counter()
        dnfs: Counter = Counter()

        convergence_data: list[dict] = []

        for i in range(self.num_simulations):
            race = Race(
                self.track, self.drivers, seed=None,
                weather=self.weather, rain_intensity=self.rain_intensity,
            )
            state = race.run()
            self.results.append(state)

            for result in state.results:
                name = result.driver_name
                positions[name].append(result.position)
                gaps[name].append(result.gap_to_leader)

                if result.is_dnf:
                    dnfs[name] += 1
                else:
                    if result.position == 1:
                        wins[name] += 1
                    if result.position <= 3:
                        podiums[name] += 1
                    if result.position <= 5:
                        top5s[name] += 1
                    if result.position <= 10:
                        top10s[name] += 1

            # Record convergence every 10% or every 50 sims
            interval = max(1, self.num_simulations // 20)
            if (i + 1) % interval == 0:
                n = i + 1
                convergence_data.append({
                    "sim_number": n,
                    "win_pcts": {
                        name: wins[name] / n * 100
                        for name in positions
                    },
                })

            if progress_callback:
                progress_callback(i + 1, self.num_simulations)

        # Build driver probabilities
        n = self.num_simulations
        driver_probs = []
        for driver in self.drivers:
            name = driver.name
            pos_list = positions[name]
            pos_counter = Counter(pos_list)

            dp = DriverProbabilities(
                driver_name=name,
                team=driver.team,
                win_pct=wins[name] / n * 100,
                podium_pct=podiums[name] / n * 100,
                top5_pct=top5s[name] / n * 100,
                top10_pct=top10s[name] / n * 100,
                dnf_pct=dnfs[name] / n * 100,
                avg_position=sum(pos_list) / len(pos_list) if pos_list else 0,
                avg_gap=sum(gaps[name]) / len(gaps[name]) if gaps[name] else 0,
                best_position=min(pos_list) if pos_list else 20,
                worst_position=max(pos_list) if pos_list else 20,
                position_distribution={
                    pos: pos_counter[pos] / n * 100
                    for pos in sorted(pos_counter)
                },
            )
            driver_probs.append(dp)

        # Sort by average position
        driver_probs.sort(key=lambda dp: dp.avg_position)

        return MonteCarloResult(
            num_simulations=n,
            driver_probabilities=driver_probs,
            convergence_data=convergence_data,
        )
