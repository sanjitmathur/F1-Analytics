import logging
import platform
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import pit_stops, frames, datasets, training, models
from .schemas import HealthResponse, SystemInfo
from .services.yolo_detector import detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    await init_db()
    logger.info("Loading YOLO model...")
    detector.load_model()
    logger.info("Startup complete")
    yield
    # Shutdown
    logger.info("Shutting down")


app = FastAPI(
    title="F1 Pit Stop Analytics",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pit_stops.router)
app.include_router(frames.router)
app.include_router(datasets.router)
app.include_router(training.router)
app.include_router(models.router)


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok")


@app.get("/api/system/info", response_model=SystemInfo)
async def system_info():
    import ultralytics

    def dir_size(path: str) -> str:
        p = Path(path)
        if not p.exists():
            return "0 MB"
        total = sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
        if total > 1024 * 1024 * 1024:
            return f"{total / (1024**3):.1f} GB"
        return f"{total / (1024**2):.1f} MB"

    return SystemInfo(
        python_version=platform.python_version(),
        yolo_version=ultralytics.__version__,
        cuda_available=torch.cuda.is_available(),
        gpu_name=torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        loaded_models=[m["name"] for m in detector.list_models()],
        disk_usage={
            "uploads": dir_size(settings.UPLOAD_DIR),
            "extracted_frames": dir_size(settings.EXTRACTED_FRAMES_DIR),
            "datasets": dir_size(settings.DATASETS_DIR),
            "models": dir_size(settings.MODELS_DIR),
        },
    )
