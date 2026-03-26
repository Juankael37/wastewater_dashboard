from flask import Blueprint, render_template, request, redirect, jsonify, send_file
from flask_login import login_user, login_required, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import io

from .models import get_db_connection
from .__init__ import User

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet

main = Blueprint('main', __name__)

# ================= ALERT LOGIC =================
def get_status(value, min_val, max_val):
    if value < min_val or value > max_val:
        return "CRITICAL"

    margin = (max_val - min_val) * 0.1

    if value < (min_val + margin) or value > (max_val - margin):
        return "WARNING"

    return "SAFE"


# ================= SMART ALERT ENGINE =================
def create_alert(parameter, value, status):
    conn = get_db_connection()

    existing = conn.execute("""
        SELECT * FROM alerts
        WHERE parameter = ? AND state = 'ACTIVE'
        ORDER BY timestamp DESC LIMIT 1
    """, (parameter,)).fetchone()

    now = datetime.datetime.now()

    if existing:
        last_time = datetime.datetime.strptime(existing["timestamp"], "%Y-%m-%d %H:%M:%S")

        # ⏱ 10 MIN COOLDOWN
        if (now - last_time).total_seconds() < 600:
            conn.close()
            return

        # 🚫 SAME STATUS → SKIP
        if existing["status"] == status:
            conn.close()
            return

    # ✅ CREATE ALERT
    conn.execute("""
        INSERT INTO alerts (parameter, value, status, state, timestamp)
        VALUES (?, ?, ?, 'ACTIVE', ?)
    """, (
        parameter,
        value,
        status,
        now.strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()


def resolve_alert(parameter):
    conn = get_db_connection()

    conn.execute("""
        UPDATE alerts
        SET state = 'RESOLVED',
            resolved_at = ?
        WHERE parameter = ? AND state = 'ACTIVE'
    """, (
        datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        parameter
    ))

    conn.commit()
    conn.close()


# ================= REGISTER =================
@main.route('/register', methods=['GET', 'POST'])
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
        except Exception:
            conn.close()
            return "Username already exists ❌"

        conn.close()
        return redirect('/login')

    return render_template('register.html')


# ================= LOGIN =================
@main.route('/login', methods=['GET', 'POST'])
def login():
    error = None

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
            error = "Invalid username or password"

    return render_template('login.html', error=error)


# ================= LOGOUT =================
@main.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login')


# ================= HOME =================
@main.route('/')
@login_required
def home():
    return render_template('index.html')


# ================= INPUT =================
@main.route('/input', methods=['GET', 'POST'])
@login_required
def input_page():
    if request.method == 'POST':
        ph = float(request.form.get('ph'))
        cod = float(request.form.get('cod'))
        bod = float(request.form.get('bod'))
        tss = float(request.form.get('tss'))

        conn = get_db_connection()

        conn.execute("""
            INSERT INTO data (ph, cod, bod, tss, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            ph, cod, bod, tss,
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        conn.commit()
        conn.close()

        # 🔥 SMART ALERT CHECK
        conn = get_db_connection()
        std_rows = conn.execute("SELECT * FROM standards").fetchall()
        conn.close()

        standards = {s["parameter"]: s for s in std_rows}

        values = {
            "ph": ph,
            "cod": cod,
            "bod": bod,
            "tss": tss
        }

        for param, value in values.items():
            s = standards.get(param)
            if not s:
                continue

            min_val = s["class_c_min"]
            max_val = s["class_c_max"]

            status = get_status(value, min_val, max_val)

            if status == "SAFE":
                resolve_alert(param)
            else:
                create_alert(param, value, status)

        return redirect('/')

    return render_template('input.html')


# ================= API =================
@main.route('/api/data')
@login_required
def api_data():
    filter_type = request.args.get('filter', 'all')
    selected_class = request.args.get('class', 'C')

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

    std_rows = conn.execute("SELECT * FROM standards").fetchall()
    conn.close()

    rows_list = [{
        "id": r["id"],
        "ph": float(r["ph"]),
        "cod": float(r["cod"]),
        "bod": float(r["bod"]),
        "tss": float(r["tss"]),
        "timestamp": r["timestamp"]
    } for r in rows]

    standards = {}

    for s in std_rows:
        param = s["parameter"]

        if selected_class == "A":
            min_val = float(s["class_a_min"])
            max_val = float(s["class_a_max"])
        elif selected_class == "B":
            min_val = float(s["class_b_min"])
            max_val = float(s["class_b_max"])
        else:
            min_val = float(s["class_c_min"])
            max_val = float(s["class_c_max"])

        standards[param] = {
            "min": min_val,
            "max": max_val
        }

    return jsonify({
        "selected_class": selected_class,
        "rows": rows_list,
        "timestamps": [r["timestamp"][11:19] for r in rows_list],
        "ph": [r["ph"] for r in rows_list],
        "cod": [r["cod"] for r in rows_list],
        "bod": [r["bod"] for r in rows_list],
        "tss": [r["tss"] for r in rows_list],
        "standards": standards
    })


# ================= ALERTS PAGE =================
@main.route('/alerts')
@login_required
def alerts():
    conn = get_db_connection()

    rows = conn.execute("""
        SELECT * FROM alerts ORDER BY timestamp DESC
    """).fetchall()

    conn.close()

    alerts_data = [{
        "parameter": r["parameter"],
        "value": r["value"],
        "status": r["status"],
        "state": r["state"],
        "timestamp": r["timestamp"],
        "resolved_at": r["resolved_at"]
    } for r in rows]

    return render_template("alerts.html", alerts=alerts_data)