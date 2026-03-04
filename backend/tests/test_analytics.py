"""Tests for pit stop analytics endpoints and scoring logic."""

import io
from unittest.mock import patch

from sqlalchemy.orm import sessionmaker, Session

from app.models import Detection, PitStop
from app.services.pit_stop_analyzer import _compute_efficiency_score


# --- Helper to create a completed pit stop with detections ---

async def _create_completed_pit_stop(client, sync_engine, class_names=None):
    """Create a pit stop and manually insert detections (bypassing real video processing)."""
    if class_names is None:
        class_names = ["person", "car"]

    with patch("app.routers.pit_stops.process_video"):
        resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = resp.json()["id"]

    # Directly update the pit stop to completed and insert detections
    SyncSession = sessionmaker(sync_engine, class_=Session)
    db = SyncSession()
    try:
        ps = db.query(PitStop).filter(PitStop.id == pid).first()
        ps.status = "completed"
        ps.fps = 30.0
        ps.total_frames = 300
        ps.processed_frames = 60
        ps.duration_sec = 10.0
        db.commit()

        # Insert detections simulating a pit stop
        detections = []
        for frame in range(0, 300, 5):
            ts = round(frame / 30.0, 3)
            # Car visible throughout
            for cn in class_names:
                if cn in ("car", "f1_car"):
                    detections.append(Detection(
                        pit_stop_id=pid,
                        frame_number=frame,
                        timestamp_sec=ts,
                        class_name=cn,
                        confidence=0.9,
                        bbox_x=100, bbox_y=100, bbox_w=200, bbox_h=100,
                        model_name="default",
                    ))
                elif cn in ("person", "pit_crew"):
                    # Crew appears mid-stop
                    if 2.0 <= ts <= 8.0:
                        for i in range(3):
                            detections.append(Detection(
                                pit_stop_id=pid,
                                frame_number=frame,
                                timestamp_sec=ts,
                                class_name=cn,
                                confidence=0.8,
                                bbox_x=50 + i * 60, bbox_y=150,
                                bbox_w=40, bbox_h=80,
                                model_name="default",
                            ))

        db.bulk_save_objects(detections)
        db.commit()
    finally:
        db.close()

    return pid


# --- Endpoint tests ---

async def test_analyze_not_found(client):
    resp = await client.post("/api/analytics/999/analyze")
    assert resp.status_code == 404


async def test_analyze_not_completed(client):
    with patch("app.routers.pit_stops.process_video"):
        upload_resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = upload_resp.json()["id"]
    resp = await client.post(f"/api/analytics/{pid}/analyze")
    assert resp.status_code == 400


async def test_get_analytics_not_found(client):
    resp = await client.get("/api/analytics/999")
    assert resp.status_code == 404


async def test_analyze_with_coco_classes(client):
    from tests.conftest import test_sync_engine

    pid = await _create_completed_pit_stop(client, test_sync_engine, ["person", "car"])

    with patch("app.routers.analytics.get_sync_db") as mock_sync:
        SyncSession = sessionmaker(test_sync_engine, class_=Session)
        mock_sync.return_value = SyncSession()

        resp = await client.post(f"/api/analytics/{pid}/analyze")

    assert resp.status_code == 200
    data = resp.json()
    assert data["pit_stop_id"] == pid
    assert data["class_mapping_used"] == "coco"
    assert data["car_first_seen_sec"] is not None
    assert data["max_crew_count"] >= 1
    assert data["efficiency_score"] is not None
    assert isinstance(data["phases"], list)


async def test_analyze_with_f1_classes(client):
    from tests.conftest import test_sync_engine

    pid = await _create_completed_pit_stop(client, test_sync_engine, ["pit_crew", "f1_car"])

    with patch("app.routers.analytics.get_sync_db") as mock_sync:
        SyncSession = sessionmaker(test_sync_engine, class_=Session)
        mock_sync.return_value = SyncSession()

        resp = await client.post(f"/api/analytics/{pid}/analyze")

    assert resp.status_code == 200
    data = resp.json()
    assert data["class_mapping_used"] == "f1_custom"
    assert data["car_first_seen_sec"] is not None


async def test_compare_endpoint(client):
    from tests.conftest import test_sync_engine

    pid1 = await _create_completed_pit_stop(client, test_sync_engine, ["person", "car"])
    pid2 = await _create_completed_pit_stop(client, test_sync_engine, ["person", "car"])

    # Run analysis on both
    SyncSession = sessionmaker(test_sync_engine, class_=Session)
    with patch("app.routers.analytics.get_sync_db") as mock_sync:
        mock_sync.return_value = SyncSession()
        await client.post(f"/api/analytics/{pid1}/analyze")
    with patch("app.routers.analytics.get_sync_db") as mock_sync:
        mock_sync.return_value = SyncSession()
        await client.post(f"/api/analytics/{pid2}/analyze")

    resp = await client.get(f"/api/analytics/compare/multi?ids={pid1},{pid2}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["rank"] == 1
    assert data["items"][1]["rank"] == 2


async def test_compare_invalid_ids(client):
    resp = await client.get("/api/analytics/compare/multi?ids=abc")
    assert resp.status_code == 400


# --- Unit tests for efficiency scoring ---

def test_efficiency_score_boundaries():
    assert _compute_efficiency_score(None) is None
    assert _compute_efficiency_score(0) is None
    assert _compute_efficiency_score(2.0) == 100.0
    assert _compute_efficiency_score(2.5) == 100.0
    assert _compute_efficiency_score(3.0) == 90.0
    assert _compute_efficiency_score(3.5) == 80.0
    assert _compute_efficiency_score(5.0) == 50.0
    assert _compute_efficiency_score(8.0) == 20.0
    assert _compute_efficiency_score(20.0) == 5.0


def test_efficiency_score_monotonic_decrease():
    """Score should decrease as duration increases."""
    prev_score = 100.0
    for d in [2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0]:
        score = _compute_efficiency_score(d)
        assert score is not None
        assert score <= prev_score, f"Score should decrease: {d}s gave {score}, prev was {prev_score}"
        prev_score = score
