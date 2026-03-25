from flask import Flask, render_template, request, redirect, jsonify
import sqlite3
import datetime

# 🔐 Login system
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "secret123"

# ---------------- LOGIN SETUP ----------------
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'


# ---------------- USER CLASS ----------------
class User(UserMixin):
    def __init__(self, id):
        self.id = id


@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


# ---------------- DATABASE ----------------
def get_db_connection():
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row
    return conn


# ---------------- REGISTER ----------------
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            return "Username and password required ❌"

        hashed_password = generate_password_hash(password)

        conn = get_db_connection()

        try:
            conn.execute(
                "INSERT INTO users (username, password) VALUES (?, ?)",
                (username, hashed_password)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return "Username already exists ❌"
        except Exception as e:
            conn.close()
            return f"Error: {str(e)}"

        conn.close()
        return redirect('/login')

    return render_template('register.html')


# ---------------- LOGIN ----------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()
        conn.close()

        if user and check_password_hash(user["password"], password):
            login_user(User(user["id"]))
            return redirect('/')
        else:
            return "Invalid login ❌"

    return render_template('login.html')


# ---------------- LOGOUT ----------------
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login')


# ---------------- HOME ----------------
@app.route('/')
@login_required
def home():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM data ORDER BY timestamp").fetchall()
    conn.close()

    timestamps = [row["timestamp"] for row in rows]
    ph_values = [row["ph"] for row in rows]
    cod_values = [row["cod"] for row in rows]
    bod_values = [row["bod"] for row in rows]
    tss_values = [row["tss"] for row in rows]
    ids = [row["id"] for row in rows]

    return render_template(
        'index.html',
        rows=rows,
        timestamps=timestamps,
        ph_values=ph_values,
        cod_values=cod_values,
        bod_values=bod_values,
        tss_values=tss_values,
        ids=ids
    )


# ---------------- INPUT ----------------
@app.route('/input', methods=['GET', 'POST'])
@login_required
def input_page():
    if request.method == 'POST':
        ph = request.form.get('ph')
        cod = request.form.get('cod')
        bod = request.form.get('bod')
        tss = request.form.get('tss')

        conn = get_db_connection()

        conn.execute("""
            INSERT INTO data (ph, cod, bod, tss, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            float(ph),
            float(cod),
            float(bod),
            float(tss),
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        conn.commit()
        conn.close()

        return redirect('/')

    return render_template('input.html')


# ---------------- DELETE ----------------
@app.route('/delete/<int:id>')
@login_required
def delete(id):
    conn = get_db_connection()
    conn.execute("DELETE FROM data WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return redirect('/')


# ---------------- API ----------------
@app.route('/api/data')
@login_required
def api_data():
    filter_type = request.args.get('filter', 'all')

    conn = get_db_connection()

    if filter_type == "today":
        rows = conn.execute(
            "SELECT * FROM data WHERE DATE(timestamp)=DATE('now') ORDER BY timestamp"
        ).fetchall()
    elif filter_type == "7days":
        rows = conn.execute(
            "SELECT * FROM data WHERE timestamp >= datetime('now','-7 days') ORDER BY timestamp"
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM data ORDER BY timestamp"
        ).fetchall()

    conn.close()

    rows_list = []
    for r in rows:
        rows_list.append({
            "id": r["id"],
            "ph": float(r["ph"]),
            "cod": float(r["cod"]),
            "bod": float(r["bod"]),
            "tss": float(r["tss"]),
            "timestamp": r["timestamp"]
        })

    return jsonify({
        "rows": rows_list,
        "timestamps": [r["timestamp"][11:19] for r in rows_list],
        "ph": [r["ph"] for r in rows_list],
        "cod": [r["cod"] for r in rows_list],
        "bod": [r["bod"] for r in rows_list],
        "tss": [r["tss"] for r in rows_list]
    })


# ---------------- RUN ----------------
if __name__ == '__main__':
    app.run(debug=True)