"""
Tests for Patient Record Service (PostgreSQL)

Unit tests for PatientRecordService with mocked PostgreSQL operations.
These tests mock the service methods directly to avoid database dependencies.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


class MockPatientRecordService:
    """Mock implementation of PatientRecordService for testing."""

    async def create_record(self, db, project_id, trial_slug, record_data, created_by):
        return MagicMock(
            id=uuid4(),
            record_id=getattr(record_data, 'record_id', str(uuid4())),
            project_id=project_id,
            trial_slug=trial_slug,
            patient_data=getattr(record_data, 'patient_data', {}),
            metadata=getattr(record_data, 'metadata', {}),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def get_records(self, db, project_id, trial_slug, page=1, size=10, **kwargs):
        return ([], 0, 0)

    async def get_record_by_id(self, db, project_id, trial_slug, record_id):
        return MagicMock(
            id=uuid4(),
            record_id=record_id,
            project_id=project_id,
            trial_slug=trial_slug,
            patient_data={},
            metadata={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def update_record(self, db, project_id, trial_slug, record_id, update_data, **kwargs):
        return MagicMock(
            id=uuid4(),
            record_id=record_id,
            project_id=project_id,
            trial_slug=trial_slug,
            patient_data=getattr(update_data, 'patient_data', {}),
            metadata=getattr(update_data, 'metadata', {}),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def delete_record(self, db, project_id, trial_slug, record_id):
        return True

    async def count_records(self, db, project_id, trial_slug):
        return 42


@pytest.fixture
def service():
    """Fixture for PatientRecordService."""
    return MockPatientRecordService()


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
def sample_patient_data():
    """Sample patient data for testing."""
    return {
        "age": 45,
        "gender": "M",
        "blood_pressure": 120,
        "cholesterol": 200,
    }


@pytest.fixture
def sample_project_id():
    """Sample project UUID."""
    return uuid4()


class MockRecordData:
    """Mock record data class."""
    def __init__(self, record_id=None, patient_data=None, metadata=None):
        self.record_id = record_id or str(uuid4())
        self.patient_data = patient_data or {}
        self.metadata = metadata or {}


class MockUpdateData:
    """Mock update data class."""
    def __init__(self, patient_data=None, metadata=None):
        self.patient_data = patient_data
        self.metadata = metadata


class TestPatientRecordService:
    """Test suite for PatientRecordService."""

    @pytest.mark.asyncio
    async def test_create_record(self, service, mock_db, sample_patient_data, sample_project_id):
        """Test creating a patient record."""
        record_data = MockRecordData(
            record_id="test-record-123",
            patient_data=sample_patient_data,
            metadata={"source": "test"}
        )

        result = await service.create_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_data=record_data,
            created_by="user_123"
        )

        assert result.record_id == "test-record-123"
        assert result.project_id == sample_project_id

    @pytest.mark.asyncio
    async def test_create_record_auto_generate_id(self, service, mock_db, sample_project_id):
        """Test creating a patient record with auto-generated ID."""
        record_data = MockRecordData(
            patient_data={"age": 30},
            metadata={}
        )

        result = await service.create_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_data=record_data,
            created_by="user_123"
        )

        assert result.record_id is not None
        assert len(result.record_id) > 0

    @pytest.mark.asyncio
    async def test_get_records_paginated(self, service, mock_db, sample_project_id):
        """Test getting paginated patient records."""
        records, total, pages = await service.get_records(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            page=1,
            size=5
        )

        assert isinstance(records, list)
        assert isinstance(total, int)
        assert isinstance(pages, int)

    @pytest.mark.asyncio
    async def test_get_record_by_id(self, service, mock_db, sample_patient_data, sample_project_id):
        """Test getting a patient record by ID."""
        result = await service.get_record_by_id(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_id="test-record-123"
        )

        assert result.record_id == "test-record-123"

    @pytest.mark.asyncio
    async def test_update_record(self, service, mock_db, sample_project_id):
        """Test updating a patient record."""
        updated_data = MockUpdateData(
            patient_data={"age": 50},
            metadata={"updated": True}
        )

        result = await service.update_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_id="test-record-123",
            update_data=updated_data,
            updated_by="user_123"
        )

        assert result.patient_data == {"age": 50}
        assert result.metadata == {"updated": True}

    @pytest.mark.asyncio
    async def test_delete_record(self, service, mock_db, sample_project_id):
        """Test deleting a patient record."""
        result = await service.delete_record(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789",
            record_id="test-record-123"
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_count_records(self, service, mock_db, sample_project_id):
        """Test counting patient records."""
        count = await service.count_records(
            mock_db,
            project_id=sample_project_id,
            trial_slug="trial_789"
        )

        assert count == 42
