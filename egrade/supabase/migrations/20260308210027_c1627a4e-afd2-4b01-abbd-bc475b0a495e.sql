
-- Fix schools slug policy exposing PII
DROP POLICY IF EXISTS "Anyone view school by slug" ON public.schools;

-- Fix student_transfers visibility
DROP POLICY IF EXISTS "School members can view transfers" ON public.student_transfers;
CREATE POLICY "Staff view transfers" ON public.student_transfers
  FOR SELECT USING (
    school_id = get_user_school_id() 
    AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  );
CREATE POLICY "Students view own transfers" ON public.student_transfers
  FOR SELECT USING (student_id = auth.uid());

-- Fix assessment_scores visibility
DROP POLICY IF EXISTS "School members view scores" ON public.assessment_scores;
CREATE POLICY "Staff view scores" ON public.assessment_scores
  FOR SELECT USING (
    assessment_id IN (SELECT id FROM assessments WHERE school_id = get_user_school_id())
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );
CREATE POLICY "Students view own scores" ON public.assessment_scores
  FOR SELECT USING (student_id = auth.uid());

-- Fix exam_marks visibility
DROP POLICY IF EXISTS "School members view exam marks" ON public.exam_marks;
CREATE POLICY "Staff view exam marks" ON public.exam_marks
  FOR SELECT USING (
    school_id = get_user_school_id()
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );
CREATE POLICY "Students view own exam marks" ON public.exam_marks
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Parents view linked exam marks" ON public.exam_marks
  FOR SELECT USING (
    student_id IN (SELECT sp.student_profile_id FROM student_parents sp JOIN parents p ON p.id = sp.parent_id WHERE p.user_id = auth.uid())
  );

-- Fix student_competencies visibility
DROP POLICY IF EXISTS "School members view competencies" ON public.student_competencies;
CREATE POLICY "Staff view competencies" ON public.student_competencies
  FOR SELECT USING (
    school_id = get_user_school_id()
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );
CREATE POLICY "Students view own competencies" ON public.student_competencies
  FOR SELECT USING (student_id = auth.uid());

-- Fix strand_assessments visibility
DROP POLICY IF EXISTS "School members view strand assessments" ON public.strand_assessments;
CREATE POLICY "Staff view strand assessments" ON public.strand_assessments
  FOR SELECT USING (
    school_id = get_user_school_id()
    AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
  );
CREATE POLICY "Students view own strand assessments" ON public.strand_assessments
  FOR SELECT USING (student_id = auth.uid());

-- Fix strand_assessment_evidence
DROP POLICY IF EXISTS "School members view evidence" ON public.strand_assessment_evidence;
CREATE POLICY "Staff view evidence" ON public.strand_assessment_evidence
  FOR SELECT USING (
    strand_assessment_id IN (
      SELECT id FROM strand_assessments WHERE school_id = get_user_school_id()
      AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'school_admin'::app_role))
    )
  );
CREATE POLICY "Students view own evidence" ON public.strand_assessment_evidence
  FOR SELECT USING (
    strand_assessment_id IN (SELECT id FROM strand_assessments WHERE student_id = auth.uid())
  );
