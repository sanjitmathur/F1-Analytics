// --- Track ---

export interface Track {
  id: number;
  name: string;
  country: string;
  total_laps: number;
  base_lap_time: number;
  pit_loss_time: number;
  drs_zones: number;
  overtake_difficulty: number;
  safety_car_probability: number;
  is_preset: boolean;
  created_at: string;
}

// --- Strategy ---

export interface PitStopPlan {
  lap: number;
  compound: string;
}

export interface DriverConfig {
  name: string;
  team: string;
  skill: number;
  grid_position: number;
  starting_compound: string;
  pit_stops: PitStopPlan[];
  dnf_chance_per_lap: number;
}

// --- Simulation ---

export interface SimulationRun {
  id: number;
  name: string | null;
  track_id: number;
  track_name: string;
  status: "pending" | "running" | "completed" | "failed";
  sim_type: "single" | "monte_carlo";
  num_simulations: number;
  completed_simulations: number;
  driver_config: DriverConfig[];
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SimulationStatus {
  id: number;
  status: string;
  completed_simulations: number;
  num_simulations: number;
  progress_pct: number;
}

export interface SimulationResult {
  position: number;
  driver_name: string;
  team: string;
  total_time: number;
  gap_to_leader: number;
  laps_completed: number;
  pit_stops: number;
  is_dnf: boolean;
  best_lap_time: number | null;
  positions_gained: number;
}

export interface LapData {
  lap: number;
  driver_name: string;
  position: number;
  lap_time: number;
  total_time: number;
  tire_compound: string;
  tire_age: number;
  gap_to_leader: number;
  is_pit_lap: boolean;
  is_safety_car: boolean;
}

// --- Monte Carlo ---

export interface MonteCarloDriver {
  driver_name: string;
  team: string;
  win_pct: number;
  podium_pct: number;
  top5_pct: number;
  top10_pct: number;
  dnf_pct: number;
  avg_position: number;
  avg_gap: number;
  best_position: number;
  worst_position: number;
  position_distribution: Record<number, number>;
}

export interface MonteCarloResult {
  run_id: number;
  num_simulations: number;
  drivers: MonteCarloDriver[];
}

// --- Import ---

export interface ImportedRace {
  id: number;
  year: number;
  grand_prix: string;
  session_type: string;
  driver_count: number;
  total_laps: number;
  csv_path: string | null;
  imported_at: string;
}

// --- Presets ---

export interface PresetDriver {
  name: string;
  team: string;
  skill: number;
}

export interface PresetTrack {
  name: string;
  country: string;
  total_laps: number;
  base_lap_time: number;
}

// --- Team colors ---

export type TeamColors = Record<string, string>;

// --- 2026 Season ---

export interface RaceWeekend {
  id: number;
  season_id: number;
  round_number: number;
  name: string;
  track_name: string;
  country: string;
  race_date: string;
  lat: number | null;
  lon: number | null;
  total_laps: number;
  base_lap_time: number;
  pit_loss_time: number;
  drs_zones: number;
  overtake_difficulty: number;
  safety_car_probability: number;
  status: "upcoming" | "predicted" | "completed";
  weather_data: WeatherData | null;
}

export interface SeasonData {
  id: number;
  year: number;
  is_active: boolean;
  race_weekends: RaceWeekend[];
}

export interface WeatherData {
  condition: "dry" | "wet" | "mixed";
  temperature: number | null;
  rain_probability: number | null;
  wind_speed: number | null;
  humidity: number | null;
  source: string;
}

export interface Driver2026 {
  name: string;
  team: string;
  skill: number;
  number: number;
}

export interface RacePrediction {
  id: number;
  race_weekend_id: number;
  prediction_type: "qualifying" | "race";
  status: string;
  num_simulations: number;
  weather_condition: string;
  results: PredictionResultItem[];
  created_at: string;
}

export interface PredictionResultItem {
  driver_name: string;
  team: string;
  predicted_position: number;
  win_pct: number;
  podium_pct: number;
  top5_pct: number;
  top10_pct: number;
  dnf_pct: number;
  position_distribution: Record<string, number>;
  q1_exit_pct: number;
  q2_exit_pct: number;
  q3_exit_pct: number;
}

export interface PredictionStatus {
  id: number;
  prediction_type: string;
  status: string;
  num_simulations: number;
  completed_simulations: number;
  progress_pct: number;
  weather_condition: string;
}

export interface ChampionshipStanding {
  entity_name: string;
  points: number;
  wins: number;
  podiums: number;
  through_round: number;
  is_predicted: boolean;
}

export interface HeadToHeadResult {
  driver1: string;
  driver2: string;
  track: string | null;
  driver1_avg_pos: number;
  driver2_avg_pos: number;
  driver1_wins: number;
  driver2_wins: number;
  driver1_podiums: number;
  driver2_podiums: number;
  driver1_points: number;
  driver2_points: number;
}

export interface AccuracyMetrics {
  race_weekend_id: number;
  prediction_id: number;
  mae: number;
  top3_accuracy: number;
  winner_correct: boolean;
  kendall_tau: number;
}
