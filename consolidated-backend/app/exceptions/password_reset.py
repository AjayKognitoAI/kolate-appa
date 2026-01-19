class OTPExpiredException(Exception):
    """Raised when OTP has expired."""

    def __init__(self, message: str = "OTP has expired"):
        self.message = message
        super().__init__(self.message)


class InvalidOTPException(Exception):
    """Raised when OTP is invalid."""

    def __init__(self, message: str = "Invalid OTP"):
        self.message = message
        super().__init__(self.message)


class MaxOTPAttemptsException(Exception):
    """Raised when maximum OTP verification attempts exceeded."""

    def __init__(self, message: str = "Maximum OTP verification attempts exceeded"):
        self.message = message
        super().__init__(self.message)


class OTPRateLimitException(Exception):
    """Raised when OTP request rate limit is exceeded."""

    def __init__(
        self, message: str = "Too many OTP requests. Please try again later."
    ):
        self.message = message
        super().__init__(self.message)


class InvalidResetTokenException(Exception):
    """Raised when reset token is invalid or expired."""

    def __init__(self, message: str = "Reset token is invalid or has expired"):
        self.message = message
        super().__init__(self.message)


class PasswordResetException(Exception):
    """Base exception for password reset operations."""

    def __init__(self, message: str = "Password reset operation failed"):
        self.message = message
        super().__init__(self.message)
