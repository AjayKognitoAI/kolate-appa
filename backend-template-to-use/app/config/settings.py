from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Database Configuration
    DATABASE_URL: str
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str

    # Redis Configuration
    REDIS_URL: str
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    # Cache Configuration
    CACHE_TYPE: str = "redis"  # Options: "redis", "memory"

    # Application Configuration
    SECRET_KEY: str
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Auth0 Configuration
    AUTH0_DOMAIN: str  # e.g., "your-tenant.auth0.com"
    AUTH0_AUDIENCE: str  # e.g., "https://your-api.example.com"
    AUTH0_ALGORITHMS: List[str] = ["RS256"]
    AUTH0_ISSUER: Optional[str] = None  # Defaults to https://{AUTH0_DOMAIN}/

    # Auth0 RBAC Configuration
    AUTH0_PERMISSIONS_CLAIM: str = "permissions"  # Claim containing permissions in JWT
    AUTH0_ROLES_CLAIM: str = "https://your-namespace/roles"  # Custom claim for roles
    AUTH0_USE_RBAC: bool = True  # Enable/disable RBAC from Auth0 permissions

    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE"]
    ALLOWED_HEADERS: List[str] = ["*"]

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    ENABLE_FILE_LOGGING: bool = True
    LOG_DIRECTORY: str = "logs"
    LOG_FORMAT: str = "json"  # 'json' or 'text'
    LOG_MAX_FILE_SIZE: int = 10485760  # 10MB in bytes
    LOG_BACKUP_COUNT: int = 5
    LOG_ERROR_FILE_SIZE: int = 5242880  # 5MB in bytes
    LOG_ERROR_BACKUP_COUNT: int = 3

    # API Configuration
    API_BASE_URL: str = "http://localhost:8000"  # Base URL for the API server

    # File Storage Configuration
    FILE_STORAGE_TYPE: str = "local"  # Options: "local", "s3"
    LOCAL_UPLOAD_PATH: str = "uploads"
    MEDIA_BASE_URL: str = "/media"

    # AWS S3 Configuration (only required if FILE_STORAGE_TYPE is "s3")
    AWS_S3_BUCKET_NAME: Optional[str] = None
    AWS_S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BASE_URL: Optional[str] = None

    # Email Configuration
    EMAIL_PROVIDER: str = "smtp"  # Options: "smtp", "ses"

    # SMTP Configuration (only required if EMAIL_PROVIDER is "smtp")
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Your Application Name"

    # AWS SES Configuration (only required if EMAIL_PROVIDER is "ses")
    AWS_SES_REGION: str = "us-east-1"
    AWS_SES_FROM_EMAIL: Optional[str] = None
    AWS_SES_FROM_NAME: str = "Your Application Name"
    AWS_SES_CONFIGURATION_SET: Optional[str] = None

    # Password Reset Configuration
    PASSWORD_RESET_OTP_EXPIRE_MINUTES: int = 10
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 5
    PASSWORD_RESET_MAX_ATTEMPTS: int = 3
    PASSWORD_RESET_RATE_LIMIT_PER_HOUR: int = 3

    # Email Verification Configuration
    EMAIL_VERIFICATION_OTP_EXPIRE_MINUTES: int = 10
    EMAIL_VERIFICATION_MAX_ATTEMPTS: int = 10
    EMAIL_VERIFICATION_RATE_LIMIT_PER_HOUR: int = 3

    # Frontend URL (for email links)
    FRONTEND_URL: str = "http://localhost:3000"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    @field_validator("ALLOWED_METHODS", mode="before")
    def parse_cors_methods(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    @field_validator("ALLOWED_HEADERS", mode="before")
    def parse_cors_headers(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    @field_validator("LOG_LEVEL", mode="before")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if isinstance(v, str):
            v = v.upper()
            if v not in valid_levels:
                raise ValueError(f"LOG_LEVEL must be one of {valid_levels}, got {v}")
        return v

    @field_validator("LOG_FORMAT", mode="before")
    def validate_log_format(cls, v):
        valid_formats = ["json", "text"]
        if isinstance(v, str):
            v = v.lower()
            if v not in valid_formats:
                raise ValueError(f"LOG_FORMAT must be one of {valid_formats}, got {v}")
        return v

    @field_validator("AUTH0_ALGORITHMS", mode="before")
    def parse_auth0_algorithms(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()