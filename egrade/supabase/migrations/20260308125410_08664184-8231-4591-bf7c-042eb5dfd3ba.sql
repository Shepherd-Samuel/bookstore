
-- Main grading scale table (e.g., "KJSEA 2025", "School Default")
CREATE TABLE public.grading_scales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grade entries within a scale (main grades like A, B, C, D, E)
CREATE TABLE public.grade_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grading_scale_id UUID REFERENCES public.grading_scales(id) ON DELETE CASCADE NOT NULL,
  grade TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  points NUMERIC DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional sub-grades (e.g., A = A, A-, B+ = B+, B, B-)
CREATE TABLE public.grade_sub_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade_entry_id UUID REFERENCES public.grade_entries(id) ON DELETE CASCADE NOT NULL,
  sub_grade TEXT NOT NULL,
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  points NUMERIC DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_sub_entries ENABLE ROW LEVEL SECURITY;

-- Grading scales policies
CREATE POLICY "School members view grading scales" ON public.grading_scales
  FOR SELECT TO authenticated
  USING (school_id = get_user_school_id());

CREATE POLICY "School admin insert grading scales" ON public.grading_scales
  FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update grading scales" ON public.grading_scales
  FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete grading scales" ON public.grading_scales
  FOR DELETE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- Grade entries policies
CREATE POLICY "School members view grade entries" ON public.grade_entries
  FOR SELECT TO authenticated
  USING (grading_scale_id IN (SELECT id FROM public.grading_scales WHERE school_id = get_user_school_id()));

CREATE POLICY "School admin insert grade entries" ON public.grade_entries
  FOR INSERT TO authenticated
  WITH CHECK (grading_scale_id IN (SELECT id FROM public.grading_scales WHERE school_id = get_user_school_id()) AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update grade entries" ON public.grade_entries
  FOR UPDATE TO authenticated
  USING (grading_scale_id IN (SELECT id FROM public.grading_scales WHERE school_id = get_user_school_id()) AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete grade entries" ON public.grade_entries
  FOR DELETE TO authenticated
  USING (grading_scale_id IN (SELECT id FROM public.grading_scales WHERE school_id = get_user_school_id()) AND has_role(auth.uid(), 'school_admin'));

-- Sub-grade entries policies
CREATE POLICY "School members view sub-grade entries" ON public.grade_sub_entries
  FOR SELECT TO authenticated
  USING (grade_entry_id IN (SELECT ge.id FROM public.grade_entries ge JOIN public.grading_scales gs ON gs.id = ge.grading_scale_id WHERE gs.school_id = get_user_school_id()));

CREATE POLICY "School admin insert sub-grade entries" ON public.grade_sub_entries
  FOR INSERT TO authenticated
  WITH CHECK (grade_entry_id IN (SELECT ge.id FROM public.grade_entries ge JOIN public.grading_scales gs ON gs.id = ge.grading_scale_id WHERE gs.school_id = get_user_school_id()) AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update sub-grade entries" ON public.grade_sub_entries
  FOR UPDATE TO authenticated
  USING (grade_entry_id IN (SELECT ge.id FROM public.grade_entries ge JOIN public.grading_scales gs ON gs.id = ge.grading_scale_id WHERE gs.school_id = get_user_school_id()) AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete sub-grade entries" ON public.grade_sub_entries
  FOR DELETE TO authenticated
  USING (grade_entry_id IN (SELECT ge.id FROM public.grade_entries ge JOIN public.grading_scales gs ON gs.id = ge.grading_scale_id WHERE gs.school_id = get_user_school_id()) AND has_role(auth.uid(), 'school_admin'));
