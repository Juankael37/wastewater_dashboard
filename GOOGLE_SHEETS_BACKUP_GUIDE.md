# Google Sheets Backup Integration Guide

## Overview
This guide provides instructions for setting up Google Sheets backup functionality for the Wastewater Monitoring System. All submitted data will be automatically backed up to Google Sheets, providing an additional layer of data redundancy and easy access for non-technical users.

## Architecture
- **Trigger**: On measurement submission (API endpoint or database trigger)
- **Service**: Cloudflare Worker or Supabase Edge Function
- **Destination**: Google Sheets spreadsheet
- **Frequency**: Real-time or batch processing

## Step 1: Set Up Google Cloud Project

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Create Project"
3. Name: `wastewater-monitoring-backup`
4. Click "Create"

### 1.2 Enable Google Sheets API
1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click "Enable"
4. Also enable "Google Drive API" (for spreadsheet management)

## Step 2: Create Service Account

### 2.1 Create Service Account
1. Go to **IAM & Admin** → **Service Accounts**
2. Click "Create Service Account"
3. Enter details:
   - **Name**: `wastewater-sheets-backup`
   - **Description**: "Service account for Google Sheets backup"
4. Click "Create and Continue"
5. Skip role assignment for now
6. Click "Done"

### 2.2 Create Service Account Key
1. Find the service account in the list
2. Click on the email address
3. Go to **Keys** tab
4. Click "Add Key" → "Create new key"
5. Select **JSON** format
6. Click "Create"
7. **IMPORTANT**: Save the downloaded JSON file securely

## Step 3: Set Up Google Sheet

### 3.1 Create Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create new spreadsheet
3. Name it: `Wastewater Monitoring Backup - [Date]`
4. Create initial sheet structure:

### 3.2 Sheet Structure
Create the following columns in the first row (Row 1):

| Column | Header | Description |
|--------|--------|-------------|
| A | `timestamp` | Measurement timestamp (ISO format) |
| B | `plant_name` | Treatment plant name |
| C | `parameter` | Parameter name (pH, COD, BOD, etc.) |
| D | `value` | Measurement value |
| E | `unit` | Measurement unit (mg/L, °C, etc.) |
| F | `type` | Influent/Effluent |
| G | `operator` | Operator name/ID |
| H | `validation_status` | Pass/Warning/Fail |
| I | `alert_generated` | Yes/No |
| J | `alert_message` | Alert description if any |
| K | `image_url` | URL to captured image (if any) |
| L | `notes` | Additional notes |
| M | `backup_timestamp` | When data was backed up |

### 3.3 Share Spreadsheet with Service Account
1. Click "Share" button
2. Add the service account email (from JSON file: `client_email`)
3. Set permission to **Editor**
4. Click "Send"

## Step 4: Get Spreadsheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Copy the `SPREADSHEET_ID` (between `/d/` and `/edit`)
4. Save this ID for configuration

## Step 5: Implement Backup Function

### Option A: Cloudflare Worker Implementation

Create a new worker or add to existing API:

```javascript
// api/src/sheets-backup.js
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

// Initialize Google Sheets client
const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function backupToSheets(measurementData) {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Prepare row data
    const rowData = [
      measurementData.timestamp,
      measurementData.plant_name,
      measurementData.parameter,
      measurementData.value,
      measurementData.unit,
      measurementData.type,
      measurementData.operator,
      measurementData.validation_status,
      measurementData.alert_generated ? 'Yes' : 'No',
      measurementData.alert_message || '',
      measurementData.image_url || '',
      measurementData.notes || '',
      new Date().toISOString(), // backup_timestamp
    ];

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    console.log('Backup successful:', response.data.updates.updatedRows, 'rows updated');
    return { success: true, rowsUpdated: response.data.updates.updatedRows };
    
  } catch (error) {
    console.error('Google Sheets backup failed:', error);
    throw error;
  }
}
```

### Option B: Supabase Edge Function

Create a Supabase Edge Function for backup:

```typescript
// supabase/functions/sheets-backup/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleAuth } from 'https://esm.sh/google-auth-library@8.7.0'
import { google } from 'https://esm.sh/googleapis@126.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { measurement } = await req.json()
    
    // Initialize auth
    const auth = new GoogleAuth({
      credentials: JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY') || '{}'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_ID')

    // Prepare row
    const rowData = [
      measurement.timestamp,
      measurement.plant_name,
      measurement.parameter,
      measurement.value,
      measurement.unit,
      measurement.type,
      measurement.operator,
      measurement.validation_status,
      measurement.alert_generated ? 'Yes' : 'No',
      measurement.alert_message || '',
      measurement.image_url || '',
      measurement.notes || '',
      new Date().toISOString(),
    ]

    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:M',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        rowsUpdated: response.data.updates?.updatedRows 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

## Step 6: Configure Environment Variables

### For Cloudflare Worker
Update `api/wrangler.toml`:

```toml
[vars]
GOOGLE_SHEETS_ID = "your-spreadsheet-id-here"
GOOGLE_SERVICE_ACCOUNT_KEY = '{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

### For Supabase Edge Function
Set environment variables in Supabase dashboard:
1. Go to **Project Settings** → **API** → **Edge Functions**
2. Add environment variables:
   - `GOOGLE_SHEETS_ID`: Your spreadsheet ID
   - `GOOGLE_SERVICE_ACCOUNT_KEY`: Full JSON key as string

## Step 7: Integrate with Measurement Submission

### Option A: API Hook
Modify your measurement creation endpoint:

