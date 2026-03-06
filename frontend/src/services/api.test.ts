import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("axios", () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: { create: vi.fn(() => mockClient) },
  };
});

// Import after mocking
import * as api from "./api";

const mockClient = axios.create() as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("API service", () => {
  it("listTracks calls GET /tracks", async () => {
    const tracks = [{ id: 1, name: "Monaco" }];
    mockClient.get.mockResolvedValue({ data: tracks });
    const result = await api.listTracks();
    expect(mockClient.get).toHaveBeenCalledWith("/tracks");
    expect(result).toEqual(tracks);
  });

  it("getTrack calls GET /tracks/:id", async () => {
    const track = { id: 1, name: "Monaco" };
    mockClient.get.mockResolvedValue({ data: track });
    const result = await api.getTrack(1);
    expect(mockClient.get).toHaveBeenCalledWith("/tracks/1");
    expect(result).toEqual(track);
  });

  it("createTrack calls POST /tracks", async () => {
    const newTrack = { name: "Test", country: "US", total_laps: 50, base_lap_time: 80, pit_loss_time: 22, drs_zones: 2, overtake_difficulty: 0.5, safety_car_probability: 0.03 };
    mockClient.post.mockResolvedValue({ data: { id: 2, ...newTrack } });
    const result = await api.createTrack(newTrack);
    expect(mockClient.post).toHaveBeenCalledWith("/tracks", newTrack);
    expect(result.id).toBe(2);
  });

  it("deleteTrack calls DELETE /tracks/:id", async () => {
    mockClient.delete.mockResolvedValue({});
    await api.deleteTrack(1);
    expect(mockClient.delete).toHaveBeenCalledWith("/tracks/1");
  });

  it("startSimulation calls POST /simulations", async () => {
    const config = { track_id: 1, drivers: [], sim_type: "single", num_simulations: 1 };
    mockClient.post.mockResolvedValue({ data: { id: 1, message: "ok" } });
    const result = await api.startSimulation(config);
    expect(mockClient.post).toHaveBeenCalledWith("/simulations", config);
    expect(result.id).toBe(1);
  });

  it("getSimulationStatus calls GET /simulations/:id/status", async () => {
    const status = { id: 1, status: "completed", completed_simulations: 1, num_simulations: 1, progress_pct: 100 };
    mockClient.get.mockResolvedValue({ data: status });
    const result = await api.getSimulationStatus(1);
    expect(mockClient.get).toHaveBeenCalledWith("/simulations/1/status");
    expect(result.status).toBe("completed");
  });

  it("getMonteCarloResults calls GET /monte-carlo/:id", async () => {
    const mc = { run_id: 1, num_simulations: 100, drivers: [] };
    mockClient.get.mockResolvedValue({ data: mc });
    const result = await api.getMonteCarloResults(1);
    expect(mockClient.get).toHaveBeenCalledWith("/monte-carlo/1");
    expect(result.num_simulations).toBe(100);
  });

  it("getPresetDrivers calls GET /presets/drivers", async () => {
    const drivers = [{ name: "Verstappen", team: "Red Bull", skill: 97 }];
    mockClient.get.mockResolvedValue({ data: drivers });
    const result = await api.getPresetDrivers();
    expect(mockClient.get).toHaveBeenCalledWith("/presets/drivers");
    expect(result).toEqual(drivers);
  });

  it("getLapData passes driver param when provided", async () => {
    mockClient.get.mockResolvedValue({ data: [] });
    await api.getLapData(1, "Hamilton");
    expect(mockClient.get).toHaveBeenCalledWith("/simulations/1/laps", { params: { driver: "Hamilton" } });
  });

  it("getLapData omits driver param when not provided", async () => {
    mockClient.get.mockResolvedValue({ data: [] });
    await api.getLapData(1);
    expect(mockClient.get).toHaveBeenCalledWith("/simulations/1/laps", { params: {} });
  });
});
