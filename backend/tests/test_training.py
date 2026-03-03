async def test_list_training_runs_empty(client):
    resp = await client.get("/api/training")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_training_run_not_found(client):
    resp = await client.get("/api/training/999")
    assert resp.status_code == 404


async def test_training_status_not_found(client):
    resp = await client.get("/api/training/999/status")
    assert resp.status_code == 404


async def test_start_training_dataset_not_found(client):
    resp = await client.post("/api/training/start", json={
        "dataset_id": 999,
        "model_name": "test-model",
        "base_model": "yolov8s.pt",
        "epochs": 10,
        "batch_size": 16,
        "image_size": 640,
        "patience": 5,
    })
    assert resp.status_code == 404
