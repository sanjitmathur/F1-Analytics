from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class YouTubeRequest(BaseModel):
    url: str


class PitStopBase(BaseModel):
    id: int
    filename: str
    original_filename: str
    status: str
    source_url: Optional[str] = None
    duration_sec: Optional[float] = None
    total_frames: Optional[int] = None
    processed_frames: int = 0
    fps: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PitStopDetail(PitStopBase):
    error_message: Optional[str] = None
    summaries: list["DetectionSummaryOut"] = []


class PitStopStatus(BaseModel):
    id: int
    status: str
    processed_frames: int
    total_frames: Optional[int] = None
    progress_pct: float = 0.0

    model_config = {"from_attributes": True}


class DetectionOut(BaseModel):
    id: int
    frame_number: int
    timestamp_sec: float
    class_name: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float

    model_config = {"from_attributes": True}


class DetectionPage(BaseModel):
    items: list[DetectionOut]
    total: int
    page: int
    per_page: int


class DetectionSummaryOut(BaseModel):
    id: int
    class_name: str
    total_count: int
    avg_confidence: float
    min_confidence: float
    max_confidence: float
    first_seen_sec: float
    last_seen_sec: float

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    id: int
    message: str


class HealthResponse(BaseModel):
    status: str


# --- Phase 2: Frame Extraction ---

class FrameExtractionRequest(BaseModel):
    pit_stop_id: int
    num_frames: int = 100
    strategy: str = "uniform"  # uniform, random, interval


class FrameExtractionResponse(BaseModel):
    job_id: int
    message: str


class ExtractedFrameOut(BaseModel):
    id: int
    pit_stop_id: int
    frame_number: int
    timestamp_sec: float
    width: int
    height: int
    is_labeled: bool
    dataset_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExtractedFramePage(BaseModel):
    items: list[ExtractedFrameOut]
    total: int
    page: int
    per_page: int


class AnnotationLabel(BaseModel):
    class_name: str
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float


class AnnotateRequest(BaseModel):
    labels: list[AnnotationLabel]


class AnnotationResponse(BaseModel):
    labels: list[AnnotationLabel]


class FrameExportRequest(BaseModel):
    frame_ids: list[int]


# --- Phase 2: Dataset Management ---

class DatasetCreate(BaseModel):
    name: str
    description: str = ""
    class_names: list[str]


class DatasetOut(BaseModel):
    id: int
    name: str
    version: str
    description: Optional[str] = None
    class_names: list[str]
    total_images: int
    total_labeled: int
    train_count: int
    val_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetStats(BaseModel):
    total_images: int
    total_labeled: int
    train_count: int
    val_count: int
    per_class_counts: dict[str, int]
    avg_annotations_per_image: float


class AddFramesRequest(BaseModel):
    frame_ids: list[int]


class SplitRequest(BaseModel):
    train_ratio: float = 0.8


# --- Phase 2: Training ---

class TrainingStartRequest(BaseModel):
    dataset_id: int
    model_name: str
    base_model: str = "yolov8s.pt"
    epochs: int = 100
    batch_size: int = 16
    image_size: int = 640
    patience: int = 20


class TrainingStartResponse(BaseModel):
    training_run_id: int
    message: str


class TrainingProgress(BaseModel):
    status: str
    current_epoch: int
    total_epochs: int
    progress_pct: float
    train_loss: Optional[float] = None
    val_map50: Optional[float] = None
    val_map50_95: Optional[float] = None
    loss_history: Optional[list[dict]] = None


class TrainingRunOut(BaseModel):
    id: int
    dataset_id: int
    model_name: str
    base_model: str
    status: str
    epochs: int
    batch_size: int
    image_size: int
    current_epoch: int
    best_map50: Optional[float] = None
    best_map50_95: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    training_time_sec: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# --- Phase 2: Model Management ---

class ModelInfo(BaseModel):
    name: str
    path: str
    type: str  # "coco" or "custom"
    best_map50: Optional[float] = None


class ActiveModelRequest(BaseModel):
    model_name: str


class LoadModelRequest(BaseModel):
    name: str
    weights_path: str


class ReprocessRequest(BaseModel):
    model_name: str


# --- System Info ---

class SystemInfo(BaseModel):
    python_version: str
    yolo_version: str
    cuda_available: bool
    gpu_name: Optional[str] = None
    loaded_models: list[str]
    disk_usage: dict[str, str]
