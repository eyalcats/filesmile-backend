"""
Authentication helper for Priority client creation.

Handles both legacy API key authentication and new JWT multi-tenant authentication.
"""
from typing import Optional, Tuple
from fastapi import Request
from fastapi import HTTPException, status
from app.core.auth import CurrentUser
from app.core.config import settings
from app.utils.encryption import decrypt_value
from app.services.priority_client import PriorityClient
import logging

logger = logging.getLogger(__name__)


class AuthHelper:
    """Helper for creating Priority clients with proper authentication."""

    @staticmethod
    def get_priority_credentials_and_config(
        current_user: Optional[CurrentUser] = None,
        request: Optional[Request] = None,
        use_admin_credentials: bool = False
    ) -> Tuple[str, str, str, str, str]:
        """
        Get Priority credentials and configuration based on JWT authentication.

        Uses tenant admin credentials for GET operations and user credentials for POST operations.

        Args:
            current_user: Authenticated user from JWT (required)
            request: FastAPI request object
            use_admin_credentials: If True, use tenant admin credentials (for GET operations)
                                 If False, use user credentials (for POST operations)

        Returns:
            Tuple of (username, password, company, base_url, tabula_ini)

        Raises:
            HTTPException: If JWT authentication is not found or invalid
        """
        try:
            # JWT multi-tenant authentication (ONLY)
            if current_user:
                # Use tenant's ERP configuration
                tenant = current_user.tenant
                user = current_user.user

                if use_admin_credentials:
                    # Use tenant admin credentials for GET operations
                    logger.info(f"Using tenant admin credentials for GET operation (tenant: {tenant.name})")
                    erp_username = decrypt_value(tenant.erp_admin_username) if tenant.erp_admin_username else None
                    erp_password = decrypt_value(tenant.erp_admin_password_or_token) if tenant.erp_admin_password_or_token else None
                    
                    if not erp_username or not erp_password:
                        logger.warning("Tenant admin ERP credentials not configured, falling back to user credentials")
                        # Fall back to user credentials since admin and user are the same
                        erp_username = decrypt_value(user.erp_username) if user.erp_username else None
                        erp_password = decrypt_value(user.erp_password_or_token) if user.erp_password_or_token else None
                        
                        if not erp_username or not erp_password:
                            logger.error("Both admin and user ERP credentials not configured")
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="ERP credentials not configured. Please contact system administrator."
                            )
                else:
                    # Use user credentials for POST operations
                    logger.info(f"Using user credentials for POST operation (user: {user.email}, tenant: {tenant.name})")
                    erp_username = decrypt_value(user.erp_username) if user.erp_username else None
                    erp_password = decrypt_value(user.erp_password_or_token) if user.erp_password_or_token else None
                    
                    if not erp_username or not erp_password:
                        logger.error("User ERP credentials not configured")
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="User ERP credentials not configured. Please complete registration."
                        )

                # Use tenant's ERP config
                base_url = tenant.erp_base_url
                company = tenant.erp_company
                tabula_ini = tenant.erp_tabula_ini

                return erp_username, erp_password, company, base_url, tabula_ini

            # No authentication - fail explicitly
            logger.error("No JWT authentication found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="JWT authentication required. Please provide a valid JWT token."
            )
        except Exception as e:
            logger.error(f"AuthHelper.get_priority_credentials_and_config failed: {e}", exc_info=True)
            raise

    @staticmethod
    def create_priority_client(
        current_user: Optional[CurrentUser] = None,
        request: Optional[Request] = None,
        use_admin_credentials: bool = False
    ) -> PriorityClient:
        """
        Create a Priority client with appropriate authentication.

        Args:
            current_user: Authenticated user from JWT (if available)
            request: FastAPI request (to check for X-API-Key header)
            use_admin_credentials: If True, use tenant admin credentials (for GET operations)
                                 If False, use user credentials (for POST operations)

        Returns:
            Configured PriorityClient instance
        """
        username, password, company, base_url, tabula_ini = AuthHelper.get_priority_credentials_and_config(
            current_user, request, use_admin_credentials
        )

        # Create and return client
        return PriorityClient(
            username=username,
            password=password,
            company=company,
            base_url=base_url,
            tabula_ini=tabula_ini
        )
