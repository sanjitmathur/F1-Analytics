from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./f1_pitstop.db"
    SYNC_DATABASE_URL: str = "sqlite:///./f1_pitstop.db"
    UPLOAD_DIR: str = str(Path(__file__).resolve().parent.parent.parent / "data" / "uploads")
    YOLO_MODEL: str = "yolov8n.pt"
    FRAME_SAMPLE_RATE: int = 5

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
