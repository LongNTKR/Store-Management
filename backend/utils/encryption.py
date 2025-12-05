"""Encryption utilities for secure API key storage."""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend


class EncryptionManager:
    """Manages encryption and decryption of sensitive data."""
    
    def __init__(self, secret_key: str):
        """Initialize encryption manager with secret key.
        
        Args:
            secret_key: Secret key from environment variable (minimum 32 characters)
        
        Raises:
            ValueError: If secret_key is too short
        """
        if not secret_key or len(secret_key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        
        # Derive a proper Fernet key from the secret key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'store_management_salt',  # Fixed salt for deterministic key
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        self.fernet = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext string.
        
        Args:
            plaintext: The text to encrypt (e.g., API key)
        
        Returns:
            Encrypted string (base64 encoded)
        """
        if not plaintext:
            raise ValueError("Cannot encrypt empty string")
        
        encrypted_bytes = self.fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()
    
    def decrypt(self, encrypted_text: str) -> str:
        """Decrypt an encrypted string.
        
        Args:
            encrypted_text: The encrypted text to decrypt
        
        Returns:
            Decrypted plaintext string
        
        Raises:
            ValueError: If decryption fails
        """
        if not encrypted_text:
            raise ValueError("Cannot decrypt empty string")
        
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted_text.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")


# Global encryption manager instance (initialized in config)
_encryption_manager = None


def init_encryption_manager(secret_key: str):
    """Initialize the global encryption manager.
    
    Args:
        secret_key: Secret key from configuration
    """
    global _encryption_manager
    _encryption_manager = EncryptionManager(secret_key)


def get_encryption_manager() -> EncryptionManager:
    """Get the global encryption manager instance.
    
    Returns:
        EncryptionManager instance
    
    Raises:
        RuntimeError: If encryption manager not initialized
    """
    if _encryption_manager is None:
        raise RuntimeError("Encryption manager not initialized. Call init_encryption_manager first.")
    return _encryption_manager


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key.
    
    Args:
        api_key: The API key to encrypt
    
    Returns:
        Encrypted API key string
    """
    return get_encryption_manager().encrypt(api_key)


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an encrypted API key.
    
    Args:
        encrypted_key: The encrypted API key
    
    Returns:
        Decrypted API key string
    """
    return get_encryption_manager().decrypt(encrypted_key)
