import sqlite3

def check_users():
    try:
        conn = sqlite3.connect('data.db')
        c = conn.cursor()
        
        # Check if users table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        table_exists = c.fetchone()
        
        if not table_exists:
            print("Users table does not exist yet.")
            return
        
        # Get all users
        c.execute('SELECT * FROM users')
        users = c.fetchall()
        
        print('Existing users in database:')
        if not users:
            print('No users found in database.')
        else:
            for user in users:
                print(f'ID: {user[0]}, Username: {user[1]}')
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking users: {e}")

if __name__ == '__main__':
    check_users()