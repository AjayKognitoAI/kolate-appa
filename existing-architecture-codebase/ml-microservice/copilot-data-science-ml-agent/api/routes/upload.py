"""File upload routes."""

import os
import json
import shutil
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from sqlalchemy.orm import Session

from api.dependencies import get_pipeline, get_rag
from api.db import get_db
from api.crud import session_crud, uploaded_file_crud
from api.agent.analysis_pipeline import AnalysisPipeline
from api.agent.rag_system import RAGSystem

router = APIRouter(tags=["upload"])


@router.post("")
async def upload_file(
    session_id: str,
    file: UploadFile = File(...),
    pipeline: AnalysisPipeline = Depends(get_pipeline),
    rag: RAGSystem = Depends(get_rag),
    db: Session = Depends(get_db)
):
    """
    Upload a file for analysis.

    Pre-computes analysis and embeds results into the session's ChromaDB collection
    for RAG retrieval.

    Supported formats: CSV, Excel, PDF, JSON, Text
    """
    try:
        # Validate session
        session = session_crud.get(db, id=session_id)
        if not session or not session.is_active:
            raise HTTPException(status_code=404, detail="Invalid or inactive session")

        # Create upload directory
        upload_dir = os.getenv("UPLOAD_DIR", "./data/uploads")
        os.makedirs(upload_dir, exist_ok=True)

        # Save file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{session_id}_{timestamp}_{file.filename}"
        file_path = os.path.join(upload_dir, safe_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_stats = os.stat(file_path)

        # Save file info to database
        from api.agent.shared_libraries.file_handler import FileHandler
        file_handler = FileHandler(upload_dir)
        file_type = file_handler.get_file_type(file.filename)

        uploaded_file = uploaded_file_crud.add_file(
            db,
            session_id=session_id,
            filename=file.filename,
            file_path=file_path,
            file_type=file_type,
            file_size=file_stats.st_size
        )

        # Handle different file types
        if file_type in ['csv', 'excel']:
            # CSV/Excel: Full analysis pipeline
            return await _handle_tabular_file(
                file, file_path, file_type, file_stats,
                uploaded_file, session_id, pipeline, rag
            )
        elif file_type == 'pdf':
            # PDF: Extract text and embed
            return await _handle_pdf_file(
                file, file_path, file_type, file_stats,
                uploaded_file, session_id, file_handler, rag
            )
        elif file_type == 'json':
            # JSON: Convert to CSV if tabular, then analyze
            return await _handle_json_file(
                file, file_path, file_type, file_stats,
                uploaded_file, session_id, rag, pipeline
            )
        elif file_type == 'text':
            # Text: Read and embed
            return await _handle_text_file(
                file, file_path, file_type, file_stats,
                uploaded_file, session_id, rag
            )
        else:
            # Unknown type - try to read as text
            return await _handle_text_file(
                file, file_path, file_type, file_stats,
                uploaded_file, session_id, rag
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in upload_file: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


async def _handle_tabular_file(
    file: UploadFile,
    file_path: str,
    file_type: str,
    file_stats,
    uploaded_file,
    session_id: str,
    pipeline: AnalysisPipeline,
    rag: RAGSystem
):
    """Handle CSV/Excel file upload with full analysis pipeline."""
    # Pre-compute analysis pipeline
    analysis_result = pipeline.analyze_file(file_path, session_id)

    if "error" in analysis_result:
        raise HTTPException(status_code=500, detail=analysis_result["error"])

    # Embed dataset metadata into vector store
    rag.embed_dataset_metadata(
        session_id,
        file.filename,
        analysis_result.get("dataframe_info", {})
    )

    # Embed all analysis results into vector store
    rag.embed_analysis_results(
        session_id,
        analysis_result,
        file.filename
    )

    # Embed visualization information into vector store
    visualizations = analysis_result.get("visualizations", {})
    if visualizations:
        rag.embed_visualizations(
            session_id,
            visualizations,
            file.filename
        )

    # Save analysis cache
    pipeline.save_analysis(analysis_result, session_id, file.filename)

    # Build visualization URLs for response
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    viz_urls = {}
    for viz_type, viz_path in visualizations.items():
        viz_filename = os.path.basename(viz_path)
        viz_urls[viz_type] = f"{backend_url}/visualizations/{session_id}/{viz_filename}"

    return {
        "file_id": uploaded_file.id,
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file_type,
        "file_size_bytes": file_stats.st_size,
        "upload_timestamp": uploaded_file.upload_timestamp,
        "analysis": {
            "shape": analysis_result.get("dataframe_info", {}).get("shape"),
            "columns": analysis_result.get("dataframe_info", {}).get("num_columns"),
            "rows": analysis_result.get("dataframe_info", {}).get("num_rows"),
            "visualizations_generated": len(visualizations),
            "visualization_urls": viz_urls,
            "insights_generated": "insights" in analysis_result
        },
        "message": "File analyzed and embedded in vector store. Ready for RAG queries!"
    }


async def _handle_pdf_file(
    file: UploadFile,
    file_path: str,
    file_type: str,
    file_stats,
    uploaded_file,
    session_id: str,
    file_handler,
    rag: RAGSystem
):
    """Handle PDF file upload - extract text and embed."""
    # Extract PDF content
    pdf_data = file_handler.parse_research_paper(file_path)

    if "error" in pdf_data:
        raise HTTPException(status_code=500, detail=pdf_data["error"])

    # Embed PDF content into vector store
    rag.embed_pdf_content(
        session_id,
        file.filename,
        pdf_data
    )

    return {
        "file_id": uploaded_file.id,
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file_type,
        "file_size_bytes": file_stats.st_size,
        "upload_timestamp": uploaded_file.upload_timestamp,
        "analysis": {
            "num_pages": pdf_data.get("num_pages", 0),
            "total_chars": pdf_data.get("total_chars", 0),
            "sections_found": list(pdf_data.get("has_sections", {}).keys()),
        },
        "message": "PDF extracted and embedded in vector store. Ready for RAG queries!"
    }


async def _handle_json_file(
    file: UploadFile,
    file_path: str,
    file_type: str,
    file_stats,
    uploaded_file,
    session_id: str,
    rag: RAGSystem,
    pipeline: AnalysisPipeline = None
):
    """Handle JSON file upload - convert to CSV if tabular and analyze."""
    import pandas as pd

    # Read and parse JSON
    with open(file_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)

    # Check if JSON is tabular (list of dicts or dict with array values)
    is_tabular = False
    df = None

    try:
        if isinstance(json_data, list) and len(json_data) > 0:
            # List of objects - common tabular format
            if isinstance(json_data[0], dict):
                df = pd.DataFrame(json_data)
                is_tabular = True
            # List of lists with potential header
            elif isinstance(json_data[0], list):
                df = pd.DataFrame(json_data[1:], columns=json_data[0] if json_data else None)
                is_tabular = True
        elif isinstance(json_data, dict):
            # Check if it's a dict with 'data' key containing array
            if 'data' in json_data and isinstance(json_data['data'], list):
                if len(json_data['data']) > 0 and isinstance(json_data['data'][0], dict):
                    df = pd.DataFrame(json_data['data'])
                    is_tabular = True
            # Check if dict values are all arrays of same length (columnar format)
            elif all(isinstance(v, list) for v in json_data.values()):
                lengths = [len(v) for v in json_data.values()]
                if len(set(lengths)) == 1 and lengths[0] > 0:
                    df = pd.DataFrame(json_data)
                    is_tabular = True
            # Try pandas json_normalize for nested structures
            elif all(isinstance(v, dict) for v in json_data.values()):
                try:
                    df = pd.json_normalize(list(json_data.values()))
                    df.index = list(json_data.keys())
                    is_tabular = len(df) > 1
                except Exception:
                    pass
    except Exception as e:
        print(f"Error checking JSON tabular structure: {e}")
        is_tabular = False

    if is_tabular and df is not None and len(df) > 0 and pipeline is not None:
        # Convert to CSV and run full analysis pipeline
        csv_path = file_path.replace('.json', '_converted.csv')
        df.to_csv(csv_path, index=False)
        print(f"[Upload] Converted JSON to CSV: {csv_path} ({len(df)} rows, {len(df.columns)} columns)")

        # Run analysis pipeline on converted CSV
        analysis_result = pipeline.analyze_file(csv_path, session_id)

        if "error" in analysis_result:
            # Fall back to text embedding if analysis fails
            rag.embed_json_content(session_id, file.filename, json_data)
            return {
                "file_id": uploaded_file.id,
                "filename": file.filename,
                "file_path": file_path,
                "file_type": file_type,
                "file_size_bytes": file_stats.st_size,
                "upload_timestamp": uploaded_file.upload_timestamp,
                "analysis": {"error": analysis_result["error"], "fallback": "json_embedding"},
                "message": "JSON embedded as text (tabular conversion failed). Ready for RAG queries!"
            }

        # Embed dataset metadata into vector store
        rag.embed_dataset_metadata(
            session_id,
            file.filename,
            analysis_result.get("dataframe_info", {})
        )

        # Embed all analysis results into vector store
        rag.embed_analysis_results(
            session_id,
            analysis_result,
            file.filename
        )

        # Embed visualization information into vector store
        visualizations = analysis_result.get("visualizations", {})
        if visualizations:
            rag.embed_visualizations(
                session_id,
                visualizations,
                file.filename
            )

        # Save analysis cache
        pipeline.save_analysis(analysis_result, session_id, file.filename)

        # Build visualization URLs for response
        backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        viz_urls = {}
        for viz_type, viz_path in visualizations.items():
            viz_filename = os.path.basename(viz_path)
            viz_urls[viz_type] = f"{backend_url}/visualizations/{session_id}/{viz_filename}"

        return {
            "file_id": uploaded_file.id,
            "filename": file.filename,
            "file_path": file_path,
            "file_type": "json_tabular",
            "file_size_bytes": file_stats.st_size,
            "upload_timestamp": uploaded_file.upload_timestamp,
            "analysis": {
                "converted_to_csv": True,
                "shape": analysis_result.get("dataframe_info", {}).get("shape"),
                "columns": analysis_result.get("dataframe_info", {}).get("num_columns"),
                "rows": analysis_result.get("dataframe_info", {}).get("num_rows"),
                "visualizations_generated": len(visualizations),
                "visualization_urls": viz_urls,
                "insights_generated": "insights" in analysis_result
            },
            "message": "JSON converted to CSV and analyzed. Full EDA available. Ready for RAG queries!"
        }

    else:
        # Non-tabular JSON - embed as text
        rag.embed_json_content(
            session_id,
            file.filename,
            json_data
        )

        # Determine structure info
        if isinstance(json_data, dict):
            structure = {"type": "object", "keys": len(json_data)}
        elif isinstance(json_data, list):
            structure = {"type": "array", "length": len(json_data)}
        else:
            structure = {"type": type(json_data).__name__}

        return {
            "file_id": uploaded_file.id,
            "filename": file.filename,
            "file_path": file_path,
            "file_type": file_type,
            "file_size_bytes": file_stats.st_size,
            "upload_timestamp": uploaded_file.upload_timestamp,
            "analysis": {
                "converted_to_csv": False,
                "structure": structure,
            },
            "message": "JSON parsed and embedded in vector store. Ready for RAG queries!"
        }


async def _handle_text_file(
    file: UploadFile,
    file_path: str,
    file_type: str,
    file_stats,
    uploaded_file,
    session_id: str,
    rag: RAGSystem
):
    """Handle text file upload - read and embed."""
    # Read text content
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        text_content = f.read()

    # Embed text content into vector store
    rag.embed_text_content(
        session_id,
        file.filename,
        text_content
    )

    return {
        "file_id": uploaded_file.id,
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file_type,
        "file_size_bytes": file_stats.st_size,
        "upload_timestamp": uploaded_file.upload_timestamp,
        "analysis": {
            "total_chars": len(text_content),
            "total_lines": text_content.count('\n') + 1,
        },
        "message": "Text file embedded in vector store. Ready for RAG queries!"
    }
