from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class GuestRole(BaseModel):
    """Guest-Role mapping for RBAC system.

    Separate table from UserRole to avoid FK constraint issues,
    since guests don't exist in the users table.
    """

    __tablename__ = "guest_roles"

    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    # Add unique constraint on guest_id and role_id combination
    __table_args__ = (
        UniqueConstraint('guest_id', 'role_id', name='uq_guest_role'),
    )

    # Relationships
    guest = relationship("Guest", backref="guest_roles")
    role = relationship("Role", backref="guest_roles")

    def __repr__(self):
        return f"<GuestRole(id={self.id}, guest_id={self.guest_id}, role_id={self.role_id})>"