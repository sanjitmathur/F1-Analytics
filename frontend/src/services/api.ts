import axios from "axios";
import type {
  PitStop,
  PitStopDetail,
  PitStopStatus,
  DetectionPage,
  DetectionSummary,
  UploadResponse,
  ExtractedFramePage,
  ExtractionStatus,
  AnnotationLabel,
  Dataset,
  DatasetStats,
  TrainingRun,
  TrainingProgress,
  ModelInfo,
  SystemInfo,
} from "../types";

const client = axios.create({ baseURL: "/api" });

export async function uploadVideo(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post<UploadResponse>("/pit-stops/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data;
}

export async function listPitStops(): Promise<PitStop[]> {
  const { data } = await client.get<PitStop[]>("/pit-stops");
  return data;
}

export async function getPitStop(id: number): Promise<PitStopDetail> {
  const { data } = await client.get<PitStopDetail>(`/pit-stops/${id}`);
  return data;
}

export async function getPitStopStatus(id: number): Promise<PitStopStatus> {
  const { data } = await client.get<PitStopStatus>(`/pit-stops/${id}/status`);
  return data;
}

export async function getDetections(
  id: number,
  page = 1,
  perPage = 50,
  modelName?: string
): Promise<DetectionPage> {
  const params: Record<string, unknown> = { page, per_page: perPage };
  if (modelName) params.model_name = modelName;
  const { data } = await client.get<DetectionPage>(
    `/pit-stops/${id}/detections`,
    { params }
  );
  return data;
}

export async function submitYouTubeUrl(url: string): Promise<UploadResponse> {
  const { data } = await client.post<UploadResponse>("/pit-stops/from-youtube", { url });
  return data;
}

export async function deletePitStop(id: number): Promise<void> {
  await client.delete(`/pit-stops/${id}`);
}

// --- Phase 2: Frame Extraction ---

export async function extractFrames(
  pitStopId: number,
  numFrames: number = 100,
  strategy: string = "uniform"
): Promise<{ job_id: number; message: string }> {
  const { data } = await client.post("/frames/extract", {
    pit_stop_id: pitStopId,
    num_frames: numFrames,
    strategy,
  });
  return data;
}

export async function getExtractionStatus(jobId: number): Promise<ExtractionStatus> {
  const { data } = await client.get<ExtractionStatus>(`/frames/extract/${jobId}/status`);
  return data;
}

export async function listFrames(
  pitStopId?: number,
  labeled?: boolean,
  page = 1,
  perPage = 50
): Promise<ExtractedFramePage> {
  const params: Record<string, unknown> = { page, per_page: perPage };
  if (pitStopId !== undefined) params.pit_stop_id = pitStopId;
  if (labeled !== undefined) params.labeled = labeled;
  const { data } = await client.get<ExtractedFramePage>("/frames", { params });
  return data;
}

export function getFrameImageUrl(frameId: number): string {
  return `/api/frames/${frameId}/image`;
}

export async function deleteFrame(frameId: number): Promise<void> {
  await client.delete(`/frames/${frameId}`);
}

export async function annotateFrame(
  frameId: number,
  labels: AnnotationLabel[]
): Promise<void> {
  await client.post(`/frames/${frameId}/annotate`, { labels });
}

export async function getFrameAnnotations(
  frameId: number
): Promise<{ labels: AnnotationLabel[] }> {
  const { data } = await client.get(`/frames/${frameId}/annotations`);
  return data;
}

// --- Phase 2: Datasets ---

export async function createDataset(
  name: string,
  description: string,
  classNames: string[]
): Promise<Dataset> {
  const { data } = await client.post<Dataset>("/datasets", {
    name,
    description,
    class_names: classNames,
  });
  return data;
}

export async function listDatasets(): Promise<Dataset[]> {
  const { data } = await client.get<Dataset[]>("/datasets");
  return data;
}

export async function getDataset(id: number): Promise<Dataset> {
  const { data } = await client.get<Dataset>(`/datasets/${id}`);
  return data;
}

export async function addFramesToDataset(
  datasetId: number,
  frameIds: number[]
): Promise<void> {
  await client.post(`/datasets/${datasetId}/add-frames`, { frame_ids: frameIds });
}

export async function splitDataset(
  datasetId: number,
  trainRatio = 0.8
): Promise<void> {
  await client.post(`/datasets/${datasetId}/split`, { train_ratio: trainRatio });
}

export async function getDatasetStats(id: number): Promise<DatasetStats> {
  const { data } = await client.get<DatasetStats>(`/datasets/${id}/stats`);
  return data;
}

export async function deleteDataset(id: number): Promise<void> {
  await client.delete(`/datasets/${id}`);
}

// --- Phase 2: Training ---

export async function startTraining(config: {
  dataset_id: number;
  model_name: string;
  base_model?: string;
  epochs?: number;
  batch_size?: number;
  image_size?: number;
  patience?: number;
}): Promise<{ training_run_id: number; message: string }> {
  const { data } = await client.post("/training/start", config);
  return data;
}

export async function getTrainingProgress(runId: number): Promise<TrainingProgress> {
  const { data } = await client.get<TrainingProgress>(`/training/${runId}/status`);
  return data;
}

export async function listTrainingRuns(): Promise<TrainingRun[]> {
  const { data } = await client.get<TrainingRun[]>("/training");
  return data;
}

export async function getTrainingRun(id: number): Promise<TrainingRun> {
  const { data } = await client.get<TrainingRun>(`/training/${id}`);
  return data;
}

// --- Phase 2: Models ---

export async function listModels(): Promise<ModelInfo[]> {
  const { data } = await client.get<ModelInfo[]>("/models");
  return data;
}

export async function getActiveModel(): Promise<{ name: string; type: string }> {
  const { data } = await client.get("/models/active");
  return data;
}

export async function setActiveModel(modelName: string): Promise<void> {
  await client.post("/models/active", { model_name: modelName });
}

export async function reprocessPitStop(
  pitStopId: number,
  modelName: string
): Promise<void> {
  await client.post(`/pit-stops/${pitStopId}/reprocess`, { model_name: modelName });
}

export async function getModelsUsed(
  pitStopId: number
): Promise<{ models: string[] }> {
  const { data } = await client.get(`/pit-stops/${pitStopId}/models-used`);
  return data;
}

export function getPreviewFrameUrl(
  pitStopId: number,
  frameNumber: number,
  modelName?: string
): string {
  let url = `/api/pit-stops/${pitStopId}/preview-frame?frame_number=${frameNumber}`;
  if (modelName) url += `&model_name=${encodeURIComponent(modelName)}`;
  return url;
}

export async function getSummariesByModel(
  pitStopId: number,
  modelName?: string
): Promise<DetectionSummary[]> {
  const params: Record<string, unknown> = {};
  if (modelName) params.model_name = modelName;
  const { data } = await client.get(`/pit-stops/${pitStopId}/summaries`, { params });
  return data;
}

// --- System Info ---

export async function getSystemInfo(): Promise<SystemInfo> {
  const { data } = await client.get<SystemInfo>("/system/info");
  return data;
}
