
-- 1. strand_assessments: replaces student_competencies with curriculum-linked CBC assessments
CREATE TABLE public.strand_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  teacher_id uuid NOT NULL REFERENCES public.profiles(id),
  subject_id uuid NOT NULL REFERENCES public.subjects(id),
  stream_id uuid NOT NULL REFERENCES public.streams(id),
  curriculum_design_id uuid REFERENCES public.curriculum_designs(id),
  strand text NOT NULL DEFAULT '',
  sub_strand text NOT NULL DEFAULT '',
  rating text NOT NULL DEFAULT 'ME',
  comments text DEFAULT '',
  term text DEFAULT 'Term 1',
  academic_year text DEFAULT '2026',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strand_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view strand assessments" ON public.strand_assessments
  FOR SELECT TO authenticated USING (school_id = get_user_school_id());

CREATE POLICY "Teachers insert strand assessments" ON public.strand_assessments
  FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'school_admin')));

CREATE POLICY "Teachers update strand assessments" ON public.strand_assessments
  FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND (teacher_id = auth.uid() OR has_role(auth.uid(), 'school_admin')));

-- 2. strand_assessment_evidence: evidence uploads
CREATE TABLE public.strand_assessment_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strand_assessment_id uuid NOT NULL REFERENCES public.strand_assessments(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text DEFAULT '',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.strand_assessment_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view evidence" ON public.strand_assessment_evidence
  FOR SELECT TO authenticated
  USING (strand_assessment_id IN (SELECT id FROM public.strand_assessments WHERE school_id = get_user_school_id()));

CREATE POLICY "Teachers insert evidence" ON public.strand_assessment_evidence
  FOR INSERT TO authenticated
  WITH CHECK (strand_assessment_id IN (SELECT id FROM public.strand_assessments WHERE school_id = get_user_school_id() AND (teacher_id = auth.uid() OR has_role(auth.uid(), 'school_admin'))));

-- 3. Evidence storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('assessment-evidence', 'assessment-evidence', true);

CREATE POLICY "Authenticated upload evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assessment-evidence');

CREATE POLICY "Public read evidence" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'assessment-evidence');

-- 4. Add approval workflow columns to assessments table
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS available_from timestamptz;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS available_until timestamptz;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS target_stream_ids jsonb DEFAULT '[]'::jsonb;

-- 5. student_exam_answers: for digital exam responses
CREATE TABLE public.student_exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  answer_text text DEFAULT '',
  selected_option_id uuid REFERENCES public.mcq_options(id),
  is_correct boolean,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE(question_id, student_id)
);

ALTER TABLE public.student_exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own answers" ON public.student_exam_answers
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR assessment_id IN (SELECT id FROM public.assessments WHERE school_id = get_user_school_id() AND (teacher_id = auth.uid() OR has_role(auth.uid(), 'school_admin'))));

CREATE POLICY "Students insert answers" ON public.student_exam_answers
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update answers" ON public.student_exam_answers
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND submitted_at IS NULL);

-- 6. student_exam_sessions: track exam timing
CREATE TABLE public.student_exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  auto_submitted boolean DEFAULT false,
  score numeric,
  UNIQUE(assessment_id, student_id)
);

ALTER TABLE public.student_exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own sessions" ON public.student_exam_sessions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR assessment_id IN (SELECT id FROM public.assessments WHERE school_id = get_user_school_id() AND (teacher_id = auth.uid() OR has_role(auth.uid(), 'school_admin'))));

CREATE POLICY "Students insert sessions" ON public.student_exam_sessions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update sessions" ON public.student_exam_sessions
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid());
