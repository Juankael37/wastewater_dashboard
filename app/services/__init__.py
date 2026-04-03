"""
Business logic services for the Wastewater Monitoring System.
This module contains the core business logic separated from routes and models.
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from app.models import Parameter, Measurement, Alert, Report


class ValidationService:
    """Service for validating measurements against standards."""
    
    @staticmethod
    def validate_measurement(
        ph: float = None,
        cod: float = None,
        bod: float = None,
        tss: float = None,
        ammonia: float = None,
        nitrate: float = None,
        phosphate: float = None,
        temperature: float = None,
        flow: float = None
    ) -> Dict[str, Dict]:
        """
        Validate measurement values against Class C standards.
        Returns a dictionary with validation results for each parameter.
        """
        parameters = [
            ("ph", ph, 6.0, 9.5),
            ("cod", cod, 0, 100),
            ("bod", bod, 0, 50),
            ("tss", tss, 0, 100),
            ("ammonia", ammonia, 0, 0.5),
            ("nitrate", nitrate, 0, 14),
            ("phosphate", phosphate, 0, 1.0),
            ("temperature", temperature, 10, 40),
            ("flow", flow, 0, 5000)
        ]
        
        results = {}
        alerts_to_create = []
        
        for param_name, value, min_val, max_val in parameters:
            if value is None:
                # Skip validation for missing optional parameters
                continue
            
            # Check if value is within acceptable range
            if min_val <= value <= max_val:
                status = "good"
                message = f"{param_name.upper()} is within standards"
                valid = True
            elif value < min_val:
                status = "warning"
                message = f"{param_name.upper()} is below minimum ({min_val})"
                valid = False
            else:  # value > max_val
                status = "critical"
                message = f"{param_name.upper()} exceeds maximum ({max_val})"
                valid = False
            
            results[param_name] = {
                "valid": valid,
                "status": status,
                "message": message,
                "value": value,
                "standard": f"{min_val}-{max_val}"
            }
            
            # Create alert for non-good status
            if status != "good":
                alerts_to_create.append((param_name, value, status))
        
        # Create alerts in database
        for param_name, value, status in alerts_to_create:
            Alert.create(param_name, value, status)
        
        return results
    
    @staticmethod
    def get_compliance_rate() -> float:
        """Calculate overall compliance rate based on recent data."""
        recent_data = Measurement.get_recent(days=7)
        if not recent_data:
            return 100.0  # No data means no violations
        
        standards = Parameter.get_all()
        compliance_count = 0
        total_checks = 0
        
        # All parameters we track
        all_params = ["ph", "cod", "bod", "tss", "ammonia", "nitrate", "phosphate", "temperature", "flow"]
        
        for measurement in recent_data:
            for param in all_params:
                value = measurement.get(param)
                if value is not None:
                    total_checks += 1
                    standard = next((s for s in standards if s["parameter"] == param), None)
                    if standard:
                        if standard["min_limit"] <= value <= standard["max_limit"]:
                            compliance_count += 1
        
        return (compliance_count / total_checks * 100) if total_checks > 0 else 100.0


class AlertService:
    """Service for managing alerts and notifications."""
    
    @staticmethod
    def check_and_create_alerts(measurement_data: Dict) -> List[Dict]:
        """Check measurement data and create alerts for any violations."""
        validation_results = ValidationService.validate_measurement(
            measurement_data.get("ph"),
            measurement_data.get("cod"),
            measurement_data.get("bod"),
            measurement_data.get("tss")
        )
        
        alerts_created = []
        for param_name, result in validation_results.items():
            if result["status"] != "good":
                alert_id = Alert.create(
                    param_name,
                    result["value"],
                    result["status"]
                )
                alerts_created.append({
                    "id": alert_id,
                    "parameter": param_name,
                    "message": result["message"],
                    "status": result["status"]
                })
        
        return alerts_created
    
    @staticmethod
    def get_dashboard_alerts() -> Dict[str, any]:
        """Get alerts data formatted for the dashboard."""
        active_alerts = Alert.get_active()
        
        # Categorize alerts by severity
        critical_alerts = [a for a in active_alerts if a["status"] == "critical"]
        warning_alerts = [a for a in active_alerts if a["status"] == "warning"]
        
        return {
            "total": len(active_alerts),
            "critical": len(critical_alerts),
            "warning": len(warning_alerts),
            "alerts": active_alerts[:10]  # Limit for dashboard
        }


class ReportService:
    """Service for generating reports and analytics."""
    
    @staticmethod
    def generate_daily_report() -> Dict[str, any]:
        """Generate a daily report with statistics."""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get today's measurements
        measurements = Measurement.get_recent(days=1)
        
        # Get compliance rate
        compliance_rate = ValidationService.get_compliance_rate()
        
        # Get alerts summary
        alerts_summary = AlertService.get_dashboard_alerts()
        
        # Calculate parameter averages for all parameters
        all_params = ["ph", "cod", "bod", "tss", "ammonia", "nitrate", "phosphate", "temperature", "flow"]
        param_stats = {}
        
        for param in all_params:
            values = [m[param] for m in measurements if m.get(param) is not None]
            if values:
                param_stats[param] = {
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }
            else:
                param_stats[param] = {"avg": 0, "min": 0, "max": 0, "count": 0}
        
        return {
            "date": today,
            "measurement_count": len(measurements),
            "compliance_rate": round(compliance_rate, 2),
            "alerts": alerts_summary["total"],
            "parameters": param_stats,
            "summary": f"Daily report: {len(measurements)} measurements, "
                      f"{round(compliance_rate, 2)}% compliance, "
                      f"{alerts_summary['total']} active alerts."
        }
    
    @staticmethod
    def generate_performance_metrics(days: int = 30) -> Dict[str, any]:
        """Generate performance metrics for the specified period."""
        measurements = Measurement.get_recent(days=days)
        
        if not measurements:
            return {
                "period_days": days,
                "total_measurements": 0,
                "avg_daily_measurements": 0,
                "compliance_trend": "no_data",
                "alert_frequency": 0
            }
        
        # Group by day
        daily_counts = {}
        for m in measurements:
            date = m["timestamp"][:10]  # Extract YYYY-MM-DD
            daily_counts[date] = daily_counts.get(date, 0) + 1
        
        avg_daily = sum(daily_counts.values()) / len(daily_counts)
        
        # Get compliance trend (simplified)
        recent_compliance = ValidationService.get_compliance_rate()
        
        # Get alert frequency
        active_alerts = Alert.get_active()
        alert_frequency = len(active_alerts) / days if days > 0 else 0
        
        return {
            "period_days": days,
            "total_measurements": len(measurements),
            "avg_daily_measurements": round(avg_daily, 2),
            "compliance_rate": round(recent_compliance, 2),
            "compliance_trend": "stable" if recent_compliance > 90 else "needs_attention",
            "alert_frequency": round(alert_frequency, 2),
            "days_with_data": len(daily_counts)
        }


class DataImportService:
    """Service for importing and exporting data."""
    
    @staticmethod
    def import_from_csv(csv_data: str) -> Dict[str, any]:
        """Import measurements from CSV data."""
        # This is a simplified implementation
        # In a real system, this would parse CSV and create measurements
        lines = csv_data.strip().split('\n')
        imported_count = 0
        errors = []
        
        for i, line in enumerate(lines[1:], start=1):  # Skip header
            try:
                parts = line.split(',')
                if len(parts) >= 5:
                    timestamp, ph, cod, bod, tss = parts[:5]
                    
                    # Create measurement
                    Measurement.create(
                        timestamp.strip(),
                        float(ph) if ph else None,
                        float(cod) if cod else None,
                        float(bod) if bod else None,
                        float(tss) if tss else None
                    )
                    imported_count += 1
            except Exception as e:
                errors.append(f"Line {i}: {str(e)}")
        
        return {
            "imported": imported_count,
            "errors": errors,
            "total_lines": len(lines) - 1
        }
    
    @staticmethod
    def export_to_csv() -> str:
        """Export measurements to CSV format."""
        measurements = Measurement.get_all(limit=1000)  # Limit for export
        
        # Create CSV header and rows
        csv_lines = ["timestamp,ph,cod,bod,tss"]
        for m in measurements:
            csv_lines.append(
                f"{m['timestamp']},"
                f"{m['ph'] or ''},"
                f"{m['cod'] or ''},"
                f"{m['bod'] or ''},"
                f"{m['tss'] or ''}"
            )
        
        return "\n".join(csv_lines)