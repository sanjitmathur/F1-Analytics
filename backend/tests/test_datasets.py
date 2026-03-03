from unittest.mock import patch, MagicMock


async def test_list_datasets_empty(client):
    resp = await client.get("/api/datasets")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_dataset(client):
    with patch("app.routers.datasets.create_dataset_sync") as mock_create:
        mock_ds = MagicMock()
        mock_ds.id = 1
        mock_ds.name = "test-ds"
        mock_ds.version = "1.0"
        mock_ds.description = "A test dataset"
        mock_ds.class_names = '["pit_crew", "tire"]'
        mock_ds.total_images = 0
        mock_ds.total_labeled = 0
        mock_ds.train_count = 0
        mock_ds.val_count = 0
        mock_ds.created_at = "2025-01-01T00:00:00"
        mock_ds.updated_at = "2025-01-01T00:00:00"
        mock_create.return_value = mock_ds

        resp = await client.post("/api/datasets", json={
            "name": "test-ds",
            "description": "A test dataset",
            "class_names": ["pit_crew", "tire"],
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test-ds"
    assert data["class_names"] == ["pit_crew", "tire"]


async def test_get_dataset_not_found(client):
    resp = await client.get("/api/datasets/999")
    assert resp.status_code == 404


async def test_delete_dataset_not_found(client):
    resp = await client.delete("/api/datasets/999")
    assert resp.status_code == 404


async def test_add_frames_dataset_not_found(client):
    resp = await client.post("/api/datasets/999/add-frames", json={"frame_ids": [1]})
    assert resp.status_code == 404


async def test_split_dataset_not_found(client):
    resp = await client.post("/api/datasets/999/split", json={"train_ratio": 0.8})
    assert resp.status_code == 404


async def test_stats_dataset_not_found(client):
    resp = await client.get("/api/datasets/999/stats")
    assert resp.status_code == 404
