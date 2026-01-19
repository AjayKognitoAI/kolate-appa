import logging
from pathlib import Path
from typing import Optional
from jinja2 import Environment, FileSystemLoader

from app.utils.email import EmailFactory
from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending emails using configured email provider.
    """

    def __init__(self):
        """Initialize email service with provider from settings."""
        self.provider = EmailFactory.create_from_settings(settings)

        # Setup Jinja2 for email templates
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))

    async def send_otp_email(
        self, to_email: str, otp: str, expires_in_minutes: int = 10
    ) -> bool:
        """
        Send OTP email for password reset.

        Args:
            to_email: Recipient email address
            otp: 6-digit OTP
            expires_in_minutes: OTP expiration time in minutes

        Returns:
            bool: True if email sent successfully
        """
        try:
            subject = "Password Reset OTP - MindTrip GigConnect"

            # Render HTML template
            template = self.jinja_env.get_template("forgot_password_otp.html")
            html_content = template.render(otp=otp, expires_in=expires_in_minutes)

            # Plain text fallback
            text_content = f"""
Password Reset Request

We received a request to reset your password for MindTrip GigConnect.

Your OTP: {otp}

This OTP will expire in {expires_in_minutes} minutes.

If you didn't request this, please ignore this email.

Best regards,
MindTrip GigConnect Team
            """.strip()

            # Send email
            await self.provider.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )

            logger.info(f"OTP email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send OTP email to {to_email}: {str(e)}")
            raise

    async def send_password_reset_success_email(
        self, to_email: str, reset_time: str
    ) -> bool:
        """
        Send confirmation email after successful password reset.

        Args:
            to_email: Recipient email address
            reset_time: Timestamp of password reset

        Returns:
            bool: True if email sent successfully
        """
        try:
            subject = "Password Reset Successful - MindTrip GigConnect"

            # Render HTML template
            template = self.jinja_env.get_template("password_reset_success.html")
            html_content = template.render(reset_time=reset_time)

            # Plain text fallback
            text_content = f"""
Password Reset Successful

Your password has been successfully reset for your MindTrip GigConnect account.

Reset completed at: {reset_time}

If you did not make this change, please contact support immediately.

Best regards,
MindTrip GigConnect Team
            """.strip()

            # Send email
            await self.provider.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )

            logger.info(f"Password reset success email sent to {to_email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send password reset success email to {to_email}: {str(e)}"
            )
            raise

    async def send_verification_otp_email(
        self, to_email: str, otp: str, expires_in_minutes: int = 10
    ) -> bool:
        """
        Send OTP email for email verification during registration.

        Args:
            to_email: Recipient email address
            otp: 6-digit OTP
            expires_in_minutes: OTP expiration time in minutes

        Returns:
            bool: True if email sent successfully
        """
        try:
            subject = "Verify Your Email - MindTrip GigConnect"

            # Render HTML template
            template = self.jinja_env.get_template("verification_email.html")
            html_content = template.render(otp=otp, expires_in_minutes=expires_in_minutes)

            # Plain text fallback
            text_content = f"""
Welcome to MindTrip GigConnect!

Thank you for registering with us. To complete your registration and verify your email address, please use the One-Time Password (OTP) below:

Your OTP: {otp}

This code will expire in {expires_in_minutes} minutes.

If you didn't create an account with GigConnect, please ignore this email.

Best regards,
MindTrip GigConnect Team
            """.strip()

            # Send email
            await self.provider.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )

            logger.info(f"Verification OTP email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send verification OTP email to {to_email}: {str(e)}")
            raise
