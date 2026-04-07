import requests
import json

def simulate_frontend_login():
    """Simulate exactly what the frontend's apiRequest function does"""
    print("Simulating frontend login flow...\n")
    
    url = 'http://localhost:5000/login'
    
    # Frontend uses FormData, but for testing we'll use regular form data
    # The key difference: FormData doesn't set Content-Type header
    data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    # Headers that frontend sends (from apiRequest function)
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        # Note: When using FormData, browser doesn't set Content-Type
        # So we won't set it either
    }
    
    print("Sending request with headers:", headers)
    response = requests.post(url, data=data, headers=headers, allow_redirects=False)
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    
    # Simulate what apiRequest does
    print("\n--- Simulating apiRequest logic ---")
    
    # Line 111-114: Special handling for login endpoint - 302 is success
    if response.status_code == 302:
        print("apiRequest: Got 302 redirect, returning empty object {}")
        result = {}
    else:
        # Line 116-119: Check if response is ok
        if not response.ok:
            error_text = response.text
            print(f"apiRequest: Response not ok, throwing error: {error_text}")
            result = None
        else:
            # Line 121-125: Check if response is JSON
            content_type = response.headers.get('content-type', '')
            if 'application/json' in content_type:
                try:
                    json_data = response.json()
                    print(f"apiRequest: Parsed JSON: {json_data}")
                    result = json_data
                except json.JSONDecodeError:
                    print("apiRequest: Failed to parse JSON")
                    result = response.text
            else:
                print(f"apiRequest: Not JSON, returning text: {response.text[:100]}...")
                result = response.text
    
    print("\n--- What authApi.login returns ---")
    if result is not None:
        print(f"authApi.login would return: {result}")
        
        # Check if it has the expected structure
        if isinstance(result, dict):
            print(f"  Has 'success' key: {'success' in result}")
            if 'success' in result:
                print(f"  success value: {result['success']}")
                
                # Simulate AuthContext.signIn logic
                print("\n--- Simulating AuthContext.signIn logic ---")
                if result['success']:
                    print("AuthContext: response.success is True")
                    print("AuthContext: Would set user state with username:", result.get('username'))
                    print("AuthContext: Would show toast: 'Signed in successfully'")
                    print("LoginPage: Would call navigate('/dashboard')")
                else:
                    print("AuthContext: response.success is False or missing")
                    print("AuthContext: Would throw error:", result.get('message', 'Authentication failed'))
            else:
                print("  ERROR: Response doesn't have 'success' key!")
                print("  AuthContext.signIn would check 'if (response.success)' which would be falsy")
                print("  AuthContext would throw error: 'Authentication failed'")
    else:
        print("authApi.login would throw an error")

if __name__ == '__main__':
    simulate_frontend_login()