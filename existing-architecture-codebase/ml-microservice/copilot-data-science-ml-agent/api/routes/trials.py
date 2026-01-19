"""Trial management API routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from api.db import get_db
from api.crud.s3_processed_file import s3_processed_file_crud
from api.agent.rag_system import RAGSystem
from api.dependencies import get_rag, get_scheduler_service, get_s3_service
from api.services.s3_service import S3Service
from api.services.scheduler_service import SchedulerService

router = APIRouter(tags=["trials"])


# Response models
class TrialFileInfo(BaseModel):
    """Information about a file in a trial."""
    file_name: str
    s3_key: str
    status: str  # "processed", "failed", "pending" (not yet synced)
    file_size: int
    last_modified: Optional[str] = None  # S3 last modified timestamp
    processed_at: Optional[str] = None
    error_message: Optional[str] = None
    analysis_metadata: Optional[dict] = None


class TrialInfo(BaseModel):
    """Information about a trial."""
    name: str
    s3_files: int  # Actual files in S3
    files_processed: int
    files_failed: int
    files_pending: int  # Files in S3 not yet processed
    last_sync: Optional[str] = None


class TrialDetailResponse(BaseModel):
    """Detailed trial information."""
    trial_name: str
    files: List[TrialFileInfo]
    vector_store: dict


class TrialListResponse(BaseModel):
    """List of all trials."""
    trials: List[TrialInfo]
    total: int


class SyncResponse(BaseModel):
    """Response for sync operations."""
    message: str
    trials_synced: Optional[int] = None
    new_files: Optional[int] = None
    updated_files: Optional[int] = None
    deleted_files: Optional[int] = None
    failed_files: Optional[int] = None


class SchedulerStatusResponse(BaseModel):
    """Response for scheduler status."""
    is_running: bool
    sync_in_progress: bool
    next_run_time: Optional[str] = None
    last_sync: Optional[dict] = None


@router.get("", response_model=TrialListResponse)
async def list_trials(
    db: DBSession = Depends(get_db),
    rag: RAGSystem = Depends(get_rag),
    s3: S3Service = Depends(get_s3_service)
):
    """
    List all available trials with sync status.

    Returns trials from S3 with actual S3 file counts and processing status.
    """
    # Get trials from S3
    try:
        s3_trials = s3.list_trials() if s3 else []
    except Exception as e:
        print(f"[Trials] Error listing S3 trials: {e}")
        s3_trials = []

    # Get processed trials from ChromaDB (for trials that might not be in S3 anymore)
    chroma_trials = rag.list_available_trials()

    # Combine and deduplicate
    all_trials = list(set(s3_trials + chroma_trials))

    # Build trial info list
    trial_infos = []
    for trial_name in all_trials:
        # Get actual S3 file count
        s3_file_count = 0
        if s3 and trial_name in s3_trials:
            try:
                s3_files = s3.list_csv_files(trial_name)
                s3_file_count = len(s3_files)
            except Exception as e:
                print(f"[Trials] Error listing S3 files for '{trial_name}': {e}")

        # Get processed files from database
        db_files = s3_processed_file_crud.get_by_trial(db, trial_name=trial_name)
        processed = len([f for f in db_files if f.status == "processed"])
        failed = len([f for f in db_files if f.status == "failed"])
        pending = s3_file_count - processed - failed  # Files in S3 not yet processed
        last_sync = max([f.processed_at for f in db_files], default=None)

        trial_infos.append(TrialInfo(
            name=trial_name,
            s3_files=s3_file_count,
            files_processed=processed,
            files_failed=failed,
            files_pending=max(0, pending),  # Ensure non-negative
            last_sync=last_sync.isoformat() if last_sync else None
        ))

    # Sort by name
    trial_infos.sort(key=lambda x: x.name)

    return TrialListResponse(trials=trial_infos, total=len(trial_infos))


@router.get("/{trial_name}", response_model=TrialDetailResponse)
async def get_trial_details(
    trial_name: str,
    db: DBSession = Depends(get_db),
    rag: RAGSystem = Depends(get_rag),
    s3: S3Service = Depends(get_s3_service)
):
    """
    Get detailed information about a specific trial.

    Includes file list from S3 with processing status and vector store statistics.
    """
    # Get files directly from S3
    s3_files = []
    if s3:
        try:
            s3_files = s3.list_csv_files(trial_name)
        except Exception as e:
            print(f"[Trials] Error listing S3 files for '{trial_name}': {e}")

    # Get processed files from database (keyed by s3_key for lookup)
    db_files = s3_processed_file_crud.get_by_trial(db, trial_name=trial_name)
    db_files_by_key = {f.s3_key: f for f in db_files}

    if not s3_files and not db_files:
        # Check if trial exists in ChromaDB
        stats = rag.get_trial_collection_stats(trial_name)
        if not stats.get("exists"):
            raise HTTPException(status_code=404, detail=f"Trial '{trial_name}' not found")

    # Build file info list from S3 files with database status
    file_infos = []
    for s3_file in s3_files:
        db_record = db_files_by_key.get(s3_file.key)
        if db_record:
            # File has been processed
            file_infos.append(TrialFileInfo(
                file_name=s3_file.file_name,
                s3_key=s3_file.key,
                status=db_record.status,
                file_size=s3_file.size,
                last_modified=s3_file.last_modified.isoformat() if s3_file.last_modified else None,
                processed_at=db_record.processed_at.isoformat() if db_record.processed_at else None,
                error_message=db_record.error_message,
                analysis_metadata=db_record.analysis_metadata
            ))
        else:
            # File exists in S3 but not yet processed
            file_infos.append(TrialFileInfo(
                file_name=s3_file.file_name,
                s3_key=s3_file.key,
                status="pending",
                file_size=s3_file.size,
                last_modified=s3_file.last_modified.isoformat() if s3_file.last_modified else None,
                processed_at=None,
                error_message=None,
                analysis_metadata=None
            ))

    # Get vector store stats
    vector_stats = rag.get_trial_collection_stats(trial_name)

    return TrialDetailResponse(
        trial_name=trial_name,
        files=file_infos,
        vector_store=vector_stats
    )


@router.get("/{trial_name}/files", response_model=List[TrialFileInfo])
async def list_trial_files(
    trial_name: str,
    status: Optional[str] = None,
    db: DBSession = Depends(get_db),
    s3: S3Service = Depends(get_s3_service)
):
    """
    List all files in a trial from S3 with their processing status.

    Args:
        trial_name: Name of the trial
        status: Optional filter by status (processed, failed, pending)
    """
    # Get files directly from S3
    s3_files = []
    if s3:
        try:
            s3_files = s3.list_csv_files(trial_name)
        except Exception as e:
            print(f"[Trials] Error listing S3 files for '{trial_name}': {e}")

    # Get processed files from database (keyed by s3_key for lookup)
    db_files = s3_processed_file_crud.get_by_trial(db, trial_name=trial_name)
    db_files_by_key = {f.s3_key: f for f in db_files}

    # Build file info list from S3 files with database status
    file_infos = []
    for s3_file in s3_files:
        db_record = db_files_by_key.get(s3_file.key)
        if db_record:
            # File has been processed
            file_status = db_record.status
            file_info = TrialFileInfo(
                file_name=s3_file.file_name,
                s3_key=s3_file.key,
                status=file_status,
                file_size=s3_file.size,
                last_modified=s3_file.last_modified.isoformat() if s3_file.last_modified else None,
                processed_at=db_record.processed_at.isoformat() if db_record.processed_at else None,
                error_message=db_record.error_message,
                analysis_metadata=db_record.analysis_metadata
            )
        else:
            # File exists in S3 but not yet processed
            file_status = "pending"
            file_info = TrialFileInfo(
                file_name=s3_file.file_name,
                s3_key=s3_file.key,
                status=file_status,
                file_size=s3_file.size,
                last_modified=s3_file.last_modified.isoformat() if s3_file.last_modified else None,
                processed_at=None,
                error_message=None,
                analysis_metadata=None
            )

        # Apply status filter if provided
        if status is None or file_status == status:
            file_infos.append(file_info)

    return file_infos


@router.post("/sync", response_model=SyncResponse)
async def trigger_sync_all(
    scheduler: SchedulerService = Depends(get_scheduler_service)
):
    """
    Trigger immediate sync of all trials from S3.

    This runs asynchronously - use /scheduler/status to check progress.
    """
    if scheduler is None:
        raise HTTPException(status_code=503, detail="S3 sync is not enabled")

    message = scheduler.trigger_immediate_sync()
    return SyncResponse(message=message)


@router.post("/{trial_name}/sync", response_model=SyncResponse)
async def sync_single_trial(
    trial_name: str,
    scheduler: SchedulerService = Depends(get_scheduler_service)
):
    """
    Trigger immediate sync for a specific trial.

    This runs asynchronously and syncs only the specified trial.
    """
    if scheduler is None:
        raise HTTPException(status_code=503, detail="S3 sync is not enabled")

    # For single trial sync, we need to access the sync service directly
    sync_service = scheduler.sync_service
    result = await sync_service.sync_trial(trial_name)

    return SyncResponse(
        message=f"Sync completed for trial '{trial_name}'",
        new_files=result.new_files,
        updated_files=result.updated_files,
        deleted_files=result.deleted_files,
        failed_files=result.failed_files
    )


@router.get("/scheduler/status", response_model=SchedulerStatusResponse)
async def get_scheduler_status(
    scheduler: SchedulerService = Depends(get_scheduler_service)
):
    """
    Get the status of the S3 sync scheduler.

    Returns information about scheduler state, next run time, and last sync results.
    """
    if scheduler is None:
        return SchedulerStatusResponse(
            is_running=False,
            sync_in_progress=False,
            next_run_time=None,
            last_sync=None
        )

    status = scheduler.get_status()
    return SchedulerStatusResponse(**status)


@router.delete("/{trial_name}")
async def delete_trial(
    trial_name: str,
    db: DBSession = Depends(get_db),
    rag: RAGSystem = Depends(get_rag)
):
    """
    Delete a trial's data from ChromaDB and database records.

    Warning: This will remove all embeddings and processed file records for the trial.
    """
    # Delete from ChromaDB
    chroma_deleted = rag.delete_trial_collection(trial_name)

    # Delete from database
    db_deleted = s3_processed_file_crud.delete_by_trial(db, trial_name=trial_name)

    return {
        "message": f"Trial '{trial_name}' deleted",
        "chroma_collection_deleted": chroma_deleted,
        "database_records_deleted": db_deleted
    }
