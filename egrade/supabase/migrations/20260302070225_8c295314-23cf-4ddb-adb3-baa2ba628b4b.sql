
-- 1. Create a SECURITY DEFINER function to get the user's school_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_school_id FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_school_id TO authenticated;

-- 2. Fix profiles table policies (the root cause of recursion)
DROP POLICY IF EXISTS "School members view profiles" ON public.profiles;
CREATE POLICY "School members view profiles" ON public.profiles
  FOR SELECT USING (school_id = public.get_user_school_id());

DROP POLICY IF EXISTS "School admin insert profiles" ON public.profiles;
CREATE POLICY "School admin insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

DROP POLICY IF EXISTS "School admin update profiles" ON public.profiles;
CREATE POLICY "School admin update profiles" ON public.profiles
  FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- 3. Fix all other tables that reference profiles in their RLS policies

-- classes
DROP POLICY IF EXISTS "School members view classes" ON public.classes;
CREATE POLICY "School members view classes" ON public.classes FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin insert classes" ON public.classes;
CREATE POLICY "School admin insert classes" ON public.classes FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update classes" ON public.classes;
CREATE POLICY "School admin update classes" ON public.classes FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin delete classes" ON public.classes;
CREATE POLICY "School admin delete classes" ON public.classes FOR DELETE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- streams
DROP POLICY IF EXISTS "School members view streams" ON public.streams;
CREATE POLICY "School members view streams" ON public.streams FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin insert streams" ON public.streams;
CREATE POLICY "School admin insert streams" ON public.streams FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update streams" ON public.streams;
CREATE POLICY "School admin update streams" ON public.streams FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin delete streams" ON public.streams;
CREATE POLICY "School admin delete streams" ON public.streams FOR DELETE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- departments
DROP POLICY IF EXISTS "School members view departments" ON public.departments;
CREATE POLICY "School members view departments" ON public.departments FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin insert departments" ON public.departments;
CREATE POLICY "School admin insert departments" ON public.departments FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update departments" ON public.departments;
CREATE POLICY "School admin update departments" ON public.departments FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin delete departments" ON public.departments;
CREATE POLICY "School admin delete departments" ON public.departments FOR DELETE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- attendance
DROP POLICY IF EXISTS "School members view attendance" ON public.attendance;
CREATE POLICY "School members view attendance" ON public.attendance FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin update attendance" ON public.attendance;
CREATE POLICY "School admin update attendance" ON public.attendance FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "Teachers insert attendance" ON public.attendance;
CREATE POLICY "Teachers insert attendance" ON public.attendance FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND marked_by = auth.uid());
DROP POLICY IF EXISTS "Teachers manage attendance" ON public.attendance;
CREATE POLICY "Teachers manage attendance" ON public.attendance FOR INSERT WITH CHECK (school_id = public.get_user_school_id());

-- assessments
DROP POLICY IF EXISTS "School members view assessments" ON public.assessments;
CREATE POLICY "School members view assessments" ON public.assessments FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin insert assessments" ON public.assessments;
CREATE POLICY "School admin insert assessments" ON public.assessments FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update assessments" ON public.assessments;
CREATE POLICY "School admin update assessments" ON public.assessments FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin delete assessments" ON public.assessments;
CREATE POLICY "School admin delete assessments" ON public.assessments FOR DELETE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "Teachers insert assessments" ON public.assessments;
CREATE POLICY "Teachers insert assessments" ON public.assessments FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND teacher_id = auth.uid());
DROP POLICY IF EXISTS "Teachers update assessments" ON public.assessments;
CREATE POLICY "Teachers update assessments" ON public.assessments FOR UPDATE USING (school_id = public.get_user_school_id() AND teacher_id = auth.uid());
DROP POLICY IF EXISTS "Teachers delete assessments" ON public.assessments;
CREATE POLICY "Teachers delete assessments" ON public.assessments FOR DELETE USING (school_id = public.get_user_school_id() AND teacher_id = auth.uid());

