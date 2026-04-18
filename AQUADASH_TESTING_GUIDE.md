# AquaDash Production Testing Guide

**Status:** ✅ Backend APIs verified and working  
**Date:** April 18, 2026

---

## ✅ Pre-Test Verification (Completed)

### Login Page
- ✅ AquaDash login page accessible at https://33cbaf08.wastewater-dashboard.pages.dev/aquadash/login
- ✅ Page loads correctly with form and styling
- ✅ Login API endpoint responding correctly

### API Health Check
- ✅ Worker API reachable: https://wastewater-api.justewater-api.juankael37.workers.dev
- ✅ CORS configured for AquaDash domain
- ✅ Authentication endpoint working
- ✅ Invalid credentials properly rejected

---

## 🔧 Manual Testing Steps

### Step 1: Create Test Admin Account

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to: https://app.supabase.com/
2. Select your **wastewater_dashboard** project
3. Navigate to **Authentication** → **Users**
4. Click **Add User** → **Create new user**
5. Enter:
   - **Email:** `aquadash.test@example.com` (or your email)
   - **Password:** Choose a strong password (e.g., `AquaDash@2026`)
   - Check **Auto send invite email** (uncheck to skip)
6. Click **Create user**

#### Step 2: Set Admin Role
1. In Supabase Users list, find the user you created
2. Click the user to view details
3. Scroll to **User Metadata** section
4. Add/Edit the metadata:
   ```json
   {
     "role": "admin",
     "full_name": "Test Admin"
   }
   ```
5. Click **Save**

**Note:** If you already have an admin account from testing the React PWA, you can use that account for AquaDash as well.

---

### Step 2: Test AquaDash Login

1. **Open AquaDash:** https://33cbaf08.wastewater-dashboard.pages.dev/aquadash/login
2. **Enter credentials:**
   - Email: The email you created above
   - Password: The password you set
3. **Click "Sign In"**

**Expected Result:** Should redirect to dashboard page

**If Error:**
- ❌ "Failed to sign in" → Wrong credentials
- ❌ "Admin access required" → User role not set to "admin"
- ❌ "Failed to fetch" → CORS issue or API unreachable

---

### Step 3: Test Dashboard Page

Once logged in:

1. **Dashboard loads** ✓
   - Should see KPI cards (Total Records, Compliance Rate, Active Alerts, Parameters Tracked)
   - Charts should display (if you have data in Supabase)
   - Recent Data Submissions table should show measurements

**Test Points:**
- [ ] All 4 KPI cards display
- [ ] Chart.js charts render without errors (check browser console)
- [ ] Recent data table shows entries (or "No recent data" if empty)
- [ ] Page is responsive on desktop/mobile

**Debug:** Open browser DevTools (F12) → Console tab to see any errors

---

### Step 4: Test Reports Page

1. **Click "Reports"** in left sidebar
2. **Reports page should load** with:
   - Export buttons (PDF Report, CSV Export)
   - Summary metrics (if data exists)
   - Performance table
   - Daily readings

**Test Points:**
- [ ] Page loads without errors
- [ ] Export buttons are clickable
- [ ] PDF export downloads a file (may take a few seconds)
- [ ] CSV export downloads a file

**Export Test:**
```bash
# Verify PDF was downloaded
ls -lh ~/Downloads/*report*.pdf

# Verify CSV was downloaded  
ls -lh ~/Downloads/*data*.csv
```

---

### Step 5: Test Alerts Page

1. **Click "Alerts"** in left sidebar
2. **Alerts page should load** with:
   - Filter buttons (All, Critical, Warning, Info)
   - Active Alerts section
   - Resolved Alerts section

**Test Points:**
- [ ] Page loads without errors
- [ ] If you have alerts, they display in correct sections
- [ ] Admin can see "Resolve" button on active alerts
- [ ] Filter buttons are clickable (for UI responsiveness)

**Note:** To see alerts in action, you need to submit measurements that violate standards. Check the React PWA to input test data first.

---

### Step 6: Test Settings Page (Admin Only)

