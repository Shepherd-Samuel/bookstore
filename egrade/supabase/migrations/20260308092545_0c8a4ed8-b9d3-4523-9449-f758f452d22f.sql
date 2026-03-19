
-- Student competency ratings table
CREATE TABLE public.student_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  competency text NOT NULL,
  rating text NOT NULL DEFAULT 'ME',
  term text DEFAULT 'Term 1',
  academic_year text DEFAULT '2026',
  rated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_competencies ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_student_competency_unique ON public.student_competencies(student_id, competency, term, academic_year);

CREATE POLICY "School members view competencies" ON public.student_competencies FOR SELECT USING (school_id = get_user_school_id());
CREATE POLICY "Teachers insert competencies" ON public.student_competencies FOR INSERT WITH CHECK (school_id = get_user_school_id() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'school_admin')));
CREATE POLICY "Teachers update competencies" ON public.student_competencies FOR UPDATE USING (school_id = get_user_school_id() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'school_admin')));

-- Exam types table (mid-term, end-term, mid-week etc)
CREATE TABLE public.exam_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view exam types" ON public.exam_types FOR SELECT USING (school_id = get_user_school_id());
CREATE POLICY "School admin insert exam types" ON public.exam_types FOR INSERT WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
CREATE POLICY "School admin update exam types" ON public.exam_types FOR UPDATE USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
CREATE POLICY "School admin delete exam types" ON public.exam_types FOR DELETE USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- Subject papers (PP1, PP2 etc with default out-of marks)
CREATE TABLE public.subject_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id),
  paper_name text NOT NULL,
  default_out_of numeric NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subject_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view subject papers" ON public.subject_papers FOR SELECT USING (school_id = get_user_school_id());
CREATE POLICY "School admin insert subject papers" ON public.subject_papers FOR INSERT WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
CREATE POLICY "School admin update subject papers" ON public.subject_papers FOR UPDATE USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
CREATE POLICY "School admin delete subject papers" ON public.subject_papers FOR DELETE USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- Exams table (linked to exam type)
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_type_id uuid NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  term text DEFAULT 'Term 1',
  academic_year text DEFAULT '2026',
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view exams" ON public.exams FOR SELECT USING (school_id = get_user_school_id());
CREATE POLICY "School admin insert exams" ON public.exams FOR INSERT WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
CREATE POLICY "School admin update exams" ON public.exams FOR UPDATE USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
CREATE POLICY "School admin delete exams" ON public.exams FOR DELETE USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- Exam marks (teacher enters per student per paper)
CREATE TABLE public.exam_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_paper_id uuid NOT NULL REFERENCES public.subject_papers(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  out_of numeric NOT NULL DEFAULT 100,
  score numeric,
  graded_by uuid REFERENCES public.profiles(id),
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_exam_marks_unique ON public.exam_marks(exam_id, student_id, subject_paper_id);

CREATE POLICY "School members view exam marks" ON public.exam_marks FOR SELECT USING (school_id = get_user_school_id());
CREATE POLICY "Teachers insert exam marks" ON public.exam_marks FOR INSERT WITH CHECK (school_id = get_user_school_id() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'school_admin')));
CREATE POLICY "Teachers update exam marks" ON public.exam_marks FOR UPDATE USING (school_id = get_user_school_id() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'school_admin')));
