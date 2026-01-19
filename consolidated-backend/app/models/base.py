from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, Boolean, String
from sqlalchemy.sql import func
from app.core.database import Base as SQLAlchemyBase


class TimestampMixin:
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    

class BaseModel(SQLAlchemyBase, TimestampMixin):
    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)


class BaseModelWithStringId(SQLAlchemyBase, TimestampMixin):
    __abstract__ = True

    id = Column(String(64), primary_key=True, index=True)