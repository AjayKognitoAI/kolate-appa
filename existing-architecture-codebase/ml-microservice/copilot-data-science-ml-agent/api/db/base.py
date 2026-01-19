"""Database base configuration."""

from sqlalchemy.ext.declarative import declarative_base

# Create the SQLAlchemy Base class
# This is the single source of truth for all models
Base = declarative_base()
