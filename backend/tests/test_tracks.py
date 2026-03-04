import pytest


@pytest.mark.asyncio
async def test_list_tracks(client):
    resp = await client.get("/api/tracks")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_create_track(client):
    data = {
        "name": "Test Track",
        "country": "Testland",
        "total_laps": 50,
        "base_lap_time": 85.0,
    }
    resp = await client.post("/api/tracks", json=data)
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Test Track"
    assert body["is_preset"] is False


@pytest.mark.asyncio
async def test_get_track(client):
    # Create first
    data = {
        "name": "Get Track",
        "country": "Testland",
        "total_laps": 50,
        "base_lap_time": 85.0,
    }
    create_resp = await client.post("/api/tracks", json=data)
    track_id = create_resp.json()["id"]

    resp = await client.get(f"/api/tracks/{track_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Get Track"


@pytest.mark.asyncio
async def test_delete_track(client):
    data = {
        "name": "Delete Track",
        "country": "Testland",
        "total_laps": 50,
        "base_lap_time": 85.0,
    }
    create_resp = await client.post("/api/tracks", json=data)
    track_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/tracks/{track_id}")
    assert resp.status_code == 200

    resp = await client.get(f"/api/tracks/{track_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_track_not_found(client):
    resp = await client.get("/api/tracks/9999")
    assert resp.status_code == 404
