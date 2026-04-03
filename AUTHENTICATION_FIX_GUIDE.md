# Authentication Fix Guide - "Failed to Fetch" Error Solved

## ✅ Problem Identified & Fixed

The "failed to fetch" error was caused by **CORS (Cross-Origin Resource Sharing)** issues between:
- **React Frontend**: `http://localhost:5173`
- **Flask Backend**: `http://localhost:5000`

## 🔧 Fixes Applied

### 1. **Installed Flask-CORS**
```bash
pip install flask-cors
```

### 2. **Updated Flask App Configuration** (`app/__init__.py`)
- Added CORS import: `from flask_cors import CORS`
- Enabled CORS with credentials support:
```python
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])
```

### 3. **Updated Login Endpoint** (`app/routes_refactored.py`)
Modified `/login` route to return JSON for API calls instead of HTML redirect:
- Checks if request is from React (multipart/form-data or XHR)
- Returns JSON response: `{"success": true, "message": "Login successful", "username": username}`
- Maintains backward compatibility for browser form submissions

## 📱 How to Access Mobile App Now

### **Step 1: Verify Servers Are Running**
Both should be running (they currently are):
- **Frontend**: `http://localhost:5173` (React PWA)
- **Backend**: `http://localhost:5000` (Flask API)

### **Step 2: Use Correct Credentials**

#### **Existing Users** (in database):
| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator |

#### **Create New Operator User**:
```bash
# Method 1: Python script
python -c "
import sqlite3
from werkzeug.security import generate_password_hash
conn = sqlite3.connect('data.db')
c = conn.cursor()
hashed = generate_password_hash('operator123')
try:
    c.execute('INSERT INTO users (username, password) VALUES (?, ?)', ('operator1', hashed))
    conn.commit()
    print('Operator user created: operator1 / operator123')
except:
    print('User already exists or error occurred')
conn.close()
"

# Method 2: Direct API call
curl -X POST http://localhost:5000/register -F "username=operator1" -F "password=operator123"
```

### **Step 3: Login to Mobile App**

1. **Open browser**: `http://localhost:5173`
2. **Click "Sign In"**
3. **Enter credentials**:
   - For admin: `admin` / `admin123`
   - For operator: `operator1` / `operator123` (after creating)
4. **Click "Sign In"** - Should now work without "failed to fetch" error

## 🧪 Test Authentication Flow

### **Test 1: Direct API Login**
```bash
curl -X POST http://localhost:5000/login \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: multipart/form-data" \
  -F "username=admin" \
  -F "password=admin123"
```
**Expected Response**: JSON with success message

### **Test 2: Check Authentication Status**
```bash
curl -X GET http://localhost:5000/api/data \
  -H "Origin: http://localhost:5173" \
  --cookie "session=your-session-cookie"
```
**Note**: After login, use the session cookie from Test 1 response

## 🔄 Updated Authentication Flow

### **Before Fix**:
1. React → Flask login (302 redirect to HTML)
2. CORS blocks redirect response
3. "Failed to fetch" error

### **After Fix**:
1. React → Flask login (JSON response)
2. Session cookie set automatically
3. Subsequent API calls include cookie
4. Authentication works seamlessly

## 📲 Mobile PWA Installation

### **Android**:
1. Chrome → `http://192.168.1.4:5173` (your computer's IP)
2. Menu (⋮) → "Add to Home screen"
3. Confirm installation

### **iOS**:
1. Safari → `http://192.168.1.4:5173`
2. Share (📤) → "Add to Home Screen"
3. Name → "Add"

## 🚨 If You Still See "Failed to Fetch"

### **Checklist**:
1. ✅ Both servers running (`npm run dev` + `python run.py`)
2. ✅ CORS configured (Flask-CORS installed & initialized)
3. ✅ Using correct credentials
4. ✅ Browser not blocking cookies (try incognito mode)
5. ✅ Network connectivity (mobile device on same Wi-Fi)

### **Debug Steps**:
1. **Open browser Developer Tools** (F12)
2. **Check Console** for specific error messages
3. **Check Network tab** for failed requests
4. **Verify response headers** include:
   ```
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Credentials: true
   ```

## 🎯 Success Indicators

1. **Login works** without "failed to fetch" error
2. **Dashboard loads** after login
3. **API calls succeed** (check Network tab)
4. **Mobile PWA installs** and functions offline
5. **Camera integration** works (simulated in dev)

## 📞 Quick Reference

### **URLs**:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- Network access: `http://[YOUR-IP]:5173`

### **Default Credentials**:
- Admin: `admin` / `admin123`
- Create operator: Use Python script above

### **Key Files Modified**:
- `app/__init__.py` - Added CORS support
- `app/routes_refactored.py` - Updated login endpoint

The authentication system is now fully functional with proper CORS configuration. You should be able to login and access all mobile app features without the "failed to fetch" error.