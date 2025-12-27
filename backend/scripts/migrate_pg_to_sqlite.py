"""
Migration script: PostgreSQL to SQLite

This script migrates all data from your Render PostgreSQL database to a local SQLite file.

Usage:
    python scripts/migrate_pg_to_sqlite.py

Requirements:
    - Set POSTGRES_URL environment variable with your Render PostgreSQL connection string
    - Or pass it as an argument: python scripts/migrate_pg_to_sqlite.py "postgresql://..."
"""

import os
import sys
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# SQLite output path
SQLITE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "filesmile.db")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"


def get_postgres_url():
    """Get PostgreSQL URL from environment or command line argument."""
    if len(sys.argv) > 1:
        return sys.argv[1]

    pg_url = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")
    if not pg_url:
        print("Error: No PostgreSQL URL provided.")
        print("Either:")
        print("  1. Set POSTGRES_URL environment variable")
        print("  2. Pass URL as argument: python scripts/migrate_pg_to_sqlite.py 'postgresql://...'")
        sys.exit(1)

    return pg_url


def migrate():
    """Migrate data from PostgreSQL to SQLite."""
    pg_url = get_postgres_url()

    # Use psycopg2 driver (more widely available)
    if pg_url.startswith('postgresql://') and 'psycopg' not in pg_url:
        pg_url_driver = pg_url.replace('postgresql://', 'postgresql+psycopg2://')
    else:
        pg_url_driver = pg_url

    print(f"Source: PostgreSQL (Render)")
    print(f"Target: {SQLITE_PATH}")
    print()

    # Create engines
    print("Connecting to PostgreSQL...")
    pg_engine = create_engine(pg_url_driver)

    print("Creating SQLite database...")
    # Remove existing SQLite file if it exists
    if os.path.exists(SQLITE_PATH):
        os.remove(SQLITE_PATH)
        print(f"  Removed existing {SQLITE_PATH}")

    sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

    # Import models to create tables
    from app.models.database import Tenant, TenantDomain, User, UserTenant
    from app.db.session import Base

    # Create all tables in SQLite
    print("Creating tables in SQLite...")
    Base.metadata.create_all(bind=sqlite_engine)

    # Create sessions
    PgSession = sessionmaker(bind=pg_engine)
    SqliteSession = sessionmaker(bind=sqlite_engine)

    pg_session = PgSession()
    sqlite_session = SqliteSession()

    try:
        # Migrate tenants
        print("\nMigrating tenants...")
        tenants = pg_session.query(Tenant).all()
        for tenant in tenants:
            new_tenant = Tenant(
                id=tenant.id,
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
            sqlite_session.add(new_tenant)
        sqlite_session.commit()
        print(f"  Migrated {len(tenants)} tenants")

        # Migrate tenant domains
        print("Migrating tenant domains...")
        domains = pg_session.query(TenantDomain).all()
        for domain in domains:
            new_domain = TenantDomain(
                id=domain.id,
                tenant_id=domain.tenant_id,
                domain=domain.domain,
                created_at=domain.created_at
            )
            sqlite_session.add(new_domain)
        sqlite_session.commit()
        print(f"  Migrated {len(domains)} tenant domains")

        # Migrate users
        print("Migrating users...")
        users = pg_session.query(User).all()
        for user in users:
            new_user = User(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            sqlite_session.add(new_user)
        sqlite_session.commit()
        print(f"  Migrated {len(users)} users")

        # Migrate user-tenant associations
        print("Migrating user-tenant associations...")
        user_tenants = pg_session.query(UserTenant).all()
        for ut in user_tenants:
            new_ut = UserTenant(
                id=ut.id,
                user_id=ut.user_id,
                tenant_id=ut.tenant_id,
                erp_username=ut.erp_username,
                erp_password_or_token=ut.erp_password_or_token,
                is_active=ut.is_active,
                created_at=ut.created_at,
                updated_at=ut.updated_at
            )
            sqlite_session.add(new_ut)
        sqlite_session.commit()
        print(f"  Migrated {len(user_tenants)} user-tenant associations")

        print("\n" + "=" * 50)
        print("Migration completed successfully!")
        print("=" * 50)
        print(f"\nSQLite database created at: {SQLITE_PATH}")
        print(f"\nTo use it, update your .env file:")
        print(f"  DATABASE_URL=sqlite:///{SQLITE_PATH}")
        print(f"\nOr for Docker with volume mount:")
        print(f"  DATABASE_URL=sqlite:////app/data/filesmile.db")

    except Exception as e:
        sqlite_session.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        pg_session.close()
        sqlite_session.close()


if __name__ == "__main__":
    migrate()
