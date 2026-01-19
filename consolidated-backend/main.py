from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import uvicorn

from app.config.settings import settings
from app.core.cache import cache_manager
from app.routes import api_router
from app.core.logging_middleware import LoggingMiddleware
from app.core.logging import logger, info
# Import all models to ensure they are registered with SQLAlchemy
from app import models
# Import exception handlers
from app.exceptions.handlers import EXCEPTION_HANDLERS


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Application startup initiated", environment=settings.ENVIRONMENT)

    try:
        await cache_manager.connect()
        logger.info("Cache manager connected successfully")

        # Log file system initialization
        from app.core.logging import _log_config
        logger.info(
            "Logging system initialized",
            log_format=_log_config.log_format,
            console_format=_log_config.log_format,
            file_format="json" if _log_config.enable_file_logging else "disabled"
        )

        if _log_config.enable_file_logging:
            logger.info(
                "File logging configured",
                log_directory=str(_log_config.log_directory),
                max_file_size=_log_config.max_file_size,
                backup_count=_log_config.backup_count
            )

        logger.info(
            "Application started successfully",
            version="1.0.0",
            environment=settings.ENVIRONMENT,
            debug=settings.DEBUG,
            host=settings.HOST,
            port=settings.PORT,
            log_level=_log_config.log_level,
            log_format=_log_config.log_format,
            file_logging_enabled=_log_config.enable_file_logging
        )
    except Exception as e:
        logger.error("Failed to start application", error=str(e))
        raise

    yield

    # Shutdown
    logger.info("Application shutdown initiated")

    try:
        await cache_manager.disconnect()
        logger.info("Cache manager disconnected successfully")
        logger.info("Application shutdown completed")
    except Exception as e:
        logger.error("Error during application shutdown", error=str(e))


app = FastAPI(
    title="FastAPI Backend Template",
    description="A production-ready FastAPI backend template with RBAC, async database, and caching",
    version="1.0.0",
    lifespan=lifespan
)

# Add logging middleware (should be first for comprehensive request tracking)
app.add_middleware(LoggingMiddleware)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.ALLOWED_METHODS,
    allow_headers=settings.ALLOWED_HEADERS,
)

# Register exception handlers
for exception_class, handler in EXCEPTION_HANDLERS.items():
    app.add_exception_handler(exception_class, handler)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Mount static files for local file storage (only if using local storage)
if settings.FILE_STORAGE_TYPE.lower() == "local":
    upload_dir = Path(settings.LOCAL_UPLOAD_PATH)
    upload_dir.mkdir(parents=True, exist_ok=True)  # Create directory if it doesn't exist
    app.mount(
        settings.MEDIA_BASE_URL,
        StaticFiles(directory=str(upload_dir)),
        name="media"
    )
    logger.info(
        "Static file serving enabled",
        mount_path=settings.MEDIA_BASE_URL,
        directory=str(upload_dir)
    )


@app.get("/")
async def root():
    logger.info("Root endpoint accessed", endpoint="/")

    response_data = {
        "message": "Welcome to FastAPI Backend Template",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

    logger.debug("Root endpoint response prepared", response_data=response_data)
    return response_data


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )