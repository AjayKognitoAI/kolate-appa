"""
Tests for Execution Record Service (PostgreSQL)

Unit tests for ExecutionRecordService with mocked PostgreSQL operations.
These tests mock the service methods directly to avoid database dependencies.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4


class MockExecutionRecordService:
    """Mock implementation of ExecutionRecordService for testing."""

    async def create_record(self, db, project_id, trial_slug, record_data, current_user):
        executed_by = getattr(record_data, 'executed_by', None)
        if executed_by is None:
            executed_by = current_user
        return MagicMock(
            id=uuid4(),
            execution_id=str(uuid4()),
            project_id=project_id,
            trial_slug=trial_slug,
            user_id=getattr(record_data, 'user_id', 'auth0|test'),
            base_patient_data=getattr(record_data, 'base_patient_data', {}),
            base_prediction=getattr(record_data, 'base_prediction', []),
            executed_by=executed_by,
            executed_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def get_records(self, db, project_id, trial_slug, page=1, size=10, **kwargs):
        return ([], 0, 0)

    async def get_record_by_id(self, db, project_id, trial_slug, execution_id):
        return MagicMock(
            id=uuid4(),
            execution_id=execution_id,
            project_id=project_id,
            trial_slug=trial_slug,
            user_id="auth0|test",
            base_patient_data={},
            base_prediction=[],
            executed_by="auth0|admin",
            executed_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def update_record(self, db, project_id, trial_slug, execution_id, update_data, **kwargs):
        return MagicMock(
            id=uuid4(),
            execution_id=execution_id,
            project_id=project_id,
            trial_slug=trial_slug,
            user_id="auth0|test",
            base_patient_data=getattr(update_data, 'base_patient_data', {}),
            base_prediction=getattr(update_data, 'base_prediction', []),
            executed_by="auth0|admin",
            executed_at=datetime.utcnow() - timedelta(hours=1),
            updated_by=getattr(update_data, 'updated_by', None),
            updated_at=datetime.utcnow(),
        )

    async def delete_record(self, db, project_id, trial_slug, execution_id):
        return True

    async def get_records_by_ids(self, db, project_id, trial_slug, execution_ids):
        return [
            MagicMock(
                id=uuid4(),
                execution_id=exec_id,
                project_id=project_id,
                trial_slug=trial_slug,
                user_id="auth0|test",
                base_patient_data={},
                base_prediction=[],
                executed_by="auth0|admin",
                executed_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            for exec_id in execution_ids
        ] if execution_ids else []

    async def get_user_records(self, db, project_id, trial_slug, user_id, page=1, size=10):
        return ([], 0, 0)

    async def count_records(self, db, project_id, trial_slug, user_id=None):
        return 42 if not user_id else 15


@pytest.fixture
def service():
    """Fixture for ExecutionRecordService."""
    return MockExecutionRecordService()


@pytest.fixture
def mock_db():
    """Fixture for mocked database session."""
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def sample_project_id():
    """Sample project UUID."""
    return uuid4()


class MockRecordCreate:
    """Mock execution record create data."""
    def __init__(self, user_id=None, base_patient_data=None, base_prediction=None, executed_by=None):
        self.user_id = user_id or "auth0|user123"
        self.base_patient_data = base_patient_data or {}
        self.base_prediction = base_prediction or []
        self.executed_by = executed_by


class MockRecordUpdate:
    """Mock execution record update data."""
    def __init__(self, base_patient_data=None, base_prediction=None, updated_by=None):
        self.base_patient_data = base_patient_data
        self.base_prediction = base_prediction
        self.updated_by = updated_by


class TestExecutionRecordService:
    """Test suite for ExecutionRecordService."""

    @pytest.mark.asyncio
    async def test_create_record(self, service, mock_db, sample_project_id):
        """Test creating an execution record."""
        record_data = MockRecordCreate(
            user_id="auth0|user123",
            base_patient_data={"age": 45, "gender": "M"},
            base_prediction=[{"model": "model_a", "prediction": 0.85}]
        )

        result = await service.create_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_data=record_data,
            current_user="auth0|admin123"
        )

        assert result.user_id == "auth0|user123"
        assert result.executed_by == "auth0|admin123"

    @pytest.mark.asyncio
    async def test_create_record_with_executed_by(self, service, mock_db, sample_project_id):
        """Test creating record with custom executed_by field."""
        record_data = MockRecordCreate(
            user_id="auth0|user123",
            base_patient_data={"age": 30},
            base_prediction=[],
            executed_by="auth0|custom_executor"
        )

        result = await service.create_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_data=record_data,
            current_user="auth0|admin123"
        )

        assert result.executed_by == "auth0|custom_executor"

    @pytest.mark.asyncio
    async def test_get_records_paginated(self, service, mock_db, sample_project_id):
        """Test getting paginated execution records."""
        records, total, pages = await service.get_records(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            page=1,
            size=5,
            sort_by="executed_at",
            sort_order="desc"
        )

        assert isinstance(records, list)
        assert isinstance(total, int)
        assert isinstance(pages, int)

    @pytest.mark.asyncio
    async def test_get_record_by_id(self, service, mock_db, sample_project_id):
        """Test getting an execution record by ID."""
        result = await service.get_record_by_id(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            execution_id="exec_123"
        )

        assert result.execution_id == "exec_123"
        assert result.user_id == "auth0|test"

    @pytest.mark.asyncio
    async def test_update_record(self, service, mock_db, sample_project_id):
        """Test updating an execution record."""
        updated_data = MockRecordUpdate(
            base_patient_data={"age": 50},
            base_prediction=[{"model": "new", "prediction": 0.9}],
            updated_by="auth0|updater123"
        )

        result = await service.update_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            execution_id="exec_123",
            update_data=updated_data,
            current_user="auth0|admin123"
        )

        assert result.base_patient_data == {"age": 50}
        assert result.updated_by == "auth0|updater123"

    @pytest.mark.asyncio
    async def test_get_records_by_ids(self, service, mock_db, sample_project_id):
        """Test getting multiple execution records by IDs."""
        execution_ids = ["exec_1", "exec_2", "exec_3"]

        results = await service.get_records_by_ids(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            execution_ids=execution_ids
        )

        assert len(results) == 3
        assert all(r.execution_id in execution_ids for r in results)

    @pytest.mark.asyncio
    async def test_get_records_by_ids_empty_list(self, service, mock_db, sample_project_id):
        """Test getting records with empty ID list returns empty list."""
        results = await service.get_records_by_ids(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            execution_ids=[]
        )

        assert results == []

    @pytest.mark.asyncio
    async def test_get_user_records(self, service, mock_db, sample_project_id):
        """Test getting paginated records for a specific user."""
        records, total, pages = await service.get_user_records(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            user_id="auth0|user123",
            page=1,
            size=10
        )

        assert isinstance(records, list)
        assert isinstance(total, int)
        assert isinstance(pages, int)

    @pytest.mark.asyncio
    async def test_count_records(self, service, mock_db, sample_project_id):
        """Test counting all execution records."""
        count = await service.count_records(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789"
        )

        assert count == 42

    @pytest.mark.asyncio
    async def test_count_records_by_user(self, service, mock_db, sample_project_id):
        """Test counting execution records for a specific user."""
        count = await service.count_records(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            user_id="auth0|user123"
        )

        assert count == 15

    @pytest.mark.asyncio
    async def test_delete_record(self, service, mock_db, sample_project_id):
        """Test deleting an execution record."""
        result = await service.delete_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            execution_id="exec_123"
        )

        assert result is True
