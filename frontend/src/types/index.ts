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
  model_name: string;
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
  max_per_frame: number;
  avg_confidence: number;
  min_confidence: number;
  max_confidence: number;
  first_seen_sec: number;
  last_seen_sec: number;
  model_name: string;
}

export interface UploadResponse {
  id: number;
  message: string;
}

// --- Phase 2 Types ---

export interface ExtractedFrame {
  id: number;
  pit_stop_id: number;
  frame_number: number;
  timestamp_sec: number;
  width: number;
  height: number;
  is_labeled: boolean;
  dataset_id: number | null;
  created_at: string;
}

export interface ExtractedFramePage {
  items: ExtractedFrame[];
  total: number;
  page: number;
  per_page: number;
}

export interface ExtractionStatus {
  status: string;
  extracted: number;
  total: number;
  progress_pct: number;
}

export interface AnnotationLabel {
  class_name: string;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

export interface Dataset {
  id: number;
  name: string;
  version: string;
  description: string | null;
  class_names: string[];
  total_images: number;
  total_labeled: number;
  train_count: number;
  val_count: number;
  created_at: string;
  updated_at: string;
}

export interface DatasetStats {
  total_images: number;
  total_labeled: number;
  train_count: number;
  val_count: number;
  per_class_counts: Record<string, number>;
  avg_annotations_per_image: number;
}

export interface TrainingRun {
  id: number;
  dataset_id: number;
  model_name: string;
  base_model: string;
  status: "pending" | "training" | "completed" | "failed";
  epochs: number;
  batch_size: number;
  image_size: number;
  current_epoch: number;
  best_map50: number | null;
  best_map50_95: number | null;
  precision: number | null;
  recall: number | null;
  training_time_sec: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TrainingProgress {
  status: string;
  current_epoch: number;
  total_epochs: number;
  progress_pct: number;
  train_loss: number | null;
  val_map50: number | null;
  val_map50_95: number | null;
  loss_history: Array<{
    epoch: number;
    box_loss: number;
    cls_loss: number;
    map50: number;
  }> | null;
}

export interface ModelInfo {
  name: string;
  path: string;
  type: "coco" | "custom";
  best_map50?: number | null;
}

// --- Phase 3: Analytics ---

export interface PitStopPhase {
  name: string;
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  confidence: number;
  crew_count_avg: number;
  notes: string;
}

export interface PitStopAnalytics {
  id: number;
  pit_stop_id: number;
  car_first_seen_sec: number | null;
  car_last_seen_sec: number | null;
  total_stop_duration_sec: number | null;
  stationary_start_sec: number | null;
  stationary_end_sec: number | null;
  stationary_duration_sec: number | null;
  max_crew_count: number | null;
  avg_crew_count: number | null;
  crew_convergence_frame: number | null;
  jack_detected: boolean;
  wheel_gun_detected: boolean;
  tire_change_detected: boolean;
  efficiency_score: number | null;
  phases: PitStopPhase[];
  model_name: string;
  class_mapping_used: string | null;
  analysis_version: string;
  created_at: string;
}

export interface PitStopComparisonItem {
  pit_stop_id: number;
  original_filename: string;
  total_stop_duration_sec: number | null;
  stationary_duration_sec: number | null;
  efficiency_score: number | null;
  max_crew_count: number | null;
  model_name: string;
  rank: number;
}

export interface PitStopComparison {
  items: PitStopComparisonItem[];
  count: number;
}

export interface SystemInfo {
  python_version: string;
  yolo_version: string;
  cuda_available: boolean;
  gpu_name: string | null;
  loaded_models: string[];
  disk_usage: Record<string, string>;
}
