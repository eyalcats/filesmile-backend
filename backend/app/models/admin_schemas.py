"""
Pydantic schemas for Admin API endpoints.

Provides request/response models for tenant, domain, and user management.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# Admin Authentication Schemas
# ============================================================================

class AdminLoginRequest(BaseModel):
    """Request model for admin login."""
    username: str = Field(..., description="Admin username")
    password: str = Field(..., description="Admin password")


class AdminLoginResponse(BaseModel):
    """Response model for admin login."""
    access_token: str = Field(..., description="Session token")
    token_type: str = Field(default="bearer", description="Token type")
    username: str = Field(..., description="Admin username")
    expires_in: int = Field(..., description="Token expiration in seconds")


# ============================================================================
# Tenant Schemas
# ============================================================================

class TenantBase(BaseModel):
    """Base tenant schema with common fields."""
    name: str = Field(..., description="Tenant name")
    erp_base_url: str = Field(..., description="ERP base URL")
    erp_company: str = Field(..., description="ERP company code")
    erp_auth_type: Optional[str] = Field(default="basic", description="Auth type (basic, oauth2, token)")
    erp_tabula_ini: Optional[str] = Field(default="tabula.ini", description="Tabula INI file")


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    erp_admin_username: Optional[str] = Field(None, description="ERP admin username")
    erp_admin_password_or_token: Optional[str] = Field(None, description="ERP admin password/token")
    is_active: Optional[bool] = Field(default=True, description="Active status")


class TenantUpdate(BaseModel):
    """Schema for updating a tenant (all fields optional)."""
    name: Optional[str] = Field(None, description="Tenant name")
    erp_base_url: Optional[str] = Field(None, description="ERP base URL")
    erp_company: Optional[str] = Field(None, description="ERP company code")
    erp_auth_type: Optional[str] = Field(None, description="Auth type")
    erp_admin_username: Optional[str] = Field(None, description="ERP admin username")
    erp_admin_password_or_token: Optional[str] = Field(None, description="ERP admin password/token")
    erp_tabula_ini: Optional[str] = Field(None, description="Tabula INI file")
    is_active: Optional[bool] = Field(None, description="Active status")


class TenantResponse(BaseModel):
    """Response schema for tenant data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Tenant ID")
    name: str = Field(..., description="Tenant name")
    erp_base_url: str = Field(..., description="ERP base URL")
    erp_company: str = Field(..., description="ERP company code")
    erp_auth_type: Optional[str] = Field(None, description="Auth type")
    erp_admin_username: Optional[str] = Field(None, description="ERP admin username (decrypted)")
    erp_tabula_ini: Optional[str] = Field(None, description="Tabula INI file")
    is_active: bool = Field(..., description="Active status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Note: erp_admin_password_or_token is excluded for security


class TenantListResponse(BaseModel):
    """Response schema for tenant list."""
    items: List[TenantResponse] = Field(..., description="List of tenants")
    total: int = Field(..., description="Total count")


# ============================================================================
# Domain Schemas
# ============================================================================

class DomainBase(BaseModel):
    """Base domain schema."""
    domain: str = Field(..., description="Email domain (e.g., example.com)")
    tenant_id: int = Field(..., description="Associated tenant ID")


class DomainCreate(DomainBase):
    """Schema for creating a new domain."""
    pass


class DomainUpdate(BaseModel):
    """Schema for updating a domain (all fields optional)."""
    domain: Optional[str] = Field(None, description="Email domain")
    tenant_id: Optional[int] = Field(None, description="Associated tenant ID")


class DomainResponse(BaseModel):
    """Response schema for domain data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Domain ID")
    domain: str = Field(..., description="Email domain")
    tenant_id: int = Field(..., description="Associated tenant ID")
    created_at: datetime = Field(..., description="Creation timestamp")


class DomainListResponse(BaseModel):
    """Response schema for domain list."""
    items: List[DomainResponse] = Field(..., description="List of domains")
    total: int = Field(..., description="Total count")


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    """Base user schema."""
    email: str = Field(..., description="User email")
    tenant_id: int = Field(..., description="Associated tenant ID")
    display_name: Optional[str] = Field(None, description="Display name")
    role: Optional[str] = Field(default="user", description="User role (user, admin)")


class UserCreate(UserBase):
    """Schema for creating a new user."""
    erp_username: Optional[str] = Field(None, description="ERP username")
    erp_password_or_token: Optional[str] = Field(None, description="ERP password/token")
    is_active: Optional[bool] = Field(default=True, description="Active status")


class UserUpdate(BaseModel):
    """Schema for updating a user (all fields optional)."""
    email: Optional[str] = Field(None, description="User email")
    tenant_id: Optional[int] = Field(None, description="Associated tenant ID")
    display_name: Optional[str] = Field(None, description="Display name")
    role: Optional[str] = Field(None, description="User role")
    erp_username: Optional[str] = Field(None, description="ERP username")
    erp_password_or_token: Optional[str] = Field(None, description="ERP password/token")
    is_active: Optional[bool] = Field(None, description="Active status")


class UserResponse(BaseModel):
    """Response schema for user data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    tenant_id: int = Field(..., description="Associated tenant ID")
    display_name: Optional[str] = Field(None, description="Display name")
    role: str = Field(..., description="User role")
    is_active: bool = Field(..., description="Active status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    # Note: Sensitive fields (erp_username, erp_password_or_token) are excluded


class UserListResponse(BaseModel):
    """Response schema for user list."""
    items: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total count")
