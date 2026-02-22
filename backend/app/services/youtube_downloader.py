import logging
import threading
import uuid
from pathlib import Path

import yt_dlp

from ..config import settings
from ..database import get_sync_db
from ..models import PitStop
from .video_processor import process_video as _process_video_bg

logger = logging.getLogger(__name__)


def download_and_process(pit_stop_id: int, url: str):
    """Download a YouTube video then hand off to YOLO processing. Runs in background thread."""
    thread = threading.Thread(
        target=_download_and_process_sync,
        args=(pit_stop_id, url),
        daemon=True,
    )
    thread.start()
    return thread


def _download_and_process_sync(pit_stop_id: int, url: str):
    db = get_sync_db()
    try:
        pit_stop = db.query(PitStop).filter(PitStop.id == pit_stop_id).first()
        if not pit_stop:
            logger.error(f"PitStop {pit_stop_id} not found")
            return

        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}"
        output_template = str(upload_dir / unique_name) + ".%(ext)s"

        ydl_opts = {
            "format": "best[height<=720][ext=mp4]/best[height<=720]/best",
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
            "merge_output_format": "mp4",
        }

        logger.info(f"Downloading YouTube video for pit stop {pit_stop_id}: {url}")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title", "youtube_video")
            ext = info.get("ext", "mp4")
            downloaded_file = Path(ydl.prepare_filename(info))

        if not downloaded_file.exists():
            # yt-dlp may have merged to mp4
            mp4_path = downloaded_file.with_suffix(".mp4")
            if mp4_path.exists():
                downloaded_file = mp4_path
            else:
                raise FileNotFoundError(f"Downloaded file not found: {downloaded_file}")

        # Update DB with filename
        pit_stop.filename = downloaded_file.name
        pit_stop.original_filename = title
        pit_stop.status = "pending"
        db.commit()

        logger.info(f"Download complete for pit stop {pit_stop_id}: {downloaded_file.name}")

        # Hand off to YOLO processing (starts its own thread)
        _process_video_bg(pit_stop_id, str(downloaded_file))

    except Exception as e:
        logger.exception(f"YouTube download failed for pit stop {pit_stop_id}")
        try:
            pit_stop = db.query(PitStop).filter(PitStop.id == pit_stop_id).first()
            if pit_stop:
                pit_stop.status = "failed"
                pit_stop.error_message = str(e)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
