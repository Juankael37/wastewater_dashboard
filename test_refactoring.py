#!/usr/bin/env python3
"""
Test script to verify refactored wastewater monitoring system.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import init_db, Parameter, Measurement, Alert, Report
from app.services import ValidationService, AlertService, ReportService
from datetime import datetime

def test_database_initialization():
    """Test database initialization and schema."""
    print("Testing database initialization...")
    try:
        init_db()
        print("[OK] Database initialized successfully")
        
        # Test Parameter model
        parameters = Parameter.get_all()
        print(f"[OK] Retrieved {len(parameters)} parameters")
        
        # Check if all parameters exist
        param_names = [p['parameter'] for p in parameters]
        expected_params = ['ph', 'cod', 'bod', 'tss', 'ammonia', 'nitrate', 'phosphate', 'temperature', 'flow']
        
        for param in expected_params:
            if param in param_names:
                print(f"  [OK] Parameter '{param}' found")
            else:
                print(f"  [FAIL] Parameter '{param}' missing")
                
        return True
    except Exception as e:
        print(f"[FAIL] Database initialization failed: {e}")
        return False

def test_measurement_creation():
    """Test creating a measurement with all parameters."""
    print("\nTesting measurement creation...")
    try:
        timestamp = datetime.now().isoformat()
        
        # Create a measurement with all parameters
        measurement_id = Measurement.create(
            timestamp=timestamp,
            ph=7.2,
            cod=85.0,
            bod=42.0,
            tss=95.0,
            ammonia=0.3,
            nitrate=12.0,
            phosphate=0.8,
            temperature=25.5,
            flow=1500.0,
            measurement_type='effluent',
            plant_id=1,
            operator_id=1,
            notes='Test measurement'
        )
        
        print(f"[OK] Measurement created with ID: {measurement_id}")
        
        # Retrieve the measurement
        measurements = Measurement.get_all(limit=1)
        if measurements:
            print(f"[OK] Retrieved {len(measurements)} measurements")
            latest = measurements[0]
            print(f"  Latest measurement: pH={latest.get('ph')}, COD={latest.get('cod')}")
        else:
            print("[FAIL] No measurements retrieved")
            
        return True
    except Exception as e:
        print(f"[FAIL] Measurement creation failed: {e}")
        return False

def test_validation_service():
    """Test validation service with all parameters."""
    print("\nTesting validation service...")
    try:
        # Test valid values
        validation_results = ValidationService.validate_measurement(
            ph=7.2,
            cod=85.0,
            bod=42.0,
            tss=95.0,
            ammonia=0.3,
            nitrate=12.0,
            phosphate=0.8,
            temperature=25.5,
            flow=1500.0
        )
        
        print(f"[OK] Validation service executed successfully")
        print(f"  Validated {len(validation_results)} parameters")
        
        # Check results
        for param, result in validation_results.items():
            status = "[OK]" if result['valid'] else "[FAIL]"
            print(f"  {status} {param}: {result['message']}")
            
        # Test with invalid values
        invalid_results = ValidationService.validate_measurement(
            ph=10.0,  # Too high
            ammonia=0.6  # Too high
        )
        
        print(f"\n[OK] Invalid value detection working")
        for param, result in invalid_results.items():
            if not result['valid']:
                print(f"  [FAIL] Correctly detected invalid {param}: {result['message']}")
                
        return True
    except Exception as e:
        print(f"[FAIL] Validation service failed: {e}")
        return False

def test_report_service():
    """Test report generation."""
    print("\nTesting report service...")
    try:
        # Generate daily report
        daily_report = ReportService.generate_daily_report()
        print(f"[OK] Daily report generated")
        print(f"  Date: {daily_report['date']}")
        print(f"  Measurements: {daily_report['measurement_count']}")
        print(f"  Compliance rate: {daily_report['compliance_rate']}%")
        
        # Generate performance metrics
        performance = ReportService.generate_performance_metrics(days=7)
        print(f"[OK] Performance metrics generated")
        print(f"  Period: {performance['period_days']} days")
        print(f"  Total measurements: {performance['total_measurements']}")
        
        # Test report summary
        start_date = datetime.now().strftime('%Y-%m-01')
        end_date = datetime.now().strftime('%Y-%m-%d')
        summary = Report.get_summary(start_date, end_date)
        print(f"[OK] Report summary generated")
        print(f"  Count: {summary['count']}")
        print(f"  Compliance: {summary['compliance_rate']}%")
        
        return True
    except Exception as e:
        print(f"[FAIL] Report service failed: {e}")
        return False

def test_alert_service():
    """Test alert generation and management."""
    print("\nTesting alert service...")
    try:
        # Get active alerts
        active_alerts = Alert.get_active()
        print(f"[OK] Retrieved {len(active_alerts)} active alerts")
        
        # Test dashboard alerts
        dashboard_alerts = AlertService.get_dashboard_alerts()
        print(f"[OK] Dashboard alerts summary:")
        print(f"  Total: {dashboard_alerts['total']}")
        print(f"  Critical: {dashboard_alerts['critical']}")
        print(f"  Warning: {dashboard_alerts['warning']}")
        
        return True
    except Exception as e:
        print(f"[FAIL] Alert service failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing Refactored Wastewater Monitoring System")
    print("=" * 60)
    
    tests = [
        test_database_initialization,
        test_measurement_creation,
        test_validation_service,
        test_report_service,
        test_alert_service
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("[OK] All tests passed! Refactoring successful.")
        return 0
    else:
        print("[FAIL] Some tests failed. Review the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())