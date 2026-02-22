from pathlib import Path
from pydantic_settings import BaseSettings

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./f1_pitstop.db"
    SYNC_DATABASE_URL: str = "sqlite:///./f1_pitstop.db"
    UPLOAD_DIR: str = str(_PROJECT_ROOT / "data" / "uploads")
    YOLO_MODEL: str = "yolov8n.pt"
    FRAME_SAMPLE_RATE: int = 5

    # Phase 2 settings
    EXTRACTED_FRAMES_DIR: str = str(_PROJECT_ROOT / "data" / "extracted_frames")
    DATASETS_DIR: str = str(_PROJECT_ROOT / "data" / "datasets")
    MODELS_DIR: str = str(_PROJECT_ROOT / "data" / "models")
    DEFAULT_BASE_MODEL: str = "yolov8s.pt"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
