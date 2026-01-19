from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Permission(BaseModel):
    """Permission model for RBAC system."""

    __tablename__ = "permissions"

    feature_id = Column(Integer, ForeignKey("features.id"), nullable=False)
    action_id = Column(Integer, ForeignKey("actions.id"), nullable=False)
    code = Column(String(100), unique=True, nullable=False, index=True)

    # Relationships
    feature = relationship("Feature", back_populates="permissions")
    action = relationship("Action", back_populates="permissions")
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Permission(id={self.id}, code='{self.code}')>"