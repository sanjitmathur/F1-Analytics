"""FastF1 data loading service."""

from __future__ import annotations

import logging
import os

from sqlalchemy import select

from ..config import settings
from ..database import get_sync_db
from ..models import ImportedRaceData

logger = logging.getLogger(__name__)


def import_session_sync(
    record_id: int,
    year: int,
    grand_prix: str,
    session_type: str = "Race",
) -> None:
    """Import a FastF1 session in a background thread."""
    db = get_sync_db()
    try:
        import fastf1

        # Set up cache
        cache_dir = settings.FASTF1_CACHE_DIR
        os.makedirs(cache_dir, exist_ok=True)
        fastf1.Cache.enable_cache(cache_dir)

        # Load session
        session = fastf1.get_session(year, grand_prix, session_type)
        session.load()

        # Export to CSV
        export_dir = settings.CSV_EXPORT_DIR
        os.makedirs(export_dir, exist_ok=True)
        csv_filename = f"{year}_{grand_prix.replace(' ', '_')}_{session_type}.csv"
        csv_path = os.path.join(export_dir, csv_filename)

        laps_df = session.laps
        laps_df.to_csv(csv_path, index=False)

        # Update record
        record = db.execute(
            select(ImportedRaceData).where(ImportedRaceData.id == record_id)
        ).scalar_one_or_none()

        if record:
            record.csv_path = csv_path
            record.driver_count = len(laps_df["Driver"].unique()) if "Driver" in laps_df.columns else 0
            record.total_laps = int(laps_df["LapNumber"].max()) if "LapNumber" in laps_df.columns else 0
            db.commit()

        logger.info(f"FastF1 import complete: {csv_path}")

    except Exception as e:
        logger.exception(f"FastF1 import failed: {e}")
    finally:
        db.close()
