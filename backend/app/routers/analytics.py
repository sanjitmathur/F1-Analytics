"""API endpoints for pit stop analytics."""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PitStop, PitStopAnalytics
from ..schemas import PhaseOut, PitStopAnalyticsOut, PitStopComparisonItem, PitStopComparisonOut
from ..services.pit_stop_analyzer import analyze_pit_stop
from ..database import get_sync_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# NOTE: compare/multi must come BEFORE /{pit_stop_id} routes,
# otherwise FastAPI tries to parse "compare" as an int and fails.
@router.get("/compare/multi", response_model=PitStopComparisonOut)
async def compare_pit_stops(
    ids: str = Query(..., description="Comma-separated pit stop IDs"),
    db: AsyncSession = Depends(get_db),
):
    """Compare analytics across multiple pit stops, ranked by efficiency."""
    try:
        pit_stop_ids = [int(x.strip()) for x in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IDs format. Use comma-separated integers.")

    items = []
    for pid in pit_stop_ids:
        # Get pit stop info
        ps_result = await db.execute(select(PitStop).where(PitStop.id == pid))
        ps = ps_result.scalar_one_or_none()
        if not ps:
            continue

        # Get analytics (any model)
        a_result = await db.execute(
            select(PitStopAnalytics).where(PitStopAnalytics.pit_stop_id == pid)
        )
        analytics = a_result.scalar_one_or_none()

        items.append(PitStopComparisonItem(
            pit_stop_id=pid,
            original_filename=ps.original_filename,
            total_stop_duration_sec=analytics.total_stop_duration_sec if analytics else None,
            stationary_duration_sec=analytics.stationary_duration_sec if analytics else None,
            efficiency_score=analytics.efficiency_score if analytics else None,
            max_crew_count=analytics.max_crew_count if analytics else None,
            model_name=analytics.model_name if analytics else "default",
        ))

    # Rank by efficiency score (highest first), None values last
    items.sort(key=lambda x: (x.efficiency_score is None, -(x.efficiency_score or 0)))
    for i, item in enumerate(items):
        item.rank = i + 1

    return PitStopComparisonOut(items=items, count=len(items))


@router.post("/{pit_stop_id}/analyze", response_model=PitStopAnalyticsOut)
async def run_analysis(
    pit_stop_id: int,
    model_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Run (or re-run) pit stop analysis for a given video."""
    result = await db.execute(select(PitStop).where(PitStop.id == pit_stop_id))
    pit_stop = result.scalar_one_or_none()
    if not pit_stop:
        raise HTTPException(status_code=404, detail="Pit stop not found")
    if pit_stop.status != "completed":
        raise HTTPException(status_code=400, detail="Pit stop processing not completed")

    effective_model = model_name or "default"

    # Run analysis using sync DB (analyzer uses sync queries)
    sync_db = get_sync_db()
    try:
        analytics = analyze_pit_stop(sync_db, pit_stop_id, effective_model)
        return _analytics_to_response(analytics)
    finally:
        sync_db.close()


@router.get("/{pit_stop_id}", response_model=PitStopAnalyticsOut)
async def get_analytics(
    pit_stop_id: int,
    model_name: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get stored analytics for a pit stop."""
    effective_model = model_name or "default"
    result = await db.execute(
        select(PitStopAnalytics).where(
            PitStopAnalytics.pit_stop_id == pit_stop_id,
            PitStopAnalytics.model_name == effective_model,
        )
    )
    analytics = result.scalar_one_or_none()
    if not analytics:
        raise HTTPException(status_code=404, detail="Analytics not found. Run analysis first.")
    return _analytics_to_response(analytics)


def _analytics_to_response(analytics: PitStopAnalytics) -> PitStopAnalyticsOut:
    """Convert ORM model to response schema, parsing phases JSON."""
    phases_raw = json.loads(analytics.phases_json) if analytics.phases_json else []
    phases = [PhaseOut(**p) for p in phases_raw]

    return PitStopAnalyticsOut(
        id=analytics.id,
        pit_stop_id=analytics.pit_stop_id,
        car_first_seen_sec=analytics.car_first_seen_sec,
        car_last_seen_sec=analytics.car_last_seen_sec,
        total_stop_duration_sec=analytics.total_stop_duration_sec,
        stationary_start_sec=analytics.stationary_start_sec,
        stationary_end_sec=analytics.stationary_end_sec,
        stationary_duration_sec=analytics.stationary_duration_sec,
        max_crew_count=analytics.max_crew_count,
        avg_crew_count=analytics.avg_crew_count,
        crew_convergence_frame=analytics.crew_convergence_frame,
        jack_detected=analytics.jack_detected,
        wheel_gun_detected=analytics.wheel_gun_detected,
        tire_change_detected=analytics.tire_change_detected,
        efficiency_score=analytics.efficiency_score,
        phases=phases,
        model_name=analytics.model_name,
        class_mapping_used=analytics.class_mapping_used,
        analysis_version=analytics.analysis_version,
        created_at=analytics.created_at,
    )
