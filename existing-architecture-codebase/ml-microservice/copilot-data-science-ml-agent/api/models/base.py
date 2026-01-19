"""Re-export Base from api.db for backward compatibility."""

from api.db.base import Base

__all__ = ["Base"]
