CREATE TABLE public.bill_to (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  details TEXT NOT NULL,
  gstin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_to TO authenticated;
GRANT ALL ON public.bill_to TO service_role;
ALTER TABLE public.bill_to ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bill_to" ON public.bill_to FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_bill_to_updated_at BEFORE UPDATE ON public.bill_to FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();