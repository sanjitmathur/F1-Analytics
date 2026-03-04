import logging

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

logger = logging.getLogger(__name__)


# Async engine for FastAPI endpoints
async_engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for background simulation threads
sync_engine = create_engine(settings.SYNC_DATABASE_URL, echo=False)
SyncSessionLocal = sessionmaker(sync_engine, expire_on_commit=False)


# Enable WAL mode for concurrent read/write
@event.listens_for(sync_engine, "connect")
def set_sqlite_wal_sync(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


class Base(DeclarativeBase):
    pass


async def init_db():
    async with async_engine.begin() as conn:
        await conn.exec_driver_sql("PRAGMA journal_mode=WAL")
        from . import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


def get_sync_db() -> Session:
    return SyncSessionLocal()
