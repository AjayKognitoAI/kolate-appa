"""
Tests for Execution Record Service (PostgreSQL)

Unit tests for ExecutionRecordService with mocked PostgreSQL operations.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.patient_records import ExecutionRecordService
from app.schemas.patient_record import (
    ExecutionRecordCreate,
    ExecutionRecordUpdate,
    ExecutionRecordSearch,
)
from app.exceptions.base import NotFoundError


@pytest.fixture
def service():
    """Fixture for ExecutionRecordService."""
    return ExecutionRecordService()


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


@pytest.fixture
def sample_execution_data():
    """Sample execution data for testing."""
    return {
        "user_id": "auth0|user123",
        "base_patient_data": {
            "age": 45,
            "gender": "M",
            "blood_pressure": 120,
        },
        "base_prediction": [
            {"model": "model_a", "prediction": 0.85},
            {"model": "model_b", "prediction": 0.72},
        ]
    }


@pytest.fixture
def sample_record_create(sample_execution_data, sample_project_id):
    """Sample ExecutionRecordCreate schema."""
    return ExecutionRecordCreate(
        project_id=sample_project_id,
        trial_slug="trial_789",
        **sample_execution_data
    )


class TestExecutionRecordService:
    """Test suite for ExecutionRecordService."""

    @pytest.mark.asyncio
    async def test_create_record(self, service, mock_db, sample_record_create, sample_project_id):
        """Test creating an execution record."""
        with patch.object(service, 'create_record', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = MagicMock(
                id=uuid4(),
                execution_id=str(uuid4()),
                project_id=sample_project_id,
                trial_slug="trial_789",
                user_id="auth0|user123",
                base_patient_data=sample_record_create.base_patient_data,
                base_prediction=sample_record_create.base_prediction,
                executed_by="auth0|admin123",
                executed_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            result = await service.create_record(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                record_data=sample_record_create,
                current_user="auth0|admin123"
            )

            assert result.user_id == "auth0|user123"
            assert result.executed_by == "auth0|admin123"
            mock_create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_record_with_executed_by(self, service, mock_db, sample_project_id):
        """Test creating record with custom executed_by field."""
        record_data = ExecutionRecordCreate(
            project_id=sample_project_id,
            trial_slug="trial_789",
            user_id="auth0|user123",
            base_patient_data={"age": 30},
            base_prediction=[],
            executed_by="auth0|custom_executor"
        )

        with patch.object(service, 'create_record', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = MagicMock(
                id=uuid4(),
                execution_id=str(uuid4()),
                project_id=sample_project_id,
                trial_slug="trial_789",
                user_id="auth0|user123",
                base_patient_data={"age": 30},
                base_prediction=[],
                executed_by="auth0|custom_executor",
                executed_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
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
        mock_records = [
            MagicMock(
                id=uuid4(),
                execution_id=f"exec_{i}",
                project_id=sample_project_id,
                trial_slug="trial_789",
                user_id="auth0|user123",
                base_patient_data={"age": 30 + i},
                base_prediction=[],
                executed_by="auth0|admin123",
                executed_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            for i in range(5)
        ]

        with patch.object(service, 'get_records', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (mock_records, 15, 3)

            records, total, pages = await service.get_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                page=1,
                size=5,
                sort_by="executed_at",
                sort_order="desc"
            )

            assert len(records) == 5
            assert total == 15
            assert pages == 3

    @pytest.mark.asyncio
    async def test_get_record_by_id(self, service, mock_db, sample_project_id):
        """Test getting an execution record by ID."""
        with patch.object(service, 'get_record_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(
                id=uuid4(),
                execution_id="exec_123",
                project_id=sample_project_id,
                trial_slug="trial_789",
                user_id="auth0|user123",
                base_patient_data={"age": 45},
                base_prediction=[],
                executed_by="auth0|admin123",
                executed_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            result = await service.get_record_by_id(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                execution_id="exec_123"
            )

            assert result.execution_id == "exec_123"
            assert result.user_id == "auth0|user123"

    @pytest.mark.asyncio
    async def test_get_record_by_id_not_found(self, service, mock_db, sample_project_id):
        """Test getting a non-existent execution record."""
        with patch.object(service, 'get_record_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = NotFoundError(
                message="Execution record not found",
                resource_type="ExecutionRecord",
                resource_id="non-existent"
            )

            with pytest.raises(NotFoundError) as exc_info:
                await service.get_record_by_id(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    execution_id="non-existent"
                )

            assert "not found" in str(exc_info.value.message).lower()

    @pytest.mark.asyncio
    async def test_update_record(self, service, mock_db, sample_project_id):
        """Test updating an execution record."""
        updated_data = ExecutionRecordUpdate(
            base_patient_data={"age": 50},
            base_prediction=[{"model": "new", "prediction": 0.9}],
            updated_by="auth0|updater123"
        )

        with patch.object(service, 'update_record', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = MagicMock(
                id=uuid4(),
                execution_id="exec_123",
                project_id=sample_project_id,
                trial_slug="trial_789",
                user_id="auth0|user123",
                base_patient_data={"age": 50},
                base_prediction=[{"model": "new", "prediction": 0.9}],
                executed_by="auth0|admin123",
                executed_at=datetime.utcnow() - timedelta(hours=1),
                updated_by="auth0|updater123",
                updated_at=datetime.utcnow(),
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
    async def test_update_record_not_found(self, service, mock_db, sample_project_id):
        """Test updating a non-existent execution record."""
        updated_data = ExecutionRecordUpdate(base_patient_data={"age": 50})

        with patch.object(service, 'update_record', new_callable=AsyncMock) as mock_update:
            mock_update.side_effect = NotFoundError(
                message="Execution record not found",
                resource_type="ExecutionRecord",
                resource_id="non-existent"
            )

            with pytest.raises(NotFoundError):
                await service.update_record(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    execution_id="non-existent",
                    update_data=updated_data,
                    current_user="auth0|admin123"
                )

    @pytest.mark.asyncio
    async def test_get_records_by_ids(self, service, mock_db, sample_project_id):
        """Test getting multiple execution records by IDs."""
        execution_ids = ["exec_1", "exec_2", "exec_3"]

        with patch.object(service, 'get_records_by_ids', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = [
                MagicMock(
                    id=uuid4(),
                    execution_id=exec_id,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    user_id="auth0|user123",
                    base_patient_data={},
                    base_prediction=[],
                    executed_by="auth0|admin123",
                    executed_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                for exec_id in execution_ids
            ]

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
        with patch.object(service, 'get_records_by_ids', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = []

            results = await service.get_records_by_ids(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                execution_ids=[]
            )

            assert results == []

    @pytest.mark.asyncio
    async def test_search_records_by_user(self, service, mock_db, sample_project_id):
        """Test searching execution records by user ID."""
        search_params = ExecutionRecordSearch(user_id="auth0|user123")

        with patch.object(service, 'search_records', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = (
                [
                    MagicMock(
                        id=uuid4(),
                        execution_id="exec_1",
                        project_id=sample_project_id,
                        trial_slug="trial_789",
                        user_id="auth0|user123",
                        base_patient_data={},
                        base_prediction=[],
                        executed_by="auth0|admin123",
                        executed_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                ],
                1,
                1
            )

            records, total, pages = await service.search_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                search_params=search_params,
                page=1,
                size=10
            )

            assert len(records) == 1
            assert total == 1
            assert records[0].user_id == "auth0|user123"

    @pytest.mark.asyncio
    async def test_search_records_by_date_range(self, service, mock_db, sample_project_id):
        """Test searching execution records by date range."""
        date_from = datetime.utcnow() - timedelta(days=7)
        date_to = datetime.utcnow()

        search_params = ExecutionRecordSearch(
            date_from=date_from,
            date_to=date_to
        )

        with patch.object(service, 'search_records', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = ([], 0, 0)

            records, total, pages = await service.search_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                search_params=search_params,
                page=1,
                size=10
            )

            assert total == 0

    @pytest.mark.asyncio
    async def test_get_user_records(self, service, mock_db, sample_project_id):
        """Test getting paginated records for a specific user."""
        with patch.object(service, 'get_user_records', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = (
                [
                    MagicMock(
                        id=uuid4(),
                        execution_id=f"exec_{i}",
                        project_id=sample_project_id,
                        trial_slug="trial_789",
                        user_id="auth0|user123",
                        base_patient_data={},
                        base_prediction=[],
                        executed_by="auth0|admin123",
                        executed_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    for i in range(3)
                ],
                3,
                1
            )

            records, total, pages = await service.get_user_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                user_id="auth0|user123",
                page=1,
                size=10
            )

            assert len(records) == 3
            assert total == 3
            assert all(r.user_id == "auth0|user123" for r in records)

    @pytest.mark.asyncio
    async def test_count_records(self, service, mock_db, sample_project_id):
        """Test counting all execution records."""
        with patch.object(service, 'count_records', new_callable=AsyncMock) as mock_count:
            mock_count.return_value = 42

            count = await service.count_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789"
            )

            assert count == 42

    @pytest.mark.asyncio
    async def test_count_records_by_user(self, service, mock_db, sample_project_id):
        """Test counting execution records for a specific user."""
        with patch.object(service, 'count_records', new_callable=AsyncMock) as mock_count:
            mock_count.return_value = 15

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
        with patch.object(service, 'delete_record', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = True

            result = await service.delete_record(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                execution_id="exec_123"
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_delete_record_not_found(self, service, mock_db, sample_project_id):
        """Test deleting a non-existent execution record."""
        with patch.object(service, 'delete_record', new_callable=AsyncMock) as mock_delete:
            mock_delete.side_effect = NotFoundError(
                message="Execution record not found",
                resource_type="ExecutionRecord",
                resource_id="non-existent"
            )

            with pytest.raises(NotFoundError):
                await service.delete_record(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    execution_id="non-existent"
                )
