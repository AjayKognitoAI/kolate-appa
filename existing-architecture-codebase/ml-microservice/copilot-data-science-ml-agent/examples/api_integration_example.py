"""
Example: Integrating Code Execution Agent with FastAPI

This shows how to replace the current ChromaDB-based system
with the new code execution agent in your FastAPI application.
"""
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import os

# Import the code execution orchestrator
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from data_science_agent.code_execution_agent import CodeExecutionOrchestrator


# ============================================================================
# Pydantic Models (API Request/Response schemas)
# ============================================================================

class AnalysisRequest(BaseModel):
    """Request model for analysis endpoint."""
    session_id: str
    message: str
    trial_name: Optional[str] = None
    max_files: Optional[int] = 10


class AnalysisResponse(BaseModel):
    """Response model for analysis endpoint."""
    session_id: str
    response: str
    success: bool
    plots: List[str] = []
    metadata: dict = {}


class FileInfo(BaseModel):
    """File information model."""
    file_path: str
    file_name: str
    file_size_mb: float
    file_type: str
    source: str
    trial_name: Optional[str] = None


class FilesListResponse(BaseModel):
    """Response model for files list endpoint."""
    files: List[FileInfo]
    count: int
    total_size_mb: float


# ============================================================================
# Dependency: Get Orchestrator Instance
# ============================================================================

_orchestrator_instance = None

def get_orchestrator() -> CodeExecutionOrchestrator:
    """
    Get or create orchestrator instance (singleton).
    Initialize once on startup.
    """
    global _orchestrator_instance
    if _orchestrator_instance is None:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        _orchestrator_instance = CodeExecutionOrchestrator(api_key=api_key)
    return _orchestrator_instance


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Data Science Agent with Code Execution",
    description="API for dynamic data analysis using LLM-generated code",
    version="2.0.0"
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Data Science Agent - Code Execution Mode",
        "version": "2.0.0",
        "approach": "LLM-generated code with local execution",
        "endpoints": {
            "analyze": "/api/v1/analyze",
            "files": "/api/v1/files",
            "file_info": "/api/v1/files/{file_path}",
            "health": "/api/v1/health"
        }
    }


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    try:
        orchestrator = get_orchestrator()
        return {
            "status": "healthy",
            "service": "code_execution_agent",
            "model": orchestrator.config.model_name,
            "s3_enabled": orchestrator.config.s3_bucket is not None,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.post("/api/v1/analyze", response_model=AnalysisResponse)
async def analyze(
    request: AnalysisRequest,
    orchestrator: CodeExecutionOrchestrator = Depends(get_orchestrator)
):
    """
    Main analysis endpoint.

    Replaces the old ChromaDB-based analysis endpoint.
    Now uses LLM-generated code execution instead of pre-computed analysis.
    """
    try:
        # Process query using code execution orchestrator
        result = orchestrator.process_query(
            query=request.message,
            trial_name=request.trial_name,
            session_id=request.session_id,
            max_files=request.max_files
        )

        # Return response
        return AnalysisResponse(
            session_id=request.session_id,
            response=result['response'],
            success=result['success'],
            plots=result['plots'],
            metadata=result['metadata']
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.get("/api/v1/files", response_model=FilesListResponse)
async def list_files(
    trial_name: Optional[str] = None,
    orchestrator: CodeExecutionOrchestrator = Depends(get_orchestrator)
):
    """
    List available files for analysis.

    Query params:
        - trial_name: Optional filter by trial name
    """
    try:
        files_info = orchestrator.get_available_files(trial_name=trial_name)

        # Convert to Pydantic models
        files = [
            FileInfo(
                file_path=f['file_path'],
                file_name=f['file_name'],
                file_size_mb=round(f['file_size'] / (1024 * 1024), 2),
                file_type=f['file_type'],
                source=f['source'],
                trial_name=f.get('trial_name')
            )
            for f in files_info['files']
        ]

        return FilesListResponse(
            files=files,
            count=files_info['count'],
            total_size_mb=files_info['total_size_mb']
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )


@app.get("/api/v1/files/metadata")
async def get_file_metadata(
    file_path: str,
    orchestrator: CodeExecutionOrchestrator = Depends(get_orchestrator)
):
    """
    Get detailed metadata for a specific file.

    Query params:
        - file_path: S3 URI or local path
    """
    try:
        metadata = orchestrator.get_file_info(file_path)
        return metadata

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get file metadata: {str(e)}"
        )


@app.post("/api/v1/execute-custom-code")
async def execute_custom_code(
    session_id: str,
    code: str,
    file_paths: dict[str, str],
    query: Optional[str] = None,
    orchestrator: CodeExecutionOrchestrator = Depends(get_orchestrator)
):
    """
    Execute custom user-provided code (advanced).

    Body:
        - session_id: Session identifier
        - code: Python code to execute
        - file_paths: Dict mapping variable names to file paths
        - query: Optional query for context
    """
    try:
        result = orchestrator.process_query_with_custom_code(
            code=code,
            file_paths=file_paths,
            query=query
        )

        return {
            "session_id": session_id,
            "response": result['response'],
            "success": result['success'],
            "plots": result['plots'],
            "metadata": result['metadata']
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Code execution failed: {str(e)}"
        )


# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator on startup."""
    print("Initializing Code Execution Orchestrator...")
    try:
        orchestrator = get_orchestrator()
        print(f"✓ Orchestrator initialized with model: {orchestrator.config.model_name}")
    except Exception as e:
        print(f"✗ Failed to initialize orchestrator: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("Shutting down Code Execution Agent...")
    # Add any cleanup logic here


# ============================================================================
# Run Application
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    # Make sure GOOGLE_API_KEY is set
    if not os.getenv("GOOGLE_API_KEY"):
        print("Error: GOOGLE_API_KEY environment variable not set")
        print("Set it with: export GOOGLE_API_KEY='your-key'")
        exit(1)

    # Run server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
