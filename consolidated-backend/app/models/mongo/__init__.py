"""
MongoDB Models Package

Document models for MongoDB using Beanie ODM:
- PatientRecord: Patient data records
- ExecutionRecord: ML execution/prediction records

These are stored in tenant-specific MongoDB databases.
Collection names are dynamically generated based on project and trial.
"""

from app.models.mongo.patient_record import (
    PatientRecord,
    PatientRecordCreate,
    patient_record_to_dict,
    dict_to_patient_record
)
from app.models.mongo.execution_record import (
    ExecutionRecord,
    ExecutionRecordCreate,
    execution_record_to_dict,
    dict_to_execution_record
)

__all__ = [
    # Patient Record
    "PatientRecord",
    "PatientRecordCreate",
    "patient_record_to_dict",
    "dict_to_patient_record",
    # Execution Record
    "ExecutionRecord",
    "ExecutionRecordCreate",
    "execution_record_to_dict",
    "dict_to_execution_record",
]
