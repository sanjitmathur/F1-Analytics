import pytest


@pytest.mark.asyncio
async def test_preset_drivers(client):
    resp = await client.get("/api/presets/drivers")
    assert resp.status_code == 200
    drivers = resp.json()
    assert len(drivers) == 20
    assert drivers[0]["name"] == "Max Verstappen"


@pytest.mark.asyncio
async def test_preset_tracks(client):
    resp = await client.get("/api/presets/tracks")
    assert resp.status_code == 200
    tracks = resp.json()
    assert len(tracks) == 10
    names = [t["name"] for t in tracks]
    assert "Monaco" in names
    assert "Monza" in names


@pytest.mark.asyncio
async def test_team_colors(client):
    resp = await client.get("/api/presets/team-colors")
    assert resp.status_code == 200
    colors = resp.json()
    assert "Ferrari" in colors
    assert colors["Ferrari"] == "#E8002D"
