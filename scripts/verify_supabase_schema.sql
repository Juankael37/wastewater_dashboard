-- Run in Supabase SQL Editor after applying schema + migration.
-- Expects 7 core public tables.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'companies',
    'plants',
    'parameters',
    'standards',
    'measurements',
    'alerts',
    'profiles'
  )
ORDER BY table_name;
