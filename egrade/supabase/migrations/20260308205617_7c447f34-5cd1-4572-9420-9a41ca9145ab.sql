
-- ============================================================
-- FIX 1: MCQ is_correct exposure - use a view to hide is_correct from students
-- We'll revoke direct student access and create a secure function instead
-- ============================================================

-- Create a function for students to check answers server-side only
CREATE OR REPLACE FUNCTION public.get_mcq_options_for_student(p_assessment_id uuid)
RETURNS TABLE(id uuid, question_id uuid, option_text text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mo.id, mo.question_id, mo.option_text
  FROM mcq_options mo
  JOIN assessment_questions aq ON aq.id = mo.question_id
  JOIN assessments a ON a.id = aq.assessment_id
  WHERE a.id = p_assessment_id
    AND a.is_published = true
    AND a.school_id = get_user_school_id();
$$;

-- Drop the old student policy that exposes is_correct
DROP POLICY IF EXISTS "Students view mcq options" ON public.mcq_options;

-- Recreate without is_correct access (students must use the function)
-- Actually, we need column-level security. Since Postgres RLS is row-level,
-- we'll use a view approach instead. But simplest: just remove student SELECT 
-- and have them use the function above.

-- ============================================================
-- FIX 2: Students can overwrite their own exam score
-- ============================================================
DROP POLICY IF EXISTS "Students update sessions" ON public.student_exam_sessions;
CREATE POLICY "Students update sessions" ON public.student_exam_sessions
  FOR UPDATE USING (student_id = auth.uid() AND submitted_at IS NULL)
  WITH CHECK (student_id = auth.uid() AND submitted_at IS NULL);

-- Revoke UPDATE on score column from authenticated users
REVOKE UPDATE(score) ON public.student_exam_sessions FROM authenticated;

-- ============================================================
-- FIX 3: Students can set is_correct on their own answers
-- ============================================================
REVOKE UPDATE(is_correct) ON public.student_exam_answers FROM authenticated;
REVOKE INSERT ON public.student_exam_answers FROM authenticated;
GRANT INSERT(id, assessment_id, student_id, question_id, answer_text, selected_option_id, started_at, submitted_at) ON public.student_exam_answers TO authenticated;

-- ============================================================
-- FIX 4: Parent PII (national_id, phone, email) visible to all school members
-- ============================================================
DROP POLICY IF EXISTS "School members view parents" ON public.parents;
CREATE POLICY "Staff view parents" ON public.parents
  FOR SELECT USING (
    school_id = get_user_school_id() 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  );

-- ============================================================
-- FIX 5: Discipline records visible to all students
-- ============================================================
DROP POLICY IF EXISTS "School members view discipline" ON public.discipline_records;
CREATE POLICY "Staff view discipline" ON public.discipline_records
  FOR SELECT USING (
    school_id = get_user_school_id() 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  );
CREATE POLICY "Students view own discipline" ON public.discipline_records
  FOR SELECT USING (student_id = auth.uid());

-- ============================================================
-- FIX 6: Fee payments visible to all school members
-- ============================================================
DROP POLICY IF EXISTS "School members view fee payments" ON public.fee_payments;
CREATE POLICY "Staff view fee payments" ON public.fee_payments
  FOR SELECT USING (
    school_id = get_user_school_id() 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  );
CREATE POLICY "Students view own fee payments" ON public.fee_payments
  FOR SELECT USING (student_id = auth.uid());
-- Parents can also view their children's fee payments
CREATE POLICY "Parents view linked student fees" ON public.fee_payments
  FOR SELECT USING (
    student_id IN (
      SELECT sp.student_profile_id FROM student_parents sp
      JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- WARN 1: Noticeboard target_role not enforced
-- ============================================================
DROP POLICY IF EXISTS "School members view notices" ON public.noticeboard;

CREATE OR REPLACE FUNCTION public.get_user_role_text()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "School members view targeted notices" ON public.noticeboard
  FOR SELECT USING (
    school_id = get_user_school_id()
    AND (
      target_role = 'ALL' 
      OR target_role IS NULL
      OR target_role = get_user_role_text()
      OR has_role(auth.uid(), 'school_admin'::app_role)
    )
  );

-- ============================================================
-- WARN 2: Schools table visible cross-tenant
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view schools" ON public.schools;
CREATE POLICY "School members view own school" ON public.schools
  FOR SELECT USING (id = get_user_school_id());
CREATE POLICY "SaaS admin view all schools" ON public.schools
  FOR SELECT USING (has_role(auth.uid(), 'saas_admin'::app_role));
-- Allow public slug lookup for school login page (unauthenticated not affected by RLS for anon)
CREATE POLICY "Anyone view school by slug" ON public.schools
  FOR SELECT USING (slug IS NOT NULL AND is_active = true);

-- ============================================================
-- WARN 3: Transfer log insertion by students
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert transfer logs" ON public.transfer_history_log;
CREATE POLICY "Staff insert transfer logs" ON public.transfer_history_log
  FOR INSERT WITH CHECK (
    (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
    AND transfer_id IN (
      SELECT id FROM student_transfers WHERE school_id = get_user_school_id()
    )
  );

-- ============================================================
-- WARN 4: Attendance visible to all students
-- ============================================================
DROP POLICY IF EXISTS "School members view attendance" ON public.attendance;
CREATE POLICY "Staff view attendance" ON public.attendance
  FOR SELECT USING (
    school_id = get_user_school_id() 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  );
CREATE POLICY "Students view own attendance" ON public.attendance
  FOR SELECT USING (student_id = auth.uid());
-- Parents view linked student attendance
CREATE POLICY "Parents view linked student attendance" ON public.attendance
  FOR SELECT USING (
    student_id IN (
      SELECT sp.student_profile_id FROM student_parents sp
      JOIN parents p ON p.id = sp.parent_id
      WHERE p.user_id = auth.uid()
    )
  );
