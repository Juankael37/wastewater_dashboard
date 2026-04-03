import sqlite3
import datetime

def reset_database():
    """Reset the data table with fresh sample data"""
    conn = sqlite3.connect('data.db')
    cursor = conn.cursor()
    
    print("Current data count:", cursor.execute("SELECT COUNT(*) FROM data").fetchone()[0])
    
    # Ask for confirmation
    response = input("Are you sure you want to delete all data? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        conn.close()
        return
    
    # Delete all data
    cursor.execute("DELETE FROM data")
    print(f"Deleted {cursor.rowcount} records")
    
    # Add fresh sample data
    sample_data = [
        (datetime.datetime.now().isoformat(), 7.2, 85.0, 42.0, 95.0),
        ((datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat(), 7.1, 82.0, 40.0, 92.0),
        ((datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(), 7.3, 88.0, 45.0, 98.0),
        ((datetime.datetime.now() - datetime.timedelta(hours=3)).isoformat(), 7.0, 90.0, 43.0, 100.0),
        ((datetime.datetime.now() - datetime.timedelta(hours=4)).isoformat(), 7.4, 78.0, 38.0, 88.0),
    ]
    
    cursor.executemany(
        "INSERT INTO data (timestamp, ph, cod, bod, tss) VALUES (?, ?, ?, ?, ?)",
        sample_data
    )
    
    conn.commit()
    print(f"Added {len(sample_data)} new sample records")
    
    # Verify
    count = cursor.execute("SELECT COUNT(*) FROM data").fetchone()[0]
    print(f"Total records now: {count}")
    
    # Show sample
    cursor.execute("SELECT timestamp, ph, cod, bod, tss FROM data ORDER BY timestamp DESC LIMIT 3")
    print("\nSample of new data:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: pH={row[1]}, COD={row[2]}, BOD={row[3]}, TSS={row[4]}")
    
    conn.close()
    print("\nDatabase reset complete!")

if __name__ == "__main__":
    reset_database()