import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      delete: mockDelete,
    }),
  },
}));

import {
  listPitStops,
  getPitStop,
  getPitStopStatus,
  getDetections,
  deletePitStop,
  listModels,
  getActiveModel,
  getModelsUsed,
  getPreviewFrameUrl,
  reprocessPitStop,
} from "./api";

describe("API service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPitStops calls GET /pit-stops", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const result = await listPitStops();
    expect(mockGet).toHaveBeenCalledWith("/pit-stops");
    expect(result).toEqual([{ id: 1 }]);
  });

  it("getPitStop calls GET /pit-stops/:id", async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 1, filename: "test.mp4" } });
    const result = await getPitStop(1);
    expect(mockGet).toHaveBeenCalledWith("/pit-stops/1");
    expect(result.id).toBe(1);
  });

  it("getPitStopStatus calls GET /pit-stops/:id/status", async () => {
    mockGet.mockResolvedValueOnce({
      data: { id: 1, status: "completed", processed_frames: 10, total_frames: 10, progress_pct: 100 },
    });
    const result = await getPitStopStatus(1);
    expect(result.status).toBe("completed");
  });

  it("getDetections passes model_name param", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, per_page: 50 } });
    await getDetections(1, 1, 50, "custom_model");
    expect(mockGet).toHaveBeenCalledWith("/pit-stops/1/detections", {
      params: { page: 1, per_page: 50, model_name: "custom_model" },
    });
  });

  it("getDetections works without model_name", async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, per_page: 50 } });
    await getDetections(1);
    expect(mockGet).toHaveBeenCalledWith("/pit-stops/1/detections", {
      params: { page: 1, per_page: 50 },
    });
  });

  it("deletePitStop calls DELETE /pit-stops/:id", async () => {
    mockDelete.mockResolvedValueOnce({});
    await deletePitStop(1);
    expect(mockDelete).toHaveBeenCalledWith("/pit-stops/1");
  });

  it("listModels calls GET /models", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ name: "default" }] });
    const result = await listModels();
    expect(result).toEqual([{ name: "default" }]);
  });

  it("getActiveModel calls GET /models/active", async () => {
    mockGet.mockResolvedValueOnce({ data: { name: "default", type: "coco" } });
    const result = await getActiveModel();
    expect(result.name).toBe("default");
  });

  it("getModelsUsed calls GET /pit-stops/:id/models-used", async () => {
    mockGet.mockResolvedValueOnce({ data: { models: ["default", "custom"] } });
    const result = await getModelsUsed(1);
    expect(result.models).toEqual(["default", "custom"]);
  });

  it("getPreviewFrameUrl builds correct URL without model", () => {
    expect(getPreviewFrameUrl(1, 50)).toBe(
      "/api/pit-stops/1/preview-frame?frame_number=50"
    );
  });

  it("getPreviewFrameUrl builds correct URL with model", () => {
    expect(getPreviewFrameUrl(1, 50, "my_model")).toBe(
      "/api/pit-stops/1/preview-frame?frame_number=50&model_name=my_model"
    );
  });

  it("reprocessPitStop calls POST /pit-stops/:id/reprocess", async () => {
    mockPost.mockResolvedValueOnce({});
    await reprocessPitStop(1, "custom_model");
    expect(mockPost).toHaveBeenCalledWith("/pit-stops/1/reprocess", {
      model_name: "custom_model",
    });
  });
});
