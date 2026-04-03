#!/usr/bin/env python3
"""
Migration script to simplify the database to use only Class C standards.
This script will:
1. Create a new simplified standards table with only Class C limits
2. Migrate existing data
3. Update the database schema
"""

import sqlite3
import os

def get_db_connection():
    """Get database connection."""
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row
    return conn

def migrate_to_class_c_only():
    """Migrate database to use only Class C standards."""
    print("Starting migration to Class C only standards...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Class C standards as specified
    class_c_standards = {
        'ammonia': (0.0, 0.5),
        'bod': (0.0, 50.0),
        'cod': (0.0, 100.0),
        'flow': (0.0, 5000.0),
        'nitrate': (0.0, 14.0),
        'ph': (6.0, 9.5),
        'phosphate': (0.0, 1.0),
        'temperature': (10.0, 40.0),
        'tss': (0.0, 100.0)
    }
    
    # Step 1: Create new simplified standards table
    print("Creating new simplified standards table...")
    c.execute("DROP TABLE IF EXISTS standards_new")
    c.execute("""
    CREATE TABLE standards_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT UNIQUE,
        min_limit REAL,
        max_limit REAL
    )
    """)
    
    # Step 2: Insert Class C standards
    print("Inserting Class C standards...")
    for param, (min_val, max_val) in class_c_standards.items():
        c.execute(
            "INSERT INTO standards_new (parameter, min_limit, max_limit) VALUES (?, ?, ?)",
            (param, min_val, max_val)
        )
        print(f"  - {param}: {min_val} - {max_val}")
    
    # Step 3: Check if we need to migrate old data
    print("\nChecking for existing standards data...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='standards'")
    if c.fetchone():
        print("Old standards table exists. Migrating data...")
        
        # Get existing standards
        c.execute("SELECT parameter, class_c_min, class_c_max FROM standards")
        old_standards = c.fetchall()
        
        for row in old_standards:
            param = row['parameter']
            min_val = row['class_c_min']
            max_val = row['class_c_max']
            
            # Update if parameter exists in new table
            c.execute("""
                UPDATE standards_new 
                SET min_limit = ?, max_limit = ?
                WHERE parameter = ?
            """, (min_val, max_val, param))
            
            print(f"  - Updated {param} from old standards")
    
    # Step 4: Rename tables
    print("\nRenaming tables...")
    c.execute("DROP TABLE IF EXISTS standards_old")
    c.execute("ALTER TABLE standards RENAME TO standards_old")
    c.execute("ALTER TABLE standards_new RENAME TO standards")
    
    # Step 5: Update data table to include all parameters
    print("\nUpdating data table structure...")
    
    # Check current columns in data table
    c.execute("PRAGMA table_info(data)")
    columns = [col[1] for col in c.fetchall()]
    
    # Add missing columns for all parameters
    all_params = list(class_c_standards.keys())
    for param in all_params:
        if param not in columns:
            c.execute(f"ALTER TABLE data ADD COLUMN {param} REAL")
            print(f"  - Added column: {param}")
    
    # Step 6: Update alerts table if needed
    print("\nChecking alerts table...")
    c.execute("PRAGMA table_info(alerts)")
    alert_columns = [col[1] for col in c.fetchall()]
    
    # Ensure alerts table has the right structure
    if 'class' in alert_columns:
        # Remove class column since we only use Class C
        c.execute("CREATE TABLE alerts_new AS SELECT id, parameter, value, status, state, timestamp, resolved_at FROM alerts")
        c.execute("DROP TABLE alerts")
        c.execute("ALTER TABLE alerts_new RENAME TO alerts")
        print("  - Removed 'class' column from alerts table")
    
    conn.commit()
    
    # Step 7: Verify migration
    print("\nVerifying migration...")
    c.execute("SELECT parameter, min_limit, max_limit FROM standards ORDER BY parameter")
    standards = c.fetchall()
    
    print("\nCurrent Class C Standards:")
    print("-" * 40)
    for row in standards:
        print(f"{row['parameter']:15} {row['min_limit']:6.1f} - {row['max_limit']:6.1f}")
    
    # Count parameters
    c.execute("SELECT COUNT(*) as count FROM standards")
    count = c.fetchone()['count']
    print(f"\nTotal parameters: {count}")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("Migration completed successfully!")
    print("Database now uses only Class C standards.")
    print("=" * 60)
    
    return True

def update_app_models():
    """Update the app/models.py file to use simplified schema."""
    print("\nUpdating app/models.py...")
    
    # Read the current file
    with open('app/models.py', 'r') as f:
        content = f.read()
    
    # Replace the standards table creation
    old_standards_sql = '''    # ---------------- STANDARDS TABLE ----------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS standards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT UNIQUE,
        class_a_min REAL,
        class_a_max REAL,
        class_b_min REAL,
        class_b_max REAL,
        class_c_min REAL,
        class_c_max REAL
    )
    """)'''
    
    new_standards_sql = '''    # ---------------- STANDARDS TABLE ----------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS standards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT UNIQUE,
        min_limit REAL,
        max_limit REAL
    )
    """)'''
    
    # Replace the standards insertion
    old_insert_sql = '''    # ---------------- INSERT DEFAULT STANDARDS (SAFE) ----------------
    existing = c.execute("SELECT COUNT(*) as count FROM standards").fetchone()["count"]

    if existing == 0:
        c.executemany("""
        INSERT INTO standards (
            parameter,
            class_a_min, class_a_max,
            class_b_min, class_b_max,
            class_c_min, class_c_max
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ('ph', 6.0, 9.0, 6.0, 9.0, 6.0, 9.5),
            ('cod', 0, 60, 0, 60, 0, 100),
            ('bod', 0, 20, 0, 30, 0, 50),
            ('tss', 0, 70, 0, 85, 0, 100)
        ])'''
    
    new_insert_sql = '''    # ---------------- INSERT DEFAULT STANDARDS (SAFE) ----------------
    existing = c.execute("SELECT COUNT(*) as count FROM standards").fetchone()["count"]

    if existing == 0:
        # Class C standards only
        c.executemany("""
        INSERT INTO standards (parameter, min_limit, max_limit) VALUES (?, ?, ?)
        """, [
            ('ammonia', 0.0, 0.5),
            ('bod', 0.0, 50.0),
            ('cod', 0.0, 100.0),
            ('flow', 0.0, 5000.0),
            ('nitrate', 0.0, 14.0),
            ('ph', 6.0, 9.5),
            ('phosphate', 0.0, 1.0),
            ('temperature', 10.0, 40.0),
            ('tss', 0.0, 100.0)
        ])'''
    
    # Perform replacements
    content = content.replace(old_standards_sql, new_standards_sql)
    content = content.replace(old_insert_sql, new_insert_sql)
    
    # Write updated content
    with open('app/models.py', 'w') as f:
        f.write(content)
    
    print("  - Updated app/models.py with simplified Class C schema")
    return True

def main():
    """Main migration function."""
    print("=" * 60)
    print("Wastewater Monitoring System - Class C Simplification")
    print("=" * 60)
    
    try:
        # Backup database first
        if os.path.exists('data.db'):
            import shutil
            shutil.copy2('data.db', 'data.db.backup')
            print("Created backup: data.db.backup")
        
        # Run migration
        migrate_to_class_c_only()
        
        # Update app models
        update_app_models()
        
        print("\n" + "=" * 60)
        print("SUCCESS: System simplified to use only Class C standards!")
        print("Next steps:")
        print("1. Restart the Flask server")
        print("2. Test the updated system")
        print("3. Update UI templates to remove Class A/B references")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        print("Restoring from backup...")
        if os.path.exists('data.db.backup'):
            import shutil
            shutil.copy2('data.db.backup', 'data.db')
            print("Restored from backup")
        return False

if __name__ == "__main__":
    main()