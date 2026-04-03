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
        min_limit REAL,
        max_limit REAL
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
        ])

    conn.commit()
    conn.close()