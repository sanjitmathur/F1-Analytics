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
