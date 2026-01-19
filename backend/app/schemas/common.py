from typing import Any, Optional

from app.schemas.base import CamelModel


class MessageResponse(CamelModel):
    message: str
    data: Optional[Any] = None


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"


class PaginationResponse(CamelModel):
    page: int
    size: int
    total: int
    total_pages: int