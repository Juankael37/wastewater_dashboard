# Mobile Input Debug Checklist

## Backend Status ✅
- Backend running: http://localhost:5000
- API endpoint: POST /api/measurements
- Measurement creation: Working via Python test
- Field names expected: timestamp, ph, cod, bod, tss, ammonia, nitrate, phosphate, temperature, flow, type, plant_id, operator_id, notes

## Frontend Status ❓
- Frontend running: http://localhost:5173
- Input page accessible: ❓
- Form submission: ❓
- API call from frontend: ❓

## Potential Issues to Check:

### 1. Form Field Mismatch
- Frontend sends: `plant_id` ✅
- Backend expects: `plant_id` ✅
- **Status: MATCHING**

### 2. Data Type Issues
- Frontend sends: strings from form inputs
- Backend expects: converted to numbers
- **Status: Backend handles conversion**

### 3. Authentication Issues
- Frontend includes: `credentials: 'include'` ✅
- Session cookies: ❓
- **Status: NEEDS CHECK**

### 4. JavaScript Console Errors
- Check browser console for: ❓
  - Form validation errors
  - Network request failures
  - API response errors

### 5. Network Issues
- CORS headers: ❓
- Request format: ❓
- Response handling: ❓

## Debug Steps:
1. Open browser dev tools
2. Navigate to http://localhost:5173/input
3. Fill out form with test data
4. Check console for errors
5. Check Network tab for request details
6. Verify response status and body

## Test Data:
- pH: 7.2
- COD: 45.0
- BOD: 25.0
- TSS: 35.0
- Ammonia: 0.3
- Nitrate: 8.0
- Phosphate: 0.5
- Temperature: 22.0
- Flow: 2500.0
- Type: effluent
- Plant ID: 1
