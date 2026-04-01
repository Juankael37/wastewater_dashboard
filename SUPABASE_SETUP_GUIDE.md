# Supabase Setup Guide for Wastewater Monitoring System

## Overview
This guide provides step-by-step instructions for setting up Supabase for the Wastewater Monitoring System. Supabase provides PostgreSQL database, authentication, and storage services that are essential for the project.

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, GitLab, or email
4. Verify your email address

## Step 2: Create a New Project

1. Click "New Project"
2. Enter project details:
   - **Name**: `wastewater-monitoring` (or your preferred name)
   - **Database Password**: Create a secure password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select **Free Tier** (for zero-cost deployment)

3. Click "Create new project"
4. Wait 1-2 minutes for the project to be provisioned

## Step 3: Get Project Credentials

Once the project is created, navigate to **Project Settings** → **API**:

1. **Project URL**: Copy the URL (e.g., `https://xxxxxxxxxxxx.supabase.co`)
2. **anon/public key**: Copy the "anon" public key
3. **service_role key**: Copy the "service_role" key (keep this secret!)

## Step 4: Deploy Database Schema

### Option A: Using SQL Editor (Recommended)
1. Go to **SQL Editor** in the Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `supabase_schema.sql` from this project
4. Paste and run the SQL script
5. Verify all tables are created successfully

### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push schema
supabase db push
```

## Step 5: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates if needed
4. Go to **Authentication** → **URL Configuration**
   - Set **Site URL**: `http://localhost:5173` (for development)
   - Set **Redirect URLs**: Add your frontend URLs

## Step 6: Set Up Storage

1. Go to **Storage** → **Create new bucket**
2. Create buckets:
   - **measurement-images**: For parameter images from camera
   - **reports**: For generated PDF reports
3. Configure RLS policies for each bucket

## Step 7: Update Environment Variables

Update the following files with your actual Supabase credentials:

### `frontend/.env.development`
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### `frontend/.env.production` (create if doesn't exist)
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### `api/wrangler.toml`
```toml
[vars]
SUPABASE_URL = "https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"
```

## Step 8: Test the Connection

### Frontend Test
1. Start the frontend: `cd frontend && npm run dev`
2. Navigate to `http://localhost:5173`
3. Try to register a new user
4. Verify user appears in Supabase **Authentication** → **Users**

### Backend Test
1. Update `api/src/index.js` with your Supabase credentials
2. Test API endpoints

## Step 9: Configure Row Level Security (RLS)

The schema includes RLS policies, but you should review and test them:

1. Go to **Authentication** → **Policies**
2. Verify policies are enabled for all tables:
   - `profiles`: Users can read their own profile
   - `measurements`: Operators can create, admins can read all
   - `alerts`: Admins can read all, operators can read their own

## Step 10: Set Up Initial Data

Run the following SQL to insert initial parameters:

```sql
-- Insert initial water quality parameters
INSERT INTO parameters (name, display_name, unit, min_value, max_value, description) VALUES
('ph', 'pH', '-', 0, 14, 'Acidity/Alkalinity'),
('cod', 'COD', 'mg/L', 0, 1000, 'Chemical Oxygen Demand'),
('bod', 'BOD', 'mg/L', 0, 500, 'Biochemical Oxygen Demand'),
('tss', 'TSS', 'mg/L', 0, 1000, 'Total Suspended Solids'),
('ammonia', 'Ammonia', 'mg/L', 0, 100, 'Ammonia Nitrogen'),
('nitrate', 'Nitrate', 'mg/L', 0, 100, 'Nitrate Nitrogen'),
('phosphate', 'Phosphate', 'mg/L', 0, 50, 'Phosphate'),
('temperature', 'Temperature', '°C', 0, 100, 'Water Temperature'),
('flow', 'Flow', 'm³/day', 0, 100000, 'Water Flow Rate');

-- Insert water quality standards (Class C)
INSERT INTO standards (parameter_id, class, min_limit, max_limit, unit) VALUES
((SELECT id FROM parameters WHERE name = 'ammonia'), 'C', NULL, 0.5, 'mg/L'),
((SELECT id FROM parameters WHERE name = 'nitrate'), 'C', NULL, 14, 'mg/L'),
((SELECT id FROM parameters WHERE name = 'phosphate'), 'C', NULL, 1, 'mg/L'),
((SELECT id FROM parameters WHERE name = 'cod'), 'C', NULL, 100, 'mg/L'),
((SELECT id FROM parameters WHERE name = 'bod'), 'C', NULL, 50, 'mg/L'),
((SELECT id FROM parameters WHERE name = 'tss'), 'C', NULL, 100, 'mg/L'),
((SELECT id FROM parameters WHERE name = 'ph'), 'C', 6.0, 9.5, '-');
```

## Troubleshooting

### Common Issues

1. **Authentication fails**: Check redirect URLs in Supabase settings
2. **RLS policies blocking access**: Review and adjust policies
3. **CORS errors**: Add frontend URL to Supabase CORS settings
4. **Storage upload fails**: Check bucket permissions and RLS policies

### Free Tier Limits

- **Database**: 500MB storage
- **Auth**: 50,000 monthly active users
- **Storage**: 1GB storage
- **Bandwidth**: 2GB transfer
- **Realtime**: 2 million messages/month

Monitor usage in **Project Settings** → **Usage** to stay within limits.

## Next Steps

After Supabase is set up:

1. **Test the full stack**: Frontend → API → Database
2. **Implement data migration**: Migrate existing SQLite data to Supabase
3. **Set up backups**: Configure automatic backups
4. **Monitor performance**: Use Supabase dashboard to monitor queries

## Support

- Supabase Documentation: https://supabase.com/docs
- Discord Community: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase