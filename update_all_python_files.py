#!/usr/bin/env python3
"""
Script to update all Python files to remove Class A/B references and use only Class C standards.
"""

import os
import re
import glob

def update_file(filepath):
    """Update a single Python file to remove Class A/B references."""
    print(f"Updating {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Replace class_a_min, class_a_max, class_b_min, class_b_max, class_c_min, class_c_max
    # with min_limit and max_limit
    content = re.sub(r'class_a_min', 'min_limit', content, flags=re.IGNORECASE)
    content = re.sub(r'class_a_max', 'max_limit', content, flags=re.IGNORECASE)
    content = re.sub(r'class_b_min', 'min_limit', content, flags=re.IGNORECASE)
    content = re.sub(r'class_b_max', 'max_limit', content, flags=re.IGNORECASE)
    content = re.sub(r'class_c_min', 'min_limit', content, flags=re.IGNORECASE)
    content = re.sub(r'class_c_max', 'max_limit', content, flags=re.IGNORECASE)
    
    # Replace Class A, Class B with Class C
    content = re.sub(r'Class [AB]', 'Class C', content, flags=re.IGNORECASE)
    
    # Update SQL queries
    content = re.sub(
        r'SELECT class_a_min, class_a_max FROM standards',
        'SELECT min_limit, max_limit FROM standards',
        content,
        flags=re.IGNORECASE
    )
    
    content = re.sub(
        r'SELECT class_c_min, class_c_max FROM standards',
        'SELECT min_limit, max_limit FROM standards',
        content,
        flags=re.IGNORECASE
    )
    
    # Update database schema references
    content = re.sub(
        r'CREATE TABLE.*standards.*\(.*class_a_min.*class_a_max.*class_b_min.*class_b_max.*class_c_min.*class_c_max',
        'CREATE TABLE standards (id INTEGER PRIMARY KEY AUTOINCREMENT, parameter TEXT UNIQUE, min_limit REAL, max_limit REAL)',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Update INSERT statements
    content = re.sub(
        r'INSERT INTO standards.*\(.*parameter.*class_a_min.*class_a_max.*class_b_min.*class_b_max.*class_c_min.*class_c_max',
        'INSERT INTO standards (parameter, min_limit, max_limit)',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Update VALUES clauses
    content = re.sub(
        r'VALUES.*\(.*\?.*\?.*\?.*\?.*\?.*\?.*\?\)',
        'VALUES (?, ?, ?)',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Check if content changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  - Updated {filepath}")
        return True
    else:
        print(f"  - No changes needed in {filepath}")
        return False

def update_routes_refactored():
    """Specifically update app/routes_refactored.py."""
    filepath = 'app/routes_refactored.py'
    if not os.path.exists(filepath):
        return False
    
    print(f"\nSpecifically updating {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update the get_status function in routes_refactored.py
    old_get_status = '''def get_status(parameter, value):
    conn = get_db_connection()
    standard = conn.execute(
        "SELECT class_a_min, class_a_max FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()
    conn.close()

    if not standard:
        return "SAFE"

    min_val = standard["class_a_min"]
    max_val = standard["class_a_max"]

    if value < min_val or value > max_val:
        return "CRITICAL"

    margin = (max_val - min_val) * 0.1

    if value < (min_val + margin) or value > (max_val - margin):
        return "WARNING"

    return "SAFE"'''
    
    new_get_status = '''def get_status(parameter, value):
    conn = get_db_connection()
    standard = conn.execute(
        "SELECT min_limit, max_limit FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()
    conn.close()

    if not standard:
        return "SAFE"

    min_val = standard["min_limit"]
    max_val = standard["max_limit"]

    if value < min_val or value > max_val:
        return "CRITICAL"

    margin = (max_val - min_val) * 0.1

    if value < (min_val + margin) or value > (max_val - margin):
        return "WARNING"

    return "SAFE"'''
    
    if old_get_status in content:
        content = content.replace(old_get_status, new_get_status)
        print("  - Updated get_status function")
    
    # Write updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def update_services_file():
    """Update app/services/__init__.py."""
    filepath = 'app/services/__init__.py'
    if not os.path.exists(filepath):
        return False
    
    print(f"\nUpdating {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update validation logic
    content = re.sub(
        r'standard\["class_c_min"\] <= value <= standard\["class_c_max"\]',
        'standard["min_limit"] <= value <= standard["max_limit"]',
        content
    )
    
    # Write updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("  - Updated validation logic")
    return True

def update_models_init():
    """Update app/models/__init__.py."""
    filepath = 'app/models/__init__.py'
    if not os.path.exists(filepath):
        return False
    
    print(f"\nUpdating {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update the update method
    old_update = '''    @staticmethod
    def update(parameter_name: str, class_c_min: float, class_c_max: float) -> bool:
        """Update parameter standards."""
        try:
            conn = get_db_connection()
            conn.execute(
                """UPDATE standards
                   SET class_c_min = ?, class_c_max = ?
                   WHERE parameter = ?""",
                (class_c_min, class_c_max, parameter_name)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating standards: {e}")
            return False'''
    
    new_update = '''    @staticmethod
    def update(parameter_name: str, min_limit: float, max_limit: float) -> bool:
        """Update parameter standards."""
        try:
            conn = get_db_connection()
            conn.execute(
                """UPDATE standards
                   SET min_limit = ?, max_limit = ?
                   WHERE parameter = ?""",
                (min_limit, max_limit, parameter_name)
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error updating standards: {e}")
            return False'''
    
    if old_update in content:
        content = content.replace(old_update, new_update)
        print("  - Updated Parameter.update method")
    
    # Update validation logic
    content = re.sub(
        r'standard\["class_c_min"\] <= row\[param\] <= standard\["class_c_max"\]',
        'standard["min_limit"] <= row[param] <= standard["max_limit"]',
        content
    )
    
    # Write updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def main():
    """Main update function."""
    print("=" * 60)
    print("Updating Python Files for Class C Standards Only")
    print("=" * 60)
    
    # Find all Python files
    python_files = []
    for root, dirs, files in os.walk('.'):
        # Skip virtual environments and hidden directories
        if any(skip in root for skip in ['venv', '.venv', '__pycache__', '.git', 'node_modules']):
            continue
        
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    print(f"Found {len(python_files)} Python files to check")
    
    updated_count = 0
    
    # Update specific files first
    update_routes_refactored()
    update_services_file()
    update_models_init()
    
    # Update all other Python files
    for filepath in python_files:
        if 'update_all_python_files.py' in filepath or 'simplify_class_c.py' in filepath or 'update_alert_logic.py' in filepath:
            continue  # Skip this script itself
        
        try:
            if update_file(filepath):
                updated_count += 1
        except Exception as e:
            print(f"  - Error updating {filepath}: {e}")
    
    print(f"\n{'=' * 60}")
    print(f"Update complete!")
    print(f"Updated {updated_count} Python files")
    print(f"All Class A/B references have been removed")
    print(f"System now uses only Class C standards (min_limit, max_limit)")
    print(f"{'=' * 60}")
    
    # Test the updates
    print("\nTesting the updates...")
    try:
        # Try to import the updated modules
        import sys
        sys.path.insert(0, '.')
        
        # Check if we can import the models
        from app.models import get_db_connection
        
        conn = get_db_connection()
        cursor = conn.execute("SELECT parameter, min_limit, max_limit FROM standards LIMIT 3")
        standards = cursor.fetchall()
        conn.close()
        
        print(f"✓ Database connection successful")
        print(f"✓ Found {len(standards)} standards in database")
        
        for std in standards:
            print(f"  - {std['parameter']}: {std['min_limit']} - {std['max_limit']}")
        
        print("\n✓ All updates completed successfully!")
        print("✓ System is ready for testing")
        
    except Exception as e:
        print(f"✗ Error testing updates: {e}")
        print("Please check the updates manually")

if __name__ == "__main__":
    main()