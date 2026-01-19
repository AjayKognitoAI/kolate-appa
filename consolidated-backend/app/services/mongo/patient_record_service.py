"""
Patient Record Service (MongoDB) - DEPRECATED

This module is deprecated. Please use:
    from app.services.patient_records import PatientRecordService

The new implementation is located in:
    app/services/patient_records/patient_record_service.py
"""

import warnings
from app.services.patient_records.patient_record_service import PatientRecordService as NewPatientRecordService


class PatientRecordService(NewPatientRecordService):
    """
    Patient record management service (MongoDB).

    DEPRECATED: This class is maintained for backward compatibility.
    Use app.services.patient_records.PatientRecordService instead.
    """

    def __init__(self):
        warnings.warn(
            "app.services.mongo.PatientRecordService is deprecated. "
            "Use app.services.patient_records.PatientRecordService instead.",
            DeprecationWarning,
            stacklevel=2
        )
        super().__init__()


# Re-export for backward compatibility
__all__ = ["PatientRecordService"]
