"""
SQLAlchemy database models for multi-tenant architecture.

Models:
- Tenant: Represents a tenant organization with ERP admin credentials
- TenantDomain: Maps email domains to tenants (one tenant can have multiple domains)
- User: Represents end users with their ERP credentials (linked to a tenant)
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
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', active={self.is_active})>"


class TenantDomain(Base):
    """
    Tenant Domain model - maps email domains to tenants.

    One tenant can have multiple domains:
    - Example: Tenant "Acme Corp" owns: acme.com, acme.co.il, subsidiary.com

    Used for tenant resolution: user@acme.com -> Tenant ID
    """
    __tablename__ = "tenant_domains"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), nullable=False, unique=True, index=True)  # e.g., "example.com"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="domains")

    # Constraints
    __table_args__ = (
        UniqueConstraint('domain', name='uq_tenant_domains_domain'),
    )

    def __repr__(self):
        return f"<TenantDomain(id={self.id}, domain='{self.domain}', tenant_id={self.tenant_id})>"


class User(Base):
    """
    User model - represents end users of the system.

    Each user:
    - Belongs to exactly one tenant
    - Has unique email within the system
    - Has their own ERP credentials (encrypted)
    - Authenticates with JWT tokens
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # User Information
    email = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # user, admin, etc.

    # ERP User Credentials (encrypted)
    erp_username = Column(String(255), nullable=True)  # Encrypted
    erp_password_or_token = Column(Text, nullable=True)  # Encrypted

    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")

    # Constraints
    __table_args__ = (
        UniqueConstraint('email', name='uq_users_email'),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', tenant_id={self.tenant_id}, active={self.is_active})>"
