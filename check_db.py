import sqlite3
import sys

def check_database():
    try:
        conn = sqlite3.connect('data.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print("Tables in database:")
        for table in tables:
            print(f"  - {table['name']}")
        
        # Check data table
        if 'data' in [t['name'] for t in tables]:
            cursor.execute("SELECT COUNT(*) as count FROM data")
            count = cursor.fetchone()['count']
            print(f"\nRows in 'data' table: {count}")
            
            if count > 0:
                cursor.execute("SELECT timestamp, ph, cod, bod, tss FROM data ORDER BY timestamp DESC LIMIT 5")
                rows = cursor.fetchall()
                print("\nLatest 5 records:")
                for row in rows:
                    print(f"  {row['timestamp']}: pH={row['ph']}, COD={row['cod']}, BOD={row['bod']}, TSS={row['tss']}")
            else:
                print("\n'data' table is empty!")
        else:
            print("\n'data' table does not exist!")
            
        conn.close()
        return True
    except Exception as e:
        print(f"Error checking database: {e}")
        return False

if __name__ == "__main__":
    check_database()