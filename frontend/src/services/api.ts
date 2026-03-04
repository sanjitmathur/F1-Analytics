import axios from "axios";
import type {
  Track,
  SimulationRun,
  SimulationStatus,
  SimulationResult,
  LapData,
  MonteCarloResult,
  ImportedRace,
  PresetDriver,
  PresetTrack,
  TeamColors,
  DriverConfig,
  SeasonData,
  RaceWeekend,
  Driver2026,
  ChampionshipStanding,
  RacePrediction,
  PredictionStatus,
  PredictionResultItem,
  HeadToHeadResult,
  WeatherData,
  AccuracyMetrics,
} from "../types";

const client = axios.create({ baseURL: "/api" });

// --- Tracks ---

export async function listTracks(): Promise<Track[]> {
  const { data } = await client.get<Track[]>("/tracks");
  return data;
}

export async function getTrack(id: number): Promise<Track> {
  const { data } = await client.get<Track>(`/tracks/${id}`);
  return data;
}

export async function createTrack(track: Omit<Track, "id" | "is_preset" | "created_at">): Promise<Track> {
  const { data } = await client.post<Track>("/tracks", track);
  return data;
}

export async function deleteTrack(id: number): Promise<void> {
  await client.delete(`/tracks/${id}`);
}

// --- Simulations ---

export async function listSimulations(): Promise<SimulationRun[]> {
  const { data } = await client.get<SimulationRun[]>("/simulations");
  return data;
}

export async function startSimulation(config: {
  name?: string;
  track_id: number;
  drivers: DriverConfig[];
  sim_type: string;
  num_simulations: number;
  weather?: string;
}): Promise<{ id: number; message: string }> {
  const { data } = await client.post("/simulations", config);
  return data;
}

export async function getSimulation(id: number): Promise<SimulationRun> {
  const { data } = await client.get<SimulationRun>(`/simulations/${id}`);
  return data;
}

export async function getSimulationStatus(id: number): Promise<SimulationStatus> {
  const { data } = await client.get<SimulationStatus>(`/simulations/${id}/status`);
  return data;
}

export async function getSimulationResults(id: number): Promise<SimulationResult[]> {
  const { data } = await client.get<SimulationResult[]>(`/simulations/${id}/results`);
  return data;
}

export async function getLapData(id: number, driver?: string): Promise<LapData[]> {
  const params: Record<string, string> = {};
  if (driver) params.driver = driver;
  const { data } = await client.get<LapData[]>(`/simulations/${id}/laps`, { params });
  return data;
}

export async function deleteSimulation(id: number): Promise<void> {
  await client.delete(`/simulations/${id}`);
}

// --- Monte Carlo ---

export async function getMonteCarloResults(runId: number): Promise<MonteCarloResult> {
  const { data } = await client.get<MonteCarloResult>(`/monte-carlo/${runId}`);
  return data;
}

// --- Import ---

export async function listImports(): Promise<ImportedRace[]> {
  const { data } = await client.get<ImportedRace[]>("/import");
  return data;
}

export async function importRace(year: number, grandPrix: string, sessionType: string = "Race"): Promise<{ id: number; message: string }> {
  const { data } = await client.post("/import", { year, grand_prix: grandPrix, session_type: sessionType });
  return data;
}

// --- Presets ---

export async function getPresetDrivers(): Promise<PresetDriver[]> {
  const { data } = await client.get<PresetDriver[]>("/presets/drivers");
  return data;
}

export async function getPresetTracks(): Promise<PresetTrack[]> {
  const { data } = await client.get<PresetTrack[]>("/presets/tracks");
  return data;
}

export async function getTeamColors(): Promise<TeamColors> {
  const { data } = await client.get<TeamColors>("/presets/team-colors");
  return data;
}

// --- Season ---

export async function getSeasonData(year: number): Promise<SeasonData> {
  const { data } = await client.get<SeasonData>(`/season/${year}`);
  return data;
}

export async function getSeasonCalendar(year: number): Promise<RaceWeekend[]> {
  const { data } = await client.get<RaceWeekend[]>(`/season/${year}/calendar`);
  return data;
}

export async function getSeasonDrivers(year: number): Promise<Driver2026[]> {
  const { data } = await client.get<Driver2026[]>(`/season/${year}/drivers`);
  return data;
}

export async function getSeasonTeamColors(year: number): Promise<TeamColors> {
  const { data } = await client.get<TeamColors>(`/season/${year}/team-colors`);
  return data;
}

export async function getDriverStandings(year: number): Promise<ChampionshipStanding[]> {
  const { data } = await client.get<ChampionshipStanding[]>(`/season/${year}/standings/driver`);
  return data;
}

export async function getConstructorStandings(year: number): Promise<ChampionshipStanding[]> {
  const { data } = await client.get<ChampionshipStanding[]>(`/season/${year}/standings/constructor`);
  return data;
}

// --- Predictions ---

export async function startRacePrediction(
  raceWeekendId: number,
  config: { num_simulations?: number; weather_override?: string; parameter_overrides?: Record<string, unknown> }
): Promise<{ qualifying_prediction_id: number; race_prediction_id: number; message: string }> {
  const { data } = await client.post(`/predictions/race/${raceWeekendId}`, config);
  return data;
}

export async function getPredictionStatus(id: number): Promise<PredictionStatus> {
  const { data } = await client.get<PredictionStatus>(`/predictions/${id}/status`);
  return data;
}

export async function getPredictionResults(id: number): Promise<PredictionResultItem[]> {
  const { data } = await client.get<PredictionResultItem[]>(`/predictions/${id}/results`);
  return data;
}

export async function getRaceWeekendPredictions(rwId: number): Promise<RacePrediction[]> {
  const { data } = await client.get<RacePrediction[]>(`/predictions/race-weekend/${rwId}`);
  return data;
}

// --- Head to Head ---

export async function getHeadToHead(d1: string, d2: string, track?: string): Promise<HeadToHeadResult> {
  const params: Record<string, string> = { driver1: d1, driver2: d2 };
  if (track) params.track = track;
  const { data } = await client.get<HeadToHeadResult>("/head-to-head", { params });
  return data;
}

export async function getSeasonHeadToHead(d1: string, d2: string): Promise<HeadToHeadResult> {
  const { data } = await client.get<HeadToHeadResult>("/head-to-head/season", { params: { driver1: d1, driver2: d2 } });
  return data;
}

// --- Accuracy ---

export async function importActualResults(
  rwId: number,
  resultType: string,
  results: { driver_name: string; actual_position: number; is_dnf?: boolean }[]
): Promise<{ message: string; accuracy: AccuracyMetrics | null }> {
  const { data } = await client.post(`/accuracy/import/${rwId}`, { result_type: resultType, results });
  return data;
}

export async function getAccuracy(rwId: number): Promise<AccuracyMetrics[]> {
  const { data } = await client.get<AccuracyMetrics[]>(`/accuracy/${rwId}`);
  return data;
}

export async function getSeasonAccuracy(year: number): Promise<Record<string, number>> {
  const { data } = await client.get(`/accuracy/season/${year}`);
  return data;
}

// --- Weather ---

export async function getRaceWeather(rwId: number): Promise<WeatherData> {
  const { data } = await client.get<WeatherData>(`/weather/${rwId}`);
  return data;
}

export async function refreshWeather(rwId: number): Promise<WeatherData> {
  const { data } = await client.post<WeatherData>(`/weather/${rwId}/refresh`);
  return data;
}

export async function getWeatherImpact(rwId: number): Promise<Record<string, unknown>> {
  const { data } = await client.get(`/weather/${rwId}/impact`);
  return data;
}
