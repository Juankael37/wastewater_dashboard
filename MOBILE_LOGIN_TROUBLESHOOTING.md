# Mobile Login Troubleshooting Guide

## Issue: "Fetch failed" when trying to login from mobile device

## What Was Fixed

1. **Added dedicated `/api/login` endpoint** - Returns proper JSON response for API requests
2. **Added `/api/logout` endpoint** - Clean logout via API
3. **Added `/api/auth/check` endpoint** - Check authentication status
4. **Updated CORS configuration** - Now supports multiple network IPs (192.168.x.x, 10.0.x.x)
5. **Updated frontend API service** - Uses new `/api/login` endpoint with JSON payload
6. **Added debug logging** - Console logs show API URL and connection details

## How to Test Mobile Login

### Step 1: Verify Both Services Are Running
- Flask backend: `http://192.168.1.4:5000` (check terminal output)
- React frontend: `http://192.168.1.4:5173` (check terminal output)

### Step 2: Test Backend Access from Mobile
Open your mobile browser and navigate to:
```
http://192.168.1.4:5000/api/login
```
You should see a JSON response (not HTML).

### Step 3: Test Frontend Access from Mobile
Open your mobile browser and navigate to:
```
http://192.168.1.4:5173
```
You should see the login page.

### Step 4: Check Browser Console
1. On mobile, open browser developer tools (Chrome: Menu > Settings > Developer tools)
2. Try to login with `admin` / `admin123`
3. Look for console messages starting with `[API]` and `[DEBUG apiRequest]`
4. Check what URL is being attempted for the login request

### Step 5: Common Issues & Solutions

#### Issue: "Failed to fetch" or "Network error"
**Cause**: Windows Firewall blocking port 5000 or 5173
**Solution**: 
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find Python and Node.js, check both Private and Public networks
4. Or run this command in Admin PowerShell:
   ```powershell
   New-NetFirewallRule -DisplayName "Allow Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "Allow Port 5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
   ```

#### Issue: "CORS error" or "No 'Access-Control-Allow-Origin' header"
**Cause**: Origin not in allowed list
**Solution**: The CORS config now supports common network IPs. If your IP is different, add it to `app/__init__.py` in the `get_allowed_origins()` function.

#### Issue: "401 Unauthorized" or "Invalid credentials"
**Cause**: Wrong username/password
**Solution**: Use `admin` / `admin123` (default credentials)

#### Issue: Login succeeds but redirects to login page
**Cause**: Session cookies not being sent with requests
**Solution**: Ensure `credentials: 'include'` is set in API requests (already configured)

### Step 6: Verify API Endpoints
From your computer's browser console (F12), run:
```javascript
// Test login endpoint
fetch('http://192.168.1.4:5000/api/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({username: 'admin', password: 'admin123'})
}).then(r => r.json()).then(console.log)
```

Expected response:
```json
{
  "message": "Login successful",
  "success": true,
  "username": "admin"
}
```

## Current Network Configuration
- Your computer's IP: `192.168.1.4`
- Flask backend: `http://192.168.1.4:5000`
- React frontend: `http://192.168.1.4:5173`
- Mobile access URL: `http://192.168.1.4:5173`

## Credentials
- Username: `admin`
- Password: `admin123`
