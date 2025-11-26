"""
Authentication module for multi-tenant JWT authentication.

Supports:
1. Multi-tenant JWT Bearer token authentication (Authorization: Bearer <token>)

Legacy API key authentication has been removed.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Security, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db
from app.models.database import User, Tenant
import logging

logger = logging.getLogger(__name__)


class CurrentUser:
    """
    Container for current authenticated user and tenant.
    Attached to request context by JWT authentication middleware.
    """

    def __init__(self, user, tenant):
        self.user = user  # User model instance
        self.tenant = tenant  # Tenant model instance
        self.user_id = user.id
        self.tenant_id = tenant.id
        self.email = user.email


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security (JWT only)
bearer_scheme = HTTPBearer(auto_error=False)




# ============================================================================
# Multi-Tenant JWT Authentication
# ============================================================================

class JWTService:
    """Service for creating and validating multi-tenant user JWT tokens."""

    @staticmethod
    def create_user_jwt(
        user_id: int,
        tenant_id: int,
        email: str
    ) -> Tuple[str, datetime]:
        """
        Create a JWT token for a user.

        Args:
            user_id: User ID (becomes 'sub' claim)
            tenant_id: Tenant ID
            email: User email

        Returns:
            Tuple of (jwt_token, expiration_datetime)
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=settings.jwt_expire_minutes)

        payload = {
            "sub": str(user_id),  # Standard JWT subject claim (must be string)
            "tenant_id": tenant_id,
            "email": email,
            "exp": expires_at,
            "iat": now
        }

        token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
        return token, expires_at

    @staticmethod
    def verify_jwt(token: str) -> dict:
        """
        Verify and decode a JWT token.

        Args:
            token: JWT token string

        Returns:
            Decoded payload with user_id, tenant_id, email

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])

            # Verify required claims
            if not all(k in payload for k in ["sub", "tenant_id", "email"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing required claims",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> CurrentUser:
    """
    FastAPI dependency to authenticate user via JWT Bearer token.

    Extracts and validates JWT from Authorization: Bearer <token> header.
    Loads user and tenant from database.

    Args:
        credentials: Bearer token credentials from Authorization header
        db: Database session

    Returns:
        CurrentUser with user and tenant models

    Raises:
        HTTPException: If token is missing, invalid, or user/tenant not found
    """
    # Import here to avoid circular dependency
    from app.models.database import User, Tenant

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Verify JWT and extract payload
    payload = JWTService.verify_jwt(credentials.credentials)
    user_id = int(payload.get("sub"))  # Convert string to int
    tenant_id = int(payload.get("tenant_id"))  # Convert string to int

    # Load user from database
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Load tenant from database
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_active == True).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Verify user belongs to tenant
    if user.tenant_id != tenant.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this tenant"
        )

    return CurrentUser(user=user, tenant=tenant)


