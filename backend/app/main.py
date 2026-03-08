import logging
import platform
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .constants import CALENDAR_2026, PRESET_TRACKS
from .database import AsyncSessionLocal, init_db
from .models import RaceWeekend, Season, Track
from .routers import (
    accuracy,
    data_import,
    head_to_head,
    monte_carlo,
    predictions,
    presets,
    season,
    simulations,
    tracks,
    weather,
)
from .schemas import HealthResponse
from .services.real_results_fetcher import auto_fetch_completed_races, rebuild_real_standings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_preset_tracks():
    """Seed preset tracks if they don't exist."""
    async with AsyncSessionLocal() as db:
        for track_data in PRESET_TRACKS:
            result = await db.execute(
                select(Track).where(Track.name == track_data["name"])
            )
            if not result.scalar_one_or_none():
                db.add(Track(**track_data, is_preset=True))
        await db.commit()
    logger.info(f"Seeded {len(PRESET_TRACKS)} preset tracks")


async def seed_2026_season():
    """Seed 2026 season + 24 race weekends from calendar constants."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Season).where(Season.year == 2026))
        season_row = result.scalar_one_or_none()
        if season_row:
            return  # already seeded

        season_row = Season(year=2026, is_active=True)
        db.add(season_row)
        await db.flush()

        for race in CALENDAR_2026:
            db.add(RaceWeekend(
                season_id=season_row.id,
                round_number=race["round"],
                name=race["name"],
                track_name=race["track"],
                country=race["country"],
                race_date=race["date"].isoformat(),
                lat=race["lat"],
                lon=race["lon"],
                total_laps=race["total_laps"],
                base_lap_time=race["base_lap_time"],
                pit_loss_time=race["pit_loss"],
                drs_zones=race["drs_zones"],
                overtake_difficulty=race["overtake_difficulty"],
                safety_car_probability=race["sc_probability"],
            ))
        await db.commit()
    logger.info(f"Seeded 2026 season with {len(CALENDAR_2026)} race weekends")


def _sync_real_results():
    """Sync real results in a background thread (uses sync DB).

    1. Rebuild standings from hardcoded REAL_RESULTS_2026
    2. Try to auto-fetch any newly completed races via FastF1
    3. If new races found, rebuild again with those included
    """
    try:
        # First pass: rebuild from hardcoded results
        rebuild_real_standings()

        # Second pass: try auto-fetching new races via FastF1
        new_results = auto_fetch_completed_races()
        if new_results:
            rebuild_real_standings(extra_results=new_results)
            logger.info("Auto-fetched results for %d new rounds", len(new_results))
    except Exception:
        logger.exception("Error syncing real results")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    await seed_preset_tracks()
    await seed_2026_season()

    # Sync real results in background thread (uses sync DB engine)
    thread = threading.Thread(target=_sync_real_results, daemon=True)
    thread.start()

    logger.info("Startup complete")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="F1 AI Race Strategy Simulator",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tracks.router)
app.include_router(simulations.router)
app.include_router(monte_carlo.router)
app.include_router(data_import.router)
app.include_router(presets.router)
app.include_router(season.router)
app.include_router(predictions.router)
app.include_router(head_to_head.router)
app.include_router(accuracy.router)
app.include_router(weather.router)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok")


@app.get("/api/system/info")
async def system_info():
    return {
        "python_version": platform.python_version(),
        "app": "F1 AI Race Strategy Simulator",
        "version": "1.0.0",
    }
