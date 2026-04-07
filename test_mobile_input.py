import requests
import json

def test_mobile_input():
    print('=== TESTING MOBILE INPUT FUNCTIONALITY ===')
    
    # Test login
    session = requests.Session()
    login_response = session.post('http://localhost:5000/login', data={'username': 'admin', 'password': 'admin123'})
    
    if login_response.status_code == 200:
        print('✓ Login successful')
        
        # Test measurement creation with sample data
        test_measurement = {
            'timestamp': '2026-04-03T15:30:00Z',
            'ph': '7.2',
            'cod': '45.0',
            'bod': '25.0',
            'tss': '35.0',
            'ammonia': '0.3',
            'nitrate': '8.0',
            'phosphate': '0.5',
            'temperature': '22.0',
            'flow': '2500.0',
            'type': 'effluent',
            'plant_id': 1,
            'notes': 'Test measurement from mobile app - WORKING!'
        }
        
        create_response = session.post(
            'http://localhost:5000/api/measurements',
            json=test_measurement,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f'Measurement creation status: {create_response.status_code}')
        if create_response.status_code == 201:
            print('✓ Measurement created successfully!')
            response_data = create_response.json()
            print(f'Measurement ID: {response_data.get("id")}')
            print(f'Alerts created: {response_data.get("alerts_created")}')
        else:
            print('✗ Failed to create measurement')
            print(f'Error: {create_response.text[:300]}')
        
        # Test data count after creation
        count_response = session.get('http://localhost:5000/api/data/count')
        if count_response.status_code == 200:
            count_data = count_response.json()
            print(f'Total measurements: {count_data.get("count")}')
        
        # Test dashboard data
        dashboard_response = session.get('http://localhost:5000/api/data')
        if dashboard_response.status_code == 200:
            dashboard_data = dashboard_response.json()
            print(f'Dashboard data points: {len(dashboard_data.get("dates", []))}')
        
        print('\n=== MOBILE INPUT TEST COMPLETE ===')
        return True
    else:
        print('✗ Login failed')
        return False

if __name__ == '__main__':
    test_mobile_input()
