
-- Student transfers table
CREATE TABLE public.student_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES public.profiles(id),
  class_teacher_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'initiated',
  reason TEXT,
  destination_school TEXT,
  fee_balance NUMERIC DEFAULT 0,
  admin_comments TEXT,
  teacher_comments TEXT,
  discipline_summary JSONB DEFAULT '[]'::jsonb,
  exam_summary JSONB DEFAULT '[]'::jsonb,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  teacher_reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_transfers ENABLE ROW LEVEL SECURITY;

-- School admin can manage transfers for their school
CREATE POLICY "School members can view transfers"
  ON public.student_transfers
  FOR SELECT
  TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "School admin can insert transfers"
  ON public.student_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'school_admin'
  );

CREATE POLICY "School admin and class teacher can update transfers"
  ON public.student_transfers
  FOR UPDATE
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'school_admin'
      OR class_teacher_id = auth.uid()
    )
  );
