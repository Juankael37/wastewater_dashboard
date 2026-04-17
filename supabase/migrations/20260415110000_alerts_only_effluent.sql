-- Update alert trigger to only create alerts for effluent measurements, not influent.

CREATE OR REPLACE FUNCTION public.create_alert_on_violation()
RETURNS TRIGGER AS $$
DECLARE
  standard_record RECORD;
  alert_message TEXT;
  severity TEXT;
BEGIN
  -- Only create alerts for effluent measurements
  IF NEW.type != 'effluent' THEN
    RETURN NEW;
  END IF;

  -- Get the standard for this parameter (Class C).
  SELECT s.min_limit, s.max_limit, p.name AS parameter_name
  INTO standard_record
  FROM public.standards s
  JOIN public.parameters p ON p.id = s.parameter_id
  WHERE s.parameter_id = NEW.parameter_id
    AND s.class = 'C';

  -- Check for violations.
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

  -- Insert alert
  INSERT INTO public.alerts (measurement_id, severity, message)
  VALUES (NEW.id, severity, alert_message);

  RETURN NEW;
END;
$$ language 'plpgsql';