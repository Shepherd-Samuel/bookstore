
-- Fix search_path for the slug function
CREATE OR REPLACE FUNCTION public.generate_school_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(regexp_replace(NEW.school_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
    WHILE EXISTS (SELECT 1 FROM public.schools WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
