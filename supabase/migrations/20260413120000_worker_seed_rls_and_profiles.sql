-- Run AFTER base schema: apply `supabase_schema.sql` first (SQL Editor or Supabase CLI).
-- Adds: default org + plant, profile trigger for new auth users, RLS policies missing from base
-- (parameters/standards/alerts had RLS ON with no policies = deny-all).

-- ---------------------------------------------------------------------------
-- 1) Default tenant data (single-organization MVP)
-- ---------------------------------------------------------------------------
INSERT INTO public.companies (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.companies);

INSERT INTO public.plants (company_id, name, location)
SELECT c.id, 'Main Treatment Plant', 'Default site'
FROM public.companies c
WHERE NOT EXISTS (SELECT 1 FROM public.plants)
ORDER BY c.created_at
LIMIT 1;

-- ---------------------------------------------------------------------------
-- 2) Backfill profiles for existing auth users (one-time)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, company_id, role, full_name)
SELECT
  u.id,
  (SELECT id FROM public.companies ORDER BY created_at LIMIT 1),
  'operator',
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) New user → profile row (maps app roles to profiles.role CHECK)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  mapped_role text;
BEGIN
  SELECT c.id INTO cid FROM public.companies c ORDER BY c.created_at LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO public.companies (name) VALUES ('Default Organization') RETURNING id INTO cid;
  END IF;

  mapped_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
  IF mapped_role = 'admin' THEN
    mapped_role := 'company_admin';
  ELSIF mapped_role = 'client' THEN
    mapped_role := 'viewer';
  ELSIF mapped_role NOT IN ('super_admin', 'company_admin', 'operator', 'viewer') THEN
    mapped_role := 'operator';
  END IF;

  INSERT INTO public.profiles (id, company_id, role, full_name)
  VALUES (
    NEW.id,
    cid,
    mapped_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) RLS: parameters & standards (read for authenticated)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read parameters" ON public.parameters;
CREATE POLICY "Authenticated users can read parameters"
  ON public.parameters FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read standards" ON public.standards;
CREATE POLICY "Authenticated users can read standards"
  ON public.standards FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- 5) RLS: alerts (Worker lists / resolves alerts)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read alerts" ON public.alerts;
CREATE POLICY "Authenticated users can read alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
CREATE POLICY "Authenticated users can update alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6) RLS: measurements — enforce operator_id = auth.uid() on insert
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Operators can insert measurements" ON public.measurements;
CREATE POLICY "Operators can insert own measurements"
  ON public.measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    operator_id = auth.uid()
    AND auth.uid() IN (
      SELECT id FROM public.profiles
      WHERE role IN ('operator', 'company_admin', 'super_admin')
    )
  );
