#!/usr/bin/env python3
"""
Generate bcrypt hash for admin password.

Usage:
    python scripts/generate_admin_hash.py

The script will:
1. Prompt for password input (hidden)
2. Generate bcrypt hash
3. Output the hash to add to .env file
"""
import getpass
import bcrypt


def main():
    print("=" * 50)
    print("FileSmile Admin Password Hash Generator")
    print("=" * 50)
    print()

    # Get password from user
    password = getpass.getpass("Enter admin password: ")
    confirm = getpass.getpass("Confirm admin password: ")

    if password != confirm:
        print("\nError: Passwords do not match!")
        return

    if len(password) < 8:
        print("\nWarning: Password is less than 8 characters. Consider using a stronger password.")

    # Generate hash using bcrypt directly
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hash_value = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

    print()
    print("=" * 50)
    print("Generated bcrypt hash:")
    print("=" * 50)
    print()
    print(f"ADMIN_PASSWORD_HASH={hash_value}")
    print()
    print("Add this line to your .env file")
    print("=" * 50)


if __name__ == "__main__":
    main()
