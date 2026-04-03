from flask import Blueprint, render_template, request, redirect, jsonify, send_file, abort
from flask_login import login_user, login_required, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import io
import os

from .models import get_db_connection
from .__init__ import User

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet

main = Blueprint('main', __name__)

# ================= API FOR DASHBOARD =================
@main.route('/api/data')
@login_required
def api_data():
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT timestamp, ph, cod, bod, tss
        FROM data
        ORDER BY timestamp ASC
    """).fetchall()
    conn.close()

    data = {
        "labels": [r["timestamp"] for r in rows],
        "ph": [r["ph"] for r in rows],
        "cod": [r["cod"] for r in rows],
        "bod": [r["bod"] for r in rows],
        "tss": [r["tss"] for r in rows],
    }

    return jsonify(data)


# ================= ALERT LOGIC =================
def get_status(parameter, value):
    conn = get_db_connection()
    standard = conn.execute(
        "SELECT class_a_min, class_a_max FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()
    conn.close()

    if not standard:
        return "SAFE"  # Fallback if no standard is found

    min_val = standard["class_a_min"]
    max_val = standard["class_a_max"]

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

        if (now - last_time).total_seconds() < 600:
            conn.close()
            return

        if existing["status"] == status:
            conn.close()
            return

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


# ================= AUTH =================
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
        except:
            conn.close()
            return "Username already exists ❌"

        conn.close()
        return redirect('/login')

    return render_template('register.html')


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

        return redirect('/')

    return render_template('input.html')


# ================= REPORTS =================
@main.route('/reports')
@login_required
def reports():
    conn = get_db_connection()
    
    # Get total readings
    total_readings = conn.execute("SELECT COUNT(*) as count FROM data").fetchone()["count"]
    
    # Get active alerts
    active_alerts = conn.execute("SELECT COUNT(*) as count FROM alerts WHERE state = 'ACTIVE'").fetchone()["count"]
    
    # Get standards data
    standards = conn.execute("SELECT * FROM standards ORDER BY parameter").fetchall()
    
    # Get recent data (last 10 readings)
    recent_data = conn.execute("""
        SELECT timestamp, ph, cod, bod, tss
        FROM data
        ORDER BY timestamp DESC
        LIMIT 10
    """).fetchall()
    
    # Calculate compliance rate (simplified)
    all_data = conn.execute("SELECT ph, cod, bod, tss FROM data").fetchall()
    safe_count = 0
    for row in all_data:
        if (get_status('ph', row['ph']) == 'SAFE' and
            get_status('cod', row['cod']) == 'SAFE' and
            get_status('bod', row['bod']) == 'SAFE' and
            get_status('tss', row['tss']) == 'SAFE'):
            safe_count += 1
    
    compliance_rate = round((safe_count / len(all_data) * 100), 2) if all_data else 100
    
    # Get last 7 days count
    last_7_days = conn.execute("""
        SELECT COUNT(*) as count FROM data
        WHERE timestamp >= datetime('now', '-7 days')
    """).fetchone()["count"]
    
    conn.close()
    
    return render_template('reports_content.html',
                         total_readings=total_readings,
                         active_alerts=active_alerts,
                         standards=standards,
                         recent_data=recent_data,
                         compliance_rate=compliance_rate,
                         last_7_days=last_7_days,
                         get_status=get_status)


# ================= ALERTS =================
@main.route('/alerts')
@login_required
def alerts_page():
    conn = get_db_connection()
    
    # Get all alerts
    alerts = conn.execute("""
        SELECT * FROM alerts
        ORDER BY timestamp DESC
    """).fetchall()
    
    conn.close()
    
    return render_template('alerts.html', alerts=alerts)


# ================= PDF EXPORT =================
@main.route('/export/pdf')
@login_required
def export_pdf():
    conn = get_db_connection()
    
    # Get data for PDF
    standards = conn.execute("SELECT * FROM standards ORDER BY parameter").fetchall()
    recent_data = conn.execute("""
        SELECT timestamp, ph, cod, bod, tss
        FROM data
        ORDER BY timestamp DESC
        LIMIT 20
    """).fetchall()
    
    conn.close()
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph("Wastewater Monitoring Report", styles['Title']))
    elements.append(Paragraph(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Paragraph(" ", styles['Normal']))  # Spacer
    
    # Standards Table
    elements.append(Paragraph("Water Quality Standards", styles['Heading2']))
    
    standards_data = [['Parameter', 'Class A Min', 'Class A Max', 'Class B Min', 'Class B Max', 'Class C Min', 'Class C Max']]
    for std in standards:
        standards_data.append([
            std['parameter'],
            str(std['class_a_min']),
            str(std['class_a_max']),
            str(std['class_b_min']),
            str(std['class_b_max']),
            str(std['class_c_min']),
            str(std['class_c_max'])
        ])
    
    standards_table = Table(standards_data)
    standards_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(standards_table)
    elements.append(Paragraph(" ", styles['Normal']))  # Spacer
    
    # Recent Data Table
    elements.append(Paragraph("Recent Measurements", styles['Heading2']))
    
    data_table = [['Timestamp', 'pH', 'COD', 'BOD', 'TSS']]
    for row in recent_data:
        data_table.append([
            row['timestamp'],
            str(row['ph']),
            str(row['cod']),
            str(row['bod']),
            str(row['tss'])
        ])
    
    data_table_obj = Table(data_table)
    data_table_obj.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(data_table_obj)
    
    # Build PDF
    doc.build(elements)
    
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name='wastewater_report.pdf', mimetype='application/pdf')