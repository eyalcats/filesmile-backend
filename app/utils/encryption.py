"""
Encryption utilities for sensitive data (ERP credentials).

Uses Fernet symmetric encryption from cryptography library.
All sensitive credentials (passwords, tokens) are encrypted before storage.
"""
import base64
import os
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


class EncryptionService:
    """Service for encrypting and decrypting sensitive data."""

    def __init__(self, encryption_key: str):
        """
        Initialize encryption service with a key.

        Args:
            encryption_key: Base encryption key (will be derived using PBKDF2)
        """
        # Derive a proper Fernet key from the encryption key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'filesmile_multi_tenant_salt',  # Fixed salt for consistent key derivation
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(encryption_key.encode()))
        self.fernet = Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt a string value.

        Args:
            plaintext: Plain text to encrypt

        Returns:
            Encrypted string (base64 encoded)
        """
        if not plaintext:
            return ""

        encrypted_bytes = self.fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()

    def decrypt(self, ciphertext: str) -> Optional[str]:
        """
        Decrypt an encrypted string value.

        Args:
            ciphertext: Encrypted text (base64 encoded)

        Returns:
            Decrypted plain text, or None if decryption fails
        """
        if not ciphertext:
            return None

        try:
            decrypted_bytes = self.fernet.decrypt(ciphertext.encode())
            return decrypted_bytes.decode()
        except (InvalidToken, Exception):
            # Return None if decryption fails (invalid token, corrupted data, etc.)
            return None


# Global encryption service instance (initialized in config)
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """
    Get the global encryption service instance.

    Returns:
        Initialized EncryptionService

    Raises:
        RuntimeError: If encryption service is not initialized
    """
    global _encryption_service
    if _encryption_service is None:
        # Import here to avoid circular dependency
        from app.core.config import settings
        _encryption_service = EncryptionService(settings.encryption_key)
    return _encryption_service


def encrypt_value(plaintext: str) -> str:
    """
    Helper function to encrypt a value using the global encryption service.

    Args:
        plaintext: Plain text to encrypt

    Returns:
        Encrypted string
    """
    return get_encryption_service().encrypt(plaintext)


def decrypt_value(ciphertext: str) -> Optional[str]:
    """
    Helper function to decrypt a value using the global encryption service.

    Args:
        ciphertext: Encrypted text

    Returns:
        Decrypted plain text, or None if decryption fails
    """
    return get_encryption_service().decrypt(ciphertext)
