import logging
from typing import Optional, List

from .email_provider import EmailProvider

logger = logging.getLogger(__name__)


class SESEmailProvider(EmailProvider):
    """
    AWS SES implementation of EmailProvider.
    Requires boto3 library and AWS credentials.
    """

    def __init__(
        self,
        region: str,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        configuration_set: Optional[str] = None,
    ):
        """
        Initialize AWS SES email provider.

        Args:
            region: AWS region (e.g., 'us-east-1')
            access_key_id: AWS access key ID (optional if using IAM role)
            secret_access_key: AWS secret access key (optional if using IAM role)
            from_email: Verified sender email address
            from_name: Sender display name
            configuration_set: SES configuration set name (optional)
        """
        self.region = region
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.from_email = from_email
        self.from_name = from_name or "MindTrip GigConnect"
        self.configuration_set = configuration_set
        self.client = None

        # Initialize boto3 client
        self._initialize_client()

    def _initialize_client(self):
        """Initialize AWS SES client."""
        try:
            import boto3

            if self.access_key_id and self.secret_access_key:
                self.client = boto3.client(
                    "ses",
                    region_name=self.region,
                    aws_access_key_id=self.access_key_id,
                    aws_secret_access_key=self.secret_access_key,
                )
            else:
                # Use IAM role or default credentials
                self.client = boto3.client("ses", region_name=self.region)

            logger.info(f"AWS SES client initialized for region {self.region}")

        except ImportError:
            logger.error("boto3 library not installed. Install with: pip install boto3")
            raise ImportError("boto3 is required for AWS SES provider")
        except Exception as e:
            logger.error(f"Failed to initialize AWS SES client: {str(e)}")
            raise

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> bool:
        """Send email via AWS SES."""
        try:
            # Prepare destination
            destination = {"ToAddresses": [to_email]}
            if cc:
                destination["CcAddresses"] = cc
            if bcc:
                destination["BccAddresses"] = bcc

            # Prepare message
            message = {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {},
            }

            if text_content:
                message["Body"]["Text"] = {"Data": text_content, "Charset": "UTF-8"}

            if html_content:
                message["Body"]["Html"] = {"Data": html_content, "Charset": "UTF-8"}

            # Prepare source
            source = f"{self.from_name} <{self.from_email}>"

            # Send email
            kwargs = {
                "Source": source,
                "Destination": destination,
                "Message": message,
            }

            if self.configuration_set:
                kwargs["ConfigurationSetName"] = self.configuration_set

            response = self.client.send_email(**kwargs)

            logger.info(
                f"Email sent successfully to {to_email}. MessageId: {response['MessageId']}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to send email via SES to {to_email}: {str(e)}")
            raise

    async def send_bulk_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send bulk emails via AWS SES."""
        try:
            # For bulk sending, we'll use send_email in a loop
            # In production, consider using SES bulk templated email API
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
        """Validate AWS SES configuration."""
        try:
            if not self.client:
                logger.error("SES client not initialized")
                return False

            if not self.from_email:
                logger.error("From email not configured")
                return False

            # Test by getting send quota
            response = self.client.get_send_quota()
            logger.info(
                f"SES configuration validated. Max send rate: {response['MaxSendRate']}/sec"
            )
            return True

        except Exception as e:
            logger.error(f"SES configuration validation failed: {str(e)}")
            return False
