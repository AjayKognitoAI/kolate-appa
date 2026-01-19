"""Dependency injection for FastAPI endpoints."""

import asyncio
import os
from typing import Optional

from api.agent.analysis_pipeline import AnalysisPipeline
from api.agent.rag_system import RAGSystem
from api.agent.chat_handler import ChatHandler
from api.config import get_settings

# Singleton service instances
_analysis_pipeline: Optional[AnalysisPipeline] = None
_rag_system: Optional[RAGSystem] = None
_chat_handler: Optional[ChatHandler] = None

# S3 service instances (may be None if S3 is not configured)
_s3_service = None
_trial_sync_service = None
_scheduler_service = None


def get_pipeline() -> AnalysisPipeline:
    """Get or create analysis pipeline instance."""
    global _analysis_pipeline
    if _analysis_pipeline is None:
        _analysis_pipeline = AnalysisPipeline(
            upload_dir=os.getenv("UPLOAD_DIR", "./data/uploads")
        )
    return _analysis_pipeline


def get_rag() -> RAGSystem:
    """Get or create RAG system instance."""
    global _rag_system
    if _rag_system is None:
        _rag_system = RAGSystem(
            persist_dir=os.getenv("CHROMA_DB_DIR", "./data/chroma_db")
        )
    return _rag_system


def get_chat() -> ChatHandler:
    """Get or create chat handler instance."""
    global _chat_handler
    if _chat_handler is None:
        rag = get_rag()
        _chat_handler = ChatHandler(rag_system=rag)
    return _chat_handler


def get_s3_service():
    """Get S3 service instance (may be None if not configured)."""
    global _s3_service
    return _s3_service


def get_trial_sync_service():
    """Get trial sync service instance (may be None if not configured)."""
    global _trial_sync_service
    return _trial_sync_service


def get_scheduler_service():
    """Get scheduler service instance (may be None if not configured)."""
    global _scheduler_service
    return _scheduler_service


def _initialize_s3_services():
    """Initialize S3-related services if configured."""
    global _s3_service, _trial_sync_service, _scheduler_service

    settings = get_settings()

    # Check if S3 is configured
    if not settings.S3_SYNC_ENABLED or not settings.S3_BUCKET_NAME:
        print("[INFO] S3 sync is disabled or bucket not configured")
        return False

    try:
        # Import S3 services
        from api.services.s3_service import S3Service
        from api.services.trial_sync_service import TrialSyncService
        from api.services.scheduler_service import SchedulerService
        from api.db import get_db

        # Create S3 service
        _s3_service = S3Service(
            bucket_name=settings.S3_BUCKET_NAME,
            base_path=settings.S3_BASE_PATH,
            aws_access_key=settings.AWS_ACCESS_KEY_ID,
            aws_secret_key=settings.AWS_SECRET_ACCESS_KEY,
            aws_region=settings.AWS_REGION,
            endpoint_url=settings.AWS_S3_ENDPOINT_URL
        )

        # Test S3 connection
        if not _s3_service.test_connection():
            print(f"[WARNING] Could not connect to S3 bucket '{settings.S3_BUCKET_NAME}'")
            print("[WARNING] S3 sync will be disabled. Check your AWS credentials and bucket name.")
            _s3_service = None
            return False

        print(f"[OK] S3 Service connected to bucket: {settings.S3_BUCKET_NAME}")

        # Create trial sync service
        _trial_sync_service = TrialSyncService(
            s3_service=_s3_service,
            analysis_pipeline=get_pipeline(),
            rag_system=get_rag(),
            db_session_factory=get_db,
            temp_dir=settings.S3_TEMP_DIR
        )

        # Create scheduler service
        _scheduler_service = SchedulerService(
            trial_sync_service=_trial_sync_service
        )

        return True

    except Exception as e:
        print(f"[ERROR] Failed to initialize S3 services: {e}")
        import traceback
        traceback.print_exc()
        _s3_service = None
        _trial_sync_service = None
        _scheduler_service = None
        return False


def initialize_services():
    """Initialize all services on startup."""
    global _analysis_pipeline, _rag_system, _chat_handler

    # Import here to avoid circular imports
    from api.db import create_tables

    # Create database tables if they don't exist
    create_tables()

    _rag_system = get_rag()
    _analysis_pipeline = get_pipeline()
    _chat_handler = get_chat()

    print("[OK] Simplified Data Science RAG API started (v2.0.0)")
    print(f"[OK] Model: {os.getenv('MODEL_NAME', 'gemini-2.0-flash-exp')}")
    print(f"[OK] ChromaDB: {os.getenv('CHROMA_DB_DIR', './data/chroma_db')}")
    print("[OK] Services initialized: Pipeline, RAG, Chat, Database")

    # Initialize S3 services if configured
    settings = get_settings()
    if settings.S3_SYNC_ENABLED and settings.S3_BUCKET_NAME:
        s3_initialized = _initialize_s3_services()

        if s3_initialized and _scheduler_service:
            # Schedule initial sync in background (non-blocking)
            print("[OK] Initial S3 sync will run in background after startup")

            # Start periodic scheduler
            _scheduler_service.start(interval_minutes=settings.S3_POLL_INTERVAL_MINUTES)
            print(f"[OK] S3 scheduler started (every {settings.S3_POLL_INTERVAL_MINUTES} minutes)")


def shutdown_services():
    """Shutdown services on application shutdown."""
    global _scheduler_service

    if _scheduler_service:
        _scheduler_service.stop()
        print("[OK] S3 scheduler stopped")
