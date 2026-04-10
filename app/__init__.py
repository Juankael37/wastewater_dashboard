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
            parameter TEXT UNIQUE,
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


import os
from flask import send_from_directory

# ---------------- APP FACTORY ----------------
def create_app():
    app = Flask(__name__)
    app.secret_key = "secret123"
    
    # Path to the React PWA build output
    PWA_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')
    
    # Configure session cookie for same-site requests (localhost:5173 -> localhost:5000)
    # Lax allows cookies on top-level navigation and same-site requests
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False  # False for localhost HTTP
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_DOMAIN'] = None  # Default to request host
    
    # Enable CORS for all routes - dynamic origin matching for development
    # This allows any localhost or 192.168.x.x origin for development
    def get_allowed_origins():
        """Return list of allowed origins for development."""
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://192.168.1.4:5173",
            "http://192.168.1.5:5173",
            "http://192.168.1.6:5173",
            "http://192.168.0.4:5173",
            "http://192.168.0.5:5173",
            "http://192.168.0.6:5173",
            "http://10.0.0.4:5173",
            "http://10.0.0.5:5173",
            "http://10.0.0.6:5173",
        ]
    
    CORS(app,
         supports_credentials=True,
         origins=get_allowed_origins(),
         allow_headers=["Content-Type", "X-Requested-With", "Authorization", "Accept", "Origin"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         expose_headers=["Set-Cookie"])

    # INIT DB - Use the new models initialization
    from .models import init_db
    init_db()
    from .models import create_admin
    create_admin()

    # LOGIN SETUP
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    # REGISTER ROUTES
    from .routes_refactored import main
    app.register_blueprint(main)

    return app