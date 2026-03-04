from pathlib import Path

from pydantic_settings import BaseSettings

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./f1_strategy.db"
    SYNC_DATABASE_URL: str = "sqlite:///./f1_strategy.db"
    FASTF1_CACHE_DIR: str = str(_PROJECT_ROOT / "data" / "fastf1_cache")
    CSV_EXPORT_DIR: str = str(_PROJECT_ROOT / "data" / "csv_exports")
    DEFAULT_MC_SIMULATIONS: int = 1000

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
