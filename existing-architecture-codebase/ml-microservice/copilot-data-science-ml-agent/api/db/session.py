"""Database session configuration."""

import os
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

from .base import Base

# Load environment variables before accessing them
# This ensures DATABASE_URL is correctly set regardless of import order
env_file = os.getenv("ENV_FILE", ".env.local")
load_dotenv(dotenv_path=env_file)

# Get database URL from environment variable or use default SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/db/data_science_agent.db")

# Ensure the database directory exists for SQLite
if DATABASE_URL.startswith("sqlite"):
    # Extract path from SQLite URL (handles both sqlite:/// and sqlite:////)
    db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
    if db_path.startswith("/"):
        # Absolute path (Linux/Docker style)
        db_dir = Path(db_path).parent
    else:
        # Relative path
        db_dir = Path(db_path).parent

    # Create directory if it doesn't exist
    if db_dir and str(db_dir) != ".":
        db_dir.mkdir(parents=True, exist_ok=True)

# Configure engine based on database type
if DATABASE_URL.startswith("sqlite"):
    # SQLite-specific configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL/MySQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    
    Yields:
        Database session
        
    Usage:
        @app.get("/items/")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    # Import all models to ensure they register with Base.metadata
    from api.models import Session, ConversationState, AnalysisResult, UploadedFile, S3ProcessedFile  # noqa: F401

    print(f"[DB] Creating tables at: {DATABASE_URL}")
    print(f"[DB] Tables to create: {list(Base.metadata.tables.keys())}")

    Base.metadata.create_all(bind=engine)

    print(f"[DB] Database tables created successfully")


def drop_tables():
    """Drop all database tables. Use with caution!"""
    Base.metadata.drop_all(bind=engine)