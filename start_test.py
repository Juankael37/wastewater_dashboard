import subprocess
import time
import requests
import sys
import os

def test_flask_app():
    """Start Flask app and test the /api/data endpoint"""
    
    # Start Flask in background
    print("Starting Flask app...")
    flask_proc = subprocess.Popen(
        [sys.executable, "run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={**os.environ, "FLASK_ENV": "development"}
    )
    
    # Give Flask time to start
    time.sleep(3)
    
    try:
        # Test the API endpoint
        print("Testing /api/data endpoint...")
        
        # Create a session to simulate login
        session = requests.Session()
        
        # First login (using test credentials)
        login_data = {
            'username': 'admin',
            'password': 'admin'
        }
        
        try:
            # Try to login
            login_response = session.post('http://localhost:5000/login', data=login_data)
            print(f"Login status: {login_response.status_code}")
            
            # Now test /api/data
            api_response = session.get('http://localhost:5000/api/data')
            print(f"API Status: {api_response.status_code}")
            
            if api_response.status_code == 200:
                data = api_response.json()
                print(f"Success! Got data with {len(data.get('labels', []))} records")
                print(f"Data keys: {list(data.keys())}")
                
                if data.get('labels'):
                    print(f"Sample - First timestamp: {data['labels'][0]}")
                    print(f"Sample - Last pH value: {data['ph'][-1] if data['ph'] else 'N/A'}")
                else:
                    print("No labels in data")
            else:
                print(f"API Error: {api_response.text}")
                
        except requests.exceptions.ConnectionError:
            print("Could not connect to Flask app. Is it running?")
            
    finally:
        # Kill Flask process
        print("\nStopping Flask app...")
        flask_proc.terminate()
        flask_proc.wait()
        
if __name__ == "__main__":
    test_flask_app()