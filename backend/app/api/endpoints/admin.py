"""
Admin API endpoints for managing tenants, domains, and users.

Provides CRUD operations for the admin frontend panel.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.session import get_db
from app.models.database import Tenant, TenantDomain, User, UserTenant
from app.models.admin_schemas import (
    # Tenant schemas
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    TenantListResponse,
    # Domain schemas
    DomainCreate,
    DomainUpdate,
    DomainResponse,
    DomainListResponse,
    # User schemas
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    # UserTenant schemas
    UserTenantResponse,
    AddUserTenantRequest,
    UpdateUserTenantRequest,
    # Auth schemas
    AdminLoginRequest,
    AdminLoginResponse,
    # Credential validation schemas
    ValidateCredentialsRequest,
    ValidateCredentialsResponse,
)
try:
    from app.utils.encryption import encrypt_value, decrypt_value
except ImportError:
    # Fallback if encryption module not available
    def encrypt_value(value):
        return value
    def decrypt_value(value):
        return value


def tenant_to_response(tenant: Tenant) -> TenantResponse:
    """Convert tenant model to response with decrypted username."""
    decrypted_username = None
    if tenant.erp_admin_username:
        try:
            decrypted_username = decrypt_value(tenant.erp_admin_username)
        except Exception:
            decrypted_username = tenant.erp_admin_username
    
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        erp_base_url=tenant.erp_base_url,
        erp_company=tenant.erp_company,
        erp_auth_type=tenant.erp_auth_type,
        erp_admin_username=decrypted_username,
        erp_tabula_ini=tenant.erp_tabula_ini,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at
    )


def user_tenant_to_response(ut: UserTenant, tenant_name: str = None) -> UserTenantResponse:
    """Convert UserTenant model to response with decrypted ERP username."""
    decrypted_username = None
    if ut.erp_username:
        try:
            decrypted_username = decrypt_value(ut.erp_username)
            # If decryption returns None, use the raw value (might be unencrypted)
            if decrypted_username is None:
                decrypted_username = ut.erp_username
        except Exception as e:
            print(f"DEBUG: Failed to decrypt erp_username for user_tenant {ut.id}: {e}")
            decrypted_username = ut.erp_username
    
    return UserTenantResponse(
        id=ut.id,
        tenant_id=ut.tenant_id,
        tenant_name=tenant_name or (ut.tenant.name if ut.tenant else None),
        erp_username=decrypted_username,
        is_active=ut.is_active,
        created_at=ut.created_at,
        updated_at=ut.updated_at
    )


def user_to_response(user: User) -> UserResponse:
    """Convert user model to response with tenant associations."""
    # Build list of tenant associations
    tenants = []
    for ut in user.tenant_associations:
        tenants.append(user_tenant_to_response(ut))
    
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        tenants=tenants
    )

from app.core.config import settings
from app.core.auth import AdminJWTService, verify_admin_password, get_current_admin
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================================================
# Admin Authentication
# ============================================================================

def verify_admin_credentials(username: str, password: str) -> bool:
    """
    Verify admin credentials using bcrypt password hash.

    Args:
        username: Admin username
        password: Plain text password

    Returns:
        True if credentials valid, False otherwise
    """
    # Verify username matches configured admin username
    if username != settings.admin_username:
        return False

    # Verify password against bcrypt hash
    return verify_admin_password(password)


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """
    Admin login endpoint with bcrypt password validation.

    Returns a JWT token for authenticated admin access.
    """
    if not verify_admin_credentials(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token, expires_at = AdminJWTService.create_admin_jwt(request.username)
    expires_in = int((expires_at - datetime.utcnow()).total_seconds())

    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        username=request.username,
        expires_in=expires_in
    )


# ============================================================================
# Tenants CRUD
# ============================================================================

@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, description="Filter by status (active/inactive)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """List all tenants with optional filtering."""
    query = db.query(Tenant)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Tenant.name.ilike(search_term),
                Tenant.erp_base_url.ilike(search_term),
                Tenant.erp_company.ilike(search_term)
            )
        )
    
    # Apply status filter
    if status:
        is_active = status.lower() == 'active'
        query = query.filter(Tenant.is_active == is_active)
    
    total = query.count()
    tenants = query.offset(skip).limit(limit).all()
    
    return TenantListResponse(
        items=[tenant_to_response(t) for t in tenants],
        total=total
    )


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Get a single tenant by ID."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant_to_response(tenant)


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(tenant_data: TenantCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Create a new tenant."""
    try:
        # Check if tenant name already exists
        existing = db.query(Tenant).filter(Tenant.name == tenant_data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this name already exists"
            )
        
        # Encrypt sensitive fields if provided
        encrypted_username = None
        encrypted_password = None
        if tenant_data.erp_admin_username:
            try:
                encrypted_username = encrypt_value(tenant_data.erp_admin_username)
            except Exception:
                encrypted_username = tenant_data.erp_admin_username
        if tenant_data.erp_admin_password_or_token:
            try:
                encrypted_password = encrypt_value(tenant_data.erp_admin_password_or_token)
            except Exception:
                encrypted_password = tenant_data.erp_admin_password_or_token
        
        tenant = Tenant(
            name=tenant_data.name,
            erp_base_url=tenant_data.erp_base_url,
            erp_auth_type=tenant_data.erp_auth_type or "basic",
            erp_admin_username=encrypted_username,
            erp_admin_password_or_token=encrypted_password,
            erp_company=tenant_data.erp_company,
            erp_tabula_ini=tenant_data.erp_tabula_ini or "tabula.ini",
            is_active=tenant_data.is_active if tenant_data.is_active is not None else True
        )
        
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        
        return tenant_to_response(tenant)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tenant: {str(e)}"
        )


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: int,
    tenant_data: TenantUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update an existing tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Update fields if provided
    if tenant_data.name is not None:
        tenant.name = tenant_data.name
    if tenant_data.erp_base_url is not None:
        tenant.erp_base_url = tenant_data.erp_base_url
    if tenant_data.erp_auth_type is not None:
        tenant.erp_auth_type = tenant_data.erp_auth_type
    if tenant_data.erp_admin_username is not None:
        tenant.erp_admin_username = encrypt_value(tenant_data.erp_admin_username)
    if tenant_data.erp_admin_password_or_token is not None:
        tenant.erp_admin_password_or_token = encrypt_value(tenant_data.erp_admin_password_or_token)
    if tenant_data.erp_company is not None:
        tenant.erp_company = tenant_data.erp_company
    if tenant_data.erp_tabula_ini is not None:
        tenant.erp_tabula_ini = tenant_data.erp_tabula_ini
    if tenant_data.is_active is not None:
        tenant.is_active = tenant_data.is_active
    
    tenant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tenant)
    
    return tenant_to_response(tenant)


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(tenant_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Delete a tenant and all associated domains and users."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    db.delete(tenant)
    db.commit()
    return None


# ============================================================================
# Domains CRUD
# ============================================================================

@router.get("/domains", response_model=DomainListResponse)
async def list_domains(
    search: Optional[str] = Query(None, description="Search term"),
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """List all domains with optional filtering."""
    query = db.query(TenantDomain)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(TenantDomain.domain.ilike(search_term))
    
    # Apply tenant filter
    if tenant_id:
        query = query.filter(TenantDomain.tenant_id == tenant_id)
    
    total = query.count()
    domains = query.offset(skip).limit(limit).all()
    
    return DomainListResponse(
        items=[DomainResponse.model_validate(d) for d in domains],
        total=total
    )


@router.get("/domains/{domain_id}", response_model=DomainResponse)
async def get_domain(domain_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Get a single domain by ID."""
    domain = db.query(TenantDomain).filter(TenantDomain.id == domain_id).first()
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain not found"
        )
    return DomainResponse.model_validate(domain)


@router.post("/domains", response_model=DomainResponse, status_code=status.HTTP_201_CREATED)
async def create_domain(domain_data: DomainCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Create a new domain-tenant mapping.
    
    Note: A domain can be connected to multiple tenants.
    The unique constraint is on (tenant_id, domain) pair.
    """
    # Check if this exact tenant-domain pair already exists
    existing = db.query(TenantDomain).filter(
        TenantDomain.domain == domain_data.domain.lower(),
        TenantDomain.tenant_id == domain_data.tenant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This domain is already connected to this tenant"
        )
    
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == domain_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant not found"
        )
    
    domain = TenantDomain(
        tenant_id=domain_data.tenant_id,
        domain=domain_data.domain.lower()
    )
    
    db.add(domain)
    db.commit()
    db.refresh(domain)
    
    return DomainResponse.model_validate(domain)


@router.put("/domains/{domain_id}", response_model=DomainResponse)
async def update_domain(
    domain_id: int,
    domain_data: DomainUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update an existing domain-tenant mapping."""
    domain = db.query(TenantDomain).filter(TenantDomain.id == domain_id).first()
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain not found"
        )
    
    new_domain_name = domain_data.domain.lower() if domain_data.domain else domain.domain
    new_tenant_id = domain_data.tenant_id if domain_data.tenant_id is not None else domain.tenant_id
    
    # Check if the new combination would conflict with existing entry
    if new_domain_name != domain.domain or new_tenant_id != domain.tenant_id:
        existing = db.query(TenantDomain).filter(
            TenantDomain.domain == new_domain_name,
            TenantDomain.tenant_id == new_tenant_id,
            TenantDomain.id != domain_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This domain-tenant combination already exists"
            )
    
    # Update domain name if provided
    if domain_data.domain:
        domain.domain = domain_data.domain.lower()
    
    # Update tenant if provided
    if domain_data.tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == domain_data.tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant not found"
            )
        domain.tenant_id = domain_data.tenant_id
    
    db.commit()
    db.refresh(domain)
    
    return DomainResponse.model_validate(domain)


@router.delete("/domains/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_domain(domain_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Delete a domain."""
    domain = db.query(TenantDomain).filter(TenantDomain.id == domain_id).first()
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Domain not found"
        )
    
    db.delete(domain)
    db.commit()
    return None


# ============================================================================
# Users CRUD
# ============================================================================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    search: Optional[str] = Query(None, description="Search term"),
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status (active/inactive)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """List all users with optional filtering."""
    query = db.query(User)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.display_name.ilike(search_term)
            )
        )
    
    # Apply tenant filter
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
    
    # Apply status filter
    if status:
        is_active = status.lower() == 'active'
        query = query.filter(User.is_active == is_active)
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    return UserListResponse(
        items=[user_to_response(u) for u in users],
        total=total
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Get a single user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user_to_response(user)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Create a new user with optional initial tenant association."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == user_data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create the user
    user = User(
        email=user_data.email.lower(),
        display_name=user_data.display_name,
        role=user_data.role or "user",
        is_active=user_data.is_active if user_data.is_active is not None else True
    )
    
    db.add(user)
    db.flush()  # Get the user ID
    
    # If tenant_id is provided, create initial tenant association
    if user_data.tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == user_data.tenant_id).first()
        if not tenant:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant not found"
            )
        
        user_tenant = UserTenant(
            user_id=user.id,
            tenant_id=user_data.tenant_id,
            erp_username=encrypt_value(user_data.erp_username) if user_data.erp_username else None,
            erp_password_or_token=encrypt_value(user_data.erp_password_or_token) if user_data.erp_password_or_token else None,
            is_active=True
        )
        db.add(user_tenant)
    
    db.commit()
    db.refresh(user)
    
    return user_to_response(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update an existing user (basic info only, use tenant endpoints for tenant associations)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if new email conflicts
    if user_data.email and user_data.email.lower() != user.email:
        existing = db.query(User).filter(User.email == user_data.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        user.email = user_data.email.lower()
    
    # Update basic user fields
    if user_data.display_name is not None:
        user.display_name = user_data.display_name
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    return user_to_response(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """Delete a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    return None


# ============================================================================
# User-Tenant Associations CRUD
# ============================================================================

@router.get("/users/{user_id}/tenants", response_model=List[UserTenantResponse])
async def list_user_tenants(user_id: int, db: Session = Depends(get_db), admin: str = Depends(get_current_admin)):
    """List all tenant associations for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return [user_tenant_to_response(ut) for ut in user.tenant_associations]


@router.post("/users/{user_id}/tenants", response_model=UserTenantResponse, status_code=status.HTTP_201_CREATED)
async def add_user_tenant(
    user_id: int,
    request: AddUserTenantRequest,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Add a tenant association to a user."""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == request.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant not found"
        )
    
    # Check if association already exists
    existing = db.query(UserTenant).filter(
        UserTenant.user_id == user_id,
        UserTenant.tenant_id == request.tenant_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already associated with this tenant"
        )
    
    user_tenant = UserTenant(
        user_id=user_id,
        tenant_id=request.tenant_id,
        erp_username=encrypt_value(request.erp_username) if request.erp_username else None,
        erp_password_or_token=encrypt_value(request.erp_password_or_token) if request.erp_password_or_token else None,
        is_active=request.is_active if request.is_active is not None else True
    )
    
    db.add(user_tenant)
    db.commit()
    db.refresh(user_tenant)
    
    return user_tenant_to_response(user_tenant, tenant.name)


@router.put("/users/{user_id}/tenants/{tenant_id}", response_model=UserTenantResponse)
async def update_user_tenant(
    user_id: int,
    tenant_id: int,
    request: UpdateUserTenantRequest,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Update a user's tenant association (ERP credentials, active status)."""
    user_tenant = db.query(UserTenant).filter(
        UserTenant.user_id == user_id,
        UserTenant.tenant_id == tenant_id
    ).first()
    
    if not user_tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-tenant association not found"
        )
    
    # Update fields if provided
    if request.erp_username is not None:
        user_tenant.erp_username = encrypt_value(request.erp_username)
    if request.erp_password_or_token is not None:
        user_tenant.erp_password_or_token = encrypt_value(request.erp_password_or_token)
    if request.is_active is not None:
        user_tenant.is_active = request.is_active
    
    user_tenant.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user_tenant)
    
    return user_tenant_to_response(user_tenant)


@router.delete("/users/{user_id}/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_tenant(
    user_id: int,
    tenant_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin)
):
    """Remove a tenant association from a user."""
    user_tenant = db.query(UserTenant).filter(
        UserTenant.user_id == user_id,
        UserTenant.tenant_id == tenant_id
    ).first()
    
    if not user_tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-tenant association not found"
        )
    
    db.delete(user_tenant)
    db.commit()
    return None


