"""
Refactored routes for the Wastewater Monitoring System.
This version uses the new service layer and follows separation of concerns.
"""

import os
from flask import Blueprint, render_template, request, jsonify, send_file, abort, redirect, session, send_from_directory
from flask_login import login_required, current_user, login_user, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import io

from app import User, get_connection
from app.models import Parameter, Measurement, Alert, Report, clear_all_data, clear_data_by_date_range, get_data_count
from app.services import (
    ValidationService,
    AlertService,
    ReportService,
    DataImportService
)
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet

main = Blueprint('main', __name__)


def _get_current_user_role():
    """Resolve current user's role from DB with admin fallback for legacy user id=1."""
    if not current_user.is_authenticated:
        return None

    conn = get_connection()
    try:
        try:
            user = conn.execute(
                "SELECT id, role FROM users WHERE id = ?",
                (current_user.id,)
            ).fetchone()
        except Exception:
            # Fallback for older DBs that do not yet have users.role.
            user = conn.execute(
                "SELECT id FROM users WHERE id = ?",
                (current_user.id,)
            ).fetchone()
    finally:
        conn.close()

    if not user:
        return None
    if "role" in user.keys() and user["role"]:
        return user["role"]
    if str(user["id"]) == "1":
        return "admin"
    return "operator"


def _require_admin_json():
    """Return a JSON error response when current user is not admin."""
    role = _get_current_user_role()
    if role != "admin":
        return jsonify({"error": "Admin access required"}), 403
    return None


# ================= AUTHENTICATION ROUTES =================
@main.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    error = None
    
    if request.method == 'POST':
        # Handle both JSON and FormData requests
        if request.is_json:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
        else:
            username = request.form.get('username')
            password = request.form.get('password')
        
        if not username or not password:
            error = "Username and password required"
            is_api_request = (
                request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
                request.headers.get('Sec-Fetch-Mode') == 'cors' or
                (request.headers.get('Origin') and request.headers.get('Origin') != request.url_root.rstrip('/'))
            )
            if is_api_request:
                return jsonify({'success': False, 'error': error}), 400
            return render_template('login.html', error=error)
        
        conn = get_connection()
        user = conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()
        conn.close()
        
        if user and check_password_hash(user["password"], password):
            login_user(User(user["id"]))
            
            # Detect API requests using multiple indicators
            # X-Requested-With may not be sent by browsers for cross-origin requests
            # Use Sec-Fetch-Mode and Origin as reliable indicators
            is_api_request = (
                request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
                request.headers.get('Sec-Fetch-Mode') == 'cors' or
                (request.headers.get('Origin') and request.headers.get('Origin') != request.url_root.rstrip('/'))
            )
            
            if is_api_request:
                return jsonify({'success': True, 'message': 'Login successful', 'username': username})
            
            # For browser form submissions, redirect to dashboard
            return redirect('/')
        else:
            error = "Invalid username or password"
            
            # Detect API requests for error response
            is_api_request = (
                request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
                request.headers.get('Sec-Fetch-Mode') == 'cors' or
                (request.headers.get('Origin') and request.headers.get('Origin') != request.url_root.rstrip('/'))
            )
            if is_api_request:
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


@main.route('/logout', methods=['GET', 'POST', 'OPTIONS'])
def logout():
    """Handle user logout."""
    # Handle CORS preflight for OPTIONS
    if request.method == 'OPTIONS':
        return '', 200
    
    logout_user()
    
    # Check if this is an API request
    is_api_request = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    if is_api_request:
        return jsonify({'success': True, 'message': 'Logged out successfully'})
    
    return redirect('/login')


# ================= DASHBOARD & VIEW ROUTES =================
@main.route('/mobile-test')
def mobile_test():
    """Render the mobile login test page (no auth required)."""
    return render_template('mobile_test.html')


# ================= PWA ROUTES =================
# Path to the React PWA build output
PWA_BUILD_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

@main.route('/pwa')
def pwa_index():
    """Serve the React PWA index.html."""
    return send_from_directory(PWA_BUILD_PATH, 'index.html')

@main.route('/pwa/')
def pwa_index_trailing():
    """Serve the React PWA index.html with trailing slash."""
    return send_from_directory(PWA_BUILD_PATH, 'index.html')

