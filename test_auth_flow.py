#!/usr/bin/env python3
"""
Test script to verify the authentication flow is working correctly.
This simulates what the React frontend does when logging in.
"""

import requests
import json

BASE_URL = "http://localhost:5000"
FRONTEND_ORIGIN = "http://localhost:5173"

def test_login(username, password):
    """Test login endpoint with FormData simulation."""
    print(f"\n🔐 Testing login for user: {username}")
    
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
        print(f"Response Headers:")
        for key, value in response.headers.items():
            if key.startswith('Access-Control') or key == 'Set-Cookie':
                print(f"  {key}: {value}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            data = response.json()
            print(f"Response JSON: {json.dumps(data, indent=2)}")
            
            # Check for session cookie
            if 'session' in response.cookies:
                print(f"✅ Session cookie received: {response.cookies['session'][:30]}...")
                return response.cookies
            else:
                print("⚠️ No session cookie in response")
                return None
        else:
            print(f"❌ Login failed with status {response.status_code}")
            print(f"Response: {response.text[:200]}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_api_access(cookies):
    """Test accessing protected API endpoint with session cookie."""
    if not cookies:
        print("\n❌ No cookies, skipping API test")
        return
    
    print(f"\n🔍 Testing API access with session cookie")
    
    headers = {
        'Origin': FRONTEND_ORIGIN,
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/data",
            cookies=cookies,
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ API access successful!")
            try:
                data = response.json()
                print(f"API returned {len(data)} data points")
            except:
                print(f"Response: {response.text[:200]}")
        elif response.status_code == 302:
            print("❌ API redirected to login (not authenticated)")
        else:
            print(f"❌ API access failed: {response.status_code}")
            print(f"Response: {response.text[:200]}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ API request failed: {e}")

def test_cors_preflight():
    """Test CORS preflight request."""
    print(f"\n🛫 Testing CORS preflight")
    
    headers = {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
    }
    
    try:
        response = requests.options(
            f"{BASE_URL}/login",
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        print("CORS Headers:")
        for key, value in response.headers.items():
            if key.startswith('Access-Control'):
                print(f"  {key}: {value}")
        
        if response.status_code == 200 and 'Access-Control-Allow-Origin' in response.headers:
            print("✅ CORS preflight successful")
        else:
            print("❌ CORS preflight failed")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ CORS test failed: {e}")

def main():
    print("=" * 60)
    print("Wastewater Monitoring System - Authentication Test")
    print("=" * 60)
    
    # Test CORS first
    test_cors_preflight()
    
    # Test with admin credentials
    cookies = test_login('admin', 'admin123')
    
    # Test API access if login successful
    if cookies:
        test_api_access(cookies)
    
    # Test with invalid credentials
    print(f"\n🧪 Testing invalid credentials")
    test_login('wronguser', 'wrongpass')
    
    print(f"\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)
    
    # Summary
    print(f"\n📋 Summary:")
    print(f"1. CORS should be configured correctly")
    print(f"2. Login should return JSON (not HTML redirect)")
    print(f"3. Session cookie should be included in response")
    print(f"4. API endpoints should be accessible with session cookie")
    print(f"\n🎯 Next: Try logging in at http://localhost:5173")

if __name__ == "__main__":
    main()