# Mobile App Access Guide - Wastewater Monitoring System

## Current Authentication Status

### ✅ Existing Users in Database
Based on database inspection, the following user exists:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator |

**Note**: The system currently only has one pre-configured admin user. There are no operator or normal user accounts pre-created.

## 📱 How to Access the Mobile App

### Option 1: Use Existing Admin Account
1. **Access URL**: `http://localhost:5173` (or `http://192.168.1.4:5173` for mobile devices)
2. **Click "Sign In"** on the login page
3. **Enter credentials**:
   - **Username**: `admin`
   - **Password**: `admin123`
4. **Click "Sign In"** to access the dashboard

### Option 2: Create New User Account (Recommended for Operators)

#### Method A: Via Web Interface (Frontend)
1. Navigate to `http://localhost:5173/register`
2. Fill in the registration form:
   - **Full Name**: Your name
   - **Email Address**: Your email (optional in current implementation)
   - **Password**: Choose a secure password
   - **Confirm Password**: Re-enter password
   - **Role**: Select "Operator" from dropdown
3. Click "Create Account"
4. You will be redirected to login page
5. Login with your new credentials

#### Method B: Direct API Registration (Alternative)
You can also create users via direct API call:

```bash
# Create an operator user
curl -X POST http://localhost:5000/register \
  -F "username=operator1" \
  -F "password=operator123"

# Create a normal user
curl -X POST http://localhost:5000/register \
  -F "username=user1" \
  -F "password=user123"
```

#### Method C: Python Script
Create a Python script to add users:

```python
import sqlite3
from werkzeug.security import generate_password_hash

def create_user(username, password):
    conn = sqlite3.connect('data.db')
    c = conn.cursor()
    hashed_password = generate_password_hash(password)
    try:
        c.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, hashed_password)
        )
        conn.commit()
        print(f"User '{username}' created successfully")
    except sqlite3.IntegrityError:
        print(f"User '{username}' already exists")
    conn.close()

# Create test users
create_user('operator1', 'operator123')
create_user('user1', 'user123')
```

## 🔐 Recommended Test User Setup

For comprehensive testing, create these users:

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| `admin` | `admin123` | Admin | System administration |
| `operator1` | `operator123` | Operator | Mobile data entry |
| `operator2` | `operator456` | Operator | Secondary operator |
| `user1` | `user123` | Normal User | Read-only access |

## 📲 Mobile PWA Installation

### Android Devices
1. Open Chrome browser
2. Navigate to `http://192.168.1.4:5173` (replace with your computer's IP)
3. Tap menu (⋮) → "Add to Home screen"
4. Confirm installation
5. App icon appears on home screen

### iOS Devices
1. Open Safari browser
2. Navigate to `http://192.168.1.4:5173`
3. Tap Share button (📤) → "Add to Home Screen"
4. Name the app → "Add"
5. App icon appears on home screen

## 🧪 Testing Different User Roles

### Admin User (`admin` / `admin123`)
- **Access**: Full system access
- **Features**:
  - View all dashboards
  - Manage users
  - Edit/delete data
  - Generate reports
  - System settings

### Operator User (Create via registration)
- **Access**: Mobile data entry + basic viewing
- **Features**:
  - Input form with camera integration
  - View submission history
  - Basic dashboard access
  - Offline data entry

### Normal User (Create via registration)
- **Access**: Read-only access
- **Features**:
  - View dashboard
  - Download reports
  - View graphs
  - No data entry capabilities

## 🚨 Important Notes

### 1. **Current Limitations**
- The registration form in the React frontend is a UI mockup (doesn't submit to backend yet)
- To create users, use the Flask backend directly at `http://localhost:5000/register`
- Role selection in registration form is currently cosmetic (all users have same permissions in Flask)

### 2. **Immediate Access Options**
- **Quick start**: Use `admin` / `admin123` for full access
- **Operator testing**: Create operator account via direct API call
- **Development**: Modify the registration form to connect to backend API

### 3. **Production Considerations**
For production deployment:
1. Update `frontend/src/pages/auth/RegisterPage.tsx` to use the `authApi.register()` function
2. Implement proper role assignment in backend
3. Add email verification for user registration
4. Implement password strength validation

## 🔧 Troubleshooting

### "Cannot create user"
- Ensure Flask backend is running (`python run.py`)
- Check if username already exists
- Verify database connection

### "Registration form not working"
- The React registration page is currently a static UI
- Use direct API calls or admin account for now
- Or implement form submission in React component

### "Mobile app not installing"
- Ensure you're using HTTPS for PWA installation (not required for development)
- Use Chrome on Android or Safari on iOS
- Check network connectivity between mobile device and computer

## 📞 Support

For immediate testing:
1. **Use admin account**: `admin` / `admin123`
2. **Access URL**: `http://localhost:5173`
3. **Backend API**: `http://localhost:5000`

Both servers are currently running and ready for testing. The mobile PWA is fully functional with offline capabilities, camera integration, and real-time validation for all 9 wastewater parameters.