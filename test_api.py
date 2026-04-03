import requests
import json

# Test the API endpoint
try:
    # Note: This assumes Flask is running on localhost:5000
    # We'll start Flask in a separate process or check if it's running
    print("Testing /api/data endpoint...")
    
    # First, let's check if we can import and run Flask directly
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    from app import create_app
    import app.models
    
    app = create_app()
    
    with app.test_client() as client:
        # First login (we need to be authenticated)
        # Create a test user session
        with client.session_transaction() as session:
            session['_user_id'] = '1'
            session['_fresh'] = True
        
        response = client.get('/api/data')
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.get_json()
            print(f"Data keys: {list(data.keys())}")
            print(f"Labels length: {len(data.get('labels', []))}")
            print(f"pH data length: {len(data.get('ph', []))}")
            print(f"Sample data (first 3):")
            for i in range(min(3, len(data.get('labels', [])))):
                print(f"  {data['labels'][i]}: pH={data['ph'][i]}, COD={data['cod'][i]}, BOD={data['bod'][i]}, TSS={data['tss'][i]}")
        else:
            print(f"Response: {response.data.decode()}")
            
except Exception as e:
    print(f"Error testing API: {e}")
    import traceback
    traceback.print_exc()