"""
Multi-tenant authentication endpoints.

Provides:
1. Tenant resolution from email domain
2. User registration with ERP credentials
3. JWT token issuance for authentication
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.database import Tenant, TenantDomain, User
from app.models.schemas import (
    TenantResolveRequest,
    TenantResolveResponse,
    UserRegisterRequest,
    UserRegisterResponse
)
from app.core.auth import JWTService
from app.core.config import settings
from app.utils.encryption import encrypt_value, decrypt_value
from app.services.priority_client import PriorityClient

router = APIRouter()


def get_domain_from_email(email: str) -> str:
    """
    Extract domain from email address.

    Args:
        email: Email address (e.g., user@example.com)

    Returns:
        Domain part (e.g., example.com)

    Raises:
        ValueError: If email format is invalid
    """
    parts = email.split("@")
    if len(parts) != 2:
        raise ValueError("Invalid email format")
    return parts[1].lower()


@router.post("/tenant/resolve", response_model=TenantResolveResponse)
async def resolve_tenant(
    request: TenantResolveRequest,
    db: Session = Depends(get_db)
) -> TenantResolveResponse:
    """
    Resolve tenant from user's email domain.

    The Outlook add-in calls this endpoint on startup with the user's email.
    Backend extracts the domain and finds the corresponding tenant.

    Flow:
    1. Extract domain from email (e.g., user@acme.com -> acme.com)
    2. Look up tenant by domain in tenant_domains table
    3. Return tenant_id and name if found

    Args:
        request: Contains user email
        db: Database session

    Returns:
        Tenant ID and name

    Raises:
        404: If tenant not found for this domain
        400: If email format is invalid
    """
    try:
        domain = get_domain_from_email(request.email)
        print(f"DEBUG: Extracted domain from email '{request.email}': '{domain}'")
    except ValueError as e:
        print(f"DEBUG: ValueError extracting domain: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    # Look up tenant by domain
    print(f"DEBUG: Querying TenantDomain table for domain: '{domain}'")
    print(f"DEBUG: Database connection: {db.bind.url}")
    tenant_domain = db.query(TenantDomain).filter(
        TenantDomain.domain == domain
    ).first()

    print(f"DEBUG: tenant_domain found: {tenant_domain is not None}")
    if tenant_domain:
        print(f"DEBUG: tenant_domain.tenant_id: {tenant_domain.tenant_id}")
        print(f"DEBUG: tenant_domain.domain: {tenant_domain.domain}")
    else:
        # Let's also check what domains are available in the database
        all_domains = db.query(TenantDomain).all()
        print(f"DEBUG: Available domains in database: {[td.domain for td in all_domains]}")

    if not tenant_domain:
        print("DEBUG: Raising TENANT_NOT_FOUND exception")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TENANT_NOT_FOUND",
            headers={"X-Error-Code": "TENANT_NOT_FOUND"}
        )

    # Get tenant
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_domain.tenant_id,
        Tenant.is_active == True
    ).first()

    print(f"DEBUG: tenant found: {tenant is not None}")
    if tenant:
        print(f"DEBUG: tenant.name: {tenant.name}")

    if not tenant:
        print("DEBUG: Raising TENANT_NOT_FOUND_OR_INACTIVE exception")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TENANT_NOT_FOUND_OR_INACTIVE",
            headers={"X-Error-Code": "TENANT_NOT_FOUND"}
        )

    return TenantResolveResponse(
        tenant_id=tenant.id,
        tenant_name=tenant.name
    )


@router.post("/register", response_model=UserRegisterResponse)
async def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db)
) -> UserRegisterResponse:
    """
    Register a new user or update existing user's ERP credentials.

    This endpoint is called when:
    1. User first launches the Outlook add-in
    2. User needs to re-authenticate (JWT expired)

    Flow:
    1. Resolve tenant from email domain (don't trust client!)
    2. Find or create user record
    3. Encrypt and store ERP credentials
    4. Generate JWT token with user_id, tenant_id, email
    5. Return JWT for subsequent API calls

    Args:
        request: User registration data including email and ERP credentials
        db: Database session

    Returns:
        JWT access token and user info

    Raises:
        404: If tenant not found for this email domain
        400: If validation fails
    """
    # Step 1: Resolve tenant from email (server-side validation)
    try:
        domain = get_domain_from_email(request.email)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    tenant_domain = db.query(TenantDomain).filter(
        TenantDomain.domain == domain
    ).first()

    if not tenant_domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tenant configured for this email domain"
        )

    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_domain.tenant_id,
        Tenant.is_active == True
    ).first()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or inactive"
        )

    # Step 2: Validate ERP credentials before saving
    try:
        # Debug logging
        print(f"DEBUG: Validating ERP credentials for user: {request.email}")
        print(f"DEBUG: ERP Username: {request.erp_username}")
        print(f"DEBUG: ERP Password: {'*' * len(request.erp_password_or_token)}")
        print(f"DEBUG: ERP Base URL: {tenant.erp_base_url}")
        print(f"DEBUG: ERP Company: {tenant.erp_company}")
        print(f"DEBUG: ERP Tabula INI: {tenant.erp_tabula_ini}")
        
        # Create temporary Priority client to validate credentials
        validation_client = PriorityClient(
            username=request.erp_username,
            password=request.erp_password_or_token,
            company=tenant.erp_company,
            base_url=tenant.erp_base_url,
            tabula_ini=tenant.erp_tabula_ini
        )
        
        # Validate credentials by making a simple API call
        print("DEBUG: Calling validate_credentials...")
        await validation_client.validate_credentials()
        print("DEBUG: Credentials validation successful!")
        await validation_client.close()
        
    except Exception as e:
        # Debug logging
        print(f"DEBUG: ERP credentials validation failed: {type(e).__name__}: {str(e)}")
        # Raise exception to stop registration if credentials are invalid
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid ERP credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Step 3: Find or create user
    user = db.query(User).filter(User.email == request.email).first()

    if user:
        # Update existing user's credentials
        user.erp_username = encrypt_value(request.erp_username)
        user.erp_password_or_token = encrypt_value(request.erp_password_or_token)
        user.is_active = True
    else:
        # Create new user
        user = User(
            tenant_id=tenant.id,
            email=request.email,
            erp_username=encrypt_value(request.erp_username),
            erp_password_or_token=encrypt_value(request.erp_password_or_token),
            role="user",
            is_active=True
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Step 3: Generate JWT token
    access_token, expires_at = JWTService.create_user_jwt(
        user_id=user.id,
        tenant_id=tenant.id,
        email=user.email
    )

    # Calculate expiration time in seconds
    expires_in = int((expires_at - user.created_at).total_seconds())

    return UserRegisterResponse(
        access_token=access_token,
        token_type="bearer",
        tenant_id=tenant.id,
        user_id=user.id,
        email=user.email,
        expires_in=expires_in
    )
