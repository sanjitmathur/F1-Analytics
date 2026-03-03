async def test_list_models(client):
    resp = await client.get("/api/models")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(m["name"] == "default" for m in data)


async def test_get_active_model(client):
    resp = await client.get("/api/models/active")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "default"


async def test_set_active_model(client):
    resp = await client.post("/api/models/active", json={"model_name": "default"})
    assert resp.status_code == 200
