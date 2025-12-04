"""
Text processing utilities for search optimization.
Includes Vietnamese diacritics normalization and phone number normalization.
"""

from unidecode import unidecode


def normalize_vietnamese(text: str) -> str:
    """
    Normalize Vietnamese text by removing diacritics.

    Args:
        text: Vietnamese text with diacritics

    Returns:
        Normalized text without diacritics in lowercase

    Examples:
        >>> normalize_vietnamese("Nguyễn Văn A")
        'nguyen van a'
        >>> normalize_vietnamese("Bút bi đỏ")
        'but bi do'
    """
    if not text:
        return ""
    return unidecode(text).lower().strip()


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number to digits-only format for consistent searching.

    Handles various phone formats:
    - "0123456789" → "0123456789"
    - "+84 123 456 789" → "0123456789"
    - "(012) 345-6789" → "0123456789"
    - "012-345-6789" → "0123456789"

    Args:
        phone: Phone number in any format

    Returns:
        Normalized phone number (digits only)

    Examples:
        >>> normalize_phone("0123456789")
        '0123456789'
        >>> normalize_phone("+84 123 456 789")
        '0123456789'
        >>> normalize_phone("(012) 345-6789")
        '0123456789'
    """
    if not phone:
        return ""

    # Strip all non-digit characters
    digits = ''.join(c for c in phone if c.isdigit())

    # Handle +84 prefix (Vietnam country code)
    # Convert +84123456789 (11 digits) to 0123456789 (10 digits)
    if digits.startswith('84') and len(digits) == 11:
        digits = '0' + digits[2:]

    return digits


def normalize_email(email: str) -> str:
    """
    Normalize email to lowercase for case-insensitive searching.

    Args:
        email: Email address in any case

    Returns:
        Lowercase email

    Examples:
        >>> normalize_email("Test@Gmail.COM")
        'test@gmail.com'
    """
    if not email:
        return ""
    return email.lower().strip()
