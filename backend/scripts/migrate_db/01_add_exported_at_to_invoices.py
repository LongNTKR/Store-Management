"""Migration script to add exported_at column to invoices table."""
import sys
import os

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from database.db_manager import get_db_manager
from sqlalchemy import text

def migrate():
    """Add exported_at column to invoices table."""
    print("=" * 60)
    print("Migration: Add exported_at to invoices table")
    print("=" * 60)
    
    db_path = os.path.join(backend_dir, "data", "store_management.db")
    print(f"Database path: {db_path}")
    
    if not os.path.exists(db_path):
        print(f"ERROR: Database file not found at {db_path}")
        return False
    
    db_manager = get_db_manager(db_path)
    session = db_manager.get_session()
    
    try:
        # Check if column already exists
        result = session.execute(text("PRAGMA table_info(invoices)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'exported_at' in columns:
            print("✓ Column 'exported_at' already exists in invoices table")
            print("Migration already applied. Skipping.")
            return True
        
        print("Adding exported_at column to invoices table...")
        
        # Add exported_at column
        session.execute(text("""
            ALTER TABLE invoices 
            ADD COLUMN exported_at DATETIME DEFAULT NULL
        """))
        session.commit()
        print("✓ Added exported_at column to invoices table")
        
        # Create index for performance
        print("Creating index on exported_at...")
        session.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_invoices_exported_at 
            ON invoices(exported_at)
        """))
        session.commit()
        print("✓ Created index idx_invoices_exported_at")
        
        # Verify the column was added
        result = session.execute(text("PRAGMA table_info(invoices)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'exported_at' in columns:
            print("\n" + "=" * 60)
            print("Migration completed successfully!")
            print("=" * 60)
            print("Summary:")
            print("  - Added column: exported_at (DATETIME, nullable)")
            print("  - Created index: idx_invoices_exported_at")
            print("  - All existing invoices have exported_at = NULL")
            print("=" * 60)
            return True
        else:
            print("ERROR: Column was not added successfully")
            return False
        
    except Exception as e:
        print(f"\nERROR during migration: {e}")
        print("Rolling back changes...")
        session.rollback()
        print("Rollback completed.")
        return False
    finally:
        session.close()

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
