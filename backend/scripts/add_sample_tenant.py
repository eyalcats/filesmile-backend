"""
Helper script to add a sample tenant for testing.

This script creates a sample tenant with domains to get started quickly.

Usage:
    python add_sample_tenant.py
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


def add_sample_tenant():
    """Add a sample tenant for testing."""
    db = SessionLocal()

    try:
        # Check if tenant already exists
        existing = db.query(Tenant).filter(Tenant.name == "Sample Tenant").first()
        if existing:
            print("⚠️  Sample tenant already exists!")
            return

        print("🏢 Creating sample tenant...")

        # Validate required environment variables for sample tenant
        if not settings.priority_base_url or not settings.priority_company:
            print("❌ PRIORITY_BASE_URL and PRIORITY_COMPANY must be set in .env for sample tenant creation")
            return

        # Create tenant with encrypted admin credentials
        tenant = Tenant(
            name="Sample Tenant",
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

        # Add sample domains
        domains = [
            "example.com",
            "example.co.il",
            "test.com"
        ]

        for domain_name in domains:
            domain = TenantDomain(tenant_id=tenant.id, domain=domain_name)
            db.add(domain)
            print(f"  ✅ Added domain: {domain_name}")

        db.commit()
        print("\n🎉 Sample tenant created successfully!")
        print(f"\n📋 Tenant Details:")
        print(f"   ID: {tenant.id}")
        print(f"   Name: {tenant.name}")
        print(f"   Domains: {', '.join(domains)}")
        print(f"\n💡 Users with emails from these domains can now register!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample tenant: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_sample_tenant()
