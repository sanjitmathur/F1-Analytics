"""SQLAlchemy ORM models for the F1 Strategy Simulator."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.types import JSON

from .database import Base


class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    country = Column(String, nullable=False)
    total_laps = Column(Integer, nullable=False)
    base_lap_time = Column(Float, nullable=False)
    pit_loss_time = Column(Float, default=22.0)
    drs_zones = Column(Integer, default=1)
    overtake_difficulty = Column(Float, default=1.0)
    safety_car_probability = Column(Float, default=0.03)
    is_preset = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    track_id = Column(Integer, nullable=False)
    track_name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    sim_type = Column(String, default="single")  # single, monte_carlo
    num_simulations = Column(Integer, default=1)
    completed_simulations = Column(Integer, default=0)
    driver_config = Column(JSON, nullable=False)  # list of driver+strategy configs
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=False, index=True)
    position = Column(Integer, nullable=False)
    driver_name = Column(String, nullable=False)
    team = Column(String, nullable=False)
    total_time = Column(Float, nullable=False)
    gap_to_leader = Column(Float, default=0.0)
    laps_completed = Column(Integer, nullable=False)
    pit_stops = Column(Integer, default=0)
    is_dnf = Column(Boolean, default=False)
    best_lap_time = Column(Float, nullable=True)
    positions_gained = Column(Integer, default=0)


class LapData(Base):
    __tablename__ = "lap_data"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=False, index=True)
    lap = Column(Integer, nullable=False)
    driver_name = Column(String, nullable=False)
    position = Column(Integer, nullable=False)
    lap_time = Column(Float, nullable=False)
    total_time = Column(Float, nullable=False)
    tire_compound = Column(String, nullable=False)
    tire_age = Column(Integer, nullable=False)
    gap_to_leader = Column(Float, default=0.0)
    is_pit_lap = Column(Boolean, default=False)
    is_safety_car = Column(Boolean, default=False)


class MonteCarloData(Base):
    __tablename__ = "monte_carlo_data"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, nullable=False, index=True)
    driver_name = Column(String, nullable=False)
    team = Column(String, nullable=False)
    win_pct = Column(Float, default=0.0)
    podium_pct = Column(Float, default=0.0)
    top5_pct = Column(Float, default=0.0)
    top10_pct = Column(Float, default=0.0)
    dnf_pct = Column(Float, default=0.0)
    avg_position = Column(Float, default=0.0)
    avg_gap = Column(Float, default=0.0)
    best_position = Column(Integer, default=20)
    worst_position = Column(Integer, default=1)
    position_distribution = Column(JSON, default=dict)


class ImportedRaceData(Base):
    __tablename__ = "imported_race_data"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    grand_prix = Column(String, nullable=False)
    session_type = Column(String, default="Race")
    csv_path = Column(String, nullable=True)
    driver_count = Column(Integer, default=0)
    total_laps = Column(Integer, default=0)
    imported_at = Column(DateTime, default=datetime.utcnow)


# ─── 2026 Season Prediction Models ──────────────────────────────────────────


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RaceWeekend(Base):
    __tablename__ = "race_weekends"

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, nullable=False, index=True)
    round_number = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    track_name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    race_date = Column(String, nullable=False)  # ISO date string
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    total_laps = Column(Integer, nullable=False)
    base_lap_time = Column(Float, nullable=False)
    pit_loss_time = Column(Float, default=22.0)
    drs_zones = Column(Integer, default=1)
    overtake_difficulty = Column(Float, default=1.0)
    safety_car_probability = Column(Float, default=0.03)
    status = Column(String, default="upcoming")  # upcoming, predicted, completed
    weather_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RacePrediction(Base):
    __tablename__ = "race_predictions"

    id = Column(Integer, primary_key=True, index=True)
    race_weekend_id = Column(Integer, nullable=False, index=True)
    prediction_type = Column(String, nullable=False)  # qualifying, race
    status = Column(String, default="pending")  # pending, running, completed, failed
    num_simulations = Column(Integer, default=500)
    completed_simulations = Column(Integer, default=0)
    weather_condition = Column(String, default="dry")  # dry, wet, mixed
    parameter_overrides = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, nullable=False, index=True)
    driver_name = Column(String, nullable=False)
    team = Column(String, nullable=False)
    predicted_position = Column(Float, nullable=False)  # avg position
    win_pct = Column(Float, default=0.0)
    podium_pct = Column(Float, default=0.0)
    top5_pct = Column(Float, default=0.0)
    top10_pct = Column(Float, default=0.0)
    dnf_pct = Column(Float, default=0.0)
    position_distribution = Column(JSON, default=dict)
    q1_exit_pct = Column(Float, default=0.0)
    q2_exit_pct = Column(Float, default=0.0)
    q3_exit_pct = Column(Float, default=0.0)


class ActualResult(Base):
    __tablename__ = "actual_results"

    id = Column(Integer, primary_key=True, index=True)
    race_weekend_id = Column(Integer, nullable=False, index=True)
    result_type = Column(String, nullable=False)  # qualifying, race
    driver_name = Column(String, nullable=False)
    actual_position = Column(Integer, nullable=False)
    is_dnf = Column(Boolean, default=False)


class AccuracyRecord(Base):
    __tablename__ = "accuracy_records"

    id = Column(Integer, primary_key=True, index=True)
    race_weekend_id = Column(Integer, nullable=False, index=True)
    prediction_id = Column(Integer, nullable=False)
    mae = Column(Float, default=0.0)
    top3_accuracy = Column(Float, default=0.0)
    winner_correct = Column(Boolean, default=False)
    kendall_tau = Column(Float, default=0.0)


class DriverPerformanceCache(Base):
    __tablename__ = "driver_performance_cache"

    id = Column(Integer, primary_key=True, index=True)
    driver_name = Column(String, nullable=False)
    track_name = Column(String, nullable=False)
    avg_qualifying_delta = Column(Float, default=0.0)
    avg_race_pace_delta = Column(Float, default=0.0)
    avg_tire_degradation = Column(Float, default=0.0)
    wet_performance_delta = Column(Float, default=0.0)
    consistency_score = Column(Float, default=0.5)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ChampionshipStanding(Base):
    __tablename__ = "championship_standings"

    id = Column(Integer, primary_key=True, index=True)
    season_id = Column(Integer, nullable=False, index=True)
    standing_type = Column(String, nullable=False)  # driver, constructor
    entity_name = Column(String, nullable=False)
    points = Column(Float, default=0.0)
    wins = Column(Integer, default=0)
    podiums = Column(Integer, default=0)
    through_round = Column(Integer, default=0)
    is_predicted = Column(Boolean, default=True)
