#!/usr/bin/env python3
"""
Migration script to update the database schema to support all parameters.
"""

import sqlite3
import sys

def migrate_database():
    """Migrate the database to support all parameters."""
    print("Migrating database to support all parameters...")
    
    try:
        conn = sqlite3.connect('data.db')
        c = conn.cursor()
        
        # Check current schema
        c.execute("PRAGMA table_info(data)")
        columns = [col[1] for col in c.fetchall()]
        print(f"Current data table columns: {columns}")
        
        # Add missing columns to data table
        new_columns = [
            ('ammonia', 'REAL'),
            ('nitrate', 'REAL'),
            ('phosphate', 'REAL'),
            ('temperature', 'REAL'),
            ('flow', 'REAL'),
            ('type', 'TEXT DEFAULT "effluent"'),
            ('plant_id', 'INTEGER DEFAULT 1'),
            ('operator_id', 'INTEGER'),
            ('notes', 'TEXT')
        ]
        
        for column_name, column_type in new_columns:
            if column_name not in columns:
                print(f"Adding column '{column_name}' to data table...")
                try:
                    c.execute(f"ALTER TABLE data ADD COLUMN {column_name} {column_type}")
                    print(f"  [OK] Added column '{column_name}'")
                except Exception as e:
                    print(f"  [FAIL] Failed to add column '{column_name}': {e}")
        
        # Update standards table with all parameters
        print("\nUpdating standards table...")
        
        # First, check what parameters exist
        c.execute("SELECT parameter FROM standards")
        existing_params = [row[0] for row in c.fetchall()]
        print(f"Existing parameters in standards: {existing_params}")
        
        # Add missing parameters to standards table
        all_parameters = [
            ('ph', 6.0, 9.0, 6.0, 9.0, 6.0, 9.5),
            ('cod', 0, 60, 0, 60, 0, 100),
            ('bod', 0, 20, 0, 30, 0, 50),
            ('tss', 0, 70, 0, 85, 0, 100),
            ('ammonia', 0, 0.3, 0, 0.5, 0, 0.5),
            ('nitrate', 0, 10, 0, 12, 0, 14),
            ('phosphate', 0, 0.5, 0, 0.8, 0, 1.0),
            ('temperature', 20, 30, 15, 35, 10, 40),
            ('flow', 0, 1000, 0, 2000, 0, 5000)
        ]
        
        for param_data in all_parameters:
            param_name = param_data[0]
            if param_name not in existing_params:
                print(f"Adding parameter '{param_name}' to standards...")
                try:
                    c.execute("""
                        INSERT INTO standards (
                            parameter,
                            min_limit, max_limit,
                            min_limit, max_limit,
                            min_limit, max_limit
                        ) VALUES (?, ?, ?)
                    """, param_data)
                    print(f"  [OK] Added parameter '{param_name}'")
                except Exception as e:
                    print(f"  [FAIL] Failed to add parameter '{param_name}': {e}")
        
        conn.commit()
        
        # Verify migration
        print("\nVerifying migration...")
        
        c.execute("PRAGMA table_info(data)")
        columns = [col[1] for col in c.fetchall()]
        print(f"Updated data table columns: {columns}")
        
        c.execute("SELECT COUNT(*) FROM standards")
        param_count = c.fetchone()[0]
        print(f"Total parameters in standards: {param_count}")
        
        c.execute("SELECT parameter FROM standards ORDER BY parameter")
        all_params = [row[0] for row in c.fetchall()]
        print(f"All parameters: {all_params}")
        
        conn.close()
        
        print("\n[OK] Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"[FAIL] Database migration failed: {e}")
        return False

if __name__ == "__main__":
    if migrate_database():
        sys.exit(0)
    else:
        sys.exit(1)