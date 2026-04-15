-- Enable admin writes for parameters/standards used by Worker `/api/parameters*` routes.
-- Keeps read access for authenticated users from prior migration.

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