# Serve assets from /assets/ path (referenced in HTML as /assets/...)
@main.route('/assets/<path:filename>')
def pwa_assets(filename):
    """Serve asset files from the PWA build assets directory."""
    return send_from_directory(os.path.join(PWA_BUILD_PATH, 'assets'), filename)

# Serve root-level static files (registerSW.js, manifest.webmanifest, etc.)
@main.route('/<path:filename>')
def pwa_root_static(filename):
    """Serve root-level static files from the PWA build."""
    # Only serve specific file types at root to avoid conflicts with API routes
    if filename in ('registerSW.js', 'manifest.webmanifest', 'sw.js', 'workbox-58bd4dca.js', 'workbox-58bd4dca.js.map', 'sw.js.map', 'vite.svg', 'favicon.ico'):
        return send_from_directory(PWA_BUILD_PATH, filename)
    # For other paths, this shouldn't match - let other routes handle it
    return abort(404)

# Serve other static files from /pwa/ path
@main.route('/pwa/<path:filename>')
def pwa_static(filename):
    """Serve static files from the PWA build."""
    return send_from_directory(PWA_BUILD_PATH, filename)


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


@main.route('/settings')
@login_required
def settings_page():
    """Render the settings page (admin only)."""
    if _get_current_user_role() != "admin":
        return redirect('/')
    return render_template('settings.html')


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
@main.route('/api/capabilities')
def api_capabilities():
    """Expose backend capabilities for frontend feature gating."""
    return jsonify({
        "mode": "flask",
        "supportsLegacyAdminApi": True,
        "supportsLegacyDataCountApi": True,
        "supportsLegacyDataClearApi": True,
        "supportsLegacyUserListApi": True,
        "supportsLegacyUserCreateApi": True,
        "supportsLegacyUserDeleteApi": True,
        "supportsLegacyReportsApi": True,
        "supportsLegacyReportMetricsApi": True,
        "supportsLegacyReportPdfApi": True,
        "supportsLegacyValidationApi": True
    })