```javascript
// In your measurements POST endpoint
app.post('/measurements', authMiddleware, async (c) => {
  // ... existing code to create measurement ...
  
  // After successful creation, trigger backup
  try {
    await backupToSheets({
      ...measurementData,
      plant_name: plantData.name,
      parameter: parameterData.name,
      unit: parameterData.unit,
      validation_status: validationResult.valid ? 'Pass' : 'Warning',
      alert_generated: alertResult.hasAlert,
      alert_message: alertResult.message,
    });
  } catch (backupError) {
    // Log but don't fail the main request
    console.error('Backup failed, but measurement saved:', backupError);
  }
  
  return c.json({ data: measurement }, 201);
});
```

### Option B: Database Trigger (Recommended)
Set up a database trigger in Supabase:

```sql
-- Create a function to handle backup
CREATE OR REPLACE FUNCTION trigger_sheets_backup()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via HTTP
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/sheets-backup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
    body := json_build_object(
      'measurement', json_build_object(
        'id', NEW.id,
        'timestamp', NEW.timestamp,
        'value', NEW.value,
        'type', NEW.type,
        'operator_id', NEW.operator_id
        -- Add joins for plant and parameter names
      )
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER measurement_backup_trigger
  AFTER INSERT ON measurements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sheets_backup();
```

## Step 8: Test the Integration

### 8.1 Test Backup Function
```bash
# Test with curl
curl -X POST https://your-api.com/measurements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "plant_id": "plant-uuid",
    "parameter_id": "parameter-uuid", 
    "value": 7.5,
    "type": "influent"
  }'
```

### 8.2 Verify Google Sheet
1. Open your Google Sheet
2. Verify new row appears
3. Check all columns populated correctly
4. Verify timestamps are correct

### 8.3 Test Error Handling
1. Temporarily revoke sheet access
2. Submit measurement
3. Verify measurement still saves to database
4. Check error logs for backup failure

## Step 9: Implement Batch Backup (Optional)

For handling existing data or retrying failed backups:

```javascript
// Batch backup function
async function backupExistingData(startDate, endDate) {
  const measurements = await getMeasurementsFromDatabase(startDate, endDate);
  
  for (const measurement of measurements) {
    try {
      await backupToSheets(measurement);
      await markAsBackedUp(measurement.id);
    } catch (error) {
      console.error(`Failed to backup measurement ${measurement.id}:`, error);
      await logBackupError(measurement.id, error.message);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

## Step 10: Monitoring and Maintenance

### 10.1 Logging
Implement comprehensive logging:
- Successful backups (count, timestamp)
- Failed backups (error details)
- Rate limit hits
- Sheet quota usage

### 10.2 Alerting
Set up alerts for:
- Backup failures for > 10 consecutive attempts
- Google Sheets API quota approaching limits
- Spreadsheet nearing row limits (1M rows max)

### 10.3 Rotation Strategy
Google Sheets has a 1 million row limit. Implement rotation:

```javascript
// Check row count and create new sheet if needed
async function checkAndRotateSheet() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A:A',
  });
  
  const rowCount = response.data.values ? response.data.values.length : 0;
  
  if (rowCount > 900000) { // Near limit
    await createNewSheetAndUpdateConfig();
  }
}
```

## Step 11: Security Considerations

### 11.1 Service Account Security
- Store service account key securely (environment variables)
- Never commit keys to version control
- Rotate keys periodically (every 90 days recommended)
- Use minimal permissions (only Sheets API access)

### 11.2 Data Protection
- Consider anonymizing sensitive operator data
- Implement data retention policies
- Regular security audits of spreadsheet access

### 11.3 Access Control
- Limit who has edit access to the spreadsheet
- Use view-only access for most users
- Monitor access logs in Google Workspace

## Step 12: Cost Considerations

### Free Tier Limits
- Google Sheets API: 500 requests per 100 seconds per project
- 1 million cells per spreadsheet
- 5 million cells updated per day

### Monitoring Usage
1. Google Cloud Console → **APIs & Services** → **Dashboard**
2. Monitor Sheets API usage
3. Set up quota alerts

## Troubleshooting

### Common Issues

#### Issue: "Permission denied" error
**Solution**:
- Verify service account email has editor access to spreadsheet
- Check spreadsheet ID is correct
- Verify service account key is valid and not expired

#### Issue: API quota exceeded
**Solution**:
- Implement rate limiting (max 5 requests per second)
- Use batch operations for multiple rows
- Request quota increase if needed

#### Issue: Slow response times
**Solution**:
- Implement async processing (don't block main request)
- Use batch updates for multiple measurements
- Consider background job processing

#### Issue: Data format errors
**Solution**:
- Validate data before sending to Sheets
- Handle special characters and line breaks
- Use proper data types (numbers vs strings)

## Success Criteria

The Google Sheets backup is considered successfully implemented when:

1. ✅ Measurements automatically backed up on submission
2. ✅ All relevant data fields captured in spreadsheet
3. ✅ Error handling prevents data loss if backup fails
4. ✅ Backup process doesn't significantly impact user experience
5. ✅ Security measures implemented for service account
6. ✅ Monitoring and alerting set up for failures
7. ✅ Documentation complete for maintenance

## Next Steps

After successful implementation:

1. **Test with real data**: Monitor for 1 week
2. **Optimize performance**: Fine-tune rate limiting
3. **Add reporting**: Create summary sheets with charts
4. **Implement data validation**: In-sheet data quality checks
5. **Schedule exports**: Regular CSV exports for archiving
6. **Multi-sheet strategy**: Organize data by month/year