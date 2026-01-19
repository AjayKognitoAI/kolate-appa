"""
Patient Records Service Package

PostgreSQL-based services for managing patient records and execution records.
Uses JSONB fields for flexible patient data and prediction results.
"""

from .patient_record_service import PatientRecordService
from .execution_record_service import ExecutionRecordService

__all__ = [
    "PatientRecordService",
    "ExecutionRecordService",
]
