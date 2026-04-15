-- One-shot rollout script for Worker Settings parameter-write parity.
-- Run in Supabase SQL Editor against your target project.
--
-- What this does:
-- 1) Applies admin write policies for public.parameters + public.standards.
-- 2) Verifies policies exist after apply.
-- 3) Prints quick data sanity checks for Class C standards.

BEGIN;

-- =====================================================================
-- Apply migration: 20260415103000_fix_alert_trigger_format.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.create_alert_on_violation()
RETURNS TRIGGER AS $$
DECLARE
  standard_record RECORD;
  alert_message TEXT;
  severity TEXT;
BEGIN
  SELECT s.min_limit, s.max_limit, p.name AS parameter_name
  INTO standard_record
  FROM public.standards s
  JOIN public.parameters p ON p.id = s.parameter_id
  WHERE s.parameter_id = NEW.parameter_id
    AND s.class = 'C';

  IF standard_record.min_limit IS NOT NULL AND NEW.value < standard_record.min_limit THEN
    alert_message := format(
      '%s value (%s) below minimum limit (%s)',
      standard_record.parameter_name,
      round(NEW.value::numeric, 2),
      round(standard_record.min_limit::numeric, 2)
    );
    severity := 'critical';
  ELSIF standard_record.max_limit IS NOT NULL AND NEW.value > standard_record.max_limit THEN
    alert_message := format(
      '%s value (%s) above maximum limit (%s)',
      standard_record.parameter_name,
      round(NEW.value::numeric, 2),
      round(standard_record.max_limit::numeric, 2)
    );
    severity := 'critical';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.alerts (measurement_id, severity, message)
  VALUES (NEW.id, severity, alert_message);

  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================================
-- Apply migration: 20260415100000_alerts_insert_policy.sql
-- =====================================================================

DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
CREATE POLICY "Authenticated users can insert alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================================
-- Apply migration: 20260415090000_parameters_admin_write_policies.sql
-- =====================================================================

-- Parameters: admins can insert/update/delete.
DROP POLICY IF EXISTS "Admins can insert parameters" ON public.parameters;
CREATE POLICY "Admins can insert parameters"
  ON public.parameters FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update parameters" ON public.parameters;
CREATE POLICY "Admins can update parameters"
  ON public.parameters FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete parameters" ON public.parameters;
CREATE POLICY "Admins can delete parameters"
  ON public.parameters FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  );

-- Standards: admins can insert/update/delete.
DROP POLICY IF EXISTS "Admins can insert standards" ON public.standards;
CREATE POLICY "Admins can insert standards"
  ON public.standards FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update standards" ON public.standards;
CREATE POLICY "Admins can update standards"
  ON public.standards FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete standards" ON public.standards;
CREATE POLICY "Admins can delete standards"
  ON public.standards FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('company_admin', 'super_admin')
    )
  );

COMMIT;

-- =====================================================================
-- Verification 1: policy inventory
-- =====================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('parameters', 'standards')
ORDER BY tablename, policyname;

-- =====================================================================
-- Verification 2: required policy count
-- Expect >= 8 rows from this query:
--   2 read policies (existing migration) +
--   6 admin write policies (this rollout).
-- =====================================================================
SELECT COUNT(*) AS policy_count_parameters_standards
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('parameters', 'standards');

-- =====================================================================
-- Verification 3: data sanity for Worker /api/parameters
-- =====================================================================
SELECT
  p.name AS parameter_name,
  s.class,
  s.min_limit,
  s.max_limit
FROM public.standards s
JOIN public.parameters p ON p.id = s.parameter_id
WHERE s.class = 'C'
ORDER BY p.name;

-- =====================================================================
-- Verification 4: alerts policies present (INSERT/SELECT/UPDATE)
-- =====================================================================
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'alerts'
ORDER BY policyname;
