import io
import uuid
from pathlib import Path

import cv2
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..config import settings
from ..database import get_db, get_sync_db
from ..models import Detection, DetectionSummary, PitStop
from ..schemas import (
    DetectionPage,
    PitStopBase,
    PitStopDetail,
    PitStopStatus,
    ReprocessRequest,
    UploadResponse,
    YouTubeRequest,
)
from ..services.video_processor import process_video
from ..services.youtube_downloader import download_and_process

router = APIRouter(prefix="/api/pit-stops", tags=["pit-stops"])

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
CHUNK_SIZE = 1024 * 1024  # 1MB


@router.post("/upload", response_model=UploadResponse, status_code=202)
async def upload_video(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    # Validate extension
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}. Allowed: {ALLOWED_EXTENSIONS}")

    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / unique_name

    # Stream file to disk in chunks
    with open(file_path, "wb") as f:
        while chunk := await file.read(CHUNK_SIZE):
            f.write(chunk)

    # Create DB record
    pit_stop = PitStop(
        filename=unique_name,
        original_filename=file.filename or "unknown",
        status="pending",
    )
    db.add(pit_stop)
    await db.commit()
    await db.refresh(pit_stop)

    # Start background processing
    process_video(pit_stop.id, str(file_path))

    return UploadResponse(id=pit_stop.id, message="Video uploaded, processing started")


@router.post("/from-youtube", response_model=UploadResponse, status_code=202)
async def submit_youtube_url(body: YouTubeRequest, db: AsyncSession = Depends(get_db)):
    url = body.url.strip()
    if not any(host in url for host in ("youtube.com", "youtu.be")):
        raise HTTPException(400, "URL must be a YouTube link (youtube.com or youtu.be)")

    pit_stop = PitStop(
        filename="",  # filled after download
        original_filename=url,
        source_url=url,
        status="downloading",
    )
    db.add(pit_stop)
    await db.commit()
    await db.refresh(pit_stop)

    download_and_process(pit_stop.id, url)

    return UploadResponse(id=pit_stop.id, message="YouTube download started")


@router.get("", response_model=list[PitStopBase])
async def list_pit_stops(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PitStop).order_by(PitStop.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{pit_stop_id:int}", response_model=PitStopDetail)
async def get_pit_stop(pit_stop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PitStop)
        .options(selectinload(PitStop.summaries))
        .filter(PitStop.id == pit_stop_id)
    )
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(404, "Pit stop not found")
    return pit_stop


