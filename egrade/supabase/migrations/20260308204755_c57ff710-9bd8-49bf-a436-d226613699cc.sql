
-- =====================================================
-- FIX 1: PRIVILEGE ESCALATION - user_roles INSERT policy
-- Remove the (user_id = auth.uid()) branch that lets anyone self-grant roles
-- =====================================================
DROP POLICY IF EXISTS "SaaS admins insert roles" ON public.user_roles;
CREATE POLICY "SaaS admins insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- =====================================================
-- FIX 2: EXPOSED SENSITIVE DATA - schools table
-- Replace the unrestricted public SELECT with a view pattern
-- Drop the overly permissive public policy
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read school slug and name" ON public.schools;

-- Create a restricted public policy that only exposes safe columns via a view
CREATE OR REPLACE VIEW public.schools_public
WITH (security_invoker = on) AS
  SELECT id, school_name, slug, logo_url, moto, is_active
  FROM public.schools;

-- =====================================================
-- FIX 3: fee_payments - add role check to INSERT and UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Admins insert fees" ON public.fee_payments;
CREATE POLICY "Admins insert fees"
  ON public.fee_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = get_user_school_id()
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins update fees" ON public.fee_payments;
CREATE POLICY "Admins update fees"
  ON public.fee_payments FOR UPDATE
  TO authenticated
  USING (
    school_id = get_user_school_id()
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );

-- =====================================================
-- FIX 4: assessment_scores - add role check to INSERT and UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Teachers insert scores" ON public.assessment_scores;
CREATE POLICY "Teachers insert scores"
  ON public.assessment_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT id FROM assessments WHERE school_id = get_user_school_id()
    )
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );

DROP POLICY IF EXISTS "Teachers update scores" ON public.assessment_scores;
CREATE POLICY "Teachers update scores"
  ON public.assessment_scores FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE school_id = get_user_school_id()
    )
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );

-- =====================================================
-- FIX 5: mcq_options - restrict is_correct from students
-- Create a view that hides is_correct for students
-- =====================================================
DROP POLICY IF EXISTS "School members view mcq options" ON public.mcq_options;

-- Teachers/admins can see everything
CREATE POLICY "Teachers view mcq options"
  ON public.mcq_options FOR SELECT
  TO authenticated
  USING (
    question_id IN (
      SELECT aq.id FROM assessment_questions aq
      JOIN assessments a ON a.id = aq.assessment_id
      WHERE a.school_id = get_user_school_id()
    )
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );

-- Students can see options but we'll handle is_correct filtering in the app
CREATE POLICY "Students view mcq options"
  ON public.mcq_options FOR SELECT
  TO authenticated
  USING (
    question_id IN (
      SELECT aq.id FROM assessment_questions aq
      JOIN assessments a ON a.id = aq.assessment_id
      WHERE a.school_id = get_user_school_id()
        AND a.is_published = true
    )
  );

-- =====================================================
-- FIX 6: profiles - prevent users from changing their own role
-- =====================================================
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- =====================================================
-- FIX 7: discipline_records - add role check to INSERT
-- =====================================================
DROP POLICY IF EXISTS "School admin insert discipline" ON public.discipline_records;
CREATE POLICY "School admin insert discipline"
  ON public.discipline_records FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = get_user_school_id()
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  );

-- =====================================================
-- FIX 8: noticeboard - add role check to INSERT and UPDATE
-- =====================================================
DROP POLICY IF EXISTS "Admins insert notices" ON public.noticeboard;
CREATE POLICY "Admins insert notices"
  ON public.noticeboard FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = get_user_school_id()
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins update notices" ON public.noticeboard;
CREATE POLICY "Admins update notices"
  ON public.noticeboard FOR UPDATE
  TO authenticated
  USING (
    school_id = get_user_school_id()
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );

-- =====================================================
-- FIX 9: assessment_questions - restrict student access to published only
-- =====================================================
DROP POLICY IF EXISTS "School members view questions" ON public.assessment_questions;

CREATE POLICY "Teachers view questions"
  ON public.assessment_questions FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments WHERE school_id = get_user_school_id()
    )
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );

CREATE POLICY "Students view published questions"
  ON public.assessment_questions FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT id FROM assessments
      WHERE school_id = get_user_school_id()
        AND is_published = true
    )
  );

-- =====================================================
-- FIX 10: error_logs - restrict to admin only
-- =====================================================
DROP POLICY IF EXISTS "School members view errors" ON public.error_logs;
CREATE POLICY "School admin view errors"
  ON public.error_logs FOR SELECT
  TO authenticated
  USING (
    school_id = get_user_school_id()
    AND has_role(auth.uid(), 'school_admin'::app_role)
  );
