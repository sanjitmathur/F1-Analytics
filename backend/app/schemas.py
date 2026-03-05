"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

# --- Health ---

class HealthResponse(BaseModel):
    status: str


# --- Track ---

class TrackBase(BaseModel):
    name: str
    country: str
    total_laps: int
    base_lap_time: float
    pit_loss_time: float = 22.0
    drs_zones: int = 1
    overtake_difficulty: float = 1.0
    safety_car_probability: float = 0.03


class TrackCreate(TrackBase):
    pass


class TrackResponse(TrackBase):
    id: int
    is_preset: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Strategy / Driver config ---

class PitStopPlanSchema(BaseModel):
    lap: int
    compound: str  # SOFT, MEDIUM, HARD


class DriverConfigSchema(BaseModel):
    name: str
    team: str
    skill: float = 0.0
    grid_position: int = 1
    starting_compound: str = "MEDIUM"
    pit_stops: list[PitStopPlanSchema] = []
    dnf_chance_per_lap: float = 0.001

    @field_validator("grid_position")
    @classmethod
    def validate_grid_position(cls, v: int) -> int:
        if v < 1:
            raise ValueError("grid_position must be >= 1")
        return v

    @field_validator("starting_compound")
    @classmethod
    def validate_compound(cls, v: str) -> str:
        if v not in ("SOFT", "MEDIUM", "HARD"):
            raise ValueError("starting_compound must be SOFT, MEDIUM, or HARD")
        return v


# --- Simulation ---

class SimulationCreate(BaseModel):
    name: Optional[str] = None
    track_id: int
    drivers: list[DriverConfigSchema]
    sim_type: str = "single"  # single, monte_carlo, full_weekend
    num_simulations: int = 1  # >1 for monte_carlo
    weather: str = "dry"  # dry, wet, mixed
    rain_intensity: float = 0.5  # 0.0-1.0
    include_qualifying: bool = False

    @field_validator("rain_intensity")
    @classmethod
    def validate_rain_intensity(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("rain_intensity must be between 0.0 and 1.0")
        return v

    @field_validator("sim_type")
    @classmethod
    def validate_sim_type(cls, v: str) -> str:
        if v not in ("single", "monte_carlo", "full_weekend"):
            raise ValueError("sim_type must be single, monte_carlo, or full_weekend")
        return v

    @field_validator("weather")
    @classmethod
    def validate_weather(cls, v: str) -> str:
        if v not in ("dry", "wet", "mixed"):
            raise ValueError("weather must be dry, wet, or mixed")
        return v


class SimulationRunResponse(BaseModel):
    id: int
    name: Optional[str]
    track_id: int
    track_name: str
    status: str
    sim_type: str
    num_simulations: int
    completed_simulations: int
    driver_config: dict | list[dict]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SimulationStatus(BaseModel):
    id: int
    status: str
    completed_simulations: int
    num_simulations: int
    progress_pct: float


class SimulationResultResponse(BaseModel):
    position: int
    driver_name: str
    team: str
    total_time: float
    gap_to_leader: float
    laps_completed: int
    pit_stops: int
    is_dnf: bool
    best_lap_time: Optional[float]
    positions_gained: int

    model_config = {"from_attributes": True}


class LapDataResponse(BaseModel):
    lap: int
    driver_name: str
    position: int
    lap_time: float
    total_time: float
    tire_compound: str
    tire_age: int
    gap_to_leader: float
    is_pit_lap: bool
    is_safety_car: bool

    model_config = {"from_attributes": True}


# --- Monte Carlo ---

class MonteCarloDriverResponse(BaseModel):
    driver_name: str
    team: str
    win_pct: float
    podium_pct: float
    top5_pct: float
    top10_pct: float
    dnf_pct: float
    avg_position: float
    avg_gap: float
    best_position: int
    worst_position: int
    position_distribution: dict[int, float]

    model_config = {"from_attributes": True}


class MonteCarloResultResponse(BaseModel):
    run_id: int
    num_simulations: int
    drivers: list[MonteCarloDriverResponse]


# --- Data Import ---

class ImportRequest(BaseModel):
    year: int
    grand_prix: str
    session_type: str = "Race"


class ImportedRaceResponse(BaseModel):
    id: int
    year: int
    grand_prix: str
    session_type: str
    driver_count: int
    total_laps: int
    csv_path: Optional[str]
    imported_at: datetime

    model_config = {"from_attributes": True}


# --- Presets ---

class PresetDriverResponse(BaseModel):
    name: str
    team: str
    skill: float


class PresetTrackResponse(BaseModel):
    name: str
    country: str
    total_laps: int
    base_lap_time: float


# --- 2026 Season ---

class RaceWeekendOut(BaseModel):
    id: int
    season_id: int
    round_number: int
    name: str
    track_name: str
    country: str
    race_date: str
    lat: Optional[float]
    lon: Optional[float]
    total_laps: int
    base_lap_time: float
    pit_loss_time: float
    drs_zones: int
    overtake_difficulty: float
    safety_car_probability: float
    status: str
    weather_data: Optional[dict] = None

    model_config = {"from_attributes": True}


class SeasonOut(BaseModel):
    id: int
    year: int
    is_active: bool
    race_weekends: list[RaceWeekendOut] = []

    model_config = {"from_attributes": True}


class PredictionCreate(BaseModel):
    num_simulations: int = 500
    weather_override: Optional[str] = None  # dry, wet, mixed
    parameter_overrides: Optional[dict] = None


class PredictionStatusOut(BaseModel):
    id: int
    prediction_type: str
    status: str
    num_simulations: int
    completed_simulations: int
    progress_pct: float
    weather_condition: str

    model_config = {"from_attributes": True}


class PredictionResultOut(BaseModel):
    driver_name: str
    team: str
    predicted_position: float
    win_pct: float
    podium_pct: float
    top5_pct: float
    top10_pct: float
    dnf_pct: float
    position_distribution: dict
    q1_exit_pct: float = 0.0
    q2_exit_pct: float = 0.0
    q3_exit_pct: float = 0.0

    model_config = {"from_attributes": True}


class PredictionFullOut(BaseModel):
    id: int
    race_weekend_id: int
    prediction_type: str
    status: str
    num_simulations: int
    weather_condition: str
    results: list[PredictionResultOut] = []
    created_at: datetime


class ActualResultCreate(BaseModel):
    result_type: str  # qualifying, race
    results: list[dict]  # [{driver_name, actual_position, is_dnf}]


class AccuracyOut(BaseModel):
    race_weekend_id: int
    prediction_id: int
    mae: float
    top3_accuracy: float
    winner_correct: bool
    kendall_tau: float

    model_config = {"from_attributes": True}


class ChampionshipStandingOut(BaseModel):
    entity_name: str
    points: float
    wins: int
    podiums: int
    through_round: int
    is_predicted: bool

    model_config = {"from_attributes": True}


class HeadToHeadOut(BaseModel):
    driver1: str
    driver2: str
    track: Optional[str] = None
    driver1_avg_pos: float
    driver2_avg_pos: float
    driver1_wins: int
    driver2_wins: int
    driver1_podiums: int
    driver2_podiums: int
    driver1_points: float
    driver2_points: float


class WeatherOut(BaseModel):
    condition: str  # dry, wet, mixed
    temperature: Optional[float] = None
    rain_probability: Optional[float] = None
    wind_speed: Optional[float] = None
    humidity: Optional[float] = None
    source: str = "climate_normal"  # forecast, historical, climate_normal


class Driver2026Out(BaseModel):
    name: str
    team: str
    skill: float
    number: int
