"""Migration script to make price column nullable in products table.

This script handles the migration safely by:
1. Creating a new table with the correct schema
2. Copying all data from the old table
3. Dropping the old table
4. Renaming the new table

Run this script manually if you have an existing database with products.
"""

import sqlite3
import sys
import os

def migrate_price_to_nullable(db_path: str = "store_management.db"):
    """Make the price column nullable in products table."""
    
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        print("No migration needed - new database will be created with correct schema.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if products table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
        if not cursor.fetchone():
            print("Products table does not exist. No migration needed.")
            return
        
        # Check current schema
        cursor.execute("PRAGMA table_info(products)")
        columns = cursor.fetchall()
        
        # Find price column
        price_col = None
        for col in columns:
            if col[1] == 'price':  # col[1] is column name
                price_col = col
                break
        
        if not price_col:
            print("Price column not found. No migration needed.")
            return
        
        # Check if already nullable (notnull = 0 means nullable)
        if price_col[3] == 0:  # col[3] is notnull flag
            print("✓ Price column is already nullable. No migration needed.")
            return
        
        print("Starting migration to make price column nullable...")
        
        # Create backup
        backup_path = f"{db_path}.backup_price_migration"
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✓ Created backup at: {backup_path}")
        
        # Begin transaction
        cursor.execute("BEGIN TRANSACTION")
        
        # Create new table with correct schema
        cursor.execute("""
            CREATE TABLE products_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                normalized_name VARCHAR(255),
                price FLOAT,
                import_price FLOAT,
                description TEXT,
                category VARCHAR(100),
                unit VARCHAR(50) DEFAULT 'cái',
                stock_quantity INTEGER DEFAULT 0,
                image_paths TEXT,
                created_at DATETIME,
                updated_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                deleted_at DATETIME
            )
        """)
        
        # Copy all data from old table to new table
        cursor.execute("""
            INSERT INTO products_new 
            SELECT * FROM products
        """)
        
        # Drop old table
        cursor.execute("DROP TABLE products")
        
        # Rename new table to products
        cursor.execute("ALTER TABLE products_new RENAME TO products")
        
        # Recreate indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_name ON products (name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_normalized_name ON products (normalized_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_category ON products (category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_products_deleted_at ON products (deleted_at)")
        
        # Commit transaction
        conn.commit()
        
        print("✓ Migration completed successfully!")
        print("✓ Price column is now nullable.")
        print(f"✓ Backup kept at: {backup_path}")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")
        print("Database has been rolled back to previous state.")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "store_management.db"
    migrate_price_to_nullable(db_path)
