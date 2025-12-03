"""Helper utility functions."""

from datetime import datetime
from PIL import Image
from CTkMessagebox import CTkMessagebox
import customtkinter as ctk


def format_currency(amount: float, currency: str = "VNĐ") -> str:
    """
    Format amount as currency.

    Args:
        amount: Amount to format
        currency: Currency symbol

    Returns:
        Formatted string
    """
    return f"{amount:,.0f} {currency}"


def format_date(date: datetime, format: str = "%d/%m/%Y %H:%M") -> str:
    """
    Format datetime object.

    Args:
        date: Datetime object
        format: Format string

    Returns:
        Formatted date string
    """
    return date.strftime(format)


def resize_image(image_path: str, max_width: int = 300, max_height: int = 300) -> Image.Image:
    """
    Resize image while maintaining aspect ratio.

    Args:
        image_path: Path to image file
        max_width: Maximum width
        max_height: Maximum height

    Returns:
        Resized PIL Image object
    """
    image = Image.open(image_path)

    # Calculate aspect ratio
    ratio = min(max_width / image.width, max_height / image.height)

    new_width = int(image.width * ratio)
    new_height = int(image.height * ratio)

    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


def show_error(title: str = "Lỗi", message: str = "Đã xảy ra lỗi!"):
    """
    Show error message box.

    Args:
        title: Dialog title
        message: Error message
    """
    CTkMessagebox(
        title=title,
        message=message,
        icon="cancel",
        option_1="OK"
    )


def show_success(title: str = "Thành công", message: str = "Thao tác thành công!"):
    """
    Show success message box.

    Args:
        title: Dialog title
        message: Success message
    """
    CTkMessagebox(
        title=title,
        message=message,
        icon="check",
        option_1="OK"
    )


def show_info(title: str = "Thông báo", message: str = "Thông tin"):
    """
    Show info message box.

    Args:
        title: Dialog title
        message: Info message
    """
    CTkMessagebox(
        title=title,
        message=message,
        icon="info",
        option_1="OK"
    )


def confirm_dialog(title: str = "Xác nhận", message: str = "Bạn có chắc chắn?") -> bool:
    """
    Show confirmation dialog.

    Args:
        title: Dialog title
        message: Confirmation message

    Returns:
        True if user confirmed, False otherwise
    """
    result = CTkMessagebox(
        title=title,
        message=message,
        icon="question",
        option_1="Hủy",
        option_2="Đồng ý"
    )
    return result.get() == "Đồng ý"


def validate_phone(phone: str) -> bool:
    """
    Validate Vietnamese phone number.

    Args:
        phone: Phone number string

    Returns:
        True if valid, False otherwise
    """
    import re
    # Vietnamese phone number pattern
    pattern = r'^(0|\+84)(3|5|7|8|9)[0-9]{8}$'
    return bool(re.match(pattern, phone.replace(" ", "").replace("-", "")))


def validate_email(email: str) -> bool:
    """
    Validate email address.

    Args:
        email: Email string

    Returns:
        True if valid, False otherwise
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def parse_currency(text: str) -> float:
    """
    Parse currency string to float.

    Args:
        text: Currency string (e.g., "1,000,000 VNĐ")

    Returns:
        Float value
    """
    # Remove currency symbols and separators
    cleaned = text.replace(",", "").replace(".", "").replace("VNĐ", "").replace("đ", "").strip()

    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def truncate_text(text: str, max_length: int = 50) -> str:
    """
    Truncate text if too long.

    Args:
        text: Text to truncate
        max_length: Maximum length

    Returns:
        Truncated text with ellipsis if needed
    """
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."
