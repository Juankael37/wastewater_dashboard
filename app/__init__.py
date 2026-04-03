from flask import Flask
from flask_login import LoginManager, UserMixin
from flask_cors import CORS
import sqlite3
from werkzeug.security import generate_password_hash

login_manager = LoginManager()

# ---------------- USER CLASS ----------------
class User(UserMixin):
    def __init__(self, id):
        self.id = id


@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


# ---------------- DATABASE CONNECTION HELPER ----------------
def get_connection():
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row  # 🔥 IMPORTANT FIX
    return conn


# ---------------- DATABASE INIT ----------------
def init_db():
    conn = sqlite3.connect('data.db')
    c = conn.cursor()

    # ---------------- DATA TABLE (🔥 CRITICAL FIX) ----------------
    c.execute('''
    CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ph REAL,
        cod REAL,
        bod REAL,
        tss REAL,
        timestamp TEXT
    )
    ''')

    # ---------------- ALERTS TABLE ----------------
    c.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT,
        value REAL,
        status TEXT,
        state TEXT DEFAULT 'ACTIVE',
        timestamp TEXT,
        resolved_at TEXT
    )
    ''')

    # MIGRATION SAFETY
    try:
        c.execute("ALTER TABLE alerts ADD COLUMN state TEXT DEFAULT 'ACTIVE'")
    except:
        pass

    try:
        c.execute("ALTER TABLE alerts ADD COLUMN resolved_at TEXT")
    except:
        pass

    # ---------------- USERS TABLE ----------------
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    ''')

    # ---------------- STANDARDS TABLE ----------------
    c.execute('''
        CREATE TABLE IF NOT EXISTS standards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parameter TEXT,
            min_limit REAL,
            max_limit REAL,
            min_limit REAL,
            max_limit REAL,
            min_limit REAL,
            max_limit REAL
        )
    ''')

    conn.commit()
    conn.close()


# ---------------- CREATE ADMIN USER ----------------
def create_admin():
    conn = sqlite3.connect('data.db')
    c = conn.cursor()

    try:
        c.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            ("admin", generate_password_hash("admin123"))
        )
    except:
        pass  # already exists

    conn.commit()
    conn.close()


# ---------------- APP FACTORY ----------------
def create_app():
    app = Flask(__name__)
    app.secret_key = "secret123"
    
    # Enable CORS for all routes - allow all origins for development
    CORS(app, supports_credentials=True, origins="*")

    # INIT DB - Use the new models initialization
    from .models import init_db
    init_db()
    create_admin()

    # LOGIN SETUP
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    # REGISTER ROUTES - Use refactored routes
    try:
        from .routes_refactored import main
    except ImportError:
        # Fall back to original routes if refactored version not available
        from .routes import main
    
    app.register_blueprint(main)

    return app