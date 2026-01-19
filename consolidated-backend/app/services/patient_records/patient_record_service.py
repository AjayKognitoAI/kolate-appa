"""
Patient Record Service (MongoDB)

Manages patient records stored in MongoDB collections with multi-tenant support.
Each project/trial combination has its own collection for patient data.
"""

from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from math import ceil
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
import uuid

from app.config.settings import settings
from app.core.mongodb import get_mongo_database, get_collection_name
from app.schemas.mongo import (
    PatientRecordCreate,
    PatientRecordUpdate,
    PatientRecordResponse,
    PatientRecordSearch,
)
from app.exceptions.base import NotFoundError, ValidationError


class PatientRecordService:
    """
    Patient record management service using MongoDB.

    Handles CRUD operations for patient records with support for:
    - Pagination and sorting
    - Bulk operations
    - Flexible field-based search
    - Multi-tenant isolation
    """

    def __init__(self):
        """Initialize the patient record service."""
        self.client: Optional[AsyncIOMotorClient] = None

    def _get_collection_name(self, project_id: str, trial_slug: str) -> str:
        """
        Generate collection name for patient records.

        Args:
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            str: Collection name in format {project_id}_{trial_slug}_patient_records
        """
        return get_collection_name(project_id, trial_slug, "patient_records")

    async def _get_collection(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str
    ) -> AsyncIOMotorCollection:
        """
        Get the MongoDB collection for patient records.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            AsyncIOMotorCollection: The patient records collection
        """
        db = await get_mongo_database(org_id)
        collection_name = self._get_collection_name(project_id, trial_slug)
        return db[collection_name]

    async def create_record(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        record_data: PatientRecordCreate
    ) -> PatientRecordResponse:
        """
        Create a new patient record.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_data: Patient record data

        Returns:
            PatientRecordResponse: Created patient record
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Generate record_id if not provided
        record_id = record_data.record_id or str(uuid.uuid4())

        doc = {
            "record_id": record_id,
            "patient_data": record_data.patient_data,
            "metadata": record_data.metadata or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = await collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        return PatientRecordResponse(**doc)

    async def get_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        page: int = 1,
        size: int = 10,
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Tuple[List[PatientRecordResponse], int, int]:
        """
        Get paginated patient records.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            page: Page number (1-indexed)
            size: Page size
            sort_by: Field to sort by (default: created_at)
            sort_order: Sort order 'asc' or 'desc'

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Calculate skip
        skip = (page - 1) * size

        # Determine sort field and direction
        sort_field = sort_by or "created_at"
        sort_direction = -1 if sort_order == "desc" else 1

        # Get total count
        total = await collection.count_documents({})
        total_pages = ceil(total / size) if total > 0 else 0

        # Query with pagination and sorting
        cursor = collection.find({}).sort(sort_field, sort_direction).skip(skip).limit(size)
        documents = await cursor.to_list(length=size)

        # Convert to response models
        records = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            records.append(PatientRecordResponse(**doc))

        return records, total, total_pages

    async def get_all_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str
    ) -> List[PatientRecordResponse]:
        """
        Get all patient records without pagination.

        Warning: Use with caution for large datasets.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            List[PatientRecordResponse]: All patient records
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        cursor = collection.find({}).sort("created_at", -1)
        documents = await cursor.to_list(length=None)

        records = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            records.append(PatientRecordResponse(**doc))

        return records

    async def get_record_by_id(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        record_id: str
    ) -> PatientRecordResponse:
        """
        Get a patient record by its record_id.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_id: Record identifier

        Returns:
            PatientRecordResponse: Patient record

        Raises:
            NotFoundError: If record not found
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        doc = await collection.find_one({"record_id": record_id})

        if not doc:
            raise NotFoundError(
                message=f"Patient record not found with record_id: {record_id}",
                resource_type="PatientRecord",
                resource_id=record_id
            )

        doc["_id"] = str(doc["_id"])
        return PatientRecordResponse(**doc)

    async def update_record(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        record_id: str,
        update_data: PatientRecordUpdate
    ) -> PatientRecordResponse:
        """
        Update a patient record.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_id: Record identifier
            update_data: Updated patient record data

        Returns:
            PatientRecordResponse: Updated patient record

        Raises:
            NotFoundError: If record not found
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}

        if update_data.patient_data is not None:
            update_doc["patient_data"] = update_data.patient_data

        if update_data.metadata is not None:
            update_doc["metadata"] = update_data.metadata

        # Update the record
        result = await collection.find_one_and_update(
            {"record_id": record_id},
            {"$set": update_doc},
            return_document=True
        )

        if not result:
            raise NotFoundError(
                message=f"Patient record not found with record_id: {record_id}",
                resource_type="PatientRecord",
                resource_id=record_id
            )

        result["_id"] = str(result["_id"])
        return PatientRecordResponse(**result)

    async def delete_record(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        record_id: str
    ) -> bool:
        """
        Delete a patient record.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_id: Record identifier

        Returns:
            bool: True if deleted successfully

        Raises:
            NotFoundError: If record not found
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        result = await collection.delete_one({"record_id": record_id})

        if result.deleted_count == 0:
            raise NotFoundError(
                message=f"Patient record not found with record_id: {record_id}",
                resource_type="PatientRecord",
                resource_id=record_id
            )

        return True

    async def bulk_create_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        records: List[PatientRecordCreate]
    ) -> List[PatientRecordResponse]:
        """
        Bulk create patient records.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            records: List of patient records to create

        Returns:
            List[PatientRecordResponse]: Created patient records

        Raises:
            ValidationError: If records list is empty
        """
        if not records:
            raise ValidationError(
                message="Cannot bulk create empty list of records",
                field="records"
            )

        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Prepare documents
        now = datetime.utcnow()
        documents = []
        for record in records:
            record_id = record.record_id or str(uuid.uuid4())
            doc = {
                "record_id": record_id,
                "patient_data": record.patient_data,
                "metadata": record.metadata or {},
                "created_at": now,
                "updated_at": now,
            }
            documents.append(doc)

        # Bulk insert
        result = await collection.insert_many(documents)

        # Update documents with inserted IDs
        for doc, inserted_id in zip(documents, result.inserted_ids):
            doc["_id"] = str(inserted_id)

        # Convert to response models
        return [PatientRecordResponse(**doc) for doc in documents]

    async def search_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        search_params: PatientRecordSearch,
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[PatientRecordResponse], int, int]:
        """
        Search patient records with flexible filtering.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            search_params: Search parameters
            page: Page number (1-indexed)
            size: Page size

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Build query
        query: Dict[str, Any] = {}

        if search_params.record_id:
            query["record_id"] = search_params.record_id

        if search_params.filters:
            # Add flexible field-based filters
            # Support nested field queries like "patient_data.age": 25
            for field, value in search_params.filters.items():
                query[field] = value

        # Calculate skip
        skip = (page - 1) * size

        # Get total count
        total = await collection.count_documents(query)
        total_pages = ceil(total / size) if total > 0 else 0

        # Query with pagination
        cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(size)
        documents = await cursor.to_list(length=size)

        # Convert to response models
        records = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            records.append(PatientRecordResponse(**doc))

        return records, total, total_pages

    async def count_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str
    ) -> int:
        """
        Get total count of patient records.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            int: Total count of records
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)
        return await collection.count_documents({})
