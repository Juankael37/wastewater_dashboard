
from flask import Blueprint, render_template, request, redirect, jsonify
from flask_login import login_user, login_required, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

from .models import get_db_connection
from .__init__ import User

main = Blueprint('main', __name__)

# ---------------- REGISTER ----------------
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


# ---------------- LOGIN ----------------
@main.route('/login', methods=['GET', 'POST'])
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
@main.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login')


# ---------------- HOME ----------------
@main.route('/')
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

# ---------------- REPORTS ----------------
@main.route('/reports')
@login_required
def reports():
    conn = get_db_connection()

    rows = conn.execute(
        "SELECT * FROM data ORDER BY timestamp DESC"
    ).fetchall()

    conn.close()

    data = [
        {
            "id": r["id"],
            "ph": float(r["ph"]),
            "cod": float(r["cod"]),
            "bod": float(r["bod"]),
            "tss": float(r["tss"]),
            "timestamp": r["timestamp"]
        } for r in rows
    ]

    return render_template("reports.html", data=data)


# ---------------- INPUT ----------------
@main.route('/input', methods=['GET', 'POST'])
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
@main.route('/delete/<int:id>')
@login_required
def delete(id):
    conn = get_db_connection()
    conn.execute("DELETE FROM data WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    return redirect('/')


# ---------------- API ----------------
@main.route('/api/data')
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

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from flask import send_file
import io


@main.route('/export/pdf')
@login_required
def export_pdf():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM data ORDER BY timestamp DESC").fetchall()
    conn.close()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)

    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("Wastewater Monitoring Report", styles['Title']))

    # Table Data
    data = [["Time", "pH", "COD", "BOD", "TSS"]]

    for r in rows:
        data.append([
            r["timestamp"],
            r["ph"],
            r["cod"],
            r["bod"],
            r["tss"]
        ])

    # Table
    table = Table(data)

    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.grey),
        ('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold')
    ]))

    elements.append(table)

    doc.build(elements)

    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="wastewater_report.pdf",
        mimetype='application/pdf'
    )