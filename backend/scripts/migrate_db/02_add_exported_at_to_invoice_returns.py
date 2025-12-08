"""Add exported_at to invoice_returns table.

This migration adds an exported_at column to track when a return invoice PDF was first exported.
"""

import sqlite3
from pathlib import Path

def run_migration():
    # Get database path - store_management.db is the actual database file
    # Script is in: backend/scripts/migrate_db/
    # DB is in: backend/data/
    db_path = Path(__file__).parent.parent.parent / "data" / "store_management.db"
    
    print(f"Running migration: Add exported_at to invoice_returns")
    print(f"Database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(invoice_returns)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'exported_at' not in columns:
            print("Adding exported_at column to invoice_returns...")
            cursor.execute("""
                ALTER TABLE invoice_returns 
                ADD COLUMN exported_at DATETIME
            """)
            
            # Create index for performance
            print("Creating index on exported_at...")
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_invoice_returns_exported_at 
                ON invoice_returns(exported_at)
            """)
            
            conn.commit()
            print("✓ Migration completed successfully")
        else:
            print("✓ Column 'exported_at' already exists, skipping migration")
            
    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
