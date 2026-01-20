"""
Data Service for Patient Screening

Service for master data upload/download operations including
file parsing (CSV, JSON, XLSX), S3 storage, and type inference.
Uses common S3 client from patient_screening module.
"""

from typing import Dict, List, Any, Optional
from uuid import UUID, uuid4
from io import BytesIO
import json

import pandas as pd

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenant.patient_screening import MasterData, Study
from app.schemas.patient_screening.data_schemas import (
    MasterDataUploadResponse,
    PresignedUrlResponse,
)
from app.services.patient_screening.analytics_service import AnalyticsService
from app.services.patient_screening.type_inference_service import TypeInferenceService
from app.services.patient_screening.s3_client import patient_screening_s3_client
from app.config.settings import settings
from app.core.logging import get_class_logger


# File validation constants
ALLOWED_EXTENSIONS = {"csv", "json", "xlsx"}
ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}


def validate_file_upload(
    filename: str, file_size: int, content_type: Optional[str] = None
) -> str:
    """
    Validate uploaded file.

    Args:
        filename: Name of the uploaded file
        file_size: Size in bytes
        content_type: MIME type of the file

    Returns:
        File type (csv, json, xlsx)

    Raises:
        ValueError: If validation fails
    """
    # Check file size
    max_size_bytes = settings.MAX_MASTER_DATA_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size_bytes:
        raise ValueError(
            f"File size ({file_size / 1024 / 1024:.2f} MB) exceeds "
            f"maximum allowed ({settings.MAX_MASTER_DATA_FILE_SIZE_MB} MB)"
        )

    # Get file extension
    if "." not in filename:
        raise ValueError("File must have an extension")

    extension = filename.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Invalid file type: {extension}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    return extension


