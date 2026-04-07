import requests
import json

def test_login():
    print("Testing login flow...\n")
    
    url = 'http://localhost:5000/login'
    
    # Test 1: With X-Requested-With header (what frontend sends)
    print("Test 1: With X-Requested-With header (frontend behavior)")
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        # FormData sets Content-Type with boundary automatically
    }
    
    data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    # Use requests with allow_redirects=False to see what Flask returns
    response = requests.post(url, data=data, headers=headers, allow_redirects=False)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers:")
    for key, value in response.headers.items():
        print(f"  {key}: {value}")
    
    print(f"\nResponse Text: {response.text}")
    
    try:
        json_response = response.json()
        print(f"\nParsed JSON: {json_response}")
        print(f"Has 'success': {json_response.get('success')}")
        print(f"Has 'message': {json_response.get('message')}")
        print(f"Has 'username': {json_response.get('username')}")
        
        if json_response.get('success'):
            print("\n✓ Login should be successful")
        else:
            print("\n✗ Login failed")
            
    except json.JSONDecodeError:
        print("\nResponse is not JSON")
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: Check if session cookie is set
    print("Test 2: Checking session cookie")
    session_cookie = response.cookies.get('session')
    if session_cookie:
        print(f"✓ Session cookie is set: {session_cookie[:50]}...")
        
        # Test 3: Try to access protected endpoint with cookie
        print("\nTest 3: Testing protected endpoint with session cookie")
        cookies = {'session': session_cookie}
        protected_response = requests.get('http://localhost:5000/api/data', cookies=cookies)
        print(f"Protected endpoint status: {protected_response.status_code}")
        print(f"Protected endpoint response: {protected_response.text[:200]}")
    else:
        print("✗ No session cookie set")
    
    print("\n" + "="*50 + "\n")
    
    # Test 4: What happens without X-Requested-With header
    print("Test 4: Without X-Requested-With header")
    response2 = requests.post(url, data=data, allow_redirects=False)
    print(f"Status Code: {response2.status_code}")
    print(f"Location header: {response2.headers.get('Location')}")
    print(f"Has session cookie: {'session' in response2.cookies}")

if __name__ == '__main__':
    test_login()