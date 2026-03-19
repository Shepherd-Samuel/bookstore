
-- ==========================================
-- SAAS ADMIN MODULE: system_settings, RLS, auto-suspension
-- ==========================================

-- System settings table (maintenance mode, auto-suspension config)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SaaS admin view settings"
ON public.system_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));

CREATE POLICY "SaaS admin manage settings"
ON public.system_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

CREATE POLICY "SaaS admin insert settings"
ON public.system_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('maintenance_mode', '{"enabled": false, "message": "eGrade M|S is currently under scheduled maintenance. We will be back shortly.", "estimated_end": null, "affected_roles": ["teacher", "parent", "student"]}'::jsonb, 'Global maintenance mode configuration'),
('auto_suspension', '{"enabled": true, "grace_period_days": 3, "notify_days_before": 7}'::jsonb, 'Auto-suspension settings for expired subscriptions')
ON CONFLICT (key) DO NOTHING;

-- PLANS: Allow SaaS admin full CRUD (the existing "Anyone can view" SELECT policy stays)
CREATE POLICY "SaaS admin manage plans"
ON public.plans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- SCHOOL_SUBSCRIPTIONS: Allow SaaS admin full access
CREATE POLICY "SaaS admin manage subscriptions"
ON public.school_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- ERROR_LOGS: Allow SaaS admin to view all logs
CREATE POLICY "SaaS admin view all errors"
ON public.error_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- PROFILES: Allow SaaS admin to view all profiles (for first admin creation verification)
CREATE POLICY "SaaS admin view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- USER_ROLES: Allow SaaS admin to view all roles
-- (already has insert/update/delete policies in original migration)

-- Auto-suspension function
CREATE OR REPLACE FUNCTION public.auto_suspend_expired_schools()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suspended_count INTEGER := 0;
BEGIN
  -- Suspend expired active subscriptions
  UPDATE public.school_subscriptions
  SET status = 'suspended', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS suspended_count = ROW_COUNT;

  -- Deactivate the corresponding schools
  UPDATE public.schools
  SET is_active = false, updated_at = now()
  WHERE id IN (
    SELECT DISTINCT school_id
    FROM public.school_subscriptions
    WHERE status = 'suspended'
      AND expires_at IS NOT NULL
      AND expires_at < now()
  )
  AND is_active = true;

  RETURN suspended_count;
END;
$$;

-- Grant execute to authenticated users (SaaS admin will call this via RPC)
GRANT EXECUTE ON FUNCTION public.auto_suspend_expired_schools() TO authenticated;
