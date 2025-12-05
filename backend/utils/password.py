"""Password hashing and verification utilities."""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt.
    
    Args:
        password: The plaintext password to hash
    
    Returns:
        Hashed password string
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode()


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against a hashed password.
    
    Args:
        password: The plaintext password to verify
        hashed_password: The hashed password to compare against
    
    Returns:
        True if password matches, False otherwise
    """
    if not password or not hashed_password:
        return False
    
    try:
        return bcrypt.checkpw(password.encode(), hashed_password.encode())
    except Exception:
        return False
