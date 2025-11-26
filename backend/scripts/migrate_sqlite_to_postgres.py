"""
Script to migrate data from SQLite to PostgreSQL for Render deployment.

Usage:
1. Set DATABASE_URL to your SQLite database in .env
2. Set POSTGRES_DATABASE_URL to your PostgreSQL connection string
3. Run: python migrate_sqlite_to_postgres.py
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.database import Tenant, TenantDomain, User
from app.db.session import Base

# SQLite connection (current data)
SQLITE_URL = settings.database_url
sqlite_engine = create_engine(SQLITE_URL)
SQLiteSession = sessionmaker(bind=sqlite_engine)

# PostgreSQL connection (target)
POSTGRES_URL = os.getenv("POSTGRES_DATABASE_URL")
if not POSTGRES_URL:
    print("ERROR: Set POSTGRES_DATABASE_URL environment variable")
    sys.exit(1)

postgres_engine = create_engine(POSTGRES_URL)
PostgresSession = sessionmaker(bind=postgres_engine)


def migrate_data():
    """Migrate all data from SQLite to PostgreSQL."""
    print("Starting migration from SQLite to PostgreSQL...")
    
    # Create tables in PostgreSQL
    print("Creating tables in PostgreSQL...")
    Base.metadata.create_all(bind=postgres_engine)
    
    sqlite_db = SQLiteSession()
    postgres_db = PostgresSession()
    
    try:
        # Migrate Tenants
        print("Migrating tenants...")
        tenants = sqlite_db.query(Tenant).all()
        for tenant in tenants:
            new_tenant = Tenant(
                name=tenant.name,
                erp_base_url=tenant.erp_base_url,
                erp_auth_type=tenant.erp_auth_type,
                erp_admin_username=tenant.erp_admin_username,
                erp_admin_password_or_token=tenant.erp_admin_password_or_token,
                erp_company=tenant.erp_company,
                erp_tabula_ini=tenant.erp_tabula_ini,
                is_active=tenant.is_active,
                created_at=tenant.created_at,
                updated_at=tenant.updated_at
            )
            postgres_db.add(new_tenant)
        
        postgres_db.commit()
        print(f"Migrated {len(tenants)} tenants")
        
        # Get tenant mapping for foreign keys
        sqlite_tenants = {t.name: t.id for t in sqlite_db.query(Tenant).all()}
        postgres_tenants = {t.name: t.id for t in postgres_db.query(Tenant).all()}
        
        # Migrate TenantDomains
        print("Migrating tenant domains...")
        domains = sqlite_db.query(TenantDomain).all()
        for domain in domains:
            # Get the tenant name from SQLite to find the new tenant ID
            old_tenant = sqlite_db.query(Tenant).filter_by(id=domain.tenant_id).first()
            if old_tenant:
                new_tenant_id = postgres_tenants[old_tenant.name]
                new_domain = TenantDomain(
                    tenant_id=new_tenant_id,
                    domain=domain.domain,
                    created_at=domain.created_at
                )
                postgres_db.add(new_domain)
        
        postgres_db.commit()
        print(f"Migrated {len(domains)} domains")
        
        # Migrate Users
        print("Migrating users...")
        users = sqlite_db.query(User).all()
        for user in users:
            # Get the tenant name from SQLite to find the new tenant ID
            old_tenant = sqlite_db.query(Tenant).filter_by(id=user.tenant_id).first()
            if old_tenant:
                new_tenant_id = postgres_tenants[old_tenant.name]
                new_user = User(
                    tenant_id=new_tenant_id,
                    email=user.email,
                    display_name=user.display_name,
                    role=user.role,
                    erp_username=user.erp_username,
                    erp_password_or_token=user.erp_password_or_token,
                    is_active=user.is_active,
                    created_at=user.created_at,
                    updated_at=user.updated_at
                )
                postgres_db.add(new_user)
        
        postgres_db.commit()
        print(f"Migrated {len(users)} users")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        postgres_db.rollback()
        raise
    finally:
        sqlite_db.close()
        postgres_db.close()


if __name__ == "__main__":
    migrate_data()
