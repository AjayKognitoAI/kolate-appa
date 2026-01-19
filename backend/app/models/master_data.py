from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class MasterData(BaseModel):
    """Master data model for storing hierarchical reference data."""

    __tablename__ = "master_data"

    scope = Column(String(100), nullable=False, index=True)
    code = Column(String(100), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    parent_scope = Column(String(100), nullable=True, index=True)
    parent_code = Column(String(100), nullable=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)

    # Relationships
    locales = relationship(
        "MasterDataLocale",
        back_populates="master_data",
        cascade="all, delete-orphan"
    )

    # Unique constraint on scope and code combination
    __table_args__ = (
        UniqueConstraint('scope', 'code', name='uq_master_data_scope_code'),
    )

    def __repr__(self):
        return f"<MasterData(id={self.id}, scope='{self.scope}', code='{self.code}', display_name='{self.display_name}')>"


class MasterDataLocale(BaseModel):
    """Localized values for master data entries."""

    __tablename__ = "master_data_locale"

    master_id = Column(Integer, ForeignKey("master_data.id", ondelete="CASCADE"), nullable=False, index=True)
    locale = Column(String(10), nullable=False, index=True)  # e.g., en_US, fr_FR
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    master_data = relationship("MasterData", back_populates="locales")

    # Unique constraint on master_id and locale combination
    __table_args__ = (
        UniqueConstraint('master_id', 'locale', name='uq_master_data_locale_master_locale'),
    )

    def __repr__(self):
        return f"<MasterDataLocale(id={self.id}, master_id={self.master_id}, locale='{self.locale}', display_name='{self.display_name}')>"