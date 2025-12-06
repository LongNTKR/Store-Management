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
            # Check if units table exists, if not, create it and seed data
            if 'units' not in inspector.get_table_names():
                print("Creating units table and seeding default units...")
                self._create_units_table(conn)
            
            # Products table columns
            products_columns = {col['name'] for col in inspector.get_columns('products')}
            products_migrations = [
                ('import_price', 'FLOAT'),
                ('deleted_at', 'DATETIME'),
                ('normalized_name', 'TEXT'),
                ('price_updated_at', 'DATETIME'),
                ('import_price_updated_at', 'DATETIME'),
                ('info_updated_at', 'DATETIME'),
                ('unit_id', 'INTEGER'),  # New: FK to units table
            ]
            for col_name, col_type in products_migrations:
                if col_name not in products_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}"))
                        print(f"✓ Added column: products.{col_name}")
                        
                        # After adding unit_id, migrate existing unit strings to unit_id
                        if col_name == 'unit_id':
                            self._migrate_product_units(conn)
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
                ('paid_amount', 'FLOAT DEFAULT 0'),
                ('remaining_amount', 'FLOAT'),
            ]
            for col_name, col_type in invoices_migrations:
                if col_name not in invoices_columns:
                    try:
                        conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_type}"))
                        print(f"✓ Added column: invoices.{col_name}")
                    except Exception as e:
                        print(f"⚠ Could not add invoices.{col_name}: {e}")

            # Initialize remaining_amount for existing invoices
            if 'remaining_amount' not in invoices_columns:
                try:
                    conn.execute(text("""
                        UPDATE invoices
                        SET remaining_amount = total - COALESCE(paid_amount, 0)
                        WHERE remaining_amount IS NULL
                    """))
                    print("✓ Initialized remaining_amount for existing invoices")
                except Exception as e:
                    print(f"⚠ Could not initialize remaining_amount: {e}")

            # Normalize legacy payment tracking values to avoid NULLs in responses
            try:
                conn.execute(text("""
                    UPDATE invoices
                    SET paid_amount = COALESCE(paid_amount, 0)
                    WHERE paid_amount IS NULL
                """))
                conn.execute(text("""
                    UPDATE invoices
                    SET remaining_amount = total - COALESCE(paid_amount, 0)
                    WHERE remaining_amount IS NULL
                """))
                print("Normalized invoice payment columns (paid_amount, remaining_amount)")
            except Exception as e:
                print(f"Warning: Could not normalize invoice payment columns: {e}")

            # Create payment tables if they don't exist
            if 'payments' not in inspector.get_table_names():
                print("Creating payments table...")
                Base.metadata.tables['payments'].create(bind=self.engine)
                print("✓ Created payments table")

            if 'payment_allocations' not in inspector.get_table_names():
                print("Creating payment_allocations table...")
                Base.metadata.tables['payment_allocations'].create(bind=self.engine)
                print("✓ Created payment_allocations table")

            conn.commit()

    def _create_units_table(self, conn):
        """Create units table and seed with default units."""
        from datetime import datetime
        import pytz
        
        VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')
        now = datetime.now(VN_TZ).isoformat()
        
        # Create units table
        conn.execute(text("""
            CREATE TABLE units (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                allows_decimal BOOLEAN DEFAULT 0 NOT NULL,
                step_size FLOAT DEFAULT 1.0 NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                is_system BOOLEAN DEFAULT 0 NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
        """))
        
        # Seed default units
        default_units = [
            # Integer units (countable items)
            ('cai', 'Cái', False, 1.0, True),
            ('chiec', 'Chiếc', False, 1.0, True),
            ('hop', 'Hộp', False, 1.0, True),
            ('tui', 'Túi', False, 1.0, True),
            ('goi', 'Gói', False, 1.0, True),
            ('lon', 'Lon', False, 1.0, True),
            ('chai', 'Chai', False, 1.0, True),
            ('bo', 'Bộ', False, 1.0, True),
            ('thung', 'Thùng', False, 1.0, True),
            ('tap', 'Tập', False, 1.0, True),
            # Decimal units (measurable quantities)
            ('kg', 'Kilogram (kg)', True, 0.1, True),
            ('g', 'Gram (g)', True, 1.0, True),
            ('tan', 'Tấn', True, 0.01, True),
            ('lit', 'Lít (L)', True, 0.1, True),
            ('ml', 'Mililít (ml)', True, 1.0, True),
            ('met', 'Mét (m)', True, 0.1, True),
            ('cm', 'Centimet (cm)', True, 1.0, True),
            ('m2', 'Mét vuông (m²)', True, 0.1, True),
            ('m3', 'Mét khối (m³)', True, 0.01, True),
        ]
        
        for name, display_name, allows_decimal, step_size, is_system in default_units:
            conn.execute(text("""
                INSERT INTO units (name, display_name, allows_decimal, step_size, is_active, is_system, created_at, updated_at)
                VALUES (:name, :display_name, :allows_decimal, :step_size, 1, :is_system, :created_at, :updated_at)
            """), {
                'name': name,
                'display_name': display_name,
                'allows_decimal': allows_decimal,
                'step_size': step_size,
                'is_system': is_system,
                'created_at': now,
                'updated_at': now
            })
        
        conn.commit()
        print(f"✓ Created units table with {len(default_units)} default units")

    def _migrate_product_units(self, conn):
        """Migrate existing product unit strings to unit_id foreign keys."""
        # Get all unique unit values from products
        result = conn.execute(text("SELECT DISTINCT unit FROM products WHERE unit IS NOT NULL"))
        existing_units = [row[0] for row in result]
        
        # Map unit strings to unit IDs
        for unit_str in existing_units:
            # Try to find matching unit in units table
            result = conn.execute(
                text("SELECT id FROM units WHERE name = :name LIMIT 1"),
                {'name': unit_str}
            )
            row = result.fetchone()
            
            if row:
                # Match found, update products
                unit_id = row[0]
                conn.execute(
                    text("UPDATE products SET unit_id = :unit_id WHERE unit = :unit_str"),
                    {'unit_id': unit_id, 'unit_str': unit_str}
                )
                print(f"✓ Migrated unit '{unit_str}' -> unit_id {unit_id}")
            else:
                # No match, create custom unit
                from datetime import datetime
                import pytz
                VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')
                now = datetime.now(VN_TZ).isoformat()
                
                result = conn.execute(text("""
                    INSERT INTO units (name, display_name, allows_decimal, step_size, is_active, is_system, created_at, updated_at)
                    VALUES (:name, :display_name, 0, 1.0, 1, 0, :created_at, :updated_at)
                """), {
                    'name': unit_str,
                    'display_name': unit_str.capitalize(),
                    'created_at': now,
                    'updated_at': now
                })
                
                # Get the inserted ID and update products
                new_unit_id = result.lastrowid
                conn.execute(
                    text("UPDATE products SET unit_id = :unit_id WHERE unit = :unit_str"),
                    {'unit_id': new_unit_id, 'unit_str': unit_str}
                )
                print(f"✓ Created custom unit '{unit_str}' with ID {new_unit_id} and migrated products")
        
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
