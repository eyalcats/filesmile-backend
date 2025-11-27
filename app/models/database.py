"""
SQLAlchemy database models for multi-tenant architecture.

Models:
- Tenant: Represents a tenant organization with ERP admin credentials
- TenantDomain: Maps email domains to tenants (one domain can map to multiple tenants)
- UserTenant: Junction table for many-to-many user-tenant relationship
- User: Represents end users (can belong to multiple tenants)
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base


class Tenant(Base):
    """
    Tenant model - represents an organization/company using the system.

    Each tenant has:
    - Multiple domains (e.g., company.com, company.co.il)
    - ERP admin credentials for system-level operations
    - Multiple users (employees with their own ERP credentials)
    """
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)

    # ERP Configuration - stored per tenant
    erp_base_url = Column(String(512), nullable=False)  # Priority OData base URL
    erp_auth_type = Column(String(50), default="basic")  # basic, oauth2, token
    erp_admin_username = Column(String(255), nullable=True)  # Encrypted
    erp_admin_password_or_token = Column(Text, nullable=True)  # Encrypted
    erp_company = Column(String(255), nullable=False)  # Priority company code
    erp_tabula_ini = Column(String(255), default="tabula.ini")  # Priority tabula.ini

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    domains = relationship("TenantDomain", back_populates="tenant", cascade="all, delete-orphan")
    user_associations = relationship("UserTenant", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', active={self.is_active})>"


class TenantDomain(Base):
    """
    Tenant Domain model - maps email domains to tenants.

    Supports many-to-many relationship:
    - One tenant can have multiple domains
    - One domain can be connected to multiple tenants
    
    When a domain is connected to multiple tenants, users will be prompted
    to select their tenant during registration.

    Used for tenant resolution: user@acme.com -> [Tenant IDs]
    """
    __tablename__ = "tenant_domains"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), nullable=False, index=True)  # e.g., "example.com"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="domains")

    # Constraints - unique combination of tenant_id and domain (not just domain)
    __table_args__ = (
        UniqueConstraint('tenant_id', 'domain', name='uq_tenant_domain_pair'),
    )

    def __repr__(self):
        return f"<TenantDomain(id={self.id}, domain='{self.domain}', tenant_id={self.tenant_id})>"


class UserTenant(Base):
    """
    UserTenant model - junction table for many-to-many user-tenant relationship.

    Each entry represents a user's access to a specific tenant with:
    - Unique ERP credentials per tenant (e.g., different creds for test vs prod)
    - Independent active status per tenant
    
    This allows:
    - One user to access multiple tenants (test server, prod server)
    - Different ERP credentials per tenant
    - Independent activation per tenant
    """
    __tablename__ = "user_tenants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # ERP User Credentials specific to this user-tenant combination (encrypted)
    erp_username = Column(String(255), nullable=True)  # Encrypted
    erp_password_or_token = Column(Text, nullable=True)  # Encrypted

    # Status for this specific user-tenant association
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="tenant_associations")
    tenant = relationship("Tenant", back_populates="user_associations")

    # Constraints - unique combination of user_id and tenant_id
    __table_args__ = (
        UniqueConstraint('user_id', 'tenant_id', name='uq_user_tenant_pair'),
    )

    def __repr__(self):
        return f"<UserTenant(id={self.id}, user_id={self.user_id}, tenant_id={self.tenant_id}, active={self.is_active})>"


class User(Base):
    """
    User model - represents end users of the system.

    Each user:
    - Can belong to multiple tenants (via UserTenant junction table)
    - Has unique email within the system
    - Has separate ERP credentials per tenant
    - Authenticates with JWT tokens
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # User Information
    email = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # user, admin, etc.

    # Global user status (can be overridden per-tenant in UserTenant)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships - many-to-many with tenants via UserTenant
    tenant_associations = relationship("UserTenant", back_populates="user", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint('email', name='uq_users_email'),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', active={self.is_active})>"
