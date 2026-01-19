"""
Tests for Patient Record Service (MongoDB)

Unit tests for PatientRecordService with mocked MongoDB operations.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.services.patient_records import PatientRecordService
from app.schemas.mongo import (
    PatientRecordCreate,
    PatientRecordUpdate,
    PatientRecordSearch,
)
from app.exceptions.base import NotFoundError, ValidationError


@pytest.fixture
def service():
    """Fixture for PatientRecordService."""
    return PatientRecordService()


@pytest.fixture
def mock_collection():
    """Fixture for mocked MongoDB collection."""
    collection = MagicMock()
    collection.insert_one = AsyncMock()
    collection.insert_many = AsyncMock()
    collection.find_one = AsyncMock()
    collection.find_one_and_update = AsyncMock()
    collection.delete_one = AsyncMock()
    collection.count_documents = AsyncMock()
    collection.find = MagicMock()
    return collection


@pytest.fixture
def sample_patient_data():
    """Sample patient data for testing."""
    return {
        "age": 45,
        "gender": "M",
        "blood_pressure": 120,
        "cholesterol": 200,
    }


@pytest.fixture
def sample_record_create(sample_patient_data):
    """Sample PatientRecordCreate schema."""
    return PatientRecordCreate(
        record_id="test-record-123",
        patient_data=sample_patient_data,
        metadata={"source": "test"}
    )


class TestPatientRecordService:
    """Test suite for PatientRecordService."""

    @pytest.mark.asyncio
    async def test_create_record(self, service, mock_collection, sample_record_create):
        """Test creating a patient record."""
        # Mock the collection
        with patch.object(service, '_get_collection', return_value=mock_collection):
            # Mock insert result
            mock_result = MagicMock()
            mock_result.inserted_id = ObjectId()
            mock_collection.insert_one.return_value = mock_result

            # Create record
            result = await service.create_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_data=sample_record_create
            )

            # Assertions
            assert result.record_id == "test-record-123"
            assert result.patient_data == sample_record_create.patient_data
            assert result.metadata == sample_record_create.metadata
            assert isinstance(result.created_at, datetime)
            assert isinstance(result.updated_at, datetime)
            mock_collection.insert_one.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_record_auto_generate_id(self, service, mock_collection):
        """Test creating a patient record with auto-generated ID."""
        record_data = PatientRecordCreate(
            patient_data={"age": 30},
            metadata={}
        )

        with patch.object(service, '_get_collection', return_value=mock_collection):
            mock_result = MagicMock()
            mock_result.inserted_id = ObjectId()
            mock_collection.insert_one.return_value = mock_result

            result = await service.create_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_data=record_data
            )

            # Should auto-generate record_id
            assert result.record_id is not None
            assert len(result.record_id) > 0

    @pytest.mark.asyncio
    async def test_get_records_paginated(self, service, mock_collection):
        """Test getting paginated patient records."""
        # Mock documents
        mock_docs = [
            {
                "_id": ObjectId(),
                "record_id": f"record_{i}",
                "patient_data": {"age": 30 + i},
                "metadata": {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            for i in range(5)
        ]

        # Mock cursor
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
                size=5
            )

            assert len(records) == 5
            assert total == 15
            assert pages == 3
            assert all(hasattr(r, 'record_id') for r in records)

    @pytest.mark.asyncio
    async def test_get_record_by_id(self, service, mock_collection, sample_patient_data):
        """Test getting a patient record by ID."""
        mock_doc = {
            "_id": ObjectId(),
            "record_id": "test-record-123",
            "patient_data": sample_patient_data,
            "metadata": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        mock_collection.find_one.return_value = mock_doc

        with patch.object(service, '_get_collection', return_value=mock_collection):
            result = await service.get_record_by_id(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_id="test-record-123"
            )

            assert result.record_id == "test-record-123"
            assert result.patient_data == sample_patient_data
            mock_collection.find_one.assert_called_once_with({"record_id": "test-record-123"})

    @pytest.mark.asyncio
    async def test_get_record_by_id_not_found(self, service, mock_collection):
        """Test getting a non-existent patient record."""
        mock_collection.find_one.return_value = None

        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(NotFoundError) as exc_info:
                await service.get_record_by_id(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    record_id="non-existent"
                )

            assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_update_record(self, service, mock_collection):
        """Test updating a patient record."""
        updated_data = PatientRecordUpdate(
            patient_data={"age": 50},
            metadata={"updated": True}
        )

        mock_updated_doc = {
            "_id": ObjectId(),
            "record_id": "test-record-123",
            "patient_data": {"age": 50},
            "metadata": {"updated": True},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        mock_collection.find_one_and_update.return_value = mock_updated_doc

        with patch.object(service, '_get_collection', return_value=mock_collection):
            result = await service.update_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_id="test-record-123",
                update_data=updated_data
            )

            assert result.patient_data == {"age": 50}
            assert result.metadata == {"updated": True}
            mock_collection.find_one_and_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_record_not_found(self, service, mock_collection):
        """Test updating a non-existent patient record."""
        updated_data = PatientRecordUpdate(patient_data={"age": 50})
        mock_collection.find_one_and_update.return_value = None

        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(NotFoundError):
                await service.update_record(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    record_id="non-existent",
                    update_data=updated_data
                )

    @pytest.mark.asyncio
    async def test_delete_record(self, service, mock_collection):
        """Test deleting a patient record."""
        mock_result = MagicMock()
        mock_result.deleted_count = 1
        mock_collection.delete_one.return_value = mock_result

        with patch.object(service, '_get_collection', return_value=mock_collection):
            result = await service.delete_record(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                record_id="test-record-123"
            )

            assert result is True
            mock_collection.delete_one.assert_called_once_with({"record_id": "test-record-123"})

    @pytest.mark.asyncio
    async def test_delete_record_not_found(self, service, mock_collection):
        """Test deleting a non-existent patient record."""
        mock_result = MagicMock()
        mock_result.deleted_count = 0
        mock_collection.delete_one.return_value = mock_result

        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(NotFoundError):
                await service.delete_record(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    record_id="non-existent"
                )

    @pytest.mark.asyncio
    async def test_bulk_create_records(self, service, mock_collection):
        """Test bulk creating patient records."""
        records = [
            PatientRecordCreate(patient_data={"age": 30 + i}, metadata={})
            for i in range(3)
        ]

        mock_result = MagicMock()
        mock_result.inserted_ids = [ObjectId() for _ in range(3)]
        mock_collection.insert_many.return_value = mock_result

        with patch.object(service, '_get_collection', return_value=mock_collection):
            results = await service.bulk_create_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789",
                records=records
            )

            assert len(results) == 3
            assert all(hasattr(r, 'record_id') for r in results)
            mock_collection.insert_many.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_create_empty_list(self, service, mock_collection):
        """Test bulk creating with empty list raises error."""
        with patch.object(service, '_get_collection', return_value=mock_collection):
            with pytest.raises(ValidationError):
                await service.bulk_create_records(
                    org_id="org_123",
                    project_id="project_456",
                    trial_slug="trial_789",
                    records=[]
                )

    @pytest.mark.asyncio
    async def test_search_records(self, service, mock_collection):
        """Test searching patient records."""
        search_params = PatientRecordSearch(
            filters={"patient_data.age": {"$gte": 40}}
        )

        mock_docs = [
            {
                "_id": ObjectId(),
                "record_id": "record_1",
                "patient_data": {"age": 45},
                "metadata": {},
                "created_at": datetime.utcnow(),
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
            assert pages == 1

    @pytest.mark.asyncio
    async def test_count_records(self, service, mock_collection):
        """Test counting patient records."""
        mock_collection.count_documents.return_value = 42

        with patch.object(service, '_get_collection', return_value=mock_collection):
            count = await service.count_records(
                org_id="org_123",
                project_id="project_456",
                trial_slug="trial_789"
            )

            assert count == 42
            mock_collection.count_documents.assert_called_once_with({})
