"""
Refactored routes for the Wastewater Monitoring System.
This version uses the new service layer and follows separation of concerns.
"""

from flask import Blueprint, render_template, request, jsonify, send_file, abort, redirect
from flask_login import login_required, current_user, login_user, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import io

from app.models import Parameter, Measurement, Alert, Report
from app.services import (
    ValidationService,
    AlertService,
    ReportService,
    DataImportService
)
from app.__init__ import User, get_connection
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet

main = Blueprint('main', __name__)


# ================= AUTHENTICATION ROUTES =================
@main.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    error = None
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()
        conn.close()
        
        if user and check_password_hash(user["password"], password):
            login_user(User(user["id"]))
            # Check if this is an API request (from React frontend)
            if request.headers.get('Content-Type', '').startswith('multipart/form-data') or \
               request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': True, 'message': 'Login successful', 'username': username})
            return redirect('/')
        else:
            error = "Invalid username or password"
            # Check if this is an API request
            if request.headers.get('Content-Type', '').startswith('multipart/form-data') or \
               request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'success': False, 'error': error}), 401
    
    # If GET request or regular form submission with error
    return render_template('login.html', error=error)


@main.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            return "Username and password required ❌"
        
        hashed_password = generate_password_hash(password)
        
        conn = get_connection()
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


@main.route('/logout')
@login_required
def logout():
    """Handle user logout."""
    logout_user()
    return redirect('/login')


# ================= DASHBOARD & VIEW ROUTES =================
@main.route('/')
@login_required
def index():
    """Render the main dashboard."""
    return render_template('index.html')


@main.route('/dashboard')
@login_required
def dashboard():
    """Render the dashboard page."""
    return render_template('index.html')


# ================= ALERT LOGIC =================
def get_status(parameter, value):
    """Determine status (SAFE, WARNING, CRITICAL) for a parameter value."""
    conn = get_connection()
    standard = conn.execute(
        "SELECT min_limit, max_limit FROM standards WHERE parameter = ?",
        (parameter,)
    ).fetchone()
    conn.close()

    if not standard:
        return "SAFE"  # Fallback if no standard is found

    min_val = standard["min_limit"]
    max_val = standard["max_limit"]

    if value < min_val or value > max_val:
        return "CRITICAL"

    margin = (max_val - min_val) * 0.1

    if value < (min_val + margin) or value > (max_val - margin):
        return "WARNING"

    return "SAFE"


@main.route('/reports')
@login_required
def reports_page():
    """Render the reports page with data."""
    conn = get_connection()
    
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


@main.route('/alerts')
@login_required
def alerts_page():
    """Render the alerts page."""
    return render_template('alerts.html')


# ================= API ENDPOINTS =================
@main.route('/api/data')
@login_required
def api_data():
    """Get chart data for the dashboard."""
    chart_data = Measurement.get_for_chart()
    return jsonify(chart_data)


@main.route('/api/measurements')
@login_required
def api_measurements():
    """Get recent measurements."""
    limit = request.args.get('limit', 50, type=int)
    measurements = Measurement.get_all(limit=limit)
    return jsonify(measurements)


@main.route('/api/measurements/recent')
@login_required
def api_recent_measurements():
    """Get recent measurements for the dashboard."""
    days = request.args.get('days', 7, type=int)
    measurements = Measurement.get_recent(days=days)
    return jsonify(measurements)


