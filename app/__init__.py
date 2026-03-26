from flask import Flask
from flask_login import LoginManager, UserMixin
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




# ---------------- DATABASE INIT ----------------
def init_db():
    conn = sqlite3.connect('data.db')
    c = conn.cursor()

    # ALERTS TABLE
    c.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT,
        value REAL,
        status TEXT,
        timestamp TEXT
    )
''')

    # USERS TABLE
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    ''')

    # STANDARDS TABLE
    c.execute('''
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
        pass  # user already exists

    conn.commit()
    conn.close()


# ---------------- APP FACTORY ----------------
def create_app():
    app = Flask(__name__)
    app.secret_key = "secret123"

    # 🔥 ADD THESE
    init_db()
    create_admin()

    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    from .routes import main
    app.register_blueprint(main)


    return app