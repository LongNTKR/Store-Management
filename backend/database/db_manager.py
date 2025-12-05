"""Database manager for Store Management System."""

import os
from typing import Optional
from sqlalchemy import create_engine, event, text, inspect
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from .models import Base


class DatabaseManager:
    """Manages database connection and sessions."""

    def __init__(self, db_path: str = "store_management.db"):
        """
        Initialize database manager.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.db_url = f"sqlite:///{db_path}"

        # Create engine with proper SQLite settings
        self.engine = create_engine(
            self.db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False  # Set to True for SQL debugging
        )

        # Enable foreign keys for SQLite
        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        # Create session factory
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

        # Create tables
        self.init_db()

    def init_db(self):
        """Initialize database tables."""
        Base.metadata.create_all(bind=self.engine)
        self._ensure_columns()
        print(f"Database initialized at: {self.db_path}")

    def _ensure_columns(self):
        """
        Ensure new columns exist when the schema evolves.

        This automatically adds missing columns to existing tables,
        making the system backward compatible with older database schemas.
        """
        inspector = inspect(self.engine)

        with self.engine.connect() as conn:
            # Products table columns
            products_columns = {col['name'] for col in inspector.get_columns('products')}
            products_migrations = [
                ('import_price', 'FLOAT'),
                ('deleted_at', 'DATETIME'),
                ('normalized_name', 'TEXT'),
            ]
            for col_name, col_type in products_migrations:
                if col_name not in products_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}"))
                        print(f"✓ Added column: products.{col_name}")
                    except Exception as e:
                        print(f"⚠ Could not add products.{col_name}: {e}")

            # Customers table columns
            customers_columns = {col['name'] for col in inspector.get_columns('customers')}
            customers_migrations = [
                ('deleted_at', 'DATETIME'),
                ('normalized_name', 'TEXT'),
                ('normalized_phone', 'TEXT'),
                ('normalized_email', 'TEXT'),
            ]
            for col_name, col_type in customers_migrations:
                if col_name not in customers_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE customers ADD COLUMN {col_name} {col_type}"))
                        print(f"✓ Added column: customers.{col_name}")
                    except Exception as e:
                        print(f"⚠ Could not add customers.{col_name}: {e}")

            # Invoices table columns
            invoices_columns = {col['name'] for col in inspector.get_columns('invoices')}
            invoices_migrations = [
                ('normalized_customer_name', 'TEXT'),
                ('normalized_customer_phone', 'TEXT'),
            ]
            for col_name, col_type in invoices_migrations:
                if col_name not in invoices_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_type}"))
                        print(f"✓ Added column: invoices.{col_name}")
                    except Exception as e:
                        print(f"⚠ Could not add invoices.{col_name}: {e}")

            conn.commit()

    def get_session(self) -> Session:
        """
        Get a new database session.

        Returns:
            SQLAlchemy Session object
        """
        return self.SessionLocal()

    def close(self):
        """Close database connection."""
        self.engine.dispose()

    def reset_db(self):
        """Drop all tables and recreate them (USE WITH CAUTION)."""
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        print("Database reset completed.")

    def backup_db(self, backup_path: str):
        """
        Create a backup of the database.

        Args:
            backup_path: Path to save backup file
        """
        import shutil
        if os.path.exists(self.db_path):
            shutil.copy2(self.db_path, backup_path)
            print(f"Database backed up to: {backup_path}")
        else:
            print("Database file not found.")


# Singleton instance
_db_manager: Optional[DatabaseManager] = None


def get_db_manager(db_path: str = "store_management.db") -> DatabaseManager:
    """
    Get singleton database manager instance.

    Args:
        db_path: Path to SQLite database file

    Returns:
        DatabaseManager instance
    """
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager(db_path)
    return _db_manager