@main.route('/api/measurements', methods=['POST'])
@login_required
def api_create_measurement():
    """Create a new measurement with all parameters."""
    data = request.json
    
    # Validate required fields
    required_fields = ['timestamp']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Create measurement with all parameters
        measurement_id = Measurement.create(
            timestamp=data['timestamp'],
            ph=float(data.get('ph')) if data.get('ph') is not None else None,
            cod=float(data.get('cod')) if data.get('cod') is not None else None,
            bod=float(data.get('bod')) if data.get('bod') is not None else None,
            tss=float(data.get('tss')) if data.get('tss') is not None else None,
            ammonia=float(data.get('ammonia')) if data.get('ammonia') is not None else None,
            nitrate=float(data.get('nitrate')) if data.get('nitrate') is not None else None,
            phosphate=float(data.get('phosphate')) if data.get('phosphate') is not None else None,
            temperature=float(data.get('temperature')) if data.get('temperature') is not None else None,
            flow=float(data.get('flow')) if data.get('flow') is not None else None,
            measurement_type=data.get('type', 'effluent'),
            plant_id=data.get('plant_id', 1),
            operator_id=data.get('operator_id'),
            notes=data.get('notes')
        )
        
        # Check for alerts
        alerts = AlertService.check_and_create_alerts(data)
        
        return jsonify({
            "success": True,
            "id": measurement_id,
            "alerts_created": len(alerts),
            "message": "Measurement created successfully"
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid data format: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@main.route('/api/alerts')
@login_required
def api_alerts():
    """Get active alerts."""
    alerts = Alert.get_active()
    return jsonify(alerts)


@main.route('/api/alerts/dashboard')
@login_required
def api_dashboard_alerts():
    """Get alerts summary for dashboard."""
    alerts_summary = AlertService.get_dashboard_alerts()
    return jsonify(alerts_summary)


@main.route('/api/alerts/<int:alert_id>/resolve', methods=['POST'])
@login_required
def api_resolve_alert(alert_id):
    """Resolve an alert."""
    success = Alert.resolve(alert_id)
    if success:
        return jsonify({"success": True, "message": "Alert resolved"})
    else:
        return jsonify({"error": "Alert not found"}), 404


@main.route('/api/parameters')
@login_required
def api_parameters():
    """Get all parameters with standards."""
    parameters = Parameter.get_all()
    return jsonify(parameters)


@main.route('/api/parameters/<parameter_name>', methods=['PUT'])
@login_required
def api_update_parameter(parameter_name):
    """Update parameter standards."""
    data = request.json
    
    if 'min_limit' not in data or 'max_limit' not in data:
        return jsonify({"error": "Missing min_limit or max_limit"}), 400
    
    success = Parameter.update(
        parameter_name,
        float(data['min_limit']),
        float(data['max_limit'])
    )
    
    if success:
        return jsonify({"success": True, "message": "Parameter updated"})
    else:
        return jsonify({"error": "Parameter not found"}), 404


@main.route('/api/reports/daily')
@login_required
def api_daily_report():
    """Get daily report data."""
    report = ReportService.generate_daily_report()
    return jsonify(report)


@main.route('/api/reports/summary')
@login_required
def api_report_summary():
    """Get report summary for a date range."""
    start_date = request.args.get('start', datetime.datetime.now().strftime('%Y-%m-01'))
    end_date = request.args.get('end', datetime.datetime.now().strftime('%Y-%m-%d'))
    
    summary = Report.get_summary(start_date, end_date)
    return jsonify(summary)


@main.route('/api/reports/performance')
@login_required
def api_performance_metrics():
    """Get performance metrics."""
    days = request.args.get('days', 30, type=int)
    metrics = ReportService.generate_performance_metrics(days)
    return jsonify(metrics)


@main.route('/api/validation/check', methods=['POST'])
@login_required
def api_validate_measurement():
    """Validate measurement values without saving."""
    data = request.json
    
    validation_results = ValidationService.validate_measurement(
        ph=data.get('ph'),
        cod=data.get('cod'),
        bod=data.get('bod'),
        tss=data.get('tss'),
        ammonia=data.get('ammonia'),
        nitrate=data.get('nitrate'),
        phosphate=data.get('phosphate'),
        temperature=data.get('temperature'),
        flow=data.get('flow')
    )
    
    return jsonify(validation_results)


# ================= DATA IMPORT/EXPORT =================
@main.route('/api/data/import', methods=['POST'])
@login_required
def api_import_data():
    """Import data from CSV."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({"error": "File must be CSV"}), 400
    
    csv_data = file.read().decode('utf-8')
    result = DataImportService.import_from_csv(csv_data)
    
    return jsonify(result)


@main.route('/api/data/export')
@login_required
def api_export_data():
    """Export data as CSV."""
    csv_data = DataImportService.export_to_csv()
    
    # Create file response
    output = io.BytesIO()
    output.write(csv_data.encode('utf-8'))
    output.seek(0)
    
    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'wastewater_data_{datetime.datetime.now().strftime("%Y%m%d")}.csv'
    )


# ================= PDF REPORT GENERATION =================
@main.route('/api/reports/pdf')
@login_required
def api_generate_pdf():
    """Generate PDF report."""
    try:
        # Get report data
        start_date = request.args.get('start', datetime.datetime.now().strftime('%Y-%m-01'))
        end_date = request.args.get('end', datetime.datetime.now().strftime('%Y-%m-%d'))
        
        summary = Report.get_summary(start_date, end_date)
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        
        # Add title
        styles = getSampleStyleSheet()
        title = Paragraph(f"Wastewater Treatment Report<br/>{start_date} to {end_date}", 
                         styles['Title'])
        elements.append(title)
        
        # Add summary table
        summary_data = [
            ['Metric', 'Value'],
            ['Report Period', f'{start_date} to {end_date}'],
            ['Total Measurements', summary['count']],
            ['Compliance Rate', f"{summary['compliance_rate']}%"],
            ['Active Alerts', summary['alerts']],
            ['Generated On', datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            ['Generated By', current_user.email if current_user.is_authenticated else 'System']
        ]
        
        table = Table(summary_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'wastewater_report_{start_date}_to_{end_date}.pdf'
        )
        
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500


# ================= LEGACY COMPATIBILITY ROUTES =================
@main.route('/export/pdf')
@login_required
def legacy_export_pdf():
    """Legacy PDF export endpoint for compatibility with existing templates."""
    return redirect('/api/reports/pdf')


# ================= ERROR HANDLERS =================
@main.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404


@main.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Internal server error"}), 500


@main.errorhandler(401)
def unauthorized(error):
    return jsonify({"error": "Unauthorized access"}), 401