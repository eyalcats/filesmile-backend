"""
Database initialization script.

Run this script to create all database tables for the multi-tenant architecture.

Usage:
    python init_db.py
"""
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.db.session import engine, Base, init_db
from app.models.database import Tenant, TenantDomain, User


def main():
    """Initialize database tables."""
    print("🔧 Initializing database...")
    print(f"📁 Database URL: {engine.url}")

    # Create all tables
    print("📊 Creating tables...")
    Base.metadata.create_all(bind=engine)

    print("✅ Database initialized successfully!")
    print("\nCreated tables:")
    print("  - tenants")
    print("  - tenant_domains")
    print("  - users")
    print("\n💡 Next steps:")
    print("  1. Add your encryption_key and jwt_secret_key to .env")
    print("  2. Use the admin panel or API to create tenants")
    print("  3. Add domains to tenants")
    print("  4. Users can now register via /api/v1/auth/register")


if __name__ == "__main__":
    main()
