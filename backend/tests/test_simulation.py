"""Tests for the simulation engine."""

from app.simulation.entities import (
    Driver,
    PitStopPlan,
    Strategy,
    Tire,
    TireCompound,
)
from app.simulation.entities import Track as SimTrack
from app.simulation.lap_model import calculate_lap_time
from app.simulation.monte_carlo import MonteCarloSimulator
from app.simulation.overtake_model import overtake_probability
from app.simulation.race_engine import Car, Race


def _test_track() -> SimTrack:
    return SimTrack(
        name="Test Circuit",
        country="Test",
        total_laps=10,
        base_lap_time=90.0,
        pit_loss_time=22.0,
        drs_zones=1,
        overtake_difficulty=1.0,
        safety_car_probability=0.0,  # no SC for deterministic tests
    )


def _test_drivers() -> list[Driver]:
    return [
        Driver(
            name="Driver A",
            team="Team 1",
            skill=-0.5,
            grid_position=1,
            strategy=Strategy(
                starting_compound=TireCompound.SOFT,
                pit_stops=[PitStopPlan(lap=5, compound=TireCompound.HARD)],
            ),
            dnf_chance_per_lap=0.0,
        ),
        Driver(
            name="Driver B",
            team="Team 2",
            skill=0.0,
            grid_position=2,
            strategy=Strategy(
                starting_compound=TireCompound.MEDIUM,
                pit_stops=[PitStopPlan(lap=6, compound=TireCompound.SOFT)],
            ),
            dnf_chance_per_lap=0.0,
        ),
    ]


class TestTire:
    def test_degradation(self):
        tire = Tire(TireCompound.SOFT, age=10)
        assert abs(tire.degradation_penalty - 0.8) < 0.01

    def test_pace_offset(self):
        soft = Tire(TireCompound.SOFT)
        medium = Tire(TireCompound.MEDIUM)
        assert soft.pace_offset < medium.pace_offset  # soft is faster

    def test_wear(self):
        tire = Tire(TireCompound.MEDIUM, age=0)
        tire.wear_one_lap()
        assert tire.age == 1


class TestLapModel:
    def test_basic_lap_time(self):
        track = _test_track()
        car = Car(
            driver=Driver("Test", "Team", skill=0.0, grid_position=1,
                          strategy=Strategy(TireCompound.MEDIUM)),
        )
        car.tire = Tire(TireCompound.MEDIUM, age=0)
        lap_time = calculate_lap_time(car, track, randomness=0.0)
        # Should be close to base_lap_time
        assert 85.0 < lap_time < 95.0

    def test_safety_car_slower(self):
        track = _test_track()
        car = Car(
            driver=Driver("Test", "Team", skill=0.0, grid_position=1,
                          strategy=Strategy(TireCompound.MEDIUM)),
        )
        car.tire = Tire(TireCompound.MEDIUM, age=0)
        normal = calculate_lap_time(car, track, randomness=0.0)
        sc = calculate_lap_time(car, track, safety_car=True, randomness=0.0)
        assert sc > normal


class TestOvertake:
    def test_close_gap_high_prob(self):
        track = _test_track()
        prob = overtake_probability(0.3, track)
        assert prob > 0.5

    def test_large_gap_low_prob(self):
        track = _test_track()
        prob = overtake_probability(1.5, track)
        assert prob < 0.1

    def test_no_gap_no_overtake(self):
        track = _test_track()
        prob = overtake_probability(0.0, track)
        assert prob == 0.0


class TestRace:
    def test_race_completes(self):
        track = _test_track()
        drivers = _test_drivers()
        race = Race(track, drivers, seed=42)
        state = race.run()

        assert len(state.results) == 2
        assert state.results[0].position == 1
        assert state.results[1].position == 2
        assert all(r.laps_completed == 10 for r in state.results)

    def test_deterministic_with_seed(self):
        track = _test_track()
        drivers = _test_drivers()

        race1 = Race(track, drivers, seed=123)
        state1 = race1.run()

        race2 = Race(track, drivers, seed=123)
        state2 = race2.run()

        assert state1.results[0].driver_name == state2.results[0].driver_name
        assert abs(state1.results[0].total_time - state2.results[0].total_time) < 0.01

    def test_pit_stops_executed(self):
        track = _test_track()
        drivers = _test_drivers()
        race = Race(track, drivers, seed=42)
        state = race.run()

        for result in state.results:
            assert result.pit_stops == 1

    def test_lap_records_generated(self):
        track = _test_track()
        drivers = _test_drivers()
        race = Race(track, drivers, seed=42)
        state = race.run()

        # 10 laps * 2 drivers = 20 records
        assert len(state.lap_records) == 20


class TestMonteCarlo:
    def test_mc_runs(self):
        track = _test_track()
        drivers = _test_drivers()
        mc = MonteCarloSimulator(track, drivers, num_simulations=50)
        result = mc.run()

        assert result.num_simulations == 50
        assert len(result.driver_probabilities) == 2

        # Probabilities should sum to reasonable values
        for dp in result.driver_probabilities:
            assert 0 <= dp.win_pct <= 100
            assert 0 <= dp.podium_pct <= 100
            assert dp.avg_position > 0

    def test_faster_driver_wins_more(self):
        track = _test_track()
        drivers = _test_drivers()
        mc = MonteCarloSimulator(track, drivers, num_simulations=200)
        result = mc.run()

        driver_a = next(d for d in result.driver_probabilities if d.driver_name == "Driver A")
        driver_b = next(d for d in result.driver_probabilities if d.driver_name == "Driver B")

        # Driver A has better skill (-0.5 vs 0.0), should win more often
        assert driver_a.win_pct > driver_b.win_pct
