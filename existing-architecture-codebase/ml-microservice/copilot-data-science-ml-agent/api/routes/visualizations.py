"""Visualization serving routes."""

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(tags=["visualizations"])

# Get visualization directory from environment or derive from UPLOAD_DIR
def get_viz_dir():
    viz_dir = os.getenv("VISUALIZATION_DIR")
    if viz_dir:
        return viz_dir
    upload_dir = os.getenv("UPLOAD_DIR", "./data/uploads")
    return os.path.join(upload_dir, "..", "visualizations")


@router.get("/{session_id}/{filename}")
async def get_visualization(session_id: str, filename: str):
    """Get a generated visualization for a specific session.

    Args:
        session_id: The session ID (visualizations are stored per-session)
        filename: The visualization filename (e.g., correlation_matrix.png)
    """
    viz_dir = get_viz_dir()
    file_path = os.path.join(viz_dir, session_id, filename)

    if not os.path.exists(file_path):
        # Try without session subdirectory for backwards compatibility
        fallback_path = os.path.join(viz_dir, filename)
        if os.path.exists(fallback_path):
            return FileResponse(fallback_path)
        raise HTTPException(status_code=404, detail=f"Visualization not found: {session_id}/{filename}")

    return FileResponse(file_path)
