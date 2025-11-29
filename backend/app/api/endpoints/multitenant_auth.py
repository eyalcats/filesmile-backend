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
from app.models.database import Tenant, TenantDomain, User, UserTenant
from app.models.schemas import (
    TenantResolveRequest,
    TenantResolveResponse,
    TenantInfo,
    UserRegisterRequest,
    UserRegisterResponse,
    SwitchTenantRequest
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
    Resolve tenant(s) from user's email domain.

    The Outlook add-in calls this endpoint on startup with the user's email.
    Backend extracts the domain and finds the corresponding tenant(s).

    Flow:
    1. Extract domain from email (e.g., user@acme.com -> acme.com)
    2. Look up all tenants by domain in tenant_domains table
    3. If single tenant: return tenant_id and name
    4. If multiple tenants: return list for user selection

    Args:
        request: Contains user email
        db: Database session

    Returns:
        Single tenant info OR list of tenants for selection

    Raises:
        404: If no tenant found for this domain
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

    # Look up ALL tenants for this domain (supports multi-tenant domains)
    print(f"DEBUG: Querying TenantDomain table for domain: '{domain}'")
    tenant_domains = db.query(TenantDomain).filter(
        TenantDomain.domain == domain
    ).all()

    print(f"DEBUG: Found {len(tenant_domains)} tenant_domain entries")
    
    if not tenant_domains:
        # Let's also check what domains are available in the database
        all_domains = db.query(TenantDomain).all()
        print(f"DEBUG: Available domains in database: {[td.domain for td in all_domains]}")
        print("DEBUG: Raising TENANT_NOT_FOUND exception")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TENANT_NOT_FOUND",
            headers={"X-Error-Code": "TENANT_NOT_FOUND"}
        )

    # Get all active tenants for these domain entries
    tenant_ids = [td.tenant_id for td in tenant_domains]
    tenants = db.query(Tenant).filter(
        Tenant.id.in_(tenant_ids),
        Tenant.is_active == True
    ).all()

    print(f"DEBUG: Found {len(tenants)} active tenants")
    
    if not tenants:
        print("DEBUG: Raising TENANT_NOT_FOUND_OR_INACTIVE exception")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TENANT_NOT_FOUND_OR_INACTIVE",
            headers={"X-Error-Code": "TENANT_NOT_FOUND"}
        )

    # Single tenant - return directly
    if len(tenants) == 1:
        tenant = tenants[0]
        print(f"DEBUG: Single tenant found: {tenant.name}")
        return TenantResolveResponse(
            tenant_id=tenant.id,
            tenant_name=tenant.name,
            requires_selection=False
        )
    
    # Multiple tenants - return list for selection
    print(f"DEBUG: Multiple tenants found, requiring selection")
    tenant_list = [
        TenantInfo(tenant_id=t.id, tenant_name=t.name)
        for t in tenants
    ]
    return TenantResolveResponse(
        tenants=tenant_list,
        requires_selection=True
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

    # Debug: Log incoming request
    print(f"DEBUG: Register request received - email: {request.email}, tenant_id: {request.tenant_id}")
    
    # Check if tenant_id was provided (for multi-tenant domains)
    if request.tenant_id:
        # Verify the tenant_id is valid for this domain
        tenant_domain = db.query(TenantDomain).filter(
            TenantDomain.domain == domain,
            TenantDomain.tenant_id == request.tenant_id
        ).first()
        
        if not tenant_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected tenant is not valid for this email domain"
            )
        
        tenant = db.query(Tenant).filter(
            Tenant.id == request.tenant_id,
            Tenant.is_active == True
        ).first()
    else:
        # No tenant_id provided - check if domain has single or multiple tenants
        tenant_domains = db.query(TenantDomain).filter(
            TenantDomain.domain == domain
        ).all()

        if not tenant_domains:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tenant configured for this email domain"
            )
        
        if len(tenant_domains) > 1:
            # Multiple tenants - user must select one
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TENANT_SELECTION_REQUIRED",
                headers={"X-Error-Code": "TENANT_SELECTION_REQUIRED"}
            )
        
        # Single tenant
        tenant = db.query(Tenant).filter(
            Tenant.id == tenant_domains[0].tenant_id,
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

    # Step 3: Find or create user and user-tenant association
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Create new user
        user = User(
            email=request.email,
            role="user",
            is_active=True
        )
        db.add(user)
        db.flush()  # Get user ID
    
    # Find or create user-tenant association
    user_tenant = db.query(UserTenant).filter(
        UserTenant.user_id == user.id,
        UserTenant.tenant_id == tenant.id
    ).first()
    
    if user_tenant:
        # Update existing association's credentials
        user_tenant.erp_username = encrypt_value(request.erp_username)
        user_tenant.erp_password_or_token = encrypt_value(request.erp_password_or_token)
        user_tenant.is_active = True
    else:
        # Create new user-tenant association
        user_tenant = UserTenant(
            user_id=user.id,
            tenant_id=tenant.id,
            erp_username=encrypt_value(request.erp_username),
            erp_password_or_token=encrypt_value(request.erp_password_or_token),
            is_active=True
        )
        db.add(user_tenant)

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


@router.post("/switch-tenant", response_model=UserRegisterResponse)
async def switch_tenant(
    request: SwitchTenantRequest,
    db: Session = Depends(get_db)
) -> UserRegisterResponse:
    """
    Switch to a different tenant using stored credentials.
    
    This endpoint allows users who have previously registered with multiple tenants
    to switch between them without re-entering credentials.
    
    Flow:
    1. Find user by email
    2. Find user-tenant association for the target tenant
    3. Decrypt stored credentials
    4. Validate credentials against ERP
    5. Generate new JWT token for the target tenant
    
    Args:
        request: Switch tenant request with email and target tenant_id
        db: Database session
    
    Returns:
        JWT access token and user info for the new tenant
    
    Raises:
        404: If user or tenant not found
        401: If no stored credentials or credentials invalid
    """
    print(f"DEBUG: Switch tenant request - email: {request.email}, tenant_id: {request.tenant_id}")
    
    # Step 1: Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Step 2: Find tenant
    tenant = db.query(Tenant).filter(
        Tenant.id == request.tenant_id,
        Tenant.is_active == True
    ).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or inactive"
        )
    
    # Step 3: Find user-tenant association with stored credentials
    user_tenant = db.query(UserTenant).filter(
        UserTenant.user_id == user.id,
        UserTenant.tenant_id == tenant.id,
        UserTenant.is_active == True
    ).first()
    
    if not user_tenant or not user_tenant.erp_username or not user_tenant.erp_password_or_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="NO_STORED_CREDENTIALS",
            headers={"X-Error-Code": "NO_STORED_CREDENTIALS"}
        )
    
    # Step 4: Decrypt credentials
    try:
        erp_username = decrypt_value(user_tenant.erp_username)
        erp_password = decrypt_value(user_tenant.erp_password_or_token)
    except Exception as e:
        print(f"DEBUG: Failed to decrypt credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="NO_STORED_CREDENTIALS",
            headers={"X-Error-Code": "NO_STORED_CREDENTIALS"}
        )
    
    # Step 5: Validate credentials against ERP
    try:
        print(f"DEBUG: Validating stored credentials for tenant switch")
        validation_client = PriorityClient(
            username=erp_username,
            password=erp_password,
            company=tenant.erp_company,
            base_url=tenant.erp_base_url,
            tabula_ini=tenant.erp_tabula_ini
        )
        
        await validation_client.validate_credentials()
        await validation_client.close()
        print("DEBUG: Stored credentials validated successfully!")
        
    except Exception as e:
        print(f"DEBUG: Stored credentials validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="STORED_CREDENTIALS_INVALID",
            headers={"X-Error-Code": "STORED_CREDENTIALS_INVALID"}
        )
    
    # Step 6: Generate new JWT token for this tenant
    access_token, expires_at = JWTService.create_user_jwt(
        user_id=user.id,
        tenant_id=tenant.id,
        email=user.email
    )
    
    expires_in = int((expires_at - user.created_at).total_seconds())
    
    return UserRegisterResponse(
        access_token=access_token,
        token_type="bearer",
        tenant_id=tenant.id,
        user_id=user.id,
        email=user.email,
        expires_in=expires_in
    )
