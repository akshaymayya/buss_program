import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    Follows 12-factor application design principles.
    """
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # API Keys (treat missing as simulation mode fallback)
    ORS_API_KEY: Optional[str] = None
    OPENWEATHER_API_KEY: Optional[str] = None

    # Database
    DATABASE_PATH: str = str(BACKEND_DIR / "mefleet.db")
    
    # Environment & Security
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # SQLite concurrency tuning
    SQLITE_BUSY_TIMEOUT_MS: int = 5000

# Global cached settings instance
settings = Settings()

