from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..constants import F1_CLASS_TO_ID
from ..database import get_db
from ..models import ExtractedFrame, PitStop
from ..schemas import (
    AnnotateRequest,
    AnnotationLabel,
    AnnotationResponse,
    ExtractedFramePage,
    FrameExtractionRequest,
    FrameExtractionResponse,
)
from ..services.frame_extractor import extract_frames, get_extraction_status

router = APIRouter(prefix="/api/frames", tags=["frames"])


@router.post("/extract", response_model=FrameExtractionResponse, status_code=202)
async def start_extraction(body: FrameExtractionRequest, db: AsyncSession = Depends(get_db)):
    # Verify pit stop exists and is completed
    result = await db.execute(
        select(PitStop).filter(PitStop.id == body.pit_stop_id)
    )
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(404, "Pit stop not found")
    if pit_stop.status != "completed":
        raise HTTPException(400, "Pit stop must be completed before extracting frames")

    if body.strategy not in ("uniform", "random", "interval"):
        raise HTTPException(400, "Strategy must be 'uniform', 'random', or 'interval'")

    job_id = extract_frames(body.pit_stop_id, body.num_frames, body.strategy)
    return FrameExtractionResponse(job_id=job_id, message="Frame extraction started")


@router.get("/extract/{job_id}/status")
async def extraction_status(job_id: int):
    return get_extraction_status(job_id)


@router.get("", response_model=ExtractedFramePage)
async def list_frames(
    pit_stop_id: int = Query(None),
    labeled: bool = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(ExtractedFrame)
    count_query = select(func.count(ExtractedFrame.id))

    if pit_stop_id is not None:
        query = query.filter(ExtractedFrame.pit_stop_id == pit_stop_id)
        count_query = count_query.filter(ExtractedFrame.pit_stop_id == pit_stop_id)
    if labeled is not None:
        query = query.filter(ExtractedFrame.is_labeled == labeled)
        count_query = count_query.filter(ExtractedFrame.is_labeled == labeled)

    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    result = await db.execute(
        query.order_by(ExtractedFrame.frame_number)
        .offset(offset)
        .limit(per_page)
    )
    items = result.scalars().all()

    return ExtractedFramePage(items=items, total=total, page=page, per_page=per_page)


@router.get("/{frame_id}/image")
async def get_frame_image(frame_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExtractedFrame).filter(ExtractedFrame.id == frame_id)
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(404, "Frame not found")

    file_path = Path(settings.EXTRACTED_FRAMES_DIR) / frame.file_path
    if not file_path.exists():
        raise HTTPException(404, "Frame image file not found")

    return FileResponse(str(file_path), media_type="image/jpeg")


@router.delete("/{frame_id}", status_code=204)
async def delete_frame(frame_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ExtractedFrame).filter(ExtractedFrame.id == frame_id)
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(404, "Frame not found")

    # Delete file
    file_path = Path(settings.EXTRACTED_FRAMES_DIR) / frame.file_path
    if file_path.exists():
        file_path.unlink()

    await db.delete(frame)
    await db.commit()


@router.post("/{frame_id}/annotate", status_code=200)
async def annotate_frame(frame_id: int, body: AnnotateRequest, db: AsyncSession = Depends(get_db)):
    """Save bounding box annotations for a frame in YOLO format."""
    result = await db.execute(
        select(ExtractedFrame).filter(ExtractedFrame.id == frame_id)
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(404, "Frame not found")

    # Build YOLO-format label file path alongside the image
    img_path = Path(settings.EXTRACTED_FRAMES_DIR) / frame.file_path
    label_path = img_path.with_suffix(".txt")

    # Write YOLO format: class_id center_x center_y width height (all normalized)
    lines = []
    for label in body.labels:
        class_id = F1_CLASS_TO_ID.get(label.class_name)
        if class_id is None:
            raise HTTPException(400, f"Unknown class: {label.class_name}")
        # Convert from top-left (x,y,w,h) to center (cx,cy,w,h)
        cx = label.bbox_x + label.bbox_w / 2
        cy = label.bbox_y + label.bbox_h / 2
        lines.append(f"{class_id} {cx:.6f} {cy:.6f} {label.bbox_w:.6f} {label.bbox_h:.6f}")

    label_path.write_text("\n".join(lines))

    # Mark frame as labeled
    frame.is_labeled = len(body.labels) > 0
    await db.commit()

    return {"message": f"Saved {len(body.labels)} annotations"}


@router.get("/{frame_id}/annotations", response_model=AnnotationResponse)
async def get_annotations(frame_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve existing annotations for a frame."""
    result = await db.execute(
        select(ExtractedFrame).filter(ExtractedFrame.id == frame_id)
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(404, "Frame not found")

    img_path = Path(settings.EXTRACTED_FRAMES_DIR) / frame.file_path
    label_path = img_path.with_suffix(".txt")

    if not label_path.exists():
        return AnnotationResponse(labels=[])

    from ..constants import F1_ID_TO_CLASS

    labels = []
    for line in label_path.read_text().strip().split("\n"):
        if not line.strip():
            continue
        parts = line.strip().split()
        if len(parts) != 5:
            continue
        class_id = int(parts[0])
        cx, cy, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
        class_name = F1_ID_TO_CLASS.get(class_id, f"class_{class_id}")
        # Convert from center (cx,cy,w,h) to top-left (x,y,w,h)
        labels.append(AnnotationLabel(
            class_name=class_name,
            bbox_x=cx - w / 2,
            bbox_y=cy - h / 2,
            bbox_w=w,
            bbox_h=h,
        ))

    return AnnotationResponse(labels=labels)
