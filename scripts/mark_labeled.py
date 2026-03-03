"""Mark auto-annotated frames as labeled in the database."""

import os
import sys
from pathlib import Path

# Must run from backend dir for DB path to resolve correctly
backend_dir = Path(__file__).resolve().parent.parent / "backend"
os.chdir(backend_dir)
sys.path.insert(0, str(backend_dir))

from app.database import SyncSessionLocal
from app.models import ExtractedFrame
from app.config import settings


def mark_labeled():
    db = SyncSessionLocal()
    try:
        frames = db.query(ExtractedFrame).all()
        labeled_count = 0

        for frame in frames:
            img_path = Path(settings.EXTRACTED_FRAMES_DIR) / frame.file_path
            label_path = img_path.with_suffix(".txt")

            if label_path.exists() and label_path.stat().st_size > 0:
                frame.is_labeled = True
                labeled_count += 1

        db.commit()
        print(f"Marked {labeled_count} / {len(frames)} frames as labeled")
    finally:
        db.close()


if __name__ == "__main__":
    mark_labeled()