@main.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for login - returns JSON response."""
    data = request.get_json(silent=True)
    
    if not data:
        # Try form data
        username = request.form.get('username')
        password = request.form.get('password')
    else:
        username = data.get('username')
        password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Username and password required'}), 400
    
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
    ).fetchone()
    conn.close()
    
    if user and check_password_hash(user["password"], password):
        login_user(User(user["id"]))
        return jsonify({'success': True, 'message': 'Login successful', 'username': username})
    else:
        return jsonify({'success': False, 'error': 'Invalid username or password'}), 401


@main.route('/api/logout', methods=['POST'])
def api_logout():
    """API endpoint for logout."""
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@main.route('/api/auth/check')
def api_auth_check():
    """API endpoint to check authentication status."""
    if current_user.is_authenticated:
        conn = get_connection()
        user = conn.execute(
            "SELECT username FROM users WHERE id = ?",
            (current_user.id,)
        ).fetchone()
        conn.close()
        
        return jsonify({
            'authenticated': True,
            'username': user['username'] if user else None
        })
    return jsonify({'authenticated': False}), 401


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
    measurements = Measurement.get_recent(limit=days)
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
            ph=data.get('ph'),
            cod=data.get('cod'),
            bod=data.get('bod'),
            tss=data.get('tss'),
            ammonia=data.get('ammonia'),
            nitrate=data.get('nitrate'),
            phosphate=data.get('phosphate'),
            temperature=data.get('temperature'),
            flow=data.get('flow'),
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


@main.route('/api/data/clear', methods=['DELETE'])
@login_required
def api_clear_all_data():
    """Clear all measurement data (admin only)."""
    try:
        forbidden = _require_admin_json()
        if forbidden:
            return forbidden
        
        # Clear all data
        deleted_count = clear_all_data()
        
        return jsonify({
            "success": True,
            "message": f"Deleted {deleted_count} measurements",
            "count": deleted_count
        })
    except Exception as e:
        return jsonify({"error": f"Failed to clear data: {str(e)}"}), 500


@main.route('/api/data/clear/<start_date>/<end_date>', methods=['DELETE'])
@login_required
def api_clear_data_range():
    """Clear data within date range (admin only)."""
    try:
        forbidden = _require_admin_json()
        if forbidden:
            return forbidden
            
        start_date = request.view_args['start_date']
        end_date = request.view_args['end_date']
        
        # Clear data in range
        deleted_count = clear_data_by_date_range(start_date, end_date)
        
        return jsonify({
            "success": True,
            "message": f"Deleted {deleted_count} measurements from {start_date} to {end_date}",
            "count": deleted_count
        })
    except Exception as e:
        return jsonify({"error": f"Failed to clear data: {str(e)}"}), 500


@main.route('/api/data/count')
@login_required
def api_get_data_count():
    """Get total count of measurements."""
    try:
        count = get_data_count()
        return jsonify({
            "count": count,
            "message": f"Total measurements: {count}"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get data count: {str(e)}"}), 500


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
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

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


@main.route('/api/parameters', methods=['POST'])
@login_required
def api_create_parameter():
    """Create a new parameter."""
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

    data = request.json
    
    if not data.get('parameter') or data.get('min_limit') is None or data.get('max_limit') is None:
        return jsonify({"error": "Parameter name, min_limit, and max_limit are required"}), 400
    
    parameter_name = data['parameter'].lower().strip()
    min_limit = float(data['min_limit'])
    max_limit = float(data['max_limit'])
    
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO standards (parameter, min_limit, max_limit) VALUES (?, ?, ?)",
            (parameter_name, min_limit, max_limit)
        )
        conn.commit()
        param_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        return jsonify({
            "success": True,
            "id": param_id,
            "parameter": parameter_name,
            "min_limit": min_limit,
            "max_limit": max_limit
        }), 201
    except Exception as e:
        return jsonify({"error": f"Parameter already exists: {str(e)}"}), 400
    finally:
        conn.close()


@main.route('/api/parameters/<parameter_name>', methods=['DELETE'])
@login_required
def api_delete_parameter(parameter_name):
    """Delete a parameter."""
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

    # Prevent deleting core parameters
    core_params = ['ph', 'cod', 'bod', 'tss', 'ammonia', 'nitrate', 'phosphate', 'temperature', 'flow']
    if parameter_name.lower() in core_params:
        return jsonify({"error": "Cannot delete core parameters"}), 400
    
    conn = get_connection()
    try:
        conn.execute("DELETE FROM standards WHERE parameter = ?", (parameter_name,))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()


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
    
    summary = ReportService.get_summary(start_date, end_date)
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
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

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
    """Export data as CSV with date range support (lightweight path)."""
    # Get date range from query params
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(days=7)
    
    if request.args.get('start'):
        try:
            start_date = datetime.datetime.strptime(request.args.get('start'), '%Y-%m-%d')
        except:
            pass
    if request.args.get('end'):
        try:
            end_date = datetime.datetime.strptime(request.args.get('end'), '%Y-%m-%d')
        except:
            pass
    
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    # Get measurements in date range
    measurements = Measurement.get_by_date_range(start_str, end_str)

    if request.args.get('format') == 'pdf':
        return jsonify({
            "error": "PDF export moved to /api/reports/pdf to keep /api/data/export lightweight."
        }), 400

    now_str = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    csv_lines = ["Wastewater Treatment Plant - Measurement Data"]
    csv_lines.append("Report Period: " + start_str + " to " + end_str)
    csv_lines.append("Generated: " + now_str)
    csv_lines.append("")
    csv_lines.append("timestamp,ph,cod,bod,tss,ammonia,nitrate,phosphate,temperature,flow")

    for m in measurements:
        csv_lines.append(
            f"{m.get('timestamp', '') or ''},"
            f"{m.get('ph', '') or ''},"
            f"{m.get('cod', '') or ''},"
            f"{m.get('bod', '') or ''},"
            f"{m.get('tss', '') or ''},"
            f"{m.get('ammonia', '') or ''},"
            f"{m.get('nitrate', '') or ''},"
            f"{m.get('phosphate', '') or ''},"
            f"{m.get('temperature', '') or ''},"
            f"{m.get('flow', '') or ''}"
        )

    csv_data = "\n".join(csv_lines)
    output = io.BytesIO()
    output.write(csv_data.encode('utf-8'))
    output.seek(0)

    return send_file(
        output,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'wastewater_data_{start_str}_to_{end_str}.csv'
    )


# ================= PDF REPORT GENERATION =================
@main.route('/api/reports/pdf')
@login_required
def api_generate_pdf():
    """Generate PDF report with all 9 parameters, graphs, and images."""
    try:
        import matplotlib
        matplotlib.use('Agg')  # Non-interactive backend
        import matplotlib.pyplot as plt
        from reportlab.lib.units import inch
        from reportlab.platypus import Image as RLImage
        
        # Get date range from query params or default to last 7 days
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=7)
        
        if request.args.get('start'):
            try:
                start_date = datetime.datetime.strptime(request.args.get('start'), '%Y-%m-%d')
            except:
                pass
        if request.args.get('end'):
            try:
                end_date = datetime.datetime.strptime(request.args.get('end'), '%Y-%m-%d')
            except:
                pass
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        summary = Report.get_summary(start_str, end_str)
        measurements = Measurement.get_by_date_range(start_str, end_str)
        standards = Parameter.get_all()
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.5*inch, leftMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title = Paragraph(f"Wastewater Treatment Report", styles['Title'])
        elements.append(title)
        elements.append(Paragraph(f"Period: {start_str} to {end_str}", styles['Normal']))
        elements.append(Paragraph(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        elements.append(Paragraph(" ", styles['Normal']))
        
        # Summary Table
        elements.append(Paragraph("Summary", styles['Heading2']))
        summary_data = [
            ['Metric', 'Value'],
            ['Total Measurements', str(summary.get('count', 0))],
            ['Compliance Rate', f"{summary.get('compliance_rate', 0)}%"],
            ['Active Alerts', str(summary.get('alerts', 0))]
        ]
        summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(summary_table)
        elements.append(Paragraph(" ", styles['Normal']))
        
        # Standards Table
        elements.append(Paragraph("Water Quality Standards (Class C)", styles['Heading2']))
        standards_data = [['Parameter', 'Min Limit', 'Max Limit', 'Unit']]
        for s in standards:
            unit = 'mg/L'
            if s['parameter'] == 'ph':
                unit = '-'
            elif s['parameter'] == 'temperature':
                unit = '°C'
            elif s['parameter'] == 'flow':
                unit = 'm³/h'
            standards_data.append([
                s['parameter'].capitalize(),
                str(s['min_limit']),
                str(s['max_limit']),
                unit
            ])
        standards_table = Table(standards_data, colWidths=[1.2*inch, 1*inch, 1*inch, 0.8*inch])
        standards_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(standards_table)
        elements.append(Paragraph(" ", styles['Normal']))
        
        # Generate graphs for each parameter
        elements.append(Paragraph("Weekly Parameter Trends", styles['Heading2']))
        
        params = [
            ('ph', 'pH', '#3b82f6'),
            ('cod', 'COD (mg/L)', '#ef4444'),
            ('bod', 'BOD (mg/L)', '#f97316'),
            ('tss', 'TSS (mg/L)', '#8b5cf6'),
            ('ammonia', 'Ammonia (mg/L)', '#06b6d4'),
            ('nitrate', 'Nitrate (mg/L)', '#10b981'),
            ('phosphate', 'Phosphate (mg/L)', '#84cc16'),
            ('temperature', 'Temperature (°C)', '#f43f5e'),
            ('flow', 'Flow (m³/h)', '#6366f1')
        ]
        
        # Get standards dict
        standards_dict = {s['parameter']: s for s in standards}
        
        for param_key, param_name, color in params:
            # Extract data for this parameter
            dates = []
            values = []
            for m in measurements:
                val = m.get(param_key)
                if val is not None:
                    dates.append(m.get('timestamp', '')[:10])
                    values.append(float(val))
            
            if values:
                # Create matplotlib figure
                fig, ax = plt.subplots(figsize=(6, 3))
                ax.plot(range(len(values)), values, color=color, marker='o', markersize=4, linewidth=2)
                ax.set_title(param_name, fontsize=10, fontweight='bold')
                ax.set_ylabel(param_name, fontsize=8)
                ax.set_xlabel('Date', fontsize=8)
                ax.set_xticks(range(len(dates)))
                ax.set_xticklabels(dates, rotation=45, ha='right', fontsize=6)
                ax.tick_params(axis='y', labelsize=7)
                ax.grid(True, alpha=0.3)
                
                # Add standard limit line if available
                if param_key in standards_dict:
                    std = standards_dict[param_key]
                    ax.axhline(y=float(std['max_limit']), color='red', linestyle='--', linewidth=1, label=f'Max: {std["max_limit"]}')
                    if float(std['min_limit']) > 0:
                        ax.axhline(y=float(std['min_limit']), color='orange', linestyle='--', linewidth=1, label=f'Min: {std["min_limit"]}')
                    ax.legend(fontsize=6)
                
                plt.tight_layout()
                
                # Save to bytes
                img_buffer = io.BytesIO()
                fig.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
                img_buffer.seek(0)
                plt.close(fig)
                
                # Add to PDF
                elements.append(RLImage(img_buffer, width=6*inch, height=2.5*inch))
                elements.append(Paragraph(" ", styles['Normal']))
        
        # Recent Measurements Table
        elements.append(Paragraph("Recent Measurements", styles['Heading2']))
        measurements_data = [['Date', 'pH', 'COD', 'BOD', 'TSS', 'NH3', 'NO3', 'PO4', 'Temp', 'Flow']]
        for m in measurements[:20]:
            measurements_data.append([
                str(m.get('timestamp', ''))[:10],
                f"{m.get('ph', '-') or '-'}",
                f"{m.get('cod', '-') or '-'}",
                f"{m.get('bod', '-') or '-'}",
                f"{m.get('tss', '-') or '-'}",
                f"{m.get('ammonia', '-') or '-'}",
                f"{m.get('nitrate', '-') or '-'}",
                f"{m.get('phosphate', '-') or '-'}",
                f"{m.get('temperature', '-') or '-'}",
                f"{m.get('flow', '-') or '-'}"
            ])
        meas_table = Table(measurements_data, colWidths=[0.7*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch])
        meas_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 6)
        ]))
        elements.append(meas_table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'wastewater_report_{start_str}_to_{end_str}.pdf'
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
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


# ================= USER MANAGEMENT API =================
@main.route('/api/users')
@login_required
def api_get_users():
    """Get all users."""
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

    conn = get_connection()
    try:
        users = conn.execute("SELECT id, username, role FROM users").fetchall()
    except Exception:
        users = conn.execute("SELECT id, username FROM users").fetchall()
    conn.close()
    
    return jsonify([{
        "id": u["id"],
        "username": u["username"],
        "role": (u["role"] if "role" in u.keys() and u["role"] else ("admin" if u["id"] == 1 else "operator"))
    } for u in users])


@main.route('/api/users', methods=['POST'])
@login_required
def api_create_user():
    """Create a new user."""
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

    data = request.json
    
    if not data.get('username') or not data.get('password'):
        return jsonify({"error": "Username and password required"}), 400
    
    username = data['username']
    password = data['password']
    role = data.get('role', 'operator')  # Default to operator
    
    # Validate role
    valid_roles = ['admin', 'operator', 'client']
    if role not in valid_roles:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
    
    hashed_password = generate_password_hash(password)
    
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (username, hashed_password, role)
        )
        conn.commit()
        user_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        return jsonify({"success": True, "id": user_id, "username": username, "role": role}), 201
    except Exception as e:
        if "role" in str(e).lower() and "column" in str(e).lower():
            return jsonify({"error": "Database schema missing users.role. Run scripts/migrations/001_add_users_role.sql."}), 500
        return jsonify({"error": f"Username already exists: {str(e)}"}), 400
    finally:
        conn.close()


@main.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
def api_delete_user(user_id):
    """Delete a user."""
    forbidden = _require_admin_json()
    if forbidden:
        return forbidden

    if user_id == 1:
        return jsonify({"error": "Cannot delete admin user"}), 400
    
    conn = get_connection()
    try:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return jsonify({"success": True})
    finally:
        conn.close()