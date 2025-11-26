"""
Check existing tenants in the database.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.database import Tenant, TenantDomain

def check_tenants():
    db = SessionLocal()
    try:
        print("=== Existing Tenants ===")
        tenants = db.query(Tenant).all()
        for tenant in tenants:
            print(f"Tenant: {tenant.name} (ID: {tenant.id}, Active: {tenant.is_active})")
            domains = db.query(TenantDomain).filter(TenantDomain.tenant_id == tenant.id).all()
            for domain in domains:
                print(f"  - Domain: {domain.domain}")
        
        print(f"\nTotal tenants: {len(tenants)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_tenants()
