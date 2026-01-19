from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Action(BaseModel):
    """Action model for RBAC system."""

    __tablename__ = "actions"

    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)

    # Relationships
    permissions = relationship("Permission", back_populates="action", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Action(id={self.id}, name='{self.name}')>"