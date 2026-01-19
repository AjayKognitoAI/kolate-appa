"""Session management routes."""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session

from api.schemas.session_schemas import (
    SessionCreate,
    SessionResponse,
    SessionListResponse,
    SessionStarRequest,
)
from api.schemas.chat_schemas import ConversationTurn
from api.db import get_db
from api.crud import session_crud, conversation_state_crud, uploaded_file_crud
from api.agent.rag_system import RAGSystem
from api.dependencies import get_rag

import os

router = APIRouter(tags=["sessions"])


def get_viz_dir():
    """Get visualization directory from environment or derive from UPLOAD_DIR."""
    viz_dir = os.getenv("VISUALIZATION_DIR")
    if viz_dir:
        return viz_dir
    upload_dir = os.getenv("UPLOAD_DIR", "./data/uploads")
    return os.path.join(upload_dir, "..", "visualizations")


def _session_to_response(session) -> SessionResponse:
    """Convert a session ORM object to SessionResponse."""
    return SessionResponse(
        session_id=session.id,
        org_id=session.org_id,
        user_id=session.user_id,
        trial_name=session.trial_name,
        starred=session.starred,
        created_at=session.created_at,
        updated_at=session.updated_at,
        is_active=session.is_active
    )


@router.post("", response_model=SessionResponse)
async def create_session(
    request: SessionCreate,
    db: Session = Depends(get_db),
    rag: RAGSystem = Depends(get_rag)
):
    """
    Create a new analysis session for an organization.

    A session maintains conversation history and analysis results in separate ChromaDB collection.
    Optionally, a trial_name can be provided to associate the session with a specific trial.
    """
    try:
        # Create session in database with org_id and optional trial_name
        session = session_crud.create_session(
            db,
            org_id=request.org_id,
            user_id=request.user_id,
            trial_name=request.trial_name
        )

        # Create corresponding ChromaDB collection
        rag.create_session_collection(session.id)

        return _session_to_response(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    org_id: str = Query(..., description="Organization ID to filter sessions"),
    starred_only: bool = Query(False, description="Only return starred sessions"),
    active_only: bool = Query(True, description="Only return active sessions"),
    limit: Optional[int] = Query(None, description="Maximum number of sessions to return"),
    db: Session = Depends(get_db)
):
    """
    List all sessions for an organization.

    Filter by starred status and active status.
    """
    try:
        sessions = session_crud.get_by_org(
            db,
            org_id=org_id,
            starred_only=starred_only,
            active_only=active_only,
            limit=limit
        )
        return SessionListResponse(
            sessions=[_session_to_response(s) for s in sessions],
            total=len(sessions),
            org_id=org_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    org_id: Optional[str] = Query(None, description="Organization ID for validation"),
    db: Session = Depends(get_db),
    rag: RAGSystem = Depends(get_rag)
):
    """Get session information."""
    session = session_crud.get_with_org(db, session_id=session_id, org_id=org_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return _session_to_response(session)


@router.get("/{session_id}/details")
async def get_session_details(
    session_id: str,
    org_id: Optional[str] = Query(None, description="Organization ID for validation"),
    db: Session = Depends(get_db),
    rag: RAGSystem = Depends(get_rag)
):
    """Get detailed session information including vector store stats."""
    session = session_crud.get_with_org(db, session_id=session_id, org_id=org_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get ChromaDB collection stats
    rag_stats = rag.get_collection_stats(session_id)

    return {
        "session_id": session.id,
        "org_id": session.org_id,
        "user_id": session.user_id,
        "starred": session.starred,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "is_active": session.is_active,
        "metadata": session.session_metadata,
        "vector_store": rag_stats
    }


@router.patch("/{session_id}/star", response_model=SessionResponse)
async def update_session_star(
    session_id: str,
    request: SessionStarRequest,
    org_id: Optional[str] = Query(None, description="Organization ID for validation"),
    db: Session = Depends(get_db)
):
    """Set the starred status of a session."""
    try:
        session = session_crud.set_star(
            db,
            session_id=session_id,
            starred=request.starred,
            org_id=org_id
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return _session_to_response(session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/star/toggle", response_model=SessionResponse)
async def toggle_session_star(
    session_id: str,
    org_id: Optional[str] = Query(None, description="Organization ID for validation"),
    db: Session = Depends(get_db)
):
    """Toggle the starred status of a session."""
    try:
        session = session_crud.toggle_star(db, session_id=session_id, org_id=org_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return _session_to_response(session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/history", response_model=List[ConversationTurn])
async def get_session_history(
    session_id: str,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get conversation history for a session from database."""
    try:
        history = conversation_state_crud.get_by_session(db, session_id=session_id, limit=limit)
        # Convert ORM objects to Pydantic models to avoid circular reference issues
        return [ConversationTurn.model_validate(h) for h in history]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/vector-store")
async def get_session_vector_store(
    session_id: str,
    rag: RAGSystem = Depends(get_rag)
):
    """Get vector store statistics and overview for a session."""
    try:
        stats = rag.get_collection_stats(session_id)
        if not stats:
            raise HTTPException(status_code=404, detail="No vector store found for session")
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/files")
async def get_session_files(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get all files uploaded in a session."""
    try:
        files = uploaded_file_crud.get_by_session(db, session_id=session_id)
        return [
            {
                "file_id": f.id,
                "filename": f.filename,
                "file_type": f.file_type,
                "file_size_bytes": f.file_size,
                "upload_timestamp": f.upload_timestamp,
                "is_processed": f.is_processed
            }
            for f in files
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    org_id: Optional[str] = Query(None, description="Organization ID for validation"),
    db: Session = Depends(get_db),
    rag: RAGSystem = Depends(get_rag),
    permanent: bool = Query(False, description="Permanently delete all data (files, DB records, etc.)")
):
    """
    Deactivate a session and cleanup its data.

    Args:
        session_id: Session identifier
        org_id: Organization ID for validation
        permanent: If True, permanently deletes all files and database records.
                   If False (default), only deactivates the session.
    """
    import os
    import shutil
    from api.crud import uploaded_file_crud, analysis_result_crud, conversation_state_crud

    try:
        # Verify session exists and belongs to org
        session = session_crud.get_with_org(db, session_id=session_id, org_id=org_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        cleanup_summary = {
            "session_id": session_id,
            "deactivated": False,
            "chroma_collection_deleted": False,
            "cache_entries_cleared": 0,
            "files_deleted": 0,
            "visualizations_deleted": 0,
            "db_records_deleted": {
                "uploaded_files": 0,
                "analysis_results": 0,
                "conversation_states": 0
            }
        }

        # Deactivate in database
        success = session_crud.deactivate(db, session_id=session_id)
        cleanup_summary["deactivated"] = success

        # Delete ChromaDB collection
        chroma_deleted = rag.delete_collection(session_id)
        cleanup_summary["chroma_collection_deleted"] = chroma_deleted

        # Clear DataFrame cache for this session
        try:
            from data_science_agent.sub_agents.csv_analyzer.tools.csv_tools import clear_session_cache
            cache_entries_removed = clear_session_cache(session_id)
            cleanup_summary["cache_entries_cleared"] = cache_entries_removed
            print(f"[Session] Cleared {cache_entries_removed} cache entries for session {session_id}")
        except Exception as e:
            print(f"[Session] Error clearing cache for session {session_id}: {e}")

        # If permanent delete is requested, remove all files and database records
        if permanent:
            print(f"[Session] Performing permanent cleanup for session {session_id}")

            # Get all uploaded files for this session
            uploaded_files = uploaded_file_crud.get_by_session(db, session_id=session_id)

            # Delete uploaded files from disk
            upload_dir = os.getenv("UPLOAD_DIR", "./data/uploads")
            for file_record in uploaded_files:
                try:
                    if os.path.exists(file_record.file_path):
                        os.remove(file_record.file_path)
                        cleanup_summary["files_deleted"] += 1
                        print(f"[Session] Deleted file: {file_record.file_path}")
                except Exception as e:
                    print(f"[Session] Error deleting file {file_record.file_path}: {e}")

            # Delete visualizations for this session
            viz_dir = os.path.join("data", "visualizations", session_id)
            if os.path.exists(viz_dir):
                try:
                    for viz_file in os.listdir(viz_dir):
                        cleanup_summary["visualizations_deleted"] += 1
                    shutil.rmtree(viz_dir)
                    print(f"[Session] Deleted visualization directory: {viz_dir}")
                except Exception as e:
                    print(f"[Session] Error deleting visualizations: {e}")

            # Delete database records
            try:
                # Delete uploaded file records
                for file_record in uploaded_files:
                    uploaded_file_crud.delete(db, id=file_record.id)
                    cleanup_summary["db_records_deleted"]["uploaded_files"] += 1

                # Delete analysis results
                analysis_results = analysis_result_crud.get_by_session(db, session_id=session_id)
                for result in analysis_results:
                    analysis_result_crud.delete(db, id=result.id)
                    cleanup_summary["db_records_deleted"]["analysis_results"] += 1

                # Delete conversation history
                conversations = conversation_state_crud.get_by_session(db, session_id=session_id)
                for conv in conversations:
                    conversation_state_crud.delete(db, id=conv.id)
                    cleanup_summary["db_records_deleted"]["conversation_states"] += 1

                db.commit()
                print(f"[Session] Deleted all database records for session {session_id}")
            except Exception as e:
                db.rollback()
                print(f"[Session] Error deleting database records: {e}")
                raise

        message = "Session deactivated and cleaned up successfully"
        if permanent:
            message = "Session permanently deleted with all associated data"

        return {
            "message": message,
            **cleanup_summary
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/visualizations")
async def list_session_visualizations(session_id: str):
    """List all available visualizations for a session."""
    viz_dir = os.path.join(get_viz_dir(), session_id)

    if not os.path.exists(viz_dir):
        return {"session_id": session_id, "visualizations": []}

    visualizations = []
    for filename in os.listdir(viz_dir):
        if filename.endswith(('.png', '.jpg', '.jpeg', '.svg')):
            visualizations.append({
                "filename": filename,
                "url": f"/visualizations/{session_id}/{filename}",
                "type": filename.replace('.png', '').replace('.jpg', '')
            })

    return {
        "session_id": session_id,
        "visualizations": visualizations,
        "count": len(visualizations)
    }
