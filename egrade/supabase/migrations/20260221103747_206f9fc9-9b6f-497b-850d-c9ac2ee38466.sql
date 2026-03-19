
-- Allow school_admin to INSERT into classes
CREATE POLICY "School admin insert classes"
ON public.classes FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to UPDATE classes
CREATE POLICY "School admin update classes"
ON public.classes FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to DELETE classes
CREATE POLICY "School admin delete classes"
ON public.classes FOR DELETE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to INSERT into streams
CREATE POLICY "School admin insert streams"
ON public.streams FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to UPDATE streams
CREATE POLICY "School admin update streams"
ON public.streams FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to DELETE streams
CREATE POLICY "School admin delete streams"
ON public.streams FOR DELETE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to INSERT profiles (for registering teachers/students)
CREATE POLICY "School admin insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to UPDATE profiles in their school
CREATE POLICY "School admin update profiles"
ON public.profiles FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to INSERT into subject_teacher_allocations
CREATE POLICY "School admin insert allocations"
ON public.subject_teacher_allocations FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to UPDATE subject_teacher_allocations
CREATE POLICY "School admin update allocations"
ON public.subject_teacher_allocations FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to DELETE subject_teacher_allocations
CREATE POLICY "School admin delete allocations"
ON public.subject_teacher_allocations FOR DELETE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to manage departments
CREATE POLICY "School admin insert departments"
ON public.departments FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin update departments"
ON public.departments FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin delete departments"
ON public.departments FOR DELETE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to manage subjects for their school
CREATE POLICY "School admin insert subjects"
ON public.subjects FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin update subjects"
ON public.subjects FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to manage assessments
CREATE POLICY "School admin insert assessments"
ON public.assessments FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin update assessments"
ON public.assessments FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin delete assessments"
ON public.assessments FOR DELETE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to manage assessment questions
CREATE POLICY "School admin insert questions"
ON public.assessment_questions FOR INSERT
WITH CHECK (
  assessment_id IN (
    SELECT id FROM assessments WHERE school_id = (
      SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin update questions"
ON public.assessment_questions FOR UPDATE
USING (
  assessment_id IN (
    SELECT id FROM assessments WHERE school_id = (
      SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  AND has_role(auth.uid(), 'school_admin')
);

-- Teachers should also be able to insert questions
CREATE POLICY "Teachers insert questions"
ON public.assessment_questions FOR INSERT
WITH CHECK (
  assessment_id IN (
    SELECT id FROM assessments WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers update questions"
ON public.assessment_questions FOR UPDATE
USING (
  assessment_id IN (
    SELECT id FROM assessments WHERE teacher_id = auth.uid()
  )
);

-- Teachers insert/update MCQ options
CREATE POLICY "Teachers insert mcq options"
ON public.mcq_options FOR INSERT
WITH CHECK (
  question_id IN (
    SELECT aq.id FROM assessment_questions aq
    JOIN assessments a ON a.id = aq.assessment_id
    WHERE a.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers update mcq options"
ON public.mcq_options FOR UPDATE
USING (
  question_id IN (
    SELECT aq.id FROM assessment_questions aq
    JOIN assessments a ON a.id = aq.assessment_id
    WHERE a.teacher_id = auth.uid()
  )
);

-- Allow school_admin to manage noticeboard
CREATE POLICY "School admin delete notices"
ON public.noticeboard FOR DELETE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to manage parents
CREATE POLICY "School admin insert parents"
ON public.parents FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

CREATE POLICY "School admin update parents"
ON public.parents FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school_admin to manage student_parents
CREATE POLICY "School admin insert student parents"
ON public.student_parents FOR INSERT
WITH CHECK (
  student_profile_id IN (
    SELECT id FROM profiles WHERE school_id = (
      SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow school admin to manage attendance 
CREATE POLICY "School admin update attendance"
ON public.attendance FOR UPDATE
USING (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND has_role(auth.uid(), 'school_admin')
);

-- Allow teachers to manage attendance
CREATE POLICY "Teachers insert attendance"
ON public.attendance FOR INSERT
WITH CHECK (
  school_id = (SELECT profiles.school_id FROM profiles WHERE profiles.id = auth.uid())
  AND marked_by = auth.uid()
);
