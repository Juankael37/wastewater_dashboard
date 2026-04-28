-- Migration: Add report_settings table for automated email reports
-- Date: 2026-04-28

CREATE TABLE IF NOT EXISTS report_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE report_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage report settings"
    ON report_settings FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('company_admin', 'super_admin')
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_report_settings_updated_at 
    BEFORE UPDATE ON report_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
