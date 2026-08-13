CREATE TABLE public.site_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  site_name text NOT NULL,
  accounting_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_codes TO authenticated;
GRANT ALL ON public.site_codes TO service_role;

ALTER TABLE public.site_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own site codes" ON public.site_codes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX site_codes_user_site_uidx ON public.site_codes (user_id, lower(site_name));

CREATE TRIGGER trg_site_codes_updated BEFORE UPDATE ON public.site_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();