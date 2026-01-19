from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.orm import relationship
from .base import BaseModelWithStringId


class User(BaseModelWithStringId):
    __tablename__ = "users"

    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    user_auths = relationship("UserAuth", back_populates="user", cascade="all, delete-orphan")
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    user_media = relationship("UserMedia", back_populates="user", cascade="all, delete-orphan")
    homeowner = relationship("Homeowner", back_populates="user", uselist=False, cascade="all, delete-orphan")
    service_provider = relationship("ServiceProvider", back_populates="user", uselist=False, cascade="all, delete-orphan")
    reviews_given = relationship(
        "RatingReview", foreign_keys="RatingReview.reviewer_id", back_populates="reviewer"
    )
    reviews_received = relationship(
        "RatingReview", foreign_keys="RatingReview.reviewee_id", back_populates="reviewee"
    )