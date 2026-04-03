#!/usr/bin/env python3
"""
Script to update alert generation logic to use only Class C standards.
"""

import re

def update_routes_file():
    """Update app/routes.py to use Class C standards only."""
    print("Updating app/routes.py alert logic...")
    
    with open('app/routes.py', 'r') as f:
        content = f.read()
    
    # Update the get_status function
    old_get_status = '''def get_status(parameter, value):
    conn = get_db_connection()
    standard = conn.execute(
        "SELECT class_a_min, class_a_max FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()
    conn.close()

    if not standard:
        return "SAFE"  # Fallback if no standard is found

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
        return "SAFE"  # Fallback if no standard is found

    min_val = standard["min_limit"]
    max_val = standard["max_limit"]

    if value < min_val or value > max_val:
        return "CRITICAL"

    margin = (max_val - min_val) * 0.1

    if value < (min_val + margin) or value > (max_val - margin):
        return "WARNING"

    return "SAFE"'''
    
    # Update the create_alert function if it references classes
    old_create_alert_start = '''def create_alert(parameter, value, status):
    conn = get_db_connection()
    standard = conn.execute(
        "SELECT class_a_min, class_a_max FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()'''
    
    new_create_alert_start = '''def create_alert(parameter, value, status):
    conn = get_db_connection()
    standard = conn.execute(
        "SELECT min_limit, max_limit FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()'''
    
    # Update any other references to class_a_min, class_a_max, class_b_min, class_b_max, class_c_min, class_c_max
    content = content.replace(old_get_status, new_get_status)
    content = content.replace(old_create_alert_start, new_create_alert_start)
    
    # Replace any remaining references to class-specific columns
    content = content.replace('class_a_min', 'min_limit')
    content = content.replace('class_a_max', 'max_limit')
    content = content.replace('class_b_min', 'min_limit')
    content = content.replace('class_b_max', 'max_limit')
    content = content.replace('class_c_min', 'min_limit')
    content = content.replace('class_c_max', 'max_limit')
    
    # Update the data submission endpoint to handle all parameters
    # Find the /submit-data endpoint
    submit_data_pattern = r'@main\.route\(\'/submit-data\''
    if submit_data_pattern in content:
        print("  - Found /submit-data endpoint")
    
    # Update the API data endpoint to include all parameters
    api_data_pattern = r'@main\.route\(\'/api/data\'\)\s+@login_required\s+def api_data\(\):'
    if api_data_pattern in content:
        # Find the SQL query in api_data function
        sql_pattern = r'SELECT timestamp, ph, cod, bod, tss\s+FROM data'
        new_sql = '''SELECT timestamp, ph, cod, bod, tss, ammonia, nitrate, phosphate, temperature, flow
        FROM data'''
        content = re.sub(sql_pattern, new_sql, content)
        print("  - Updated API data query to include all parameters")
    
    # Write updated content
    with open('app/routes.py', 'w') as f:
        f.write(content)
    
    print("  - Updated alert logic to use Class C standards (min_limit, max_limit)")
    return True

def update_input_form():
    """Update the input form template to include all parameters."""
    print("\nUpdating input form template...")
    
    try:
        with open('app/templates/input.html', 'r') as f:
            content = f.read()
        
        # Check if we need to update the form
        if 'ammonia' not in content.lower():
            print("  - Input form needs updating to include all parameters")
            # We'll update this separately
        else:
            print("  - Input form already includes all parameters")
            
    except FileNotFoundError:
        print("  - input.html not found, skipping form update")
    
    return True

def update_dashboard_template():
    """Update dashboard template to show Class C compliance only."""
    print("\nUpdating dashboard template...")
    
    try:
        with open('app/templates/index.html', 'r') as f:
            content = f.read()
        
        # Remove any references to Class A or Class B
        content = re.sub(r'Class [AB]', 'Class C', content, flags=re.IGNORECASE)
        content = re.sub(r'class_[ab]', 'class_c', content, flags=re.IGNORECASE)
        
        # Write updated content
        with open('app/templates/index.html', 'w') as f:
            f.write(content)
        
        print("  - Updated dashboard to show only Class C compliance")
        
    except FileNotFoundError:
        print("  - index.html not found, skipping dashboard update")
    
    return True

def main():
    """Main update function."""
    print("=" * 60)
    print("Updating Alert Logic for Class C Standards Only")
    print("=" * 60)
    
    try:
        # Backup routes file
        import shutil
        shutil.copy2('app/routes.py', 'app/routes.py.backup')
        print("Created backup: app/routes.py.backup")
        
        # Update files
        update_routes_file()
        update_input_form()
        update_dashboard_template()
        
        print("\n" + "=" * 60)
        print("SUCCESS: Alert logic updated for Class C standards!")
        print("Next steps:")
        print("1. Restart Flask server (already auto-reloaded)")
        print("2. Test the updated alert generation")
        print("3. Verify all parameters are working")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\nERROR: Update failed: {e}")
        print("Restoring from backup...")
        if os.path.exists('app/routes.py.backup'):
            import shutil
            shutil.copy2('app/routes.py.backup', 'app/routes.py')
            print("Restored app/routes.py from backup")
        return False

if __name__ == "__main__":
    import os
    main()