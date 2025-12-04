"""
Migration script to add deleted_at column to customers table.
Run this once to update existing database schema.
"""
import sqlite3
from config import Config

def migrate():
    """Add deleted_at column to customers table if it doesn't exist."""
    db_path = Config.DATABASE_PATH
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(customers)")
        columns = [column[1] for column in cursor.fetchall()]

        if 'deleted_at' not in columns:
            print("Adding 'deleted_at' column to customers table...")
            cursor.execute("""
                ALTER TABLE customers
                ADD COLUMN deleted_at DATETIME
            """)
            conn.commit()
            print("✓ Successfully added 'deleted_at' column to customers table")
        else:
            print("'deleted_at' column already exists in customers table")

    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
