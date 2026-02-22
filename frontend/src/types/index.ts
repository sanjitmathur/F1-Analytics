export interface PitStop {
  id: number;
  filename: string;
  original_filename: string;
  status: "downloading" | "pending" | "processing" | "completed" | "failed";
  source_url: string | null;
  duration_sec: number | null;
  total_frames: number | null;
  processed_frames: number;
  fps: number | null;
  created_at: string;
  updated_at: string;
}

export interface PitStopDetail extends PitStop {
  error_message: string | null;
  summaries: DetectionSummary[];
}

export interface PitStopStatus {
  id: number;
  status: string;
  processed_frames: number;
  total_frames: number | null;
  progress_pct: number;
}

export interface Detection {
  id: number;
  frame_number: number;
  timestamp_sec: number;
  class_name: string;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

export interface DetectionPage {
  items: Detection[];
  total: number;
  page: number;
  per_page: number;
}

export interface DetectionSummary {
  id: number;
  class_name: string;
  total_count: number;
  avg_confidence: number;
  min_confidence: number;
  max_confidence: number;
  first_seen_sec: number;
  last_seen_sec: number;
}

export interface UploadResponse {
  id: number;
  message: string;
}
