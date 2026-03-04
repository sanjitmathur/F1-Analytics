import os
import tempfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Set test env vars before importing app modules
_test_dir = tempfile.mkdtemp()
os.environ["FASTF1_CACHE_DIR"] = os.path.join(_test_dir, "fastf1_cache")
os.environ["CSV_EXPORT_DIR"] = os.path.join(_test_dir, "csv_exports")

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

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
