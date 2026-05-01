-- Migration: Add scheduling options to report_settings
-- Date: 2026-04-29

ALTER TABLE report_settings 
ADD COLUMN IF NOT EXISTS send_time TEXT DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7)),
ADD COLUMN IF NOT EXISTS day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 28)),
ADD COLUMN IF NOT EXISTS include_charts BOOLEAN DEFAULT TRUE;