import logging
import random
import threading
from pathlib import Path

import cv2

from ..config import settings
from ..database import get_sync_db
from ..models import ExtractedFrame, PitStop

logger = logging.getLogger(__name__)

# In-memory tracking for extraction jobs
_extraction_jobs: dict[int, dict] = {}


def extract_frames(pit_stop_id: int, num_frames: int = 100, strategy: str = "uniform") -> int:
    """Extract frames from a video in a background thread.

    Returns the pit_stop_id as the job_id (one extraction per video).
    """
    _extraction_jobs[pit_stop_id] = {
        "status": "extracting",
        "extracted": 0,
        "total": num_frames,
    }

    thread = threading.Thread(
        target=_extract_frames_sync,
        args=(pit_stop_id, num_frames, strategy),
        daemon=True,
    )
    thread.start()
    return pit_stop_id


def get_extraction_status(job_id: int) -> dict:
    job = _extraction_jobs.get(job_id)
    if not job:
        return {"status": "not_found", "extracted": 0, "total": 0, "progress_pct": 0}
    total = job["total"]
    extracted = job["extracted"]
    pct = round(extracted / total * 100, 1) if total > 0 else 0
    return {
        "status": job["status"],
        "extracted": extracted,
        "total": total,
        "progress_pct": min(pct, 100),
    }


def _extract_frames_sync(pit_stop_id: int, num_frames: int, strategy: str):
    db = get_sync_db()
    try:
        pit_stop = db.query(PitStop).filter(PitStop.id == pit_stop_id).first()
        if not pit_stop:
            _extraction_jobs[pit_stop_id]["status"] = "failed"
            return

        video_path = str(Path(settings.UPLOAD_DIR) / pit_stop.filename)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            _extraction_jobs[pit_stop_id]["status"] = "failed"
            return

        total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

        # Determine which frame numbers to extract
        frame_numbers = _select_frame_numbers(total_video_frames, num_frames, strategy)
        actual_count = len(frame_numbers)
        _extraction_jobs[pit_stop_id]["total"] = actual_count

        # Create output directory
        out_dir = Path(settings.EXTRACTED_FRAMES_DIR) / str(pit_stop_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        extracted = 0
        for fn in sorted(frame_numbers):
            cap.set(cv2.CAP_PROP_POS_FRAMES, fn)
            ret, frame = cap.read()
            if not ret:
                continue

            h, w = frame.shape[:2]
            timestamp = round(fn / fps, 3) if fps > 0 else 0

            img_filename = f"frame_{fn:06d}.jpg"
            img_path = out_dir / img_filename
            cv2.imwrite(str(img_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 90])

            # Store relative path from project root
            rel_path = f"{pit_stop_id}/{img_filename}"

            db.add(ExtractedFrame(
                pit_stop_id=pit_stop_id,
                frame_number=fn,
                timestamp_sec=timestamp,
                file_path=rel_path,
                width=w,
                height=h,
            ))
            extracted += 1
            _extraction_jobs[pit_stop_id]["extracted"] = extracted

            # Commit every 20 frames
            if extracted % 20 == 0:
                db.commit()

        cap.release()
        db.commit()

        _extraction_jobs[pit_stop_id]["status"] = "completed"
        _extraction_jobs[pit_stop_id]["extracted"] = extracted
        logger.info(f"Extracted {extracted} frames from pit stop {pit_stop_id}")

    except Exception:
        logger.exception(f"Frame extraction failed for pit stop {pit_stop_id}")
        _extraction_jobs[pit_stop_id]["status"] = "failed"
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()


def _select_frame_numbers(total_frames: int, num_frames: int, strategy: str) -> list[int]:
    """Select frame numbers based on strategy."""
    num_frames = min(num_frames, total_frames)

    if strategy == "random":
        return sorted(random.sample(range(total_frames), num_frames))
    elif strategy == "interval":
        interval = max(1, total_frames // num_frames)
        return [i * interval for i in range(num_frames) if i * interval < total_frames]
    else:  # uniform (default)
        if num_frames <= 1:
            return [total_frames // 2]
        step = (total_frames - 1) / (num_frames - 1)
        return [int(round(i * step)) for i in range(num_frames)]
