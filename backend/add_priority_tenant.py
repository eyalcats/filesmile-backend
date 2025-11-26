"""
Script to add Priority Software tenant to production database.

This script creates the tenant for priority-software.com domain.
Run this in your production environment to fix the tenant resolution issue.

Usage:
    python add_priority_tenant.py
"""
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.database import Tenant, TenantDomain
from app.utils.encryption import encrypt_value
from app.core.config import settings


def add_priority_tenant():
    """Add Priority Software tenant."""
    db = SessionLocal()

    try:
        # Check if tenant already exists
        existing = db.query(Tenant).filter(Tenant.name == "Priority Software").first()
        if existing:
            print("⚠️  Priority Software tenant already exists!")
            return

        print("🏢 Creating Priority Software tenant...")

        # Validate required environment variables
        if not settings.priority_base_url or not settings.priority_company:
            print("❌ PRIORITY_BASE_URL and PRIORITY_COMPANY must be set in .env for tenant creation")
            print("Please check your .env file or environment variables in Render")
            return

        # Create tenant with encrypted admin credentials
        tenant = Tenant(
            name="Priority Software",
            erp_base_url=settings.priority_base_url,
            erp_auth_type="basic",
            erp_admin_username=encrypt_value(settings.priority_admin_user) if settings.priority_admin_user else None,
            erp_admin_password_or_token=encrypt_value(settings.priority_admin_password) if settings.priority_admin_password else None,
            erp_company=settings.priority_company,
            erp_tabula_ini=settings.priority_tabula_ini or "tabula.ini",
            is_active=True
        )
        db.add(tenant)
        db.flush()  # Get the tenant ID

        print(f"✅ Created tenant: {tenant.name} (ID: {tenant.id})")

        # Add priority-software.com domain
        domain = TenantDomain(tenant_id=tenant.id, domain="priority-software.com")
        db.add(domain)
        print(f"  ✅ Added domain: priority-software.com")

        db.commit()
        print("\n🎉 Priority Software tenant created successfully!")
        print(f"\n📋 Tenant Details:")
        print(f"   ID: {tenant.id}")
        print(f"   Name: {tenant.name}")
        print(f"   Domain: priority-software.com")
        print(f"   ERP Base URL: {tenant.erp_base_url}")
        print(f"   ERP Company: {tenant.erp_company}")
        print(f"\n💡 Users with @priority-software.com emails can now register!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating Priority Software tenant: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_priority_tenant()
