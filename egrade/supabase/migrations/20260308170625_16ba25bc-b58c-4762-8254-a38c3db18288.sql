
-- SaaS admin profiles table (separate from school profiles)
CREATE TABLE public.saas_admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_admin_profiles ENABLE ROW LEVEL SECURITY;

-- Only saas_admin can view/manage their own profile
CREATE POLICY "SaaS admin view own profile" ON public.saas_admin_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admin insert own profile" ON public.saas_admin_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admin update own profile" ON public.saas_admin_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'saas_admin'));

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tickets
CREATE POLICY "Users insert own tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can view their own tickets
CREATE POLICY "Users view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- SaaS admin can view all tickets
CREATE POLICY "SaaS admin view all tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'saas_admin'));

-- SaaS admin can update tickets (respond)
CREATE POLICY "SaaS admin update tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'saas_admin'));

-- Create storage bucket for saas admin avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('saas-avatars', 'saas-avatars', true);

-- Storage policies for saas-avatars
CREATE POLICY "SaaS admin upload avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'saas-avatars' AND has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admin update avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'saas-avatars' AND has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "Public read saas avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'saas-avatars');
