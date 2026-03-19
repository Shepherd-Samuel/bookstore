
-- Timetable periods (bell schedule): school-specific period definitions
CREATE TABLE public.timetable_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_number integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_break boolean NOT NULL DEFAULT false,
  break_label text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, period_number)
);

ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view timetable periods" ON public.timetable_periods
  FOR SELECT TO authenticated USING (school_id = get_user_school_id());

CREATE POLICY "School admin insert timetable periods" ON public.timetable_periods
  FOR INSERT TO authenticated WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update timetable periods" ON public.timetable_periods
  FOR UPDATE TO authenticated USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete timetable periods" ON public.timetable_periods
  FOR DELETE TO authenticated USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- Subject demand: how many periods per week each subject needs per stream
CREATE TABLE public.subject_demand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  periods_per_week integer NOT NULL DEFAULT 1,
  is_core_daily boolean NOT NULL DEFAULT false,
  academic_year text DEFAULT '2026',
  term text DEFAULT 'Term 1',
  UNIQUE(school_id, stream_id, subject_id, academic_year, term)
);

ALTER TABLE public.subject_demand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view subject demand" ON public.subject_demand
  FOR SELECT TO authenticated USING (school_id = get_user_school_id());

CREATE POLICY "School admin manage subject demand" ON public.subject_demand
  FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'))
  WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- Timetable slots: the actual generated timetable
CREATE TABLE public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  stream_id uuid NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id),
  period_id uuid NOT NULL REFERENCES public.timetable_periods(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  academic_year text DEFAULT '2026',
  term text DEFAULT 'Term 1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members view timetable slots" ON public.timetable_slots
  FOR SELECT TO authenticated USING (school_id = get_user_school_id());

CREATE POLICY "School admin manage timetable slots" ON public.timetable_slots
  FOR ALL TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'))
  WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));
