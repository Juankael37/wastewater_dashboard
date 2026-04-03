#!/usr/bin/env python3
"""
Test what /api/data endpoint returns to fix checkAuth function.
"""

import requests
import json

BASE_URL = "http://localhost:5000"
FRONTEND_ORIGIN = "http://localhost:5173"

def test_login_and_api():
    """Test login and see what /api/data returns."""
    print("1. Logging in...")
    files = {'username': (None, 'admin'), 'password': (None, 'admin123')}
    headers = {'Origin': FRONTEND_ORIGIN}
    
    response = requests.post(f"{BASE_URL}/login", files=files, headers=headers)
    print(f"Login status: {response.status_code}")
    
    if response.status_code == 200:
        cookies = response.cookies
        print("Login successful, got session cookie")
        
        print("\n2. Testing /api/data endpoint...")
        response = requests.get(
            f"{BASE_URL}/api/data",
            cookies=cookies,
            headers=headers
        )
        
        print(f"API status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        
        try:
            data = response.json()
            print(f"Response JSON (first 500 chars):")
            print(json.dumps(data, indent=2)[:500])
            
            # Check if response has user data
            if isinstance(data, dict) and 'user' in data:
                print("\n✅ Response has 'user' field")
            else:
                print("\n❌ Response does not have 'user' field")
                print(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
        except json.JSONDecodeError:
            print(f"Response text (first 500 chars): {response.text[:500]}")
            
    else:
        print("Login failed")

if __name__ == "__main__":
    test_login_and_api()