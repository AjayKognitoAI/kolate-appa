"""
Pydantic schemas for email verification endpoints.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class VerifyEmailRequest(BaseModel):
    """Request schema for email verification."""

    email: EmailStr = Field(..., description="User's email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP from email")

    @field_validator('otp')
    @classmethod
    def validate_otp(cls, v):
        if not v.isdigit():
            raise ValueError('OTP must contain only digits')
        if len(v) != 6:
            raise ValueError('OTP must be exactly 6 digits')
        return v


class VerifyEmailResponse(BaseModel):
    """Response schema for email verification."""

    message: str = Field(..., description="Success message")
    success: bool = Field(default=True, description="Verification status")


class ResendVerificationOTPRequest(BaseModel):
    """Request schema for resending verification OTP."""

    email: EmailStr = Field(..., description="User's email address")


class ResendVerificationOTPResponse(BaseModel):
    """Response schema for resending verification OTP."""

    message: str = Field(..., description="Response message")
    expires_in: int = Field(..., description="OTP expiration time in seconds")
