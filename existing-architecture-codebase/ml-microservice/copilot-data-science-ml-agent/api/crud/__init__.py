"""CRUD operations package."""

from .base import CRUDBase
from .session import CRUDSession, session_crud
from .conversation_state import CRUDConversationState, conversation_state_crud
from .analysis_result import CRUDAnalysisResult, analysis_result_crud
from .uploaded_file import CRUDUploadedFile, uploaded_file_crud
from .s3_processed_file import CRUDS3ProcessedFile, s3_processed_file_crud

__all__ = [
    # Base class
    "CRUDBase",

    # CRUD classes
    "CRUDSession",
    "CRUDConversationState",
    "CRUDAnalysisResult",
    "CRUDUploadedFile",
    "CRUDS3ProcessedFile",

    # Singleton instances
    "session_crud",
    "conversation_state_crud",
    "analysis_result_crud",
    "uploaded_file_crud",
    "s3_processed_file_crud",
]
