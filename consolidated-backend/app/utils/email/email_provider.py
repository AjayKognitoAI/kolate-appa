from abc import ABC, abstractmethod
from typing import Optional, List


class EmailProvider(ABC):
    """
    Abstract base class for email providers.
    Implements Strategy Pattern for different email sending services.
    """

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> bool:
        """
        Send an email using the provider.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (fallback)
            cc: List of CC recipients
            bcc: List of BCC recipients

        Returns:
            bool: True if email sent successfully, False otherwise

        Raises:
            Exception: If email sending fails
        """
        pass

    @abstractmethod
    async def send_bulk_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send bulk emails to multiple recipients.

        Args:
            to_emails: List of recipient email addresses
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (fallback)

        Returns:
            bool: True if all emails sent successfully, False otherwise
        """
        pass

    @abstractmethod
    def validate_configuration(self) -> bool:
        """
        Validate that the provider is properly configured.

        Returns:
            bool: True if configuration is valid, False otherwise
        """
        pass
