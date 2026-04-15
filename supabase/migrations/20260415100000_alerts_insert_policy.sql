-- Allow trigger-created alerts to be inserted under RLS.
-- Alerts are created after measurement inserts; the inserter is an authenticated operator/admin.

DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
CREATE POLICY "Authenticated users can insert alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);