class DataService:
    """
    Service for master data upload/download operations.

    Features:
    - File validation and parsing (CSV, JSON, XLSX)
    - S3 upload with structured key generation
    - Automatic column type inference
    - Patient ID column validation
    - Paginated data preview

    Uses:
    - Common S3 client (patient_screening_s3_client)
    - TypeInferenceService for column type detection
    - AnalyticsService for activity logging
    """

    def __init__(self):
        # Use common singleton S3 client
        self.s3_client = patient_screening_s3_client
        self.type_inference = TypeInferenceService()
        self.analytics_service = AnalyticsService()
        self.logger = get_class_logger(self.__class__)

    async def upload_master_data(
        self,
        db: AsyncSession,
        file_content: bytes,
        file_name: str,
        content_type: str,
        study_id: UUID,
        user_id: str,
        user_name: Optional[str] = None,
        patient_id_column: Optional[str] = None,
        column_descriptions: Optional[Dict[str, Any]] = None,
    ) -> MasterDataUploadResponse:
        """
        Upload master data file to S3 and store metadata in DB.

        Args:
            db: Database session
            file_content: File content as bytes
            file_name: Original filename
            content_type: MIME type of the file
            study_id: UUID of the study
            user_id: ID of the user uploading
            user_name: Optional user display name
            patient_id_column: Optional column name containing patient IDs
            column_descriptions: Optional column descriptions

        Returns:
            MasterDataUploadResponse with upload details

        Raises:
            ValueError: If validation fails or study not found
        """
        # Validate study exists
        study_query = select(Study).where(Study.id == study_id)
        study_result = await db.execute(study_query)
        study = study_result.scalar_one_or_none()

        if not study:
            raise ValueError("Study not found")

        # Validate file
        file_type = validate_file_upload(file_name, len(file_content), content_type)

        # Parse file to DataFrame
        df = self._parse_file(file_content, file_type)

        # Infer column types
        columns = self.type_inference.infer_column_types(df)

        # Validate patient_id_column if provided
        warnings = []
        if patient_id_column:
            validation_warnings = self._validate_patient_id_column(df, patient_id_column)
            warnings.extend(validation_warnings)

        # Generate S3 key
        master_data_id = uuid4()
        s3_key = self.s3_client.generate_s3_key(
            enterprise_id="tenant",  # Placeholder - actual tenant handled by schema
            master_data_id=str(master_data_id),
            filename=file_name,
        )

        # Upload to S3
        await self.s3_client.upload_file(
            key=s3_key, data=file_content, content_type=content_type
        )

        # Extract sample data (first 5 rows)
        sample_data = json.loads(df.head(5).to_json(orient="records"))

        # Create master data record
        master_data = MasterData(
            id=master_data_id,
            study_id=study_id,
            s3_bucket=self.s3_client.bucket,
            s3_key=s3_key,
            s3_region=self.s3_client.region,
            file_name=file_name,
            file_type=file_type,
            file_size=len(file_content),
            content_type=content_type,
            row_count=len(df),
            columns=columns,
            sample_data=sample_data,
            patient_id_column=patient_id_column,
            column_descriptions=column_descriptions,
            created_by=user_id,
        )

        db.add(master_data)
        await db.flush()

        # Log activity
        await self.analytics_service.log_activity(
            db=db,
            study_id=study_id,
            entity_type="master_data",
            entity_id=master_data.id,
            action="created",
            description=f"Master data '{file_name}' uploaded",
            user_id=user_id,
            user_name=user_name,
            activity_metadata={
                "file_name": file_name,
                "file_type": file_type,
                "file_size": len(file_content),
                "row_count": len(df),
                "column_count": len(columns),
            },
        )

        self.logger.info(f"Uploaded master data {master_data_id} with {len(df)} rows")

        await db.commit()
        await db.refresh(master_data)

        return MasterDataUploadResponse(
            master_data_id=master_data.id,
            s3_key=s3_key,
            file_name=file_name,
            file_size=len(file_content),
            row_count=len(df),
            columns=columns,
            patient_id_column=patient_id_column,
            column_descriptions=column_descriptions,
            warnings=warnings if warnings else None,
        )

    def _parse_file(self, file_content: bytes, file_type: str) -> pd.DataFrame:
        """
        Parse file content to DataFrame.

        Args:
            file_content: File content as bytes
            file_type: File type (csv, json, xlsx)

        Returns:
            Parsed pandas DataFrame

        Raises:
            ValueError: If file type is unsupported
        """
        if file_type == "csv":
            return pd.read_csv(BytesIO(file_content))
        elif file_type == "json":
            return pd.read_json(BytesIO(file_content))
        elif file_type == "xlsx":
            return pd.read_excel(BytesIO(file_content))
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def _validate_patient_id_column(
        self, df: pd.DataFrame, patient_id_column: str
    ) -> List[str]:
        """
        Validate the patient ID column.

        Args:
            df: DataFrame containing the uploaded data
            patient_id_column: Name of the column to validate

        Returns:
            List of warning messages

        Raises:
            ValueError: If the column doesn't exist
        """
        warnings = []

        # Validate column exists
        if patient_id_column not in df.columns:
            available_columns = ", ".join(df.columns.tolist())
            raise ValueError(
                f"Column '{patient_id_column}' not found in file. "
                f"Available columns: {available_columns}"
            )

        patient_ids = df[patient_id_column]

        # Check for null/empty values
        null_count = patient_ids.isna().sum()
        if null_count > 0:
            null_percentage = (null_count / len(df)) * 100
            warnings.append(
                f"Patient ID column '{patient_id_column}' contains {null_count} "
                f"null/empty values ({null_percentage:.2f}% of total rows)"
            )

        # Check for duplicates
        non_null_ids = patient_ids.dropna()
        if len(non_null_ids) > 0:
            unique_count = non_null_ids.nunique()
            total_count = len(non_null_ids)
            duplicate_count = total_count - unique_count

            if duplicate_count > 0:
                duplicate_percentage = (duplicate_count / total_count) * 100

                if duplicate_percentage > 5:
                    warnings.append(
                        f"Patient ID column '{patient_id_column}' has {duplicate_count} "
                        f"duplicate values ({duplicate_percentage:.2f}% of non-null rows). "
                        f"This may indicate data quality issues."
                    )
                else:
                    warnings.append(
                        f"Patient ID column '{patient_id_column}' has {duplicate_count} "
                        f"duplicate values ({duplicate_percentage:.2f}% of non-null rows)"
                    )

        self.logger.info(
            f"Validated patient_id_column '{patient_id_column}': "
            f"{len(patient_ids)} total, {patient_ids.nunique()} unique, "
            f"{null_count} null, {len(warnings)} warnings"
        )

        return warnings

    async def get_master_data_preview(
        self, db: AsyncSession, master_data_id: UUID, page: int = 0, size: int = 100
    ) -> Dict[str, Any]:
        """
        Get paginated preview of master data rows.

        Args:
            db: Database session
            master_data_id: UUID of the master data
            page: Page number (0-indexed)
            size: Number of rows per page (max 1000)

        Returns:
            Dictionary with rows, total_rows, columns, page, size
        """
        # Limit size to reasonable value
        size = min(size, 1000)

        # Get master data metadata
        query = select(MasterData).where(MasterData.id == master_data_id)
        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            raise ValueError("Master data not found")

        # Download file from S3
        file_content = await self.s3_client.download_file(master_data.s3_key)

        # Parse the file
        df = self._parse_file(file_content, master_data.file_type)

        # Apply pagination
        total_rows = len(df)
        start_idx = page * size
        end_idx = start_idx + size
        paginated_df = df.iloc[start_idx:end_idx]

        # Convert to list of dicts, handling NaN values
        rows = paginated_df.where(pd.notnull(paginated_df), None).to_dict(orient="records")

        self.logger.info(
            f"Retrieved preview for master_data {master_data_id}: "
            f"page={page}, size={size}, returned={len(rows)}/{total_rows}"
        )

        return {
            "master_data_id": str(master_data_id),
            "rows": rows,
            "total_rows": total_rows,
            "columns": master_data.columns,
            "patient_id_column": master_data.patient_id_column,
            "column_descriptions": master_data.column_descriptions,
            "page": page,
            "size": size,
        }

    async def get_master_data_by_id(
        self, db: AsyncSession, master_data_id: UUID
    ) -> Optional[MasterData]:
        """
        Get master data record by ID.

        Args:
            db: Database session
            master_data_id: UUID of the master data

        Returns:
            MasterData record or None
        """
        query = select(MasterData).where(MasterData.id == master_data_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def delete_master_data(
        self,
        db: AsyncSession,
        master_data_id: UUID,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> bool:
        """
        Delete master data and its S3 file.

        Args:
            db: Database session
            master_data_id: UUID of the master data to delete
            user_id: Optional ID of the user deleting
            user_name: Optional user display name

        Returns:
            True if deleted successfully
        """
        # Get master data
        query = select(MasterData).where(MasterData.id == master_data_id)
        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            return False

        study_id = master_data.study_id
        file_name = master_data.file_name

        # Delete S3 file
        try:
            await self.s3_client.delete_file(master_data.s3_key)
            self.logger.info(f"Deleted S3 file: {master_data.s3_key}")
        except Exception as e:
            self.logger.error(f"Failed to delete S3 file: {e}")

        # Delete DB record
        await db.delete(master_data)

        # Log activity
        if user_id:
            await self.analytics_service.log_activity(
                db=db,
                study_id=study_id,
                entity_type="master_data",
                entity_id=master_data_id,
                action="deleted",
                description=f"Master data '{file_name}' deleted",
                user_id=user_id,
                user_name=user_name,
            )

        await db.commit()
        self.logger.info(f"Deleted master data {master_data_id}")
        return True

    async def generate_presigned_url(
        self, db: AsyncSession, master_data_id: UUID, expires_in: Optional[int] = None
    ) -> PresignedUrlResponse:
        """
        Generate presigned URL for master data download.

        Args:
            db: Database session
            master_data_id: UUID of the master data
            expires_in: URL expiration in seconds

        Returns:
            PresignedUrlResponse with URL and metadata
        """
        # Get master data
        query = select(MasterData).where(MasterData.id == master_data_id)
        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            raise ValueError("Master data not found")

        # Generate presigned URL
        url = await self.s3_client.generate_presigned_url(
            key=master_data.s3_key, expires_in=expires_in
        )

        return PresignedUrlResponse(
            url=url,
            file_name=master_data.file_name,
            expires_in=expires_in or self.s3_client.presigned_url_expiry,
        )

    async def get_master_data_as_dataframe(
        self, db: AsyncSession, master_data_id: UUID
    ) -> pd.DataFrame:
        """
        Download master data and return as DataFrame.

        Args:
            db: Database session
            master_data_id: UUID of the master data

        Returns:
            pandas DataFrame with file contents
        """
        # Get master data
        query = select(MasterData).where(MasterData.id == master_data_id)
        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            raise ValueError("Master data not found")

        # Download and parse
        file_content = await self.s3_client.download_file(master_data.s3_key)
        return self._parse_file(file_content, master_data.file_type)

    async def update_column_descriptions(
        self,
        db: AsyncSession,
        master_data_id: UUID,
        column_descriptions: Dict[str, Any],
        user_id: str,
        user_name: Optional[str] = None,
    ) -> MasterData:
        """
        Update column descriptions for master data.

        Args:
            db: Database session
            master_data_id: UUID of the master data
            column_descriptions: New column descriptions
            user_id: ID of the user updating
            user_name: Optional user display name

        Returns:
            Updated MasterData record
        """
        query = select(MasterData).where(MasterData.id == master_data_id)
        result = await db.execute(query)
        master_data = result.scalar_one_or_none()

        if not master_data:
            raise ValueError("Master data not found")

        master_data.column_descriptions = column_descriptions

        # Log activity
        await self.analytics_service.log_activity(
            db=db,
            study_id=master_data.study_id,
            entity_type="master_data",
            entity_id=master_data_id,
            action="updated",
            description=f"Column descriptions updated for '{master_data.file_name}'",
            user_id=user_id,
            user_name=user_name,
        )

        await db.commit()
        await db.refresh(master_data)
        return master_data
