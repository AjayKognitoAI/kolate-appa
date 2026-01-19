"""Trial Sync Service for orchestrating S3 sync, analysis, and ChromaDB embedding."""

import asyncio
import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Callable, Dict, Any

from api.services.s3_service import S3Service, S3FileInfo
from api.agent.analysis_pipeline import AnalysisPipeline
from api.agent.rag_system import RAGSystem
from api.crud.s3_processed_file import s3_processed_file_crud


@dataclass
class TrialSyncResult:
    """Result of syncing a single trial."""
    trial_name: str
    new_files: int = 0
    updated_files: int = 0
    failed_files: int = 0
    skipped_files: int = 0
    deleted_files: int = 0  # Files removed because they no longer exist in S3
    errors: List[str] = field(default_factory=list)


@dataclass
class SyncResult:
    """Result of syncing all trials."""
    trials_synced: int = 0
    total_new_files: int = 0
    total_updated_files: int = 0
    total_deleted_files: int = 0
    total_failed_files: int = 0
    trial_results: List[TrialSyncResult] = field(default_factory=list)
    sync_started_at: datetime = field(default_factory=datetime.utcnow)
    sync_completed_at: Optional[datetime] = None


class TrialSyncService:
    """Orchestrates S3 sync, analysis, and ChromaDB embedding for trials."""

    def __init__(
        self,
        s3_service: S3Service,
        analysis_pipeline: AnalysisPipeline,
        rag_system: RAGSystem,
        db_session_factory: Callable,
        temp_dir: str = "./data/s3_temp"
    ):
        """
        Initialize Trial Sync Service.

        Args:
            s3_service: S3 service for file operations
            analysis_pipeline: Pipeline for analyzing files
            rag_system: RAG system for embedding
            db_session_factory: Factory for creating database sessions
            temp_dir: Temporary directory for downloaded files
        """
        self.s3 = s3_service
        self.pipeline = analysis_pipeline
        self.rag = rag_system
        self.get_db = db_session_factory
        self.temp_dir = temp_dir

        # Ensure temp directory exists
        os.makedirs(temp_dir, exist_ok=True)

    async def sync_all_trials(self) -> SyncResult:
        """
        Sync all trials from S3.

        Returns:
            SyncResult with summary of all sync operations
        """
        result = SyncResult()

        try:
            print("[TrialSync] Starting sync of all trials...")
            # Run S3 list operation in thread pool to avoid blocking
            trials = await asyncio.to_thread(self.s3.list_trials)
            print(f"[TrialSync] Found {len(trials)} trials in S3")

            for trial_name in trials:
                trial_result = await self.sync_trial(trial_name)
                result.trial_results.append(trial_result)
                result.total_new_files += trial_result.new_files
                result.total_updated_files += trial_result.updated_files
                result.total_deleted_files += trial_result.deleted_files
                result.total_failed_files += trial_result.failed_files

            result.trials_synced = len(trials)
            result.sync_completed_at = datetime.utcnow()

            print(f"[TrialSync] Sync complete. New: {result.total_new_files}, "
                  f"Updated: {result.total_updated_files}, Deleted: {result.total_deleted_files}, "
                  f"Failed: {result.total_failed_files}")

        except Exception as e:
            print(f"[TrialSync] Error during sync: {e}")
            import traceback
            traceback.print_exc()

        return result

    async def sync_trial(self, trial_name: str) -> TrialSyncResult:
        """
        Sync a single trial - check for new/modified/deleted files.

        Args:
            trial_name: Name of the trial to sync

        Returns:
            TrialSyncResult with sync details
        """
        result = TrialSyncResult(trial_name=trial_name)

        try:
            print(f"[TrialSync] Syncing trial: {trial_name}")
            # Run S3 list operation in thread pool to avoid blocking
            files = await asyncio.to_thread(self.s3.list_csv_files, trial_name)
            print(f"[TrialSync] Found {len(files)} CSV files in trial '{trial_name}'")

            db = next(self.get_db())
            try:
                # Build set of S3 file keys for quick lookup
                s3_keys = {file_info.key for file_info in files}

                # Process files currently in S3
                for file_info in files:
                    try:
                        # Check if file was already processed
                        existing = s3_processed_file_crud.get_by_s3_key(
                            db,
                            s3_bucket=self.s3.bucket_name,
                            s3_key=file_info.key
                        )

                        if existing is None:
                            # New file - process it
                            success = await self._process_new_file(db, trial_name, file_info)
                            if success:
                                result.new_files += 1
                            else:
                                result.failed_files += 1
                        elif self._file_changed(existing, file_info):
                            # Modified file - re-process it
                            success = await self._process_updated_file(db, trial_name, file_info, existing)
                            if success:
                                result.updated_files += 1
                            else:
                                result.failed_files += 1
                        else:
                            # Unchanged - skip
                            result.skipped_files += 1

                    except Exception as e:
                        error_msg = f"Error processing {file_info.file_name}: {str(e)}"
                        print(f"[TrialSync] {error_msg}")
                        result.errors.append(error_msg)
                        result.failed_files += 1

                # Check for deleted files (in DB but not in S3)
                print(f"[TrialSync] Checking for deleted files in trial '{trial_name}'")
                db_files = s3_processed_file_crud.get_by_trial(db, trial_name=trial_name)

                for db_file in db_files:
                    if db_file.s3_key not in s3_keys:
                        # File was deleted from S3 - clean up
                        try:
                            print(f"[TrialSync] File deleted from S3: {db_file.file_name}")

                            # Remove embeddings from ChromaDB (run in thread pool)
                            await asyncio.to_thread(
                                self.rag.remove_file_from_trial, trial_name, db_file.file_name
                            )

                            # Delete from database
                            s3_processed_file_crud.delete_by_s3_key(
                                db,
                                s3_bucket=db_file.s3_bucket,
                                s3_key=db_file.s3_key
                            )

                            result.deleted_files += 1
                            print(f"[TrialSync] Successfully cleaned up deleted file: {db_file.file_name}")

                        except Exception as e:
                            error_msg = f"Error cleaning up deleted file {db_file.file_name}: {str(e)}"
                            print(f"[TrialSync] {error_msg}")
                            result.errors.append(error_msg)

            finally:
                db.close()

        except Exception as e:
            error_msg = f"Error syncing trial '{trial_name}': {str(e)}"
            print(f"[TrialSync] {error_msg}")
            result.errors.append(error_msg)

        print(f"[TrialSync] Trial '{trial_name}' sync complete. "
              f"New: {result.new_files}, Updated: {result.updated_files}, "
              f"Deleted: {result.deleted_files}, Skipped: {result.skipped_files}, Failed: {result.failed_files}")

        return result

    def _file_changed(self, existing, file_info: S3FileInfo) -> bool:
        """
        Check if a file has changed using ETag comparison.

        Args:
            existing: Existing database record
            file_info: S3 file info

        Returns:
            True if file has changed, False otherwise
        """
        # Check ETag (S3's quick change indicator)
        if existing.s3_etag != file_info.etag:
            return True

        # Fallback: check last_modified timestamp
        # Handle timezone-aware vs naive datetime comparison
        try:
            existing_time = existing.last_modified
            s3_time = file_info.last_modified

            # Make both naive for comparison (strip timezone info)
            if existing_time.tzinfo is not None:
                existing_time = existing_time.replace(tzinfo=None)
            if s3_time.tzinfo is not None:
                s3_time = s3_time.replace(tzinfo=None)

            if existing_time < s3_time:
                return True
        except Exception as e:
            print(f"[TrialSync] Warning: datetime comparison failed: {e}")
            # If comparison fails, assume file changed to be safe
            return True

        return False

    async def _process_new_file(self, db, trial_name: str, file_info: S3FileInfo) -> bool:
        """
        Download, analyze, and embed a new file.

        Args:
            db: Database session
            trial_name: Trial name
            file_info: S3 file info

        Returns:
            True if successful, False otherwise
        """
        local_path = None
        try:
            print(f"[TrialSync] Processing new file: {file_info.file_name}")

            # Download file to temp directory (run in thread pool to avoid blocking)
            local_path = await asyncio.to_thread(
                self.s3.download_file, file_info.key, self.temp_dir
            )
            print(f"[TrialSync] Downloaded to: {local_path}")

            # Compute content hash (run in thread pool)
            content_hash = await asyncio.to_thread(
                self.s3.compute_content_hash, local_path
            )

            # Run analysis pipeline (CPU-intensive, run in thread pool)
            analysis = await asyncio.to_thread(
                self.pipeline.analyze_file, local_path, trial_name
            )

            if "error" in analysis:
                raise Exception(f"Analysis failed: {analysis['error']}")

            # Extract metadata for storage
            analysis_metadata = self._extract_analysis_metadata(analysis)

            # Embed into ChromaDB trial collection (run in thread pool)
            await asyncio.to_thread(
                self.rag.embed_trial_dataset, trial_name, file_info.file_name, analysis
            )

            # Record in database
            s3_processed_file_crud.upsert_file(
                db,
                trial_name=trial_name,
                s3_bucket=self.s3.bucket_name,
                s3_key=file_info.key,
                file_name=file_info.file_name,
                content_hash=content_hash,
                s3_etag=file_info.etag,
                file_size=file_info.size,
                last_modified=file_info.last_modified,
                status="processed",
                analysis_metadata=analysis_metadata
            )

            print(f"[TrialSync] Successfully processed: {file_info.file_name}")
            return True

        except Exception as e:
            print(f"[TrialSync] Failed to process {file_info.file_name}: {e}")
            import traceback
            traceback.print_exc()

            # Record failure in database
            try:
                s3_processed_file_crud.upsert_file(
                    db,
                    trial_name=trial_name,
                    s3_bucket=self.s3.bucket_name,
                    s3_key=file_info.key,
                    file_name=file_info.file_name,
                    content_hash="",
                    s3_etag=file_info.etag,
                    file_size=file_info.size,
                    last_modified=file_info.last_modified,
                    status="failed",
                    error_message=str(e)
                )
            except Exception as db_error:
                print(f"[TrialSync] Failed to record error in DB: {db_error}")

            return False

        finally:
            # Cleanup temp file
            if local_path and os.path.exists(local_path):
                try:
                    os.remove(local_path)
                except Exception:
                    pass

    async def _process_updated_file(
        self,
        db,
        trial_name: str,
        file_info: S3FileInfo,
        existing
    ) -> bool:
        """
        Re-process a modified file - delete old embeddings first.

        Args:
            db: Database session
            trial_name: Trial name
            file_info: S3 file info
            existing: Existing database record

        Returns:
            True if successful, False otherwise
        """
        print(f"[TrialSync] File changed, re-processing: {file_info.file_name}")

        # Remove old embeddings from ChromaDB (run in thread pool)
        await asyncio.to_thread(
            self.rag.remove_file_from_trial, trial_name, file_info.file_name
        )

        # Process as new file
        return await self._process_new_file(db, trial_name, file_info)

    def _extract_analysis_metadata(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract key metadata from analysis results for storage.

        Args:
            analysis: Full analysis results

        Returns:
            Dictionary with key metadata
        """
        metadata = {}

        if "dataframe_info" in analysis:
            df_info = analysis["dataframe_info"]
            metadata["num_rows"] = df_info.get("num_rows", 0)
            metadata["num_columns"] = df_info.get("num_columns", 0)
            metadata["numeric_columns"] = df_info.get("numeric_columns", [])
            metadata["categorical_columns"] = df_info.get("categorical_columns", [])

        if "data_quality" in analysis:
            quality = analysis["data_quality"]
            metadata["missing_percentage"] = quality.get("missing_percentage", 0)
            metadata["duplicate_rows"] = quality.get("duplicate_rows", 0)

        return metadata

    def cleanup_temp_files(self) -> int:
        """
        Clean up all temporary files in the temp directory.

        Returns:
            Number of files cleaned up
        """
        count = 0
        try:
            if os.path.exists(self.temp_dir):
                for filename in os.listdir(self.temp_dir):
                    file_path = os.path.join(self.temp_dir, filename)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                        count += 1
            print(f"[TrialSync] Cleaned up {count} temp files")
        except Exception as e:
            print(f"[TrialSync] Error cleaning up temp files: {e}")
        return count