@router.get("/{pit_stop_id:int}/status", response_model=PitStopStatus)
async def get_status(pit_stop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PitStop).filter(PitStop.id == pit_stop_id)
    )
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(404, "Pit stop not found")

    total = pit_stop.total_frames or 0
    sample_rate = settings.FRAME_SAMPLE_RATE
    expected_frames = (total // sample_rate) + (1 if total % sample_rate else 0) if total > 0 else 0
    progress = (pit_stop.processed_frames / expected_frames * 100) if expected_frames > 0 else 0

    return PitStopStatus(
        id=pit_stop.id,
        status=pit_stop.status,
        processed_frames=pit_stop.processed_frames,
        total_frames=pit_stop.total_frames,
        progress_pct=round(min(progress, 100), 1),
    )


@router.get("/{pit_stop_id:int}/detections", response_model=DetectionPage)
async def get_detections(
    pit_stop_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    model_name: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Verify pit stop exists
    ps = await db.execute(select(PitStop).filter(PitStop.id == pit_stop_id))
    if not ps.scalar_one_or_none():
        raise HTTPException(404, "Pit stop not found")

    # Build filters
    filters = [Detection.pit_stop_id == pit_stop_id]
    if model_name:
        filters.append(Detection.model_name == model_name)

    # Count total
    count_result = await db.execute(
        select(func.count(Detection.id)).filter(*filters)
    )
    total = count_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * per_page
    result = await db.execute(
        select(Detection)
        .filter(*filters)
        .order_by(Detection.frame_number, Detection.id)
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()

    return DetectionPage(items=items, total=total, page=page, per_page=per_page)


@router.delete("/{pit_stop_id:int}", status_code=204)
async def delete_pit_stop(pit_stop_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PitStop).filter(PitStop.id == pit_stop_id))
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(404, "Pit stop not found")

    # Delete video file
    file_path = Path(settings.UPLOAD_DIR) / pit_stop.filename
    if file_path.exists():
        file_path.unlink()

    await db.delete(pit_stop)
    await db.commit()


@router.post("/{pit_stop_id:int}/reprocess", status_code=202)
async def reprocess(pit_stop_id: int, body: ReprocessRequest, db: AsyncSession = Depends(get_db)):
    """Re-run detection on a video using a different model (non-destructive)."""
    result = await db.execute(select(PitStop).filter(PitStop.id == pit_stop_id))
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(404, "Pit stop not found")

    # Only clear detections/summaries for the specified model, preserving others
    await db.execute(
        delete(Detection).filter(
            Detection.pit_stop_id == pit_stop_id,
            Detection.model_name == body.model_name,
        )
    )
    await db.execute(
        delete(DetectionSummary).filter(
            DetectionSummary.pit_stop_id == pit_stop_id,
            DetectionSummary.model_name == body.model_name,
        )
    )
    pit_stop.status = "processing"
    pit_stop.processed_frames = 0
    await db.commit()

    # Start reprocessing with specified model
    file_path = Path(settings.UPLOAD_DIR) / pit_stop.filename
    process_video(pit_stop.id, str(file_path), model_name=body.model_name)

    return {"message": f"Reprocessing started with model '{body.model_name}'"}


@router.get("/{pit_stop_id:int}/models-used")
async def get_models_used(pit_stop_id: int, db: AsyncSession = Depends(get_db)):
    """Return distinct model names that have detections for this pit stop."""
    ps = await db.execute(select(PitStop).filter(PitStop.id == pit_stop_id))
    if not ps.scalar_one_or_none():
        raise HTTPException(404, "Pit stop not found")

    result = await db.execute(
        select(Detection.model_name)
        .filter(Detection.pit_stop_id == pit_stop_id)
        .distinct()
    )
    models = [row[0] for row in result.all()]
    return {"models": models}


@router.get("/{pit_stop_id:int}/summaries")
async def get_summaries_by_model(
    pit_stop_id: int,
    model_name: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return detection summaries, optionally filtered by model_name."""
    ps = await db.execute(select(PitStop).filter(PitStop.id == pit_stop_id))
    if not ps.scalar_one_or_none():
        raise HTTPException(404, "Pit stop not found")

    filters = [DetectionSummary.pit_stop_id == pit_stop_id]
    if model_name:
        filters.append(DetectionSummary.model_name == model_name)

    result = await db.execute(
        select(DetectionSummary).filter(*filters)
    )
    return result.scalars().all()


@router.get("/{pit_stop_id:int}/preview-frame")
async def preview_frame(
    pit_stop_id: int,
    frame_number: int = Query(None),
    model_name: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Return a single video frame with detection bounding boxes drawn on it."""
    result = await db.execute(select(PitStop).filter(PitStop.id == pit_stop_id))
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(404, "Pit stop not found")
    if pit_stop.status not in ("completed", "processing"):
        raise HTTPException(400, "Pit stop must be completed or processing")

    video_path = str(Path(settings.UPLOAD_DIR) / pit_stop.filename)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(500, "Could not open video")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    target_frame = frame_number if frame_number is not None else total_frames // 2

    cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        raise HTTPException(500, "Could not read frame")

    # Get detections near this frame
    sync_db = get_sync_db()
    try:
        query = (
            sync_db.query(Detection)
            .filter(Detection.pit_stop_id == pit_stop_id)
            .filter(Detection.frame_number.between(target_frame - 2, target_frame + 2))
        )
        if model_name:
            query = query.filter(Detection.model_name == model_name)
        dets = query.all()

        # Draw boxes
        colors = {
            "person": (66, 133, 244), "car": (52, 168, 83), "truck": (251, 188, 4),
            "pit_crew": (239, 68, 68), "tire": (59, 130, 246), "jack": (245, 158, 11),
            "f1_car": (16, 185, 129), "pit_box": (139, 92, 246), "wheel_gun": (236, 72, 153),
            "helmet": (6, 182, 212),
        }

        for det in dets:
            x1 = int(det.bbox_x)
            y1 = int(det.bbox_y)
            x2 = int(det.bbox_x + det.bbox_w)
            y2 = int(det.bbox_y + det.bbox_h)
            color = colors.get(det.class_name, (200, 200, 200))

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{det.class_name} {det.confidence:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
            cv2.putText(frame, label, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    finally:
        sync_db.close()

    # Encode as JPEG
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return StreamingResponse(io.BytesIO(buffer.tobytes()), media_type="image/jpeg")
