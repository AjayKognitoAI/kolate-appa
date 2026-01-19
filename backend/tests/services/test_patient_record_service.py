"""
Tests for Patient Record Service (PostgreSQL)

Unit tests for PatientRecordService with mocked PostgreSQL operations.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4, UUID

from app.services.patient_records import PatientRecordService
from app.schemas.patient_record import (
    PatientRecordBase,
    PatientRecordUpdate,
    PatientRecordSearch,
)
from app.exceptions.base import NotFoundError, ValidationError


@pytest.fixture
def service():
    """Fixture for PatientRecordService."""
    return PatientRecordService()


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
def sample_record_create(sample_patient_data):
    """Sample PatientRecordBase schema."""
    return PatientRecordBase(
        record_id="test-record-123",
        patient_data=sample_patient_data,
        metadata={"source": "test"}
    )


@pytest.fixture
def sample_project_id():
    """Sample project UUID."""
    return uuid4()


class TestPatientRecordService:
    """Test suite for PatientRecordService."""

    @pytest.mark.asyncio
    async def test_create_record(self, service, mock_db, sample_record_create, sample_project_id):
        """Test creating a patient record."""
        # Create record
        with patch.object(service, 'create_record', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = MagicMock(
                id=uuid4(),
                record_id="test-record-123",
                project_id=sample_project_id,
                trial_slug="trial_789",
                patient_data=sample_record_create.patient_data,
                metadata=sample_record_create.metadata,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            result = await service.create_record(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                record_data=sample_record_create,
                created_by="user_123"
            )

            assert result.record_id == "test-record-123"
            mock_create.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_record_auto_generate_id(self, service, mock_db, sample_project_id):
        """Test creating a patient record with auto-generated ID."""
        record_data = PatientRecordBase(
            patient_data={"age": 30},
            metadata={}
        )

        with patch.object(service, 'create_record', new_callable=AsyncMock) as mock_create:
            generated_id = str(uuid4())
            mock_create.return_value = MagicMock(
                id=uuid4(),
                record_id=generated_id,
                project_id=sample_project_id,
                trial_slug="trial_789",
                patient_data={"age": 30},
                metadata={},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            result = await service.create_record(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                record_data=record_data,
                created_by="user_123"
            )

            # Should auto-generate record_id
            assert result.record_id is not None
            assert len(result.record_id) > 0

    @pytest.mark.asyncio
    async def test_get_records_paginated(self, service, mock_db, sample_project_id):
        """Test getting paginated patient records."""
        mock_records = [
            MagicMock(
                id=uuid4(),
                record_id=f"record_{i}",
                project_id=sample_project_id,
                trial_slug="trial_789",
                patient_data={"age": 30 + i},
                metadata={},
                created_at=datetime.utcnow(),
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
                size=5
            )

            assert len(records) == 5
            assert total == 15
            assert pages == 3

    @pytest.mark.asyncio
    async def test_get_record_by_id(self, service, mock_db, sample_patient_data, sample_project_id):
        """Test getting a patient record by ID."""
        with patch.object(service, 'get_record_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = MagicMock(
                id=uuid4(),
                record_id="test-record-123",
                project_id=sample_project_id,
                trial_slug="trial_789",
                patient_data=sample_patient_data,
                metadata={},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            result = await service.get_record_by_id(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                record_id="test-record-123"
            )

            assert result.record_id == "test-record-123"
            assert result.patient_data == sample_patient_data

    @pytest.mark.asyncio
    async def test_get_record_by_id_not_found(self, service, mock_db, sample_project_id):
        """Test getting a non-existent patient record."""
        with patch.object(service, 'get_record_by_id', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = NotFoundError(
                message="Patient record not found",
                resource_type="PatientRecord",
                resource_id="non-existent"
            )

            with pytest.raises(NotFoundError) as exc_info:
                await service.get_record_by_id(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    record_id="non-existent"
                )

            assert "not found" in str(exc_info.value.message).lower()

    @pytest.mark.asyncio
    async def test_update_record(self, service, mock_db, sample_project_id):
        """Test updating a patient record."""
        updated_data = PatientRecordUpdate(
            patient_data={"age": 50},
            metadata={"updated": True}
        )

        with patch.object(service, 'update_record', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = MagicMock(
                id=uuid4(),
                record_id="test-record-123",
                project_id=sample_project_id,
                trial_slug="trial_789",
                patient_data={"age": 50},
                metadata={"updated": True},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
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
    async def test_update_record_not_found(self, service, mock_db, sample_project_id):
        """Test updating a non-existent patient record."""
        updated_data = PatientRecordUpdate(patient_data={"age": 50})

        with patch.object(service, 'update_record', new_callable=AsyncMock) as mock_update:
            mock_update.side_effect = NotFoundError(
                message="Patient record not found",
                resource_type="PatientRecord",
                resource_id="non-existent"
            )

            with pytest.raises(NotFoundError):
                await service.update_record(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    record_id="non-existent",
                    update_data=updated_data,
                    updated_by="user_123"
                )

    @pytest.mark.asyncio
    async def test_delete_record(self, service, mock_db, sample_project_id):
        """Test deleting a patient record."""
        with patch.object(service, 'delete_record', new_callable=AsyncMock) as mock_delete:
            mock_delete.return_value = True

            result = await service.delete_record(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                record_id="test-record-123"
            )

            assert result is True

    @pytest.mark.asyncio
    async def test_delete_record_not_found(self, service, mock_db, sample_project_id):
        """Test deleting a non-existent patient record."""
        with patch.object(service, 'delete_record', new_callable=AsyncMock) as mock_delete:
            mock_delete.side_effect = NotFoundError(
                message="Patient record not found",
                resource_type="PatientRecord",
                resource_id="non-existent"
            )

            with pytest.raises(NotFoundError):
                await service.delete_record(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    record_id="non-existent"
                )

    @pytest.mark.asyncio
    async def test_bulk_create_records(self, service, mock_db, sample_project_id):
        """Test bulk creating patient records."""
        records = [
            PatientRecordBase(patient_data={"age": 30 + i}, metadata={})
            for i in range(3)
        ]

        with patch.object(service, 'bulk_create_records', new_callable=AsyncMock) as mock_bulk:
            mock_bulk.return_value = [
                MagicMock(
                    id=uuid4(),
                    record_id=str(uuid4()),
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    patient_data={"age": 30 + i},
                    metadata={},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                for i in range(3)
            ]

            results = await service.bulk_create_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789",
                records=records,
                created_by="user_123"
            )

            assert len(results) == 3

    @pytest.mark.asyncio
    async def test_bulk_create_empty_list(self, service, mock_db, sample_project_id):
        """Test bulk creating with empty list raises error."""
        with patch.object(service, 'bulk_create_records', new_callable=AsyncMock) as mock_bulk:
            mock_bulk.side_effect = ValidationError(
                message="Cannot bulk create empty list of records",
                field="records"
            )

            with pytest.raises(ValidationError):
                await service.bulk_create_records(
                    mock_db,
                    project_id=sample_project_id,
                    trial_slug="trial_789",
                    records=[],
                    created_by="user_123"
                )

    @pytest.mark.asyncio
    async def test_search_records(self, service, mock_db, sample_project_id):
        """Test searching patient records."""
        search_params = PatientRecordSearch(
            filters={"patient_data.age": 40}
        )

        with patch.object(service, 'search_records', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = (
                [
                    MagicMock(
                        id=uuid4(),
                        record_id="record_1",
                        project_id=sample_project_id,
                        trial_slug="trial_789",
                        patient_data={"age": 45},
                        metadata={},
                        created_at=datetime.utcnow(),
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
            assert pages == 1

    @pytest.mark.asyncio
    async def test_count_records(self, service, mock_db, sample_project_id):
        """Test counting patient records."""
        with patch.object(service, 'count_records', new_callable=AsyncMock) as mock_count:
            mock_count.return_value = 42

            count = await service.count_records(
                mock_db,
                project_id=sample_project_id,
                trial_slug="trial_789"
            )

            assert count == 42
