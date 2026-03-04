import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_system_info(client):
    resp = await client.get("/api/system/info")
    assert resp.status_code == 200
    data = resp.json()
    assert "python_version" in data
    assert data["app"] == "F1 AI Race Strategy Simulator"
