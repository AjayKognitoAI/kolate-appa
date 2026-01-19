"""Analysis and chat routes."""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from sqlalchemy.orm import Session

from api.schemas.analysis_schemas import AnalysisRequest, AnalysisResponse
from api.dependencies import get_chat
from api.db import get_db
from api.crud import session_crud, conversation_state_crud, uploaded_file_crud
from api.agent.chat_handler import ChatHandler

router = APIRouter(tags=["analysis"])


@router.post("", response_model=AnalysisResponse)
async def analyze(
    request: AnalysisRequest,
    chat: ChatHandler = Depends(get_chat),
    db: Session = Depends(get_db)
):
    """
    Chat with the data science expert using RAG context.

    Provide a session_id and message. The LLM will retrieve relevant analysis context
    from the session's ChromaDB collection (or trial collection if trial_name is provided)
    and provide evidence-based responses.

    If trial_name is provided in the request, it will override the session's default trial.
    If the session has a default trial_name and none is provided in the request, the session's
    trial will be used.
    """
    # Debug logging to see incoming request
    print(f"[DEBUG] Received analyze request: session_id={request.session_id}, message={request.message[:50]}..., trial_name={request.trial_name}")

    try:
        # Validate session
        session = session_crud.get(db, id=request.session_id)
        if not session or not session.is_active:
            raise HTTPException(status_code=404, detail="Invalid or inactive session")

        # Get conversation turn count
        turn_number = conversation_state_crud.get_count(db, session_id=request.session_id) + 1

        # Validate file paths belong to current session
        if request.file_paths:
            session_files = uploaded_file_crud.get_by_session(db, session_id=request.session_id)
            valid_file_paths = {f.file_path for f in session_files}

            # Filter out any file paths that don't belong to this session
            validated_file_paths = [fp for fp in request.file_paths if fp in valid_file_paths]

            if len(validated_file_paths) < len(request.file_paths):
                print(f"[WARNING] Some file paths were filtered out as they don't belong to session {request.session_id}")

            file_name = validated_file_paths[0] if validated_file_paths else None
        else:
            file_name = None

        # Determine trial_name: use request override, or fall back to session default
        trial_name = request.trial_name or session.trial_name

        # Chat with context retrieval and LLM
        result = chat.chat(
            session_id=request.session_id,
            user_message=request.message,
            turn_number=turn_number,
            file_name=file_name,
            trial_name=trial_name
        )

        # Store conversation in database
        conversation_state_crud.add_turn(
            db,
            session_id=request.session_id,
            user_message=request.message,
            agent_response=result.get("response", ""),
            agent_type="rag_chatbot"
        )

        return AnalysisResponse(
            response=result.get("response", ""),
            session_id=request.session_id,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
