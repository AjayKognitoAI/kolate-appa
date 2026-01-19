"""
Patient Record Model (MongoDB)

Patient record document model for MongoDB using Beanie ODM.
Stored in tenant-specific MongoDB databases.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import Field
from beanie import Document


class PatientRecord(Document):
    """
    PatientRecord document model for MongoDB.

    Stores patient data with flexible schema using a dictionary field.
    Each tenant has their own database, and collections are named by
    project and trial: patient_records_{project_id}_{trial_slug}

    Attributes:
        record_id: Unique identifier for the record (can differ from _id)
        patient_data: Flexible dictionary containing patient information
        metadata: Additional metadata about the record
        created_at: Creation timestamp
        updated_at: Last update timestamp

    Note:
        The actual MongoDB _id is automatically managed by Beanie.
        The record_id field provides an additional identifier if needed.
    """

    record_id: Optional[str] = Field(default=None, description="Custom record identifier")
    patient_data: Dict[str, Any] = Field(default_factory=dict, description="Patient data")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Record metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        # Collection name will be set dynamically based on project/trial
        name = "patient_records"
        use_state_management = True

    class Config:
        json_schema_extra = {
            "example": {
                "record_id": "patient-001",
                "patient_data": {
                    "age": 45,
                    "gender": "M",
                    "diagnosis": "Type 2 Diabetes",
                    "lab_results": {
                        "glucose": 126,
                        "hba1c": 7.2
                    }
                },
                "metadata": {
                    "source": "EMR Import",
                    "import_date": "2024-01-15"
                }
            }
        }

    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()


class PatientRecordCreate:
    """
    Data class for creating a patient record.

    Used for validation before inserting into MongoDB.
    """

    def __init__(
        self,
        patient_data: Dict[str, Any],
        record_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.record_id = record_id
        self.patient_data = patient_data
        self.metadata = metadata

    def to_document(self) -> PatientRecord:
        """Convert to a PatientRecord document."""
        return PatientRecord(
            record_id=self.record_id,
            patient_data=self.patient_data,
            metadata=self.metadata
        )


# For non-Beanie usage with Motor directly
def patient_record_to_dict(record: PatientRecord) -> Dict[str, Any]:
    """
    Convert a PatientRecord to a dictionary for Motor operations.

    Args:
        record: The PatientRecord instance

    Returns:
        Dict representation of the record
    """
    return {
        "record_id": record.record_id,
        "patient_data": record.patient_data,
        "metadata": record.metadata,
        "created_at": record.created_at,
        "updated_at": record.updated_at
    }


def dict_to_patient_record(data: Dict[str, Any]) -> PatientRecord:
    """
    Convert a dictionary from MongoDB to a PatientRecord.

    Args:
        data: The dictionary from MongoDB

    Returns:
        PatientRecord instance
    """
    return PatientRecord(
        record_id=data.get("record_id"),
        patient_data=data.get("patient_data", {}),
        metadata=data.get("metadata"),
        created_at=data.get("created_at", datetime.utcnow()),
        updated_at=data.get("updated_at", datetime.utcnow())
    )
