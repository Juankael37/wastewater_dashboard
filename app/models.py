import sqlite3

# ---------------- DATABASE CONNECTION ----------------
def get_db_connection():
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row  # 🔥 REQUIRED for dict-style access
    return conn


# ---------------- DATABASE INITIALIZATION ----------------
def init_db():
    conn = get_db_connection()
    c = conn.cursor()

    # ---------------- STANDARDS TABLE ----------------
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
    """)

    # ---------------- DATA TABLE ----------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        ph REAL,
        cod REAL,
        bod REAL,
        tss REAL
    )
    """)

    # ---------------- ALERTS TABLE ----------------
    c.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT,
        value REAL,
        status TEXT,
        state TEXT DEFAULT 'ACTIVE',
        timestamp TEXT,
        resolved_at TEXT
    )
    """)

    # ---------------- INSERT DEFAULT STANDARDS (SAFE) ----------------
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
        ])

    conn.commit()
    conn.close()