import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List
import asyncio

from .email_provider import EmailProvider

logger = logging.getLogger(__name__)


class SMTPEmailProvider(EmailProvider):
    """
    SMTP implementation of EmailProvider.
    Supports standard SMTP servers like Gmail, Outlook, etc.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        use_tls: bool = True,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ):
        """
        Initialize SMTP email provider.

        Args:
            host: SMTP server host
            port: SMTP server port
            username: SMTP username
            password: SMTP password
            use_tls: Whether to use TLS encryption
            from_email: Sender email address (defaults to username)
            from_name: Sender display name
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.from_email = from_email or username
        self.from_name = from_name or "MindTrip GigConnect"

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> bool:
        """Send email via SMTP."""
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self._send_sync,
                to_email,
                subject,
                html_content,
                text_content,
                cc,
                bcc,
            )
            return result
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            raise

    def _send_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> bool:
        """Synchronous email sending implementation."""
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            if cc:
                msg["Cc"] = ", ".join(cc)
            if bcc:
                msg["Bcc"] = ", ".join(bcc)

            # Add plain text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, "plain")
                msg.attach(part1)

            part2 = MIMEText(html_content, "html")
            msg.attach(part2)

            # Prepare recipients list
            recipients = [to_email]
            if cc:
                recipients.extend(cc)
            if bcc:
                recipients.extend(bcc)

            # Send email
            with smtplib.SMTP(self.host, self.port) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)
                server.sendmail(self.from_email, recipients, msg.as_string())

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"SMTP send failed for {to_email}: {str(e)}")
            raise

    async def send_bulk_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send bulk emails via SMTP."""
        try:
            success_count = 0
            for email in to_emails:
                try:
                    await self.send_email(email, subject, html_content, text_content)
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to send bulk email to {email}: {str(e)}")

            logger.info(
                f"Bulk email: {success_count}/{len(to_emails)} sent successfully"
            )
            return success_count == len(to_emails)

        except Exception as e:
            logger.error(f"Bulk email send failed: {str(e)}")
            return False

    def validate_configuration(self) -> bool:
        """Validate SMTP configuration."""
        try:
            if not all([self.host, self.port, self.username, self.password]):
                logger.error("SMTP configuration incomplete")
                return False

            # Test connection
            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                server.login(self.username, self.password)

            logger.info("SMTP configuration validated successfully")
            return True

        except Exception as e:
            logger.error(f"SMTP configuration validation failed: {str(e)}")
            return False
