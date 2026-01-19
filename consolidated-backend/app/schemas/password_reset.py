from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class RequestOTPSchema(BaseModel):
    """Schema for requesting password reset OTP."""

    email: EmailStr = Field(..., description="User's email address")


class VerifyOTPSchema(BaseModel):
    """Schema for verifying OTP."""

    email: EmailStr = Field(..., description="User's email address")
    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="6-digit OTP from email",
    )


class ResetPasswordSchema(BaseModel):
    """Schema for resetting password."""

    reset_token: str = Field(..., description="Reset token from OTP verification")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password strength requirements."""
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class RequestOTPResponse(BaseModel):
    """Response schema for OTP request."""

    message: str
    expires_in: int = Field(..., description="OTP expiration time in seconds")


class VerifyOTPResponse(BaseModel):
    """Response schema for OTP verification."""

    reset_token: str
    expires_in: int = Field(..., description="Reset token expiration time in seconds")


class ResetPasswordResponse(BaseModel):
    """Response schema for password reset."""

    message: str
