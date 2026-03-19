
CREATE TABLE public.transfer_history_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.student_transfers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_history_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view transfer logs"
  ON public.transfer_history_log
  FOR SELECT
  TO authenticated
  USING (
    transfer_id IN (
      SELECT id FROM public.student_transfers
      WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert transfer logs"
  ON public.transfer_history_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    transfer_id IN (
      SELECT id FROM public.student_transfers
      WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
  );
