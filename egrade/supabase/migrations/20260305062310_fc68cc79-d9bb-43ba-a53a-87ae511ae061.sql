
-- 1. Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public) VALUES ('school-logos', 'school-logos', true);

-- 2. Storage RLS: school admins can upload to their school folder
CREATE POLICY "School admins upload logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-logos'
    AND has_role(auth.uid(), 'school_admin')
  );

CREATE POLICY "School admins update logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-logos'
    AND has_role(auth.uid(), 'school_admin')
  );

CREATE POLICY "Anyone can view school logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'school-logos');

CREATE POLICY "Public view school logos"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'school-logos');

-- 3. School admin can update their own school
CREATE POLICY "School admin update own school"
  ON public.schools FOR UPDATE TO authenticated
  USING (id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'))
  WITH CHECK (id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
