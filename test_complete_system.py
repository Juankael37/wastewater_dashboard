import requests
import json

def test_complete_system():
    print('=== TESTING COMPLETE DATA MANAGEMENT SYSTEM ===')
    print()

    # Test login
    session = requests.Session()
    login_response = session.post('http://localhost:5000/login', data={'username': 'admin', 'password': 'admin123'})
    print(f'1. Login Status: {login_response.status_code}')
    if login_response.status_code == 200:
        print('   ✓ Login successful')
    else:
        print('   ✗ Login failed')
        return

    # Test data count
    count_response = session.get('http://localhost:5000/api/data/count')
    print(f'\n2. Data Count Status: {count_response.status_code}')
    if count_response.status_code == 200:
        count_data = count_response.json()
        print(f'   ✓ Current data count: {count_data["count"]}')
    else:
        print('   ✗ Failed to get data count')

    # Test dashboard data
    dashboard_response = session.get('http://localhost:5000/api/data')
    print(f'\n3. Dashboard Data Status: {dashboard_response.status_code}')
    if dashboard_response.status_code == 200:
        dashboard_data = dashboard_response.json()
        print(f'   ✓ Dashboard data retrieved: {len(dashboard_data.get("dates", []))} data points')
    else:
        print('   ✗ Failed to get dashboard data')

    # Test recent measurements
    recent_response = session.get('http://localhost:5000/api/measurements/recent')
    print(f'\n4. Recent Measurements Status: {recent_response.status_code}')
    if recent_response.status_code == 200:
        recent_data = recent_response.json()
        print(f'   ✓ Recent measurements: {len(recent_data)} records')
    else:
        print('   ✗ Failed to get recent measurements')

    # Test clear all data
    clear_response = session.delete('http://localhost:5000/api/data/clear')
    print(f'\n5. Clear All Data Status: {clear_response.status_code}')
    if clear_response.status_code == 200:
        clear_data = clear_response.json()
        print(f'   ✓ Cleared {clear_data["count"]} records')
        print(f'   Message: {clear_data["message"]}')
    else:
        print('   ✗ Failed to clear data')

    # Test data count after clear
    count_response2 = session.get('http://localhost:5000/api/data/count')
    print(f'\n6. Data Count After Clear Status: {count_response2.status_code}')
    if count_response2.status_code == 200:
        count_data2 = count_response2.json()
        print(f'   ✓ Data count after clear: {count_data2["count"]}')
    else:
        print('   ✗ Failed to get data count after clear')

    print('\n=== API TESTING COMPLETE ===')

if __name__ == '__main__':
    test_complete_system()
