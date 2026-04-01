"""
Refactored routes for the Wastewater Monitoring System.
This version uses the new service layer and follows separation of concerns.
"""

from flask import Blueprint, render_template, request, jsonify, send_file, abort
from flask_login import login_required, current_user
import datetime
import io

from app.models import Parameter, Measurement, Alert, Report
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


@main.route('/input')
@login_required
def input_page():
    """Render the data input page."""
    return render_template('input.html')


@main.route('/reports')
@login_required
def reports_page():
    """Render the reports page."""
    return render_template('reports.html')


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
    
    if 'class_c_min' not in data or 'class_c_max' not in data:
        return jsonify({"error": "Missing class_c_min or class_c_max"}), 400
    
    success = Parameter.update(
        parameter_name,
        float(data['class_c_min']),
        float(data['class_c_max'])
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