1. **Click "Settings"** in left sidebar (only visible if you're admin)
2. **Settings page should load** with three tabs:
   - **Users** - List of users, add new user form
   - **Parameters** - List of parameters, add new parameter form
   - **Data Management** - Date range clear, clear all data buttons

**Test Points:**

#### Users Tab
- [ ] Current users list displays
- [ ] "Add New User" form is visible
- [ ] Form fields: Email, Password, Full Name, Role
- [ ] Submit button works (or shows error if user already exists)

#### Parameters Tab
- [ ] Current parameters list displays
- [ ] "Add Parameter" form is visible
- [ ] Form fields: Name, Min, Max, Unit
- [ ] Can add new parameter

#### Data Management Tab
- [ ] Warning message displays
- [ ] Date range clear inputs appear
- [ ] "Clear All Data" button visible with warning

**⚠️ IMPORTANT:** Do NOT click "Clear All Data" unless you want to delete all measurements!

---

### Step 7: Test Theme Toggle

1. **Click moon icon** in top-right corner
2. **Page theme should toggle** between:
   - Dark mode (dark blue/gray background)
   - Light mode (white background)
3. **Preference should persist** on page reload

**Test Points:**
- [ ] Theme toggles smoothly
- [ ] All text is readable in both modes
- [ ] Charts are visible in both modes
- [ ] Reload page and check theme persists

---

### Step 8: Test Logout

1. **Click "Logout"** button in left sidebar
2. **Should redirect to login page** at https://33cbaf08.wastewater-dashboard.pages.dev/aquadash/login
3. **Token should be cleared** (localStorage)

**Test Points:**
- [ ] Logout is immediate
- [ ] Login page loads
- [ ] Trying to visit dashboard redirects to login

---

## 🧪 Browser Console Debugging

If any page shows errors, check the browser console:

1. **Open DevTools:** Press `F12`
2. **Go to Console tab**
3. **Look for red error messages**
4. **Common errors and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to fetch` | CORS issue or API down | Check API is deployed, verify CORS settings |
| `Cannot read property 'data'` | API returned different format | Check API endpoint, verify data structure |
| `Chart is not defined` | Chart.js CDN failed | Refresh page, check internet connection |
| `localStorage is undefined` | Browser doesn't support localStorage | Use modern browser (Chrome, Firefox, Safari) |

---

## 📊 Test Data Scenarios

### Scenario 1: Empty Database (No Data)
- ✅ Dashboard loads with 0 records
- ✅ "No recent data" message shows in table
- ✅ Charts show empty or minimal data

### Scenario 2: With Data (Preferred)
1. **First, add test measurements via React PWA:**
   - https://5b6caf7b.wastewater-dashboard.pages.dev
   - Log in as operator
   - Click "Input"
   - Submit test data for a few measurements

2. **Then test AquaDash:**
   - Login to AquaDash
   - Dashboard should show records
   - Charts should display data
   - Reports should have metrics

### Scenario 3: With Alerts
1. **Via React PWA, submit data that violates standards:**
   - COD > 100 mg/L
   - BOD > 50 mg/L
   - TSS > 100 mg/L
   - etc.

2. **Check AquaDash Alerts page:**
   - Should show alerts triggered
   - Admin can resolve alerts
   - Resolved alerts move to "Resolved" section

---

## ✅ Quick Test Checklist

Print this and check off as you go:

```
[ ] Login page loads
[ ] Can login with admin account
[ ] Dashboard page loads after login
[ ] KPI cards display
[ ] Charts render (if data exists)
[ ] Reports page loads
[ ] PDF export downloads file
[ ] CSV export downloads file
[ ] Alerts page loads
[ ] Settings page shows (admin only)
[ ] Can add new user
[ ] Can add new parameter
[ ] Theme toggle works
[ ] Logout works
[ ] Browser console has no errors
```

---

## 🆘 Troubleshooting

### "Admin access required" Error
- **Problem:** User role is not set to "admin"
- **Fix:** Update user metadata in Supabase to `{"role": "admin"}`

### "Failed to fetch" on every page
- **Problem:** API CORS or network issue
- **Fix:** 
  1. Check API is deployed: https://wastewater-api.juankael37.workers.dev/
  2. Verify CORS includes your AquaDash URL
  3. Check browser console for specific error

### Charts not displaying
- **Problem:** Chart.js CDN not loading or no data
- **Fix:**
  1. Check browser console for errors
  2. If "Chart is not defined", reload page
  3. Ensure you have data in Supabase (test via React PWA first)

### Settings page shows "loading..." forever
- **Problem:** API endpoint failed
- **Fix:**
  1. Check browser console for specific error
  2. Verify you're admin
  3. Check Worker has permission to query users/parameters

### Theme not persisting
- **Problem:** localStorage disabled or private browsing
- **Fix:** Use normal browsing mode (not private/incognito)

---

## 📈 Performance Expectations

| Page | Load Time | Notes |
|------|-----------|-------|
| Login | < 2s | Should be instant |
| Dashboard | 2-5s | Depends on data volume |
| Reports | 2-5s | Chart rendering takes time |
| Alerts | 1-3s | Quick if few alerts |
| Settings | 2-4s | Loads users & parameters |

---

## 🔐 Security Verification

During testing, verify:

- ✅ **HTTPS:** All URLs use https:// (green lock in browser)
- ✅ **Auth:** Token is in localStorage as `aq_access_token`
- ✅ **CORS:** Requests only go to Worker API (check Network tab in DevTools)
- ✅ **Role Check:** Non-admins cannot see Settings page
- ✅ **Logout:** Token is cleared from localStorage

---

## 📝 Test Results

### Test Date: _______________
### Tester Name: _______________

**Pre-Launch Verification:**
- [ ] All 8 test steps completed
- [ ] No console errors
- [ ] All functionality working
- [ ] Theme toggle works
- [ ] Responsive on mobile

**Issues Found:**
1. _______________________________
2. _______________________________
3. _______________________________

**Recommendation:** 
- [ ] Ready for production
- [ ] Minor issues (document above)
- [ ] Critical issues (fix before launch)

**Notes:**
_________________________________
_________________________________

---

## 🎯 Next Steps After Testing

1. **If all tests pass:**
   - ✅ AquaDash is production-ready
   - Share URL with admins/owners
   - Provide login credentials
   - Document in internal wiki

2. **If issues found:**
   - Collect error messages from browser console
   - Test in different browsers (Chrome, Firefox, Safari)
   - Check Supabase project health
   - Verify Worker deployment status

3. **Go-Live Checklist:**
   - [ ] Create production admin account
   - [ ] Test with real data (not test data)
   - [ ] Verify backup user can login
   - [ ] Document user onboarding steps
   - [ ] Set up support process

---

**Status: Ready for Testing ✅**

Good luck! Report back once you've completed testing. 🚀
