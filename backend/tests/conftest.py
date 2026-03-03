import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Set test env vars before importing app modules
_test_dir = tempfile.mkdtemp()
os.environ["UPLOAD_DIR"] = os.path.join(_test_dir, "uploads")
os.environ["EXTRACTED_FRAMES_DIR"] = os.path.join(_test_dir, "extracted_frames")
os.environ["DATASETS_DIR"] = os.path.join(_test_dir, "datasets")
os.environ["MODELS_DIR"] = os.path.join(_test_dir, "models")
os.makedirs(os.environ["UPLOAD_DIR"], exist_ok=True)
os.makedirs(os.environ["EXTRACTED_FRAMES_DIR"], exist_ok=True)
os.makedirs(os.environ["DATASETS_DIR"], exist_ok=True)
os.makedirs(os.environ["MODELS_DIR"], exist_ok=True)

from app.database import Base, get_db
from app.main import app


TEST_DB_URL = f"sqlite+aiosqlite:///{os.path.join(_test_dir, 'test.db')}"
TEST_SYNC_DB_URL = f"sqlite:///{os.path.join(_test_dir, 'test.db')}"

test_async_engine = create_async_engine(TEST_DB_URL, echo=False)
TestAsyncSession = sessionmaker(test_async_engine, class_=AsyncSession, expire_on_commit=False)

test_sync_engine = create_engine(TEST_SYNC_DB_URL, echo=False)


@event.listens_for(test_sync_engine, "connect")
def _set_wal(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


async def override_get_db():
    async with TestAsyncSession() as session:
        yield session


# Mock YOLO detector so tests don't need ultralytics/model weights
_mock_detector = MagicMock()
_mock_detector.detect_frame.return_value = []
_mock_detector.get_active_model_name.return_value = "default"
_mock_detector.list_models.return_value = [
    {"name": "default", "path": "yolov8n.pt", "type": "coco"}
]
_mock_detector.load_model = MagicMock()
_mock_detector.set_active_model = MagicMock()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create tables before each test and drop after."""
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing FastAPI endpoints."""
    app.dependency_overrides[get_db] = override_get_db

    # Create a real sync session factory bound to the test DB
    from sqlalchemy.orm import Session
    TestSyncSession = sessionmaker(test_sync_engine, class_=Session)

    def _get_test_sync_db():
        return TestSyncSession()

    with patch("app.routers.pit_stops.get_sync_db", _get_test_sync_db), \
         patch("app.services.trainer.get_sync_db", _get_test_sync_db), \
         patch("app.services.video_processor.detector", _mock_detector), \
         patch("app.routers.models.detector", _mock_detector), \
         patch("app.main.detector", _mock_detector):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    app.dependency_overrides.clear()
