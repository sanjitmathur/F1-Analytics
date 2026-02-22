import axios from "axios";
import type {
  PitStop,
  PitStopDetail,
  PitStopStatus,
  DetectionPage,
  UploadResponse,
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
  perPage = 50
): Promise<DetectionPage> {
  const { data } = await client.get<DetectionPage>(
    `/pit-stops/${id}/detections`,
    { params: { page, per_page: perPage } }
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
