from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os
from dotenv import load_dotenv

# Load from appropriate .env file
env_file = os.getenv("ENV_FILE", ".env.local")
load_dotenv(dotenv_path=env_file)


class Settings(BaseSettings):
    APP_NAME: str = "copilot-data-science-ml-agent"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = "local"
    EUREKA_SERVER: str = "http://localhost:8761/eureka"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    EUREKA_INSTANCE_HOST: str = "localhost"

    # Database settings
    DATABASE_URL: str = "sqlite:///./data/db/data_science_agent.db"

    # Google AI settings
    GOOGLE_API_KEY: str = ""
    MODEL_NAME: str = "gemini-2.0-flash-exp"

    # Azure settings
    AZURE_API_KEY: str = ""
    AZURE_API_BASE: str = ""
    AZURE_API_VERSION: str = "2024-02-01"

    # Application settings
    CHROMA_DB_DIR: str = "./data/chroma_db"
    BACKEND_URL: str = "http://localhost:8000"
    MAX_ITERATIONS: int = 10
    TEMPERATURE: float = 0.7
    UPLOAD_DIR: str = "./data/uploads"
    VISUALIZATION_DIR: str = "./data/visualizations"
    ANALYSIS_CACHE_DIR: str = "./data/analysis_cache"
    MAX_FILE_SIZE_MB: int = 100
    SESSION_TIMEOUT_MINUTES: int = 60

    # AWS S3 Settings
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_ENDPOINT_URL: Optional[str] = None  # For LocalStack/MinIO testing

    # S3 Trial Settings
    S3_BUCKET_NAME: str = ""
    S3_BASE_PATH: str = ""  # e.g., "clinical-trials/" or empty for bucket root
    S3_TEMP_DIR: str = "./data/s3_temp"  # Temp directory for downloaded files

    # Scheduler Settings
    S3_POLL_INTERVAL_MINUTES: int = 15
    S3_SYNC_ENABLED: bool = True

    class Config:
        env_file = env_file
        extra = "ignore"


@lru_cache()
def get_settings():
    return Settings()
