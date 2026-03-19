
-- Plan upgrade requests table
CREATE TABLE public.plan_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  current_plan_id uuid REFERENCES public.plans(id),
  requested_plan_id uuid NOT NULL REFERENCES public.plans(id),
  requested_billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  school_notes text
);

-- RLS
ALTER TABLE public.plan_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- School members can view their own requests
CREATE POLICY "School members view own upgrade requests"
ON public.plan_upgrade_requests FOR SELECT
TO authenticated
USING (school_id = get_user_school_id());

-- School admin can insert requests
CREATE POLICY "School admin insert upgrade requests"
ON public.plan_upgrade_requests FOR INSERT
TO authenticated
WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- SaaS admin can view all requests
CREATE POLICY "SaaS admin view all upgrade requests"
ON public.plan_upgrade_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'saas_admin'));

-- SaaS admin can update requests (approve/reject)
CREATE POLICY "SaaS admin update upgrade requests"
ON public.plan_upgrade_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'saas_admin'));
