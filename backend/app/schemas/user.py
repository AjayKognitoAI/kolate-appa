from pydantic import EmailStr, field_validator
from typing import Optional
from datetime import datetime

from app.schemas.base import CamelModel



class UserBase(CamelModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

    @field_validator("name")
    def validate_name(cls, v):
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters long")
        if len(v) > 255:
            raise ValueError("Name must be at most 255 characters long")
        return v


class UserCreate(UserBase):
    pass


class UserUpdate(CamelModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("name")
    def validate_name(cls, v):
        if v is not None:
            if len(v) < 2:
                raise ValueError("Name must be at least 2 characters long")
            if len(v) > 255:
                raise ValueError("Name must be at most 255 characters long")
        return v


class UserLogin(CamelModel):
    email: EmailStr


class UserResponse(UserBase):
    id: str
    is_active: bool

    class Config:
        from_attributes = True


class UserSearch(CamelModel):
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):

    class Config:
        from_attributes = True
