import io
from unittest.mock import patch


async def test_list_frames_empty(client):
    resp = await client.get("/api/frames")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


async def test_extract_pit_stop_not_found(client):
    resp = await client.post("/api/frames/extract", json={
        "pit_stop_id": 999,
        "num_frames": 10,
        "strategy": "uniform",
    })
    assert resp.status_code == 404


async def test_extract_not_completed(client):
    with patch("app.routers.pit_stops.process_video"):
        upload_resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = upload_resp.json()["id"]

    resp = await client.post("/api/frames/extract", json={
        "pit_stop_id": pid,
        "num_frames": 10,
        "strategy": "uniform",
    })
    assert resp.status_code == 400


async def test_get_frame_image_not_found(client):
    resp = await client.get("/api/frames/999/image")
    assert resp.status_code == 404


async def test_delete_frame_not_found(client):
    resp = await client.delete("/api/frames/999")
    assert resp.status_code == 404


async def test_annotate_frame_not_found(client):
    resp = await client.post("/api/frames/999/annotate", json={"labels": []})
    assert resp.status_code == 404


async def test_get_annotations_not_found(client):
    resp = await client.get("/api/frames/999/annotations")
    assert resp.status_code == 404
