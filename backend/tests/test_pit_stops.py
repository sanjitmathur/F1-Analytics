import io
from unittest.mock import patch


async def test_list_pit_stops_empty(client):
    resp = await client.get("/api/pit-stops")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_upload_video(client):
    video_bytes = b"\x00" * 1024
    with patch("app.routers.pit_stops.process_video"):
        resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(video_bytes), "video/mp4")},
        )
    assert resp.status_code == 202
    data = resp.json()
    assert "id" in data
    assert data["message"] == "Video uploaded, processing started"


async def test_upload_invalid_extension(client):
    resp = await client.post(
        "/api/pit-stops/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
    )
    assert resp.status_code == 400


async def test_get_pit_stop_not_found(client):
    resp = await client.get("/api/pit-stops/999")
    assert resp.status_code == 404


async def test_get_pit_stop_after_upload(client):
    with patch("app.routers.pit_stops.process_video"):
        upload_resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = upload_resp.json()["id"]

    resp = await client.get(f"/api/pit-stops/{pid}")
    assert resp.status_code == 200
    assert resp.json()["id"] == pid
    assert resp.json()["original_filename"] == "test.mp4"


async def test_delete_pit_stop(client):
    with patch("app.routers.pit_stops.process_video"):
        upload_resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = upload_resp.json()["id"]

    resp = await client.delete(f"/api/pit-stops/{pid}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/pit-stops/{pid}")
    assert resp.status_code == 404


async def test_delete_pit_stop_not_found(client):
    resp = await client.delete("/api/pit-stops/999")
    assert resp.status_code == 404


async def test_get_status_not_found(client):
    resp = await client.get("/api/pit-stops/999/status")
    assert resp.status_code == 404


async def test_models_used_not_found(client):
    resp = await client.get("/api/pit-stops/999/models-used")
    assert resp.status_code == 404


async def test_models_used_empty(client):
    with patch("app.routers.pit_stops.process_video"):
        upload_resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = upload_resp.json()["id"]

    resp = await client.get(f"/api/pit-stops/{pid}/models-used")
    assert resp.status_code == 200
    assert resp.json()["models"] == []


async def test_detections_not_found(client):
    resp = await client.get("/api/pit-stops/999/detections")
    assert resp.status_code == 404


async def test_detections_empty(client):
    with patch("app.routers.pit_stops.process_video"):
        upload_resp = await client.post(
            "/api/pit-stops/upload",
            files={"file": ("test.mp4", io.BytesIO(b"\x00" * 100), "video/mp4")},
        )
    pid = upload_resp.json()["id"]

    resp = await client.get(f"/api/pit-stops/{pid}/detections")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
