
import sqlite3

def get_db_connection():
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row

    # -----------------------------
    # CREATE STANDARDS TABLE
    # -----------------------------
    conn.execute("""
    CREATE TABLE IF NOT EXISTS standards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT,
        class_a_min REAL,
        class_a_max REAL,
        class_b_min REAL,
        class_b_max REAL,
        class_c_min REAL,
        class_c_max REAL
    )
    """)
    conn.commit()

    # -----------------------------
    # INSERT DEFAULT STANDARDS
    # -----------------------------
    conn.execute("""
    INSERT OR IGNORE INTO standards (id, parameter, class_a_min, class_a_max, class_b_min, class_b_max, class_c_min, class_c_max)
    VALUES
    (1, 'ph', 6.0, 9.0, 6.0, 9.0, 6.0, 9.5),
    (2, 'cod', 0, 60, 0, 60, 0, 100),
    (3, 'bod', 0, 20, 0, 30, 0, 50),
    (4, 'tss', 0, 70, 0, 85, 0, 100)
    """)
    conn.commit()

    # -----------------------------
    # CREATE DATA TABLE
    # -----------------------------
    conn.execute("""
    CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        ph REAL,
        cod REAL,
        bod REAL,
        tss REAL
    )
    """)
    conn.commit()

    return conn