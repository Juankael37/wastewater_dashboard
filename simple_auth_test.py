#!/usr/bin/env python3
"""
Simple authentication test without emojis for Windows compatibility.
"""

import requests
import json

BASE_URL = "http://localhost:5000"
FRONTEND_ORIGIN = "http://localhost:5173"

def test_login(username, password):
    """Test login endpoint with FormData simulation."""
    print(f"\nTesting login for user: {username}")
    
    # Simulate FormData submission (like React frontend)
    files = {
        'username': (None, username),
        'password': (None, password)
    }
    
    headers = {
        'Origin': FRONTEND_ORIGIN,
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/login",
            files=files,
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("SUCCESS: Login successful!")
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Check for session cookie
            if 'session' in response.cookies:
                print(f"Session cookie received")
                return response.cookies
            else:
                print("WARNING: No session cookie in response")
                return None
        else:
            print(f"FAILED: Login failed with status {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Request failed: {e}")
        return None

def main():
    print("=" * 60)
    print("Authentication Test - Wastewater Monitoring System")
    print("=" * 60)
    
    # Test with admin credentials
    print("\n1. Testing admin login...")
    cookies = test_login('admin', 'admin123')
    
    if cookies:
        print("\n2. Testing API access with session cookie...")
        headers = {'Origin': FRONTEND_ORIGIN}
        response = requests.get(
            f"{BASE_URL}/api/data",
            cookies=cookies,
            headers=headers
        )
        print(f"API Status Code: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS: API access working!")
        else:
            print(f"FAILED: API access failed")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)
    
    print("\nSUMMARY:")
    print("- CORS should be configured (check Access-Control-Allow-Origin header)")
    print("- Login should return JSON response (not HTML redirect)")
    print("- Session cookie should be set for authenticated requests")
    print("\nNext: Try logging in at http://localhost:5173")

if __name__ == "__main__":
    main()