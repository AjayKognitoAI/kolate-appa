"""
Tests for Execution Record Service (MongoDB)

Unit tests for ExecutionRecordService with mocked MongoDB operations.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.services.patient_records import ExecutionRecordService
from app.schemas.mongo import (
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
def mock_collection():
    """Fixture for mocked MongoDB collection."""
    collection = MagicMock()
    collection.insert_one = AsyncMock()
    collection.find_one = AsyncMock()
    collection.find_one_and_update = AsyncMock()
    collection.delete_one = AsyncMock()
    collection.count_documents = AsyncMock()
    collection.find = MagicMock()
    return collection


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
def sample_record_create(sample_execution_data):
    """Sample ExecutionRecordCreate schema."""
    return ExecutionRecordCreate(**sample_execution_data)


class TestExecutionRecordService:
    """Test suite for ExecutionRecordService."""

    @pytest.mark.asyncio
    async def test_create_record(self, service, mock_collection, sample_record_create):
        """Test creating an execution record."""
        with patch.object(service, '_get_collection', return_value=mock_collection):
            mock_result = MagicMock()
            mock_result.inserted_id = ObjectId()
            mock_collection.insert_one.return_value = mock_result

            result = await service.create_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_data=sample_record_create,
                current_user="auth0|admin123"
            )

            assert result.user_id == "auth0|user123"
            assert result.base_patient_data == sample_record_create.base_patient_data
            assert result.base_prediction == sample_record_create.base_prediction
            assert result.executed_by == "auth0|admin123"
            assert isinstance(result.executed_at, datetime)
            mock_collection.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_record_with_executed_by(self, service, mock_collection):
        """Test creating record with custom executed_by field."""
        record_data = ExecutionRecordCreate(
            user_id="auth0|user123",
            base_patient_data={"age": 30},
            base_prediction=[],
            executed_by="auth0|custom_executor"
        )

        with patch.object(service, '_get_collection', return_value=mock_collection):
            mock_result = MagicMock()
            mock_result.inserted_id = ObjectId()
            mock_collection.insert_one.return_value = mock_result

            result = await service.create_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_data=record_data,
                current_user="auth0|admin123"
            )

            # Should use the provided executed_by
            assert result.executed_by == "auth0|custom_executor"

    @pytest.mark.asyncio
    async def test_get_records_paginated(self, service, mock_collection):
        """Test getting paginated execution records."""
        mock_docs = [
            {
                "_id": ObjectId(),
                "execution_id": f"exec_{i}",
                "user_id": "auth0|user123",
                "base_patient_data": {"age": 30 + i},
                "base_prediction": [],
                "executed_by": "auth0|admin123",
                "executed_at": datetime.utcnow(),
                "updated_by": None,
                "updated_at": datetime.utcnow(),
            }
            for i in range(5)
        ]

        mock_cursor = MagicMock()
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_cursor.to_list = AsyncMock(return_value=mock_docs)

        mock_collection.find.return_value = mock_cursor
        mock_collection.count_documents.return_value = 15

        with patch.object(service, '_get_collection', return_value=mock_collection):
            records, total, pages = await service.get_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                page=1,
                size=5,
                sort_by="executed_at",
                sort_order="desc"
            )

            assert len(records) == 5
            assert total == 15
            assert pages == 3
            assert all(hasattr(r, 'execution_id') for r in records)

    @pytest.mark.asyncio
    async def test_get_record_by_id(self, service, mock_collection):
        """Test getting an execution record by ID."""
        mock_doc = {
            "_id": ObjectId(),
            "execution_id": "exec_123",
            "user_id": "auth0|user123",
            "base_patient_data": {"age": 45},
            "base_prediction": [],
            "executed_by": "auth0|admin123",
            "executed_at": datetime.utcnow(),
            "updated_by": None,
            "updated_at": datetime.utcnow(),
        }

        mock_collection.find_one.return_value = mock_doc

        with patch.object(service, '_get_collection', return_value=mock_collection):
            result = await service.get_record_by_id(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                execution_id="exec_123"
            )

            assert result.execution_id == "exec_123"
            assert result.user_id == "auth0|user123"
            mock_collection.find_one.assert_called_once_with({"execution_id": "exec_123"})

    @pytest.mark.asyncio
    async def test_get_record_by_id_not_found(self, service, mock_collection):
        """Test getting a non-existent execution record."""
        mock_collection.find_one.return_value = None

        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(NotFoundError) as exc_info:
                await service.get_record_by_id(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    execution_id="non-existent"
                )

            assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_update_record(self, service, mock_collection):
        """Test updating an execution record."""
        updated_data = ExecutionRecordUpdate(
            base_patient_data={"age": 50},
            base_prediction=[{"model": "new", "prediction": 0.9}],
            updated_by="auth0|updater123"
        )

        mock_updated_doc = {
            "_id": ObjectId(),
            "execution_id": "exec_123",
            "user_id": "auth0|user123",
            "base_patient_data": {"age": 50},
            "base_prediction": [{"model": "new", "prediction": 0.9}],
            "executed_by": "auth0|admin123",
            "executed_at": datetime.utcnow() - timedelta(hours=1),
            "updated_by": "auth0|updater123",
            "updated_at": datetime.utcnow(),
        }

        mock_collection.find_one_and_update.return_value = mock_updated_doc

        with patch.object(service, '_get_collection', return_value=mock_collection):
            result = await service.update_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                execution_id="exec_123",
                update_data=updated_data,
                current_user="auth0|admin123"
            )

            assert result.base_patient_data == {"age": 50}
            assert result.updated_by == "auth0|updater123"
            mock_collection.find_one_and_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_record_not_found(self, service, mock_collection):
        """Test updating a non-existent execution record."""
        updated_data = ExecutionRecordUpdate(base_patient_data={"age": 50})
        mock_collection.find_one_and_update.return_value = None

        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(NotFoundError):
                await service.update_record(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    execution_id="non-existent",
                    update_data=updated_data,
                    current_user="auth0|admin123"
                )

    @pytest.mark.asyncio
    async def test_get_records_by_ids(self, service, mock_collection):
        """Test getting multiple execution records by IDs."""
        execution_ids = ["exec_1", "exec_2", "exec_3"]

        mock_docs = [
            {
                "_id": ObjectId(),
                "execution_id": exec_id,
                "user_id": "auth0|user123",
                "base_patient_data": {},
                "base_prediction": [],
                "executed_by": "auth0|admin123",
                "executed_at": datetime.utcnow(),
                "updated_by": None,
                "updated_at": datetime.utcnow(),
            }
            for exec_id in execution_ids
        ]

        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=mock_docs)
        mock_collection.find.return_value = mock_cursor

        with patch.object(service, '_get_collection', return_value=mock_collection):
            results = await service.get_records_by_ids(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                execution_ids=execution_ids
            )

            assert len(results) == 3
            assert all(r.execution_id in execution_ids for r in results)
            mock_collection.find.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_records_by_ids_empty_list(self, service, mock_collection):
        """Test getting records with empty ID list returns empty list."""
        with patch.object(service, '_get_collection', return_value=mock_collection):
            results = await service.get_records_by_ids(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                execution_ids=[]
            )

            assert results == []
            mock_collection.find.assert_not_called()

    @pytest.mark.asyncio
    async def test_search_records_by_user(self, service, mock_collection):
        """Test searching execution records by user ID."""
        search_params = ExecutionRecordSearch(user_id="auth0|user123")

        mock_docs = [
            {
                "_id": ObjectId(),
                "execution_id": "exec_1",
                "user_id": "auth0|user123",
                "base_patient_data": {},
                "base_prediction": [],
                "executed_by": "auth0|admin123",
                "executed_at": datetime.utcnow(),
                "updated_by": None,
                "updated_at": datetime.utcnow(),
            }
        ]

        mock_cursor = MagicMock()
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_cursor.to_list = AsyncMock(return_value=mock_docs)

        mock_collection.find.return_value = mock_cursor
        mock_collection.count_documents.return_value = 1

        with patch.object(service, '_get_collection', return_value=mock_collection):
            records, total, pages = await service.search_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                search_params=search_params,
                page=1,
                size=10
            )

            assert len(records) == 1
            assert total == 1
            assert records[0].user_id == "auth0|user123"

    @pytest.mark.asyncio
    async def test_search_records_by_date_range(self, service, mock_collection):
        """Test searching execution records by date range."""
        date_from = datetime.utcnow() - timedelta(days=7)
        date_to = datetime.utcnow()

        search_params = ExecutionRecordSearch(
            date_from=date_from,
            date_to=date_to
        )

        mock_cursor = MagicMock()
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_cursor.to_list = AsyncMock(return_value=[])

        mock_collection.find.return_value = mock_cursor
        mock_collection.count_documents.return_value = 0

        with patch.object(service, '_get_collection', return_value=mock_collection):
            records, total, pages = await service.search_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                search_params=search_params,
                page=1,
                size=10
            )

            # Verify that find was called with date range query
            call_args = mock_collection.find.call_args[0][0]
            assert "executed_at" in call_args
            assert "$gte" in call_args["executed_at"]
            assert "$lte" in call_args["executed_at"]

    @pytest.mark.asyncio
    async def test_get_user_records(self, service, mock_collection):
        """Test getting paginated records for a specific user."""
        mock_docs = [
            {
                "_id": ObjectId(),
                "execution_id": f"exec_{i}",
                "user_id": "auth0|user123",
                "base_patient_data": {},
                "base_prediction": [],
                "executed_by": "auth0|admin123",
                "executed_at": datetime.utcnow(),
                "updated_by": None,
                "updated_at": datetime.utcnow(),
            }
            for i in range(3)
        ]

        mock_cursor = MagicMock()
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_cursor.to_list = AsyncMock(return_value=mock_docs)

        mock_collection.find.return_value = mock_cursor
        mock_collection.count_documents.return_value = 3

        with patch.object(service, '_get_collection', return_value=mock_collection):
            records, total, pages = await service.get_user_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                user_id="auth0|user123",
                page=1,
                size=10
            )

            assert len(records) == 3
            assert total == 3
            assert all(r.user_id == "auth0|user123" for r in records)
            # Verify query was for specific user
            call_args = mock_collection.find.call_args[0][0]
            assert call_args["user_id"] == "auth0|user123"

    @pytest.mark.asyncio
    async def test_count_records(self, service, mock_collection):
        """Test counting all execution records."""
        mock_collection.count_documents.return_value = 42

        with patch.object(service, '_get_collection', return_value=mock_collection):
            count = await service.count_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789"
            )

            assert count == 42
            mock_collection.count_documents.assert_called_once_with({})

    @pytest.mark.asyncio
    async def test_count_records_by_user(self, service, mock_collection):
        """Test counting execution records for a specific user."""
        mock_collection.count_documents.return_value = 15

        with patch.object(service, '_get_collection', return_value=mock_collection):
            count = await service.count_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                user_id="auth0|user123"
            )

            assert count == 15
            call_args = mock_collection.count_documents.call_args[0][0]
            assert call_args["user_id"] == "auth0|user123"

    @pytest.mark.asyncio
    async def test_delete_record(self, service, mock_collection):
        """Test deleting an execution record."""
        mock_result = MagicMock()
        mock_result.deleted_count = 1
        mock_collection.delete_one.return_value = mock_result

        with patch.object(service, '_get_collection', return_value=mock_collection):
            result = await service.delete_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                execution_id="exec_123"
            )

            assert result is True
            mock_collection.delete_one.assert_called_once_with({"execution_id": "exec_123"})

    @pytest.mark.asyncio
    async def test_delete_record_not_found(self, service, mock_collection):
        """Test deleting a non-existent execution record."""
        mock_result = MagicMock()
        mock_result.deleted_count = 0
        mock_collection.delete_one.return_value = mock_result

        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(NotFoundError):
                await service.delete_record(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    execution_id="non-existent"
                )
