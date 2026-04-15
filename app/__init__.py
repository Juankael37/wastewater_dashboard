from flask import Flask
from flask_login import LoginManager, UserMixin
from flask_cors import CORS
import sqlite3
import os
import secrets

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


from flask import send_from_directory


def _is_production_like() -> bool:
    """Treat production/staging environments as strict for secrets."""
    app_env = (os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development").strip().lower()
    return app_env in {"production", "prod", "staging", "stage"}


def _parse_allowed_origins(raw_value: str):
    if raw_value:
        parsed = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
        if parsed:
            return parsed
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# ---------------- APP FACTORY ----------------
def create_app():
    app = Flask(__name__)
    secret_key = os.getenv("FLASK_SECRET_KEY")
    if not secret_key:
        if _is_production_like():
            raise RuntimeError("FLASK_SECRET_KEY is required in production/staging environments.")
        secret_key = secrets.token_hex(32)
    app.secret_key = secret_key
    
    # Path to the React PWA build output
    PWA_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')
    
    # Configure session cookie for same-site requests (localhost:5173 -> localhost:5000)
    # Lax allows cookies on top-level navigation and same-site requests
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False  # False for localhost HTTP
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_DOMAIN'] = None  # Default to request host
    
    allowed_origins = _parse_allowed_origins(os.getenv("FLASK_ALLOWED_ORIGINS", ""))
    
    CORS(app,
         supports_credentials=True,
         origins=allowed_origins,
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