# ============================================================================
# Credential Validation
# ============================================================================

@router.post("/validate-credentials", response_model=ValidateCredentialsResponse)
async def validate_erp_credentials(request: ValidateCredentialsRequest, admin: str = Depends(get_current_admin)):
    """
    Validate ERP admin credentials by testing connection to Priority ERP.
    
    This endpoint creates a temporary PriorityClient and attempts to authenticate
    with the provided credentials.
    """
    from app.services.priority_client import PriorityClient
    
    try:
        # Create a temporary client with the provided credentials
        client = PriorityClient(
            username=request.erp_admin_username,
            password=request.erp_admin_password_or_token,
            company=request.erp_company,
            base_url=request.erp_base_url,
            tabula_ini=request.erp_tabula_ini or "tabula.ini"
        )
        
        # Validate credentials
        await client.validate_credentials()
        
        return ValidateCredentialsResponse(
            valid=True,
            message="Credentials validated successfully. Connection to Priority ERP established."
        )
        
    except Exception as e:
        error_message = str(e)
        
        # Provide more user-friendly error messages
        if "401" in error_message or "authentication" in error_message.lower():
            error_message = "Invalid credentials: authentication failed"
        elif "connection" in error_message.lower() or "connect" in error_message.lower():
            error_message = f"Connection failed: unable to reach the ERP server at {request.erp_base_url}"
        elif "timeout" in error_message.lower():
            error_message = "Connection timed out: the ERP server did not respond in time"
        
        return ValidateCredentialsResponse(
            valid=False,
            message=error_message
        )
