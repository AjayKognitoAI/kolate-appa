"""
Execution Record Service (MongoDB) - DEPRECATED

This module is deprecated. Please use:
    from app.services.patient_records import ExecutionRecordService

The new implementation is located in:
    app/services/patient_records/execution_record_service.py
"""

import warnings
from app.services.patient_records.execution_record_service import ExecutionRecordService as NewExecutionRecordService


class ExecutionRecordService(NewExecutionRecordService):
    """
    Execution record management service (MongoDB).

    DEPRECATED: This class is maintained for backward compatibility.
    Use app.services.patient_records.ExecutionRecordService instead.
    """

    def __init__(self):
        warnings.warn(
            "app.services.mongo.ExecutionRecordService is deprecated. "
            "Use app.services.patient_records.ExecutionRecordService instead.",
            DeprecationWarning,
            stacklevel=2
        )
        super().__init__()


# Re-export for backward compatibility
__all__ = ["ExecutionRecordService"]
