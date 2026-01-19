from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ConversationTurn(BaseModel):
    """Model for a conversation turn."""
    model_config = ConfigDict(from_attributes=True)

    turn: int = Field(validation_alias='turn_number')
    user_message: str
    agent_response: Optional[str]
    agent_type: Optional[str]
    timestamp: datetime = Field(validation_alias='created_at')
