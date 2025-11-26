"""
Quick script to check environment variables.
Run this in Render to verify your configuration.
"""
import os
from app.core.config import settings

print("=== Environment Variables Check ===")
print(f"DATABASE_URL: {settings.database_url}")
print(f"SECRET_KEY: {'✅ Set' if settings.secret_key else '❌ Missing'}")
print(f"JWT_SECRET_KEY: {'✅ Set' if settings.jwt_secret_key else '❌ Missing'}")
print(f"ENCRYPTION_KEY: {'✅ Set' if settings.encryption_key else '❌ Missing'}")
print(f"DEBUG: {settings.debug}")

print("\n=== Database Connection Test ===")
try:
    from app.db.session import engine
    print(f"Database URL: {engine.url}")
    print("✅ Database connection configured")
except Exception as e:
    print(f"❌ Database connection error: {e}")
