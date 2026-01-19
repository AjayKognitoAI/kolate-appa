import logging
from typing import Optional

from .email_provider import EmailProvider
from .smtp_provider import SMTPEmailProvider
from .ses_provider import SESEmailProvider

logger = logging.getLogger(__name__)


class EmailFactory:
    """
    Factory class to create email provider instances.
    Implements Factory Pattern for email provider instantiation.
    """

    @staticmethod
    def create_provider(
        provider_type: str,
        # SMTP settings
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_username: Optional[str] = None,
        smtp_password: Optional[str] = None,
        smtp_use_tls: bool = True,
        smtp_from_email: Optional[str] = None,
        smtp_from_name: Optional[str] = None,
        # SES settings
        ses_region: Optional[str] = None,
        ses_access_key_id: Optional[str] = None,
        ses_secret_access_key: Optional[str] = None,
        ses_from_email: Optional[str] = None,
        ses_from_name: Optional[str] = None,
        ses_configuration_set: Optional[str] = None,
    ) -> EmailProvider:
        """
        Create an email provider instance based on provider type.

        Args:
            provider_type: Type of provider ('smtp' or 'ses')
            smtp_*: SMTP configuration parameters
            ses_*: AWS SES configuration parameters

        Returns:
            EmailProvider: Instance of the requested provider

        Raises:
            ValueError: If provider_type is invalid or configuration is incomplete
        """
        provider_type = provider_type.lower()

        if provider_type == "smtp":
            return EmailFactory._create_smtp_provider(
                host=smtp_host,
                port=smtp_port,
                username=smtp_username,
                password=smtp_password,
                use_tls=smtp_use_tls,
                from_email=smtp_from_email,
                from_name=smtp_from_name,
            )

        elif provider_type == "ses":
            return EmailFactory._create_ses_provider(
                region=ses_region,
                access_key_id=ses_access_key_id,
                secret_access_key=ses_secret_access_key,
                from_email=ses_from_email,
                from_name=ses_from_name,
                configuration_set=ses_configuration_set,
            )

        else:
            raise ValueError(
                f"Invalid email provider type: {provider_type}. Must be 'smtp' or 'ses'"
            )

    @staticmethod
    def _create_smtp_provider(
        host: Optional[str],
        port: Optional[int],
        username: Optional[str],
        password: Optional[str],
        use_tls: bool,
        from_email: Optional[str],
        from_name: Optional[str],
    ) -> SMTPEmailProvider:
        """Create SMTP email provider instance."""
        if not all([host, port, username, password]):
            raise ValueError(
                "SMTP provider requires host, port, username, and password"
            )

        logger.info(f"Creating SMTP email provider with host: {host}:{port}")

        return SMTPEmailProvider(
            host=host,
            port=port,
            username=username,
            password=password,
            use_tls=use_tls,
            from_email=from_email,
            from_name=from_name,
        )

    @staticmethod
    def _create_ses_provider(
        region: Optional[str],
        access_key_id: Optional[str],
        secret_access_key: Optional[str],
        from_email: Optional[str],
        from_name: Optional[str],
        configuration_set: Optional[str],
    ) -> SESEmailProvider:
        """Create AWS SES email provider instance."""
        if not region:
            raise ValueError("SES provider requires region")

        if not from_email:
            raise ValueError("SES provider requires from_email")

        logger.info(f"Creating AWS SES email provider for region: {region}")

        return SESEmailProvider(
            region=region,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            from_email=from_email,
            from_name=from_name,
            configuration_set=configuration_set,
        )

    @staticmethod
    def create_from_settings(settings) -> EmailProvider:
        """
        Create email provider from application settings.

        Args:
            settings: Application settings object

        Returns:
            EmailProvider: Configured email provider instance
        """
        return EmailFactory.create_provider(
            provider_type=settings.EMAIL_PROVIDER,
            # SMTP settings
            smtp_host=settings.SMTP_HOST,
            smtp_port=settings.SMTP_PORT,
            smtp_username=settings.SMTP_USERNAME,
            smtp_password=settings.SMTP_PASSWORD,
            smtp_use_tls=settings.SMTP_USE_TLS,
            smtp_from_email=settings.SMTP_FROM_EMAIL,
            smtp_from_name=settings.SMTP_FROM_NAME,
            # SES settings
            ses_region=settings.AWS_SES_REGION,
            ses_access_key_id=settings.AWS_ACCESS_KEY_ID,
            ses_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            ses_from_email=settings.AWS_SES_FROM_EMAIL,
            ses_from_name=settings.AWS_SES_FROM_NAME,
            ses_configuration_set=settings.AWS_SES_CONFIGURATION_SET,
        )
