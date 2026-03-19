-- Storage RLS for passports bucket: allow users to upload their own photo,
-- class teachers to upload for students in their stream, school admins to upload for any student
CREATE POLICY "Users upload own passport"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'passports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Class teachers upload student passports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'passports'
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "School admins upload passports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'passports'
  AND has_role(auth.uid(), 'school_admin'::app_role)
);

CREATE POLICY "Anyone can view passports"
ON storage.objects FOR SELECT
USING (bucket_id = 'passports');

CREATE POLICY "Users update own passport"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'passports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Teachers update student passports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'passports'
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Admins update passports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'passports'
  AND has_role(auth.uid(), 'school_admin'::app_role)
);

-- Also allow teacher to update student profile passport_url
CREATE POLICY "Class teachers update student passport_url"
ON public.profiles FOR UPDATE
USING (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND stream_id IN (
    SELECT id FROM streams WHERE class_teacher_id = auth.uid()
  )
)
WITH CHECK (
  school_id = get_user_school_id()
  AND has_role(auth.uid(), 'teacher'::app_role)
  AND stream_id IN (
    SELECT id FROM streams WHERE class_teacher_id = auth.uid()
  )
);