
-- ==========================================
-- 1. CORE SYSTEM & MULTI-TENANCY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  moto TEXT DEFAULT '',
  location TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_setup_complete BOOLEAN NOT NULL DEFAULT false,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_students INTEGER DEFAULT 100,
  max_teachers INTEGER DEFAULT 20,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 2. USERS, PROFILES & ROLES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student',
  phone TEXT DEFAULT '',
  passport_url TEXT DEFAULT '',
  adm_no TEXT,
  gender TEXT,
  dob DATE,
  class_id UUID,
  stream_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  national_id TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  relationship TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  UNIQUE(student_profile_id, parent_id)
);

-- ==========================================
-- 3. ACADEMIC STRUCTURE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id),
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'junior_secondary',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 45,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraints to profiles for class_id and stream_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_class_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_stream_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id);
  END IF;
END $$;

-- ==========================================
-- 4. CURRICULUM & SUBJECTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  category TEXT DEFAULT 'core',
  level TEXT DEFAULT 'junior_secondary',
  is_national BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subject_teacher_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  academic_year TEXT DEFAULT '2026',
  term TEXT DEFAULT 'Term 1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, teacher_id, stream_id, academic_year, term)
);

-- ==========================================
-- 5. ATTENDANCE & DISCIPLINE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  marked_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS public.discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  incident TEXT NOT NULL,
  action_taken TEXT,
  reported_by UUID REFERENCES public.profiles(id),
  date_reported DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 6. EXAMS & ASSESSMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'assignment',
  instructions TEXT,
  duration_minutes INTEGER,
  total_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
  due_date TIMESTAMPTZ,
  academic_year TEXT DEFAULT '2026',
  term TEXT DEFAULT 'Term 1',
  is_published BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'Essay',
  marks NUMERIC(5,2) NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mcq_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(6,2),
  remarks TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE(assessment_id, student_id)
);

-- ==========================================
-- 7. FINANCE & BILLING
-- ==========================================
CREATE TABLE IF NOT EXISTS public.fee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fee_category_id UUID REFERENCES public.fee_categories(id),
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  receipt_no TEXT UNIQUE NOT NULL,
  payment_reference TEXT,
  payment_method TEXT DEFAULT 'Cash'
);

-- ==========================================
-- 8. LIBRARY & RESOURCES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.library_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  category TEXT,
  resource_type TEXT DEFAULT 'Physical Book',
  file_url TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.book_lending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  return_date DATE,
  status TEXT DEFAULT 'Borrowed'
);

-- ==========================================
-- 9. COMMUNICATION & LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.noticeboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_role TEXT DEFAULT 'ALL',
  posted_by UUID REFERENCES public.profiles(id),
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id),
  user_id UUID REFERENCES auth.users(id),
  error_type TEXT NOT NULL DEFAULT 'system',
  error_message TEXT NOT NULL,
  error_stack TEXT DEFAULT '',
  page_url TEXT DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'error',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'junior_secondary',
  strand TEXT NOT NULL DEFAULT '',
  sub_strand TEXT NOT NULL DEFAULT '',
  specific_learning_outcomes TEXT DEFAULT '',
  key_inquiry_questions TEXT DEFAULT '',
  learning_experiences TEXT DEFAULT '',
  assessment_methods TEXT DEFAULT '',
  resources TEXT DEFAULT '',
  term TEXT DEFAULT 'Term 1',
  week_number INTEGER DEFAULT 1,
  lesson_number INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 10. USER ROLES TABLE
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('saas_admin', 'school_admin', 'teacher', 'parent', 'student');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ==========================================
-- 11. STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('passports', 'passports', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('library-resources', 'library-resources', true) ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 12. ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_teacher_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_lending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticeboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 13. RLS POLICIES
-- ==========================================
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "School members view profiles" ON public.profiles FOR SELECT TO authenticated 
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "SaaS admins manage roles" ON public.user_roles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "Authenticated can view schools" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "SaaS admin manage schools" ON public.schools FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);

CREATE POLICY "School members view classes" ON public.classes FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view streams" ON public.streams FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view departments" ON public.departments FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Anyone view national subjects" ON public.subjects FOR SELECT USING (is_national = true);
CREATE POLICY "School members view subjects" ON public.subjects FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()) OR is_national = true);

