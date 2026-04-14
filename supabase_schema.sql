-- Wastewater Monitoring System - Supabase PostgreSQL Schema
-- Phase 0: Core Database Setup
--
-- After this file, apply supabase/migrations/20260413120000_worker_seed_rls_and_profiles.sql
-- (see supabase/APPLY_ORDER.txt). Required for Cloudflare Worker RLS + default plant seed.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== CORE TABLES ====================

-- Companies (for multi-tenant support)
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plants (wastewater treatment plants)
CREATE TABLE IF NOT EXISTS plants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parameters (configurable water quality parameters)
CREATE TABLE IF NOT EXISTS parameters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    description TEXT,
    min_value REAL,
    max_value REAL,
    validation_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Water Quality Standards
CREATE TABLE IF NOT EXISTS standards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    parameter_id UUID REFERENCES parameters(id) ON DELETE CASCADE,
    class TEXT NOT NULL, -- 'A', 'B', 'C'
    min_limit REAL,
    max_limit REAL,
    unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parameter_id, class)
);

-- Measurements (influent/effluent data)
CREATE TABLE IF NOT EXISTS measurements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    parameter_id UUID REFERENCES parameters(id) ON DELETE CASCADE,
    value REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('influent', 'effluent')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Measurement Images (camera integration)
CREATE TABLE IF NOT EXISTS measurement_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    parameter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts (threshold violations)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    measurement_id UUID REFERENCES measurements(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PROFILES TABLE ====================
-- Extends Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'company_admin', 'operator', 'viewer')),
    full_name TEXT,
    phone TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_measurements_plant_timestamp ON measurements(plant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_parameter ON measurements(parameter_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ==================== ROW LEVEL SECURITY (RLS) ====================
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Companies policies (company admins can manage their company)
CREATE POLICY "Company admins can view their company"
    ON companies FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE company_id = companies.id 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- Plants policies
CREATE POLICY "Users can view plants in their company"
    ON plants FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Measurements policies
CREATE POLICY "Users can view measurements from their company"
    ON measurements FOR SELECT
    USING (
        plant_id IN (
            SELECT id FROM plants 
            WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Operators can insert measurements"
    ON measurements FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('operator', 'company_admin', 'super_admin')
        )
    );

-- ==================== DEFAULT DATA ====================

-- Insert default parameters
INSERT INTO parameters (name, display_name, unit, min_value, max_value) VALUES
    ('ph', 'pH', '-', 0, 14),
    ('cod', 'Chemical Oxygen Demand', 'mg/L', 0, 500),
    ('bod', 'Biological Oxygen Demand', 'mg/L', 0, 300),
    ('tss', 'Total Suspended Solids', 'mg/L', 0, 500),
    ('ammonia', 'Ammonia', 'mg/L', 0, 50),
    ('nitrate', 'Nitrate', 'mg/L', 0, 100),
    ('phosphate', 'Phosphate', 'mg/L', 0, 50),
    ('temperature', 'Temperature', '°C', 0, 50),
    ('flow', 'Flow Rate', 'm³/day', 0, 10000)
ON CONFLICT (name) DO NOTHING;

-- Insert default standards (Class C water body)
INSERT INTO standards (parameter_id, class, min_limit, max_limit, unit) 
SELECT p.id, 'C', 
    CASE p.name
        WHEN 'ph' THEN 6.0
        WHEN 'cod' THEN NULL
        WHEN 'bod' THEN NULL
        WHEN 'tss' THEN NULL
        WHEN 'ammonia' THEN NULL
        WHEN 'nitrate' THEN NULL
        WHEN 'phosphate' THEN NULL
        ELSE NULL
    END,
    CASE p.name
        WHEN 'ph' THEN 9.5
        WHEN 'cod' THEN 100
        WHEN 'bod' THEN 50
        WHEN 'tss' THEN 100
        WHEN 'ammonia' THEN 0.5
        WHEN 'nitrate' THEN 14
        WHEN 'phosphate' THEN 1
        ELSE NULL
    END,
    p.unit
FROM parameters p
WHERE p.name IN ('ph', 'cod', 'bod', 'tss', 'ammonia', 'nitrate', 'phosphate')
ON CONFLICT (parameter_id, class) DO NOTHING;

-- ==================== FUNCTIONS & TRIGGERS ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plants_updated_at 
    BEFORE UPDATE ON plants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parameters_updated_at 
    BEFORE UPDATE ON parameters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standards_updated_at 
    BEFORE UPDATE ON standards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at 
    BEFORE UPDATE ON measurements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create alert on measurement insertion
CREATE OR REPLACE FUNCTION create_alert_on_violation()
RETURNS TRIGGER AS $$
DECLARE
    standard_record RECORD;
    alert_message TEXT;
    severity TEXT;
BEGIN
    -- Get the standard for this parameter
    SELECT s.min_limit, s.max_limit, p.name as parameter_name
    INTO standard_record
    FROM standards s
    JOIN parameters p ON p.id = s.parameter_id
    WHERE s.parameter_id = NEW.parameter_id 
    AND s.class = 'C';
    
    -- Check if standard exists and violation occurs
    IF standard_record.min_limit IS NOT NULL AND NEW.value < standard_record.min_limit THEN
        alert_message := format('%s value (%.2f) below minimum limit (%.2f)', 
            standard_record.parameter_name, NEW.value, standard_record.min_limit);
        severity := 'critical';
    ELSIF standard_record.max_limit IS NOT NULL AND NEW.value > standard_record.max_limit THEN
        alert_message := format('%s value (%.2f) above maximum limit (%.2f)', 
            standard_record.parameter_name, NEW.value, standard_record.max_limit);
        severity := 'critical';
    ELSE
        RETURN NEW;
    END IF;
    
    -- Insert alert
    INSERT INTO alerts (measurement_id, severity, message)
    VALUES (NEW.id, severity, alert_message);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic alerts
CREATE TRIGGER trigger_alert_on_measurement
    AFTER INSERT ON measurements
    FOR EACH ROW EXECUTE FUNCTION create_alert_on_violation();

-- ==================== STORAGE SETUP ====================
-- Note: Storage buckets are typically created via Supabase Dashboard
-- We'll create them via SQL if possible, but usually done in UI

-- Create storage bucket for measurement images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('measurement-images', 'measurement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for measurement images
CREATE POLICY "Users can upload images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'measurement-images' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Users can view images from their company"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'measurement-images' AND
        (auth.uid() IN (
            SELECT m.operator_id FROM measurements m
            WHERE m.id::text = (storage.foldername(name))[1]
        ) OR auth.uid() IN (
            SELECT p.id FROM profiles p
            WHERE p.company_id IN (
                SELECT pl.company_id FROM measurements m
                JOIN plants pl ON pl.id = m.plant_id
                WHERE m.id::text = (storage.foldername(name))[1]
            )
        ))
    );