ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_mobile_unique ON public.profiles (mobile) WHERE mobile IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, mobile)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'mobile',''), '[^0-9]', '', 'g'), '')
  );
  RETURN NEW;
END;
$function$;