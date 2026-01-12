#!/usr/bin/env python
"""
Test stored credentials for a user.

Usage:
    python scripts/test_user_credentials.py <email> [tenant_id]
"""
import sys
import asyncio
sys.path.insert(0, '.')

from app.db.session import SessionLocal
from app.models.database import User, UserTenant, Tenant
from app.utils.encryption import decrypt_value
from app.services.priority_client import PriorityClient


async def test_credentials(email: str, tenant_id: int = None):
    db = SessionLocal()
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return

        print(f"✅ User found: {user.email} (ID: {user.id})")

        # Get user-tenant associations
        query = db.query(UserTenant).filter(UserTenant.user_id == user.id)
        if tenant_id:
            query = query.filter(UserTenant.tenant_id == tenant_id)

        user_tenants = query.all()

        if not user_tenants:
            print(f"❌ No tenant associations found for user")
            return

        for ut in user_tenants:
            tenant = db.query(Tenant).filter(Tenant.id == ut.tenant_id).first()
            print(f"\n--- Tenant: {tenant.name} (ID: {tenant.id}) ---")
            print(f"  ERP Base URL: {tenant.erp_base_url}")
            print(f"  ERP Company: {tenant.erp_company}")
            print(f"  Tabula INI: {tenant.erp_tabula_ini}")

            if not ut.erp_username or not ut.erp_password_or_token:
                print(f"  ❌ No stored credentials")
                continue

            # Decrypt credentials
            try:
                erp_username = decrypt_value(ut.erp_username)
                erp_password = decrypt_value(ut.erp_password_or_token)
                print(f"  ✅ Credentials decrypted successfully")
                print(f"  ERP Username: {erp_username}")
                print(f"  ERP Password: {'*' * len(erp_password)}")
            except Exception as e:
                print(f"  ❌ Failed to decrypt credentials: {e}")
                continue

            # Test credentials against ERP
            print(f"  Testing connection to Priority ERP...")
            try:
                client = PriorityClient(
                    username=erp_username,
                    password=erp_password,
                    company=tenant.erp_company,
                    base_url=tenant.erp_base_url,
                    tabula_ini=tenant.erp_tabula_ini
                )
                await client.validate_credentials()
                await client.close()
                print(f"  ✅ Credentials are VALID!")
            except Exception as e:
                print(f"  ❌ Credentials validation FAILED: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_user_credentials.py <email> [tenant_id]")
        sys.exit(1)

    email = sys.argv[1]
    tenant_id = int(sys.argv[2]) if len(sys.argv) > 2 else None

    asyncio.run(test_credentials(email, tenant_id))