-- assessment_questions
DROP POLICY IF EXISTS "School members view questions" ON public.assessment_questions;
CREATE POLICY "School members view questions" ON public.assessment_questions FOR SELECT USING (assessment_id IN (SELECT id FROM assessments WHERE school_id = public.get_user_school_id()));
DROP POLICY IF EXISTS "School admin insert questions" ON public.assessment_questions;
CREATE POLICY "School admin insert questions" ON public.assessment_questions FOR INSERT WITH CHECK (assessment_id IN (SELECT id FROM assessments WHERE school_id = public.get_user_school_id()) AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update questions" ON public.assessment_questions;
CREATE POLICY "School admin update questions" ON public.assessment_questions FOR UPDATE USING (assessment_id IN (SELECT id FROM assessments WHERE school_id = public.get_user_school_id()) AND public.has_role(auth.uid(), 'school_admin'));

-- assessment_scores
DROP POLICY IF EXISTS "School members view scores" ON public.assessment_scores;
CREATE POLICY "School members view scores" ON public.assessment_scores FOR SELECT USING (assessment_id IN (SELECT id FROM assessments WHERE school_id = public.get_user_school_id()));
DROP POLICY IF EXISTS "Teachers insert scores" ON public.assessment_scores;
CREATE POLICY "Teachers insert scores" ON public.assessment_scores FOR INSERT WITH CHECK (assessment_id IN (SELECT id FROM assessments WHERE school_id = public.get_user_school_id()));
DROP POLICY IF EXISTS "Teachers update scores" ON public.assessment_scores;
CREATE POLICY "Teachers update scores" ON public.assessment_scores FOR UPDATE USING (assessment_id IN (SELECT id FROM assessments WHERE school_id = public.get_user_school_id()));

-- mcq_options
DROP POLICY IF EXISTS "School members view mcq options" ON public.mcq_options;
CREATE POLICY "School members view mcq options" ON public.mcq_options FOR SELECT USING (question_id IN (SELECT aq.id FROM assessment_questions aq JOIN assessments a ON a.id = aq.assessment_id WHERE a.school_id = public.get_user_school_id()));

-- error_logs
DROP POLICY IF EXISTS "School members view errors" ON public.error_logs;
CREATE POLICY "School members view errors" ON public.error_logs FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "Authenticated insert errors" ON public.error_logs;
CREATE POLICY "Authenticated insert errors" ON public.error_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- noticeboard
DROP POLICY IF EXISTS "School members view notices" ON public.noticeboard;
CREATE POLICY "School members view notices" ON public.noticeboard FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "Admins insert notices" ON public.noticeboard;
CREATE POLICY "Admins insert notices" ON public.noticeboard FOR INSERT WITH CHECK (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "Admins update notices" ON public.noticeboard;
CREATE POLICY "Admins update notices" ON public.noticeboard FOR UPDATE USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin delete notices" ON public.noticeboard;
CREATE POLICY "School admin delete notices" ON public.noticeboard FOR DELETE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- parents
DROP POLICY IF EXISTS "School members view parents" ON public.parents;
CREATE POLICY "School members view parents" ON public.parents FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin insert parents" ON public.parents;
CREATE POLICY "School admin insert parents" ON public.parents FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update parents" ON public.parents;
CREATE POLICY "School admin update parents" ON public.parents FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- fee_categories
DROP POLICY IF EXISTS "School members view fee categories" ON public.fee_categories;
CREATE POLICY "School members view fee categories" ON public.fee_categories FOR SELECT USING (school_id = public.get_user_school_id());

-- fee_payments
DROP POLICY IF EXISTS "School members view fee payments" ON public.fee_payments;
CREATE POLICY "School members view fee payments" ON public.fee_payments FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "Admins insert fees" ON public.fee_payments;
CREATE POLICY "Admins insert fees" ON public.fee_payments FOR INSERT WITH CHECK (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "Admins update fees" ON public.fee_payments;
CREATE POLICY "Admins update fees" ON public.fee_payments FOR UPDATE USING (school_id = public.get_user_school_id());

-- library_resources
DROP POLICY IF EXISTS "School members view library" ON public.library_resources;
CREATE POLICY "School members view library" ON public.library_resources FOR SELECT USING (school_id = public.get_user_school_id());

-- book_lending
DROP POLICY IF EXISTS "School members view lending" ON public.book_lending;
CREATE POLICY "School members view lending" ON public.book_lending FOR SELECT USING (school_id = public.get_user_school_id());

-- discipline_records
DROP POLICY IF EXISTS "School members view discipline" ON public.discipline_records;
CREATE POLICY "School members view discipline" ON public.discipline_records FOR SELECT USING (school_id = public.get_user_school_id());

-- subjects
DROP POLICY IF EXISTS "School members view subjects" ON public.subjects;
CREATE POLICY "School members view subjects" ON public.subjects FOR SELECT USING (school_id = public.get_user_school_id() OR is_national = true);
DROP POLICY IF EXISTS "School admin insert subjects" ON public.subjects;
CREATE POLICY "School admin insert subjects" ON public.subjects FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update subjects" ON public.subjects;
CREATE POLICY "School admin update subjects" ON public.subjects FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- subject_teacher_allocations
DROP POLICY IF EXISTS "School members view allocations" ON public.subject_teacher_allocations;
CREATE POLICY "School members view allocations" ON public.subject_teacher_allocations FOR SELECT USING (school_id = public.get_user_school_id());
DROP POLICY IF EXISTS "School admin insert allocations" ON public.subject_teacher_allocations;
CREATE POLICY "School admin insert allocations" ON public.subject_teacher_allocations FOR INSERT WITH CHECK (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin update allocations" ON public.subject_teacher_allocations;
CREATE POLICY "School admin update allocations" ON public.subject_teacher_allocations FOR UPDATE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));
DROP POLICY IF EXISTS "School admin delete allocations" ON public.subject_teacher_allocations;
CREATE POLICY "School admin delete allocations" ON public.subject_teacher_allocations FOR DELETE USING (school_id = public.get_user_school_id() AND public.has_role(auth.uid(), 'school_admin'));

-- school_subscriptions
DROP POLICY IF EXISTS "School members view subscriptions" ON public.school_subscriptions;
CREATE POLICY "School members view subscriptions" ON public.school_subscriptions FOR SELECT USING (school_id = public.get_user_school_id());

-- student_parents
DROP POLICY IF EXISTS "School members view student parents" ON public.student_parents;
CREATE POLICY "School members view student parents" ON public.student_parents FOR SELECT USING (student_profile_id IN (SELECT id FROM profiles WHERE school_id = public.get_user_school_id()));
DROP POLICY IF EXISTS "School admin insert student parents" ON public.student_parents;
CREATE POLICY "School admin insert student parents" ON public.student_parents FOR INSERT WITH CHECK (student_profile_id IN (SELECT id FROM profiles WHERE school_id = public.get_user_school_id()) AND public.has_role(auth.uid(), 'school_admin'));
