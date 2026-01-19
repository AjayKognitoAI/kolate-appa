"""
Execution Record Service (MongoDB)

Manages execution/prediction records stored in MongoDB collections with multi-tenant support.
Tracks model executions and predictions for each project/trial combination.
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
    ExecutionRecordCreate,
    ExecutionRecordUpdate,
    ExecutionRecordResponse,
    ExecutionRecordSearch,
)
from app.exceptions.base import NotFoundError, ValidationError


class ExecutionRecordService:
    """
    Execution record management service using MongoDB.

    Handles CRUD operations for execution/prediction records with support for:
    - User-specific record tracking
    - Pagination and sorting
    - Batch retrieval by IDs
    - Flexible search filtering
    - Multi-tenant isolation
    """

    def __init__(self):
        """Initialize the execution record service."""
        self.client: Optional[AsyncIOMotorClient] = None

    def _get_collection_name(self, project_id: str, trial_slug: str) -> str:
        """
        Generate collection name for execution records.

        Args:
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            str: Collection name in format {project_id}_{trial_slug}_prediction_results
        """
        return get_collection_name(project_id, trial_slug, "prediction_results")

    async def _get_collection(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str
    ) -> AsyncIOMotorCollection:
        """
        Get the MongoDB collection for execution records.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier

        Returns:
            AsyncIOMotorCollection: The execution records collection
        """
        db = await get_mongo_database(org_id)
        collection_name = self._get_collection_name(project_id, trial_slug)
        return db[collection_name]

    async def create_record(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        record_data: ExecutionRecordCreate,
        current_user: str
    ) -> ExecutionRecordResponse:
        """
        Create a new execution record.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            record_data: Execution record data
            current_user: Auth0 ID of the user creating the record

        Returns:
            ExecutionRecordResponse: Created execution record
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Generate execution_id
        execution_id = str(uuid.uuid4())
        now = datetime.utcnow()

        doc = {
            "execution_id": execution_id,
            "user_id": record_data.user_id,
            "base_patient_data": record_data.base_patient_data,
            "base_prediction": record_data.base_prediction,
            "executed_by": record_data.executed_by or current_user,
            "executed_at": now,
            "updated_by": None,
            "updated_at": now,
        }

        result = await collection.insert_one(doc)
        doc["_id"] = str(result.inserted_id)

        return ExecutionRecordResponse(**doc)

    async def get_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        page: int = 1,
        size: int = 10,
        sort_by: Optional[str] = None,
        sort_order: str = "desc"
    ) -> Tuple[List[ExecutionRecordResponse], int, int]:
        """
        Get paginated execution records.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            page: Page number (1-indexed)
            size: Page size
            sort_by: Field to sort by (default: executed_at)
            sort_order: Sort order 'asc' or 'desc'

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Calculate skip
        skip = (page - 1) * size

        # Determine sort field and direction
        sort_field = sort_by or "executed_at"
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
            records.append(ExecutionRecordResponse(**doc))

        return records, total, total_pages

    async def get_record_by_id(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        execution_id: str
    ) -> ExecutionRecordResponse:
        """
        Get an execution record by its execution_id.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_id: Execution identifier

        Returns:
            ExecutionRecordResponse: Execution record

        Raises:
            NotFoundError: If record not found
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        doc = await collection.find_one({"execution_id": execution_id})

        if not doc:
            raise NotFoundError(
                message=f"Execution record not found with execution_id: {execution_id}",
                resource_type="ExecutionRecord",
                resource_id=execution_id
            )

        doc["_id"] = str(doc["_id"])
        return ExecutionRecordResponse(**doc)

    async def update_record(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        execution_id: str,
        update_data: ExecutionRecordUpdate,
        current_user: str
    ) -> ExecutionRecordResponse:
        """
        Update an execution record.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_id: Execution identifier
            update_data: Updated execution record data
            current_user: Auth0 ID of the user updating the record

        Returns:
            ExecutionRecordResponse: Updated execution record

        Raises:
            NotFoundError: If record not found
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Build update document
        update_doc = {
            "updated_at": datetime.utcnow(),
            "updated_by": update_data.updated_by or current_user
        }

        if update_data.base_patient_data is not None:
            update_doc["base_patient_data"] = update_data.base_patient_data

        if update_data.base_prediction is not None:
            update_doc["base_prediction"] = update_data.base_prediction

        # Update the record
        result = await collection.find_one_and_update(
            {"execution_id": execution_id},
            {"$set": update_doc},
            return_document=True
        )

        if not result:
            raise NotFoundError(
                message=f"Execution record not found with execution_id: {execution_id}",
                resource_type="ExecutionRecord",
                resource_id=execution_id
            )

        result["_id"] = str(result["_id"])
        return ExecutionRecordResponse(**result)

    async def get_records_by_ids(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        execution_ids: List[str]
    ) -> List[ExecutionRecordResponse]:
        """
        Get multiple execution records by their IDs.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_ids: List of execution identifiers

        Returns:
            List[ExecutionRecordResponse]: List of execution records
        """
        if not execution_ids:
            return []

        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Query for records matching any of the execution IDs
        cursor = collection.find({"execution_id": {"$in": execution_ids}})
        documents = await cursor.to_list(length=None)

        # Convert to response models
        records = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            records.append(ExecutionRecordResponse(**doc))

        return records

    async def search_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        search_params: ExecutionRecordSearch,
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[ExecutionRecordResponse], int, int]:
        """
        Search execution records with flexible filtering.

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

        if search_params.user_id:
            query["user_id"] = search_params.user_id

        if search_params.executed_by:
            query["executed_by"] = search_params.executed_by

        # Date range filtering
        if search_params.date_from or search_params.date_to:
            date_query: Dict[str, Any] = {}
            if search_params.date_from:
                date_query["$gte"] = search_params.date_from
            if search_params.date_to:
                date_query["$lte"] = search_params.date_to
            query["executed_at"] = date_query

        # Calculate skip
        skip = (page - 1) * size

        # Get total count
        total = await collection.count_documents(query)
        total_pages = ceil(total / size) if total > 0 else 0

        # Query with pagination and sorting
        cursor = (
            collection.find(query)
            .sort([("executed_at", -1), ("updated_at", -1)])
            .skip(skip)
            .limit(size)
        )
        documents = await cursor.to_list(length=size)

        # Convert to response models
        records = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            records.append(ExecutionRecordResponse(**doc))

        return records, total, total_pages

    async def get_user_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        user_id: str,
        page: int = 1,
        size: int = 10
    ) -> Tuple[List[ExecutionRecordResponse], int, int]:
        """
        Get paginated execution records for a specific user.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            user_id: User identifier (Auth0 ID)
            page: Page number (1-indexed)
            size: Page size

        Returns:
            Tuple of (records, total_count, total_pages)
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        # Build query for user
        query = {"user_id": user_id}

        # Calculate skip
        skip = (page - 1) * size

        # Get total count
        total = await collection.count_documents(query)
        total_pages = ceil(total / size) if total > 0 else 0

        # Query with pagination and sorting by execution date
        cursor = (
            collection.find(query)
            .sort([("executed_at", -1), ("updated_at", -1)])
            .skip(skip)
            .limit(size)
        )
        documents = await cursor.to_list(length=size)

        # Convert to response models
        records = []
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            records.append(ExecutionRecordResponse(**doc))

        return records, total, total_pages

    async def count_records(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        user_id: Optional[str] = None
    ) -> int:
        """
        Get total count of execution records, optionally filtered by user.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            user_id: Optional user identifier to filter by

        Returns:
            int: Total count of records
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        query = {}
        if user_id:
            query["user_id"] = user_id

        return await collection.count_documents(query)

    async def delete_record(
        self,
        org_id: str,
        project_id: str,
        trial_slug: str,
        execution_id: str
    ) -> bool:
        """
        Delete an execution record.

        Args:
            org_id: Organization identifier
            project_id: Project identifier
            trial_slug: Trial slug identifier
            execution_id: Execution identifier

        Returns:
            bool: True if deleted successfully

        Raises:
            NotFoundError: If record not found
        """
        collection = await self._get_collection(org_id, project_id, trial_slug)

        result = await collection.delete_one({"execution_id": execution_id})

        if result.deleted_count == 0:
            raise NotFoundError(
                message=f"Execution record not found with execution_id: {execution_id}",
                resource_type="ExecutionRecord",
                resource_id=execution_id
            )

        return True
