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

        # Create minimal tenant - ERP config will be set via admin panel
        tenant = Tenant(
            name="Priority Software",
            erp_base_url="https://placeholder.com/odata",  # Will be updated via admin panel
            erp_auth_type="basic",
            erp_admin_username=None,  # Will be set via admin panel
            erp_admin_password_or_token=None,  # Will be set via admin panel
            erp_company="PLACEHOLDER",  # Will be updated via admin panel
            erp_tabula_ini="tabula.ini",
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
        print(f"\n🎉 Priority Software tenant created successfully!")
        print(f"\n📋 Tenant Details:")
        print(f"   ID: {tenant.id}")
        print(f"   Name: {tenant.name}")
        print(f"   Domain: priority-software.com")
        print(f"   ERP Base URL: {tenant.erp_base_url} (placeholder - update via admin panel)")
        print(f"   ERP Company: {tenant.erp_company} (placeholder - update via admin panel)")
        print(f"\n💡 Users with @priority-software.com emails can now register!")
        print(f"⚠️  Remember to update ERP configuration via admin panel before user registration")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating Priority Software tenant: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_priority_tenant()
