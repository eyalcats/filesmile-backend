"""
Generate secure random secrets for .env configuration.

Run this script to generate SECRET_KEY, JWT_SECRET_KEY, and ENCRYPTION_KEY.
Copy the output to your .env file.
"""
import secrets


def generate_secret(length=32):
    """Generate a secure random hex string."""
    return secrets.token_hex(length)


def main():
    print("=" * 70)
    print("🔐 FILESMILE MULTI-TENANT SECRETS GENERATOR")
    print("=" * 70)
    print()
    print("Copy these values to your .env file:")
    print()
    print("-" * 70)
    print("# Legacy API key secret")
    print(f"SECRET_KEY={generate_secret()}")
    print()
    print("# JWT token secret (MUST be different from SECRET_KEY)")
    print(f"JWT_SECRET_KEY={generate_secret()}")
    print()
    print("# Encryption key for ERP credentials (BACKUP THIS KEY!)")
    print(f"ENCRYPTION_KEY={generate_secret()}")
    print("-" * 70)
    print()
    print("⚠️  IMPORTANT:")
    print("  • Keep these secrets secure and never commit them to git")
    print("  • BACKUP the ENCRYPTION_KEY - lost key = lost all credentials")
    print("  • Use different values for each key")
    print("  • In production, use a secrets management system")
    print()


if __name__ == "__main__":
    main()
