#!/usr/bin/env python3
"""Test script to decrypt the stored credentials."""

import sys
import os

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.encryption import EncryptionService

# Your encryption key
ENCRYPTION_KEY = "0948c62739c75c4209250723bf6c8775ff1d760c84791a6da7b131d5df7d03d3"

# Encrypted values from database
encrypted_user = "gAAAAABpJrCiLDmuyRMgaUVpEQSwE6bCYKgCCn6Joc_tfjphz102c653kaUKk0tOEnM2UyNh5z7EoMxSifYzfNXMJRoarOlhrw=="
encrypted_password = "gAAAAABpJrCiHt-fUM4Ra_3kZ0XnRAm_rDT-bxdY7THjrdOX2kuT8EFVa_-OpVZzKYyHeC072JzWtxOUZmrthbt14NzX54RxaA=="

def test_decryption():
    """Test decrypting the stored credentials."""
    print(f"Testing decryption with key: {ENCRYPTION_KEY}")
    
    # Initialize encryption service
    encryption_service = EncryptionService(ENCRYPTION_KEY)
    
    # Test decryption
    decrypted_user = encryption_service.decrypt(encrypted_user)
    decrypted_password = encryption_service.decrypt(encrypted_password)
    
    print(f"Encrypted user: {encrypted_user}")
    print(f"Decrypted user: {decrypted_user}")
    print()
    print(f"Encrypted password: {encrypted_password}")
    print(f"Decrypted password: {decrypted_password}")
    
    # Check if decryption worked
    if decrypted_user == "APP044" and decrypted_password == "Aa123456":
        print("✅ Decryption successful! Credentials match expected values.")
    else:
        print("❌ Decryption failed or credentials don't match.")
        print(f"Expected user: APP044, got: {decrypted_user}")
        print(f"Expected password: Aa123456, got: {decrypted_password}")

if __name__ == "__main__":
    test_decryption()