CREATE POLICY "School members view attendance" ON public.attendance FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Teachers manage attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "School members view assessments" ON public.assessments FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Teachers manage assessments" ON public.assessments FOR ALL TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "School members view questions" ON public.assessment_questions FOR SELECT TO authenticated
  USING (assessment_id IN (SELECT id FROM public.assessments WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "School members view scores" ON public.assessment_scores FOR SELECT TO authenticated
  USING (assessment_id IN (SELECT id FROM public.assessments WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "Teachers manage scores" ON public.assessment_scores FOR ALL TO authenticated
  USING (assessment_id IN (SELECT id FROM public.assessments WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "School members view fee categories" ON public.fee_categories FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view fee payments" ON public.fee_payments FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins manage fees" ON public.fee_payments FOR ALL TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "School members view library" ON public.library_resources FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view lending" ON public.book_lending FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "School members view notices" ON public.noticeboard FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins post notices" ON public.noticeboard FOR ALL TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated view curriculum" ON public.curriculum_designs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers manage curriculum" ON public.curriculum_designs FOR ALL TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "School members view parents" ON public.parents FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view errors" ON public.error_logs FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Authenticated insert errors" ON public.error_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "School members view subscriptions" ON public.school_subscriptions FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "School members view mcq options" ON public.mcq_options FOR SELECT TO authenticated
  USING (question_id IN (SELECT id FROM public.assessment_questions WHERE assessment_id IN (SELECT id FROM public.assessments WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "School members view allocations" ON public.subject_teacher_allocations FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view discipline" ON public.discipline_records FOR SELECT TO authenticated
  USING (school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "School members view student parents" ON public.student_parents FOR SELECT TO authenticated
  USING (student_profile_id IN (SELECT id FROM public.profiles WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())));

-- ==========================================
-- 14. REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.noticeboard;

-- ==========================================
-- 15. SEED DATA
-- ==========================================
INSERT INTO public.subjects (name, code, category, level, is_national, school_id) VALUES
('English', 'ENG', 'core', 'junior_secondary', true, NULL),
('Kiswahili', 'KIS', 'core', 'junior_secondary', true, NULL),
('Mathematics', 'MAT', 'core', 'junior_secondary', true, NULL),
('Integrated Science', 'ISC', 'core', 'junior_secondary', true, NULL),
('Health Education', 'HED', 'core', 'junior_secondary', true, NULL),
('Pre-Technical Studies', 'PTS', 'core', 'junior_secondary', true, NULL),
('Social Studies', 'SST', 'core', 'junior_secondary', true, NULL),
('Religious Education', 'CRE', 'core', 'junior_secondary', true, NULL),
('Business Studies', 'BST', 'core', 'junior_secondary', true, NULL),
('Agriculture', 'AGR', 'applied', 'junior_secondary', true, NULL),
('Life Skills Education', 'LSK', 'core', 'junior_secondary', true, NULL),
('Physical Education', 'PHE', 'core', 'junior_secondary', true, NULL),
('Creative Arts & Sports', 'CAS', 'applied', 'junior_secondary', true, NULL),
('Computer Science', 'CSC', 'applied', 'junior_secondary', true, NULL),
('Home Science', 'HSC', 'applied', 'junior_secondary', true, NULL),
('Visual Arts', 'VAR', 'applied', 'junior_secondary', true, NULL),
('Music', 'MUS', 'applied', 'junior_secondary', true, NULL),
('Indigenous Languages', 'ILG', 'optional', 'junior_secondary', true, NULL),
('Foreign Languages', 'FLG', 'optional', 'junior_secondary', true, NULL),
('Sign Language', 'SGL', 'optional', 'junior_secondary', true, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, max_students, max_teachers, features) VALUES
('Starter', 'starter', 'Perfect for small schools up to 100 students', 2999, 29990, 100, 10, '["CBC Reports", "Attendance", "Basic Finance"]'::jsonb),
('Professional', 'professional', 'Ideal for mid-size schools up to 500 students', 5999, 59990, 500, 30, '["CBC Reports", "Attendance", "Finance", "Library", "SMS Notifications", "NEMIS Export"]'::jsonb),
('Enterprise', 'enterprise', 'Full-featured for large schools and chains', 9999, 99990, 2000, 100, '["All Features", "Multi-campus", "API Access", "Dedicated Support", "Custom Branding"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
