"""
Execution Record Model (MongoDB)

Execution/prediction record document model for MongoDB using Beanie ODM.
Stores ML prediction results in tenant-specific MongoDB databases.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import Field
from beanie import Document


class ExecutionRecord(Document):
    """
    ExecutionRecord document model for MongoDB.

    Stores ML execution/prediction results with flexible schema.
    Each tenant has their own database, and collections are named by
    project and trial: {project_id}_{trial_slug}_prediction_results

    Attributes:
        user_id: Auth0 ID of the user who ran the execution
        base_patient_data: Input patient data used for prediction
        base_prediction: List of prediction results
        executed_by: Display name or identifier of the executor
        executed_at: When the execution was performed
        updated_by: Who last updated the record
        updated_at: Last update timestamp

    Note:
        The actual MongoDB _id is automatically managed by Beanie
        and serves as the execution_id.
    """

    user_id: str = Field(..., description="Auth0 ID of the user")
    base_patient_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Input patient data for prediction"
    )
    base_prediction: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Prediction results"
    )
    executed_by: Optional[str] = Field(default=None, description="Executor identifier")
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        # Collection name will be set dynamically based on project/trial
        name = "execution_records"
        use_state_management = True

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "auth0|abc123",
                "base_patient_data": {
                    "age": 45,
                    "gender": "M",
                    "glucose": 126,
                    "hba1c": 7.2
                },
                "base_prediction": [
                    {
                        "model": "diabetes_risk",
                        "probability": 0.72,
                        "risk_level": "HIGH",
                        "factors": ["elevated_glucose", "age"]
                    }
                ],
                "executed_by": "John Doe",
                "executed_at": "2024-01-15T10:30:00Z"
            }
        }

    def update_timestamp(self, updated_by: Optional[str] = None):
        """Update the updated_at timestamp and optionally updated_by."""
        self.updated_at = datetime.utcnow()
        if updated_by:
            self.updated_by = updated_by


class ExecutionRecordCreate:
    """
    Data class for creating an execution record.

    Used for validation before inserting into MongoDB.
    """

    def __init__(
        self,
        user_id: str,
        base_patient_data: Dict[str, Any],
        base_prediction: List[Dict[str, Any]],
        executed_by: Optional[str] = None
    ):
        self.user_id = user_id
        self.base_patient_data = base_patient_data
        self.base_prediction = base_prediction
        self.executed_by = executed_by

    def to_document(self) -> ExecutionRecord:
        """Convert to an ExecutionRecord document."""
        return ExecutionRecord(
            user_id=self.user_id,
            base_patient_data=self.base_patient_data,
            base_prediction=self.base_prediction,
            executed_by=self.executed_by
        )


# For non-Beanie usage with Motor directly
def execution_record_to_dict(record: ExecutionRecord) -> Dict[str, Any]:
    """
    Convert an ExecutionRecord to a dictionary for Motor operations.

    Args:
        record: The ExecutionRecord instance

    Returns:
        Dict representation of the record
    """
    return {
        "user_id": record.user_id,
        "base_patient_data": record.base_patient_data,
        "base_prediction": record.base_prediction,
        "executed_by": record.executed_by,
        "executed_at": record.executed_at,
        "updated_by": record.updated_by,
        "updated_at": record.updated_at
    }


def dict_to_execution_record(data: Dict[str, Any]) -> ExecutionRecord:
    """
    Convert a dictionary from MongoDB to an ExecutionRecord.

    Args:
        data: The dictionary from MongoDB

    Returns:
        ExecutionRecord instance
    """
    return ExecutionRecord(
        user_id=data.get("user_id", ""),
        base_patient_data=data.get("base_patient_data", {}),
        base_prediction=data.get("base_prediction", []),
        executed_by=data.get("executed_by"),
        executed_at=data.get("executed_at", datetime.utcnow()),
        updated_by=data.get("updated_by"),
        updated_at=data.get("updated_at", datetime.utcnow())
    )
