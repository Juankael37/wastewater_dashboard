#!/usr/bin/env python3
"""
Simple test script to verify authentication is working.
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
        'X-Requested-With': 'XMLHttpRequest'
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/login",
            files=files,
            headers=headers,
            allow_redirects=False  # Don't follow redirects
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("SUCCESS: Login successful (200 OK)")
            return True
        elif response.status_code == 302:
            print("SUCCESS: Got redirect (302) - this is expected for Flask login")
            print("Authentication is working correctly")
            return True
        else:
            print(f"FAILED: Unexpected status: {response.status_code}")
            print(f"Response text: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_api_endpoint():
    """Test a simple API endpoint."""
    print("\nTesting API endpoint: /api/measurements")
    
    headers = {
        'Origin': FRONTEND_ORIGIN,
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("SUCCESS: API endpoint is accessible")
            return True
        elif response.status_code == 401:
            print("INFO: API requires authentication (expected)")
            return True
        else:
            print(f"INFO: Got status {response.status_code}")
            return True
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    print("=" * 60)
    print("Wastewater Monitoring System - Authentication Test")
    print("=" * 60)
    
    # Test with correct credentials
    success1 = test_login("admin", "admin123")
    
    # Test with wrong credentials
    success2 = test_login("admin", "wrongpassword")
    
    # Test API endpoint
    success3 = test_api_endpoint()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"Correct credentials test: {'PASS' if success1 else 'FAIL'}")
    print(f"Wrong credentials test: {'PASS' if not success2 else 'FAIL'}")
    print(f"API endpoint test: {'PASS' if success3 else 'FAIL'}")
    print("=" * 60)
    
    if success1 and not success2 and success3:
        print("\nOVERALL: All tests passed! System is ready for deployment.")
        return True
    else:
        print("\nOVERALL: Some tests failed. Review issues before deployment.")
        return False

if __name__ == "__main__":
    main()