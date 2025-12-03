"""Configuration for Store Management System."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration."""

    # Application
    APP_NAME = "Quản Lý Bán Hàng"
    APP_VERSION = "1.0.0"
    COMPANY_NAME = os.getenv("COMPANY_NAME", "Cửa Hàng Gia Đình")

    # Data directory - within project for easy backup
    APP_DATA_DIR = Path(__file__).parent / "data"
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Database
    DATABASE_PATH = os.getenv("DATABASE_PATH", str(APP_DATA_DIR / "store_management.db"))

    # Google Cloud Vision API
    GOOGLE_CREDENTIALS_PATH = os.getenv("GOOGLE_CREDENTIALS_PATH", "")

    # Directories - all in data folder
    IMAGE_DIR = os.getenv("IMAGE_DIR", str(APP_DATA_DIR / "images" / "products"))
    INVOICE_DIR = os.getenv("INVOICE_DIR", str(APP_DATA_DIR / "invoices"))
    TEMP_DIR = os.getenv("TEMP_DIR", str(APP_DATA_DIR / "temp"))

    # UI Theme
    UI_THEME = os.getenv("UI_THEME", "blue")  # blue, green, dark-blue
    UI_COLOR_MODE = os.getenv("UI_COLOR_MODE", "light")  # light, dark, system

    # Invoice Settings
    DEFAULT_TAX_RATE = float(os.getenv("DEFAULT_TAX_RATE", "0"))  # 0.1 = 10%
    DEFAULT_DISCOUNT = float(os.getenv("DEFAULT_DISCOUNT", "0"))

    # Search Settings
    IMAGE_SEARCH_TOP_K = int(os.getenv("IMAGE_SEARCH_TOP_K", "5"))
    IMAGE_SEARCH_THRESHOLD = float(os.getenv("IMAGE_SEARCH_THRESHOLD", "0.3"))

    @classmethod
    def ensure_directories(cls):
        """Ensure all required directories exist."""
        os.makedirs(cls.IMAGE_DIR, exist_ok=True)
        os.makedirs(cls.INVOICE_DIR, exist_ok=True)
        os.makedirs(cls.TEMP_DIR, exist_ok=True)


# Initialize config
Config.ensure_directories()
