"""CRUD operations for S3ProcessedFile model."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session as DBSession

from api.models.s3_processed_file import S3ProcessedFile
from .base import CRUDBase


class CRUDS3ProcessedFile(CRUDBase[S3ProcessedFile, Dict[str, Any], Dict[str, Any]]):
    """CRUD operations for S3ProcessedFile model."""

    def get_by_s3_key(
        self, db: DBSession, *, s3_bucket: str, s3_key: str
    ) -> Optional[S3ProcessedFile]:
        """
        Get a processed file record by S3 bucket and key.

        Args:
            db: Database session
            s3_bucket: S3 bucket name
            s3_key: Full S3 key (path)

        Returns:
            S3ProcessedFile instance or None if not found
        """
        return (
            db.query(self.model)
            .filter(self.model.s3_bucket == s3_bucket)
            .filter(self.model.s3_key == s3_key)
            .first()
        )

    def get_by_trial(
        self, db: DBSession, *, trial_name: str, status: Optional[str] = None
    ) -> List[S3ProcessedFile]:
        """
        Get all processed files for a trial.

        Args:
            db: Database session
            trial_name: Trial name
            status: Optional status filter (processed, failed, pending)

        Returns:
            List of S3ProcessedFile instances
        """
        query = db.query(self.model).filter(self.model.trial_name == trial_name)
        if status:
            query = query.filter(self.model.status == status)
        return query.order_by(self.model.processed_at.desc()).all()

    def get_by_hash(
        self, db: DBSession, *, content_hash: str
    ) -> Optional[S3ProcessedFile]:
        """
        Get a processed file by content hash.

        Args:
            db: Database session
            content_hash: SHA256 hash of file content

        Returns:
            S3ProcessedFile instance or None if not found
        """
        return (
            db.query(self.model)
            .filter(self.model.content_hash == content_hash)
            .first()
        )

    def get_all_processed(self, db: DBSession) -> List[S3ProcessedFile]:
        """
        Get all successfully processed files.

        Args:
            db: Database session

        Returns:
            List of all processed files
        """
        return (
            db.query(self.model)
            .filter(self.model.status == "processed")
            .order_by(self.model.processed_at.desc())
            .all()
        )

    def get_failed(self, db: DBSession) -> List[S3ProcessedFile]:
        """
        Get all failed files (for retry).

        Args:
            db: Database session

        Returns:
            List of failed files
        """
        return (
            db.query(self.model)
            .filter(self.model.status == "failed")
            .order_by(self.model.processed_at.desc())
            .all()
        )

    def get_all_trials(self, db: DBSession) -> List[str]:
        """
        Get list of all unique trial names.

        Args:
            db: Database session

        Returns:
            List of unique trial names
        """
        results = db.query(self.model.trial_name).distinct().all()
        return [r[0] for r in results]

    def upsert_file(
        self,
        db: DBSession,
        *,
        trial_name: str,
        s3_bucket: str,
        s3_key: str,
        file_name: str,
        content_hash: str,
        s3_etag: Optional[str],
        file_size: int,
        last_modified: datetime,
        status: str = "processed",
        error_message: Optional[str] = None,
        analysis_metadata: Optional[Dict] = None,
    ) -> S3ProcessedFile:
        """
        Create or update a processed file record.

        Args:
            db: Database session
            trial_name: Trial name
            s3_bucket: S3 bucket name
            s3_key: Full S3 key (path)
            file_name: Just the filename
            content_hash: SHA256 hash of file content
            s3_etag: S3 ETag for quick change detection
            file_size: File size in bytes
            last_modified: S3 LastModified timestamp
            status: Processing status (processed, failed, pending)
            error_message: Error details if failed
            analysis_metadata: Metadata about the analysis (row count, columns, etc.)

        Returns:
            Created or updated S3ProcessedFile record
        """
        file_data = {
            "trial_name": trial_name,
            "s3_bucket": s3_bucket,
            "s3_key": s3_key,
            "file_name": file_name,
            "content_hash": content_hash,
            "s3_etag": s3_etag,
            "file_size": file_size,
            "last_modified": last_modified,
            "processed_at": datetime.utcnow(),
            "status": status,
            "error_message": error_message,
            "analysis_metadata": analysis_metadata or {},
        }

        return self.upsert(
            db,
            obj_in=file_data,
            filter_by={"s3_bucket": s3_bucket, "s3_key": s3_key}
        )

    def mark_failed(
        self, db: DBSession, *, file_id: int, error_message: str
    ) -> Optional[S3ProcessedFile]:
        """
        Mark a file as failed processing.

        Args:
            db: Database session
            file_id: File record ID
            error_message: Error details

        Returns:
            Updated S3ProcessedFile record or None if not found
        """
        file = db.query(self.model).filter(self.model.id == file_id).first()
        if file:
            file.status = "failed"
            file.error_message = error_message
            file.processed_at = datetime.utcnow()
            db.commit()
            db.refresh(file)
            return file
        return None

    def mark_processed(
        self, db: DBSession, *, file_id: int, analysis_metadata: Optional[Dict] = None
    ) -> Optional[S3ProcessedFile]:
        """
        Mark a file as successfully processed.

        Args:
            db: Database session
            file_id: File record ID
            analysis_metadata: Optional metadata about the analysis

        Returns:
            Updated S3ProcessedFile record or None if not found
        """
        file = db.query(self.model).filter(self.model.id == file_id).first()
        if file:
            file.status = "processed"
            file.error_message = None
            file.processed_at = datetime.utcnow()
            if analysis_metadata:
                file.analysis_metadata = analysis_metadata
            db.commit()
            db.refresh(file)
            return file
        return None

    def delete_by_trial(self, db: DBSession, *, trial_name: str) -> int:
        """
        Delete all records for a trial.

        Args:
            db: Database session
            trial_name: Trial name

        Returns:
            Number of deleted records
        """
        count = (
            db.query(self.model)
            .filter(self.model.trial_name == trial_name)
            .delete()
        )
        db.commit()
        return count

    def delete_by_s3_key(self, db: DBSession, *, s3_bucket: str, s3_key: str) -> bool:
        """
        Delete a specific file record by S3 bucket and key.

        Args:
            db: Database session
            s3_bucket: S3 bucket name
            s3_key: Full S3 key (path)

        Returns:
            True if deleted, False if not found
        """
        count = (
            db.query(self.model)
            .filter(self.model.s3_bucket == s3_bucket)
            .filter(self.model.s3_key == s3_key)
            .delete()
        )
        db.commit()
        return count > 0


# Create a singleton instance
s3_processed_file_crud = CRUDS3ProcessedFile(S3ProcessedFile)
