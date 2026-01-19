"""
Test Configuration

Sets up the test environment with required fixtures and mocks.
"""

import os
import sys
from pathlib import Path

# Set test environment before importing anything from app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test_db"
os.environ["DATABASE_HOST"] = "localhost"
os.environ["DATABASE_PORT"] = "5432"
os.environ["DATABASE_NAME"] = "test_db"
os.environ["DATABASE_USER"] = "test"
os.environ["DATABASE_PASSWORD"] = "test"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["AUTH0_DOMAIN"] = "test.auth0.com"
os.environ["AUTH0_AUDIENCE"] = "https://test-api.example.com"
os.environ["LOG_LEVEL"] = "WARNING"
os.environ["ENABLE_FILE_LOGGING"] = "false"

import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_db():
    """Fixture for mocked database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.add = MagicMock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def mock_redis():
    """Fixture for mocked Redis client."""
    redis = MagicMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock(return_value=True)
    redis.delete = AsyncMock(return_value=1)
    redis.pipeline = MagicMock()
    return redis


@pytest.fixture
def mock_auth0_user():
    """Fixture for a mock authenticated user."""
    from app.core.permissions import Auth0User
    return Auth0User(
        id="auth0|test123",
        email="test@example.com",
        email_verified=True,
        name="Test User",
        permissions=["read:all", "write:all"],
        roles=["admin"],
        scopes=["openid", "profile", "email"],
    )
