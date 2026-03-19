
-- Add slug column to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Generate slugs from existing school names
UPDATE public.schools 
SET slug = lower(regexp_replace(regexp_replace(school_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Create function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.generate_school_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(regexp_replace(NEW.school_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
    -- Handle duplicates by appending a random suffix
    WHILE EXISTS (SELECT 1 FROM public.schools WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_generate_school_slug ON public.schools;
CREATE TRIGGER trigger_generate_school_slug
  BEFORE INSERT OR UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_school_slug();

-- Allow public (unauthenticated) read of school slug and name for login page
CREATE POLICY "Anyone can read school slug and name" ON public.schools
  FOR SELECT USING (true);
