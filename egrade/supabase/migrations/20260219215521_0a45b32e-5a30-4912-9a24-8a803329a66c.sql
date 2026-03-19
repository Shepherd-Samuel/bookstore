
-- Fix overly permissive INSERT policy on error_logs - restrict to own user
DROP POLICY IF EXISTS "Authenticated insert errors" ON public.error_logs;
CREATE POLICY "Authenticated insert errors" ON public.error_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Fix curriculum designs ALL policy - restrict properly
DROP POLICY IF EXISTS "Teachers manage curriculum" ON public.curriculum_designs;
CREATE POLICY "Teachers insert curriculum" ON public.curriculum_designs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Teachers update curriculum" ON public.curriculum_designs FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Teachers delete curriculum" ON public.curriculum_designs FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Fix assessments ALL policy
DROP POLICY IF EXISTS "Teachers manage assessments" ON public.assessments;
CREATE POLICY "Teachers insert assessments" ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) AND teacher_id = auth.uid());
CREATE POLICY "Teachers update assessments" ON public.assessments FOR UPDATE TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) AND teacher_id = auth.uid());
CREATE POLICY "Teachers delete assessments" ON public.assessments FOR DELETE TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) AND teacher_id = auth.uid());

-- Fix teachers manage scores ALL policy
DROP POLICY IF EXISTS "Teachers manage scores" ON public.assessment_scores;
CREATE POLICY "Teachers insert scores" ON public.assessment_scores FOR INSERT TO authenticated
  WITH CHECK (assessment_id IN (SELECT id FROM public.assessments WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "Teachers update scores" ON public.assessment_scores FOR UPDATE TO authenticated
  USING (assessment_id IN (SELECT id FROM public.assessments WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())));

-- Fix Admins manage fees ALL policy
DROP POLICY IF EXISTS "Admins manage fees" ON public.fee_payments;
CREATE POLICY "Admins insert fees" ON public.fee_payments FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins update fees" ON public.fee_payments FOR UPDATE TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Fix Admins post notices ALL policy
DROP POLICY IF EXISTS "Admins post notices" ON public.noticeboard;
CREATE POLICY "Admins insert notices" ON public.noticeboard FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins update notices" ON public.noticeboard FOR UPDATE TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Fix SaaS admin manage schools ALL policy
DROP POLICY IF EXISTS "SaaS admin manage schools" ON public.schools;
CREATE POLICY "SaaS admin insert schools" ON public.schools FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'saas_admin'));
CREATE POLICY "SaaS admin update schools" ON public.schools FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'saas_admin'));

-- Fix SaaS admins manage roles ALL policy
DROP POLICY IF EXISTS "SaaS admins manage roles" ON public.user_roles;
CREATE POLICY "SaaS admins insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'saas_admin') OR user_id = auth.uid());
CREATE POLICY "SaaS admins update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'saas_admin'));
CREATE POLICY "SaaS admins delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'saas_admin'));
