
-- ============================================================
-- 1. Fix missing RLS policies for fee_categories, library_resources,
--    discipline_records, book_lending, error_logs
-- ============================================================

-- fee_categories: school admin CRUD
CREATE POLICY "School admin insert fee categories"
  ON public.fee_categories FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update fee categories"
  ON public.fee_categories FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete fee categories"
  ON public.fee_categories FOR DELETE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- library_resources: school admin CRUD
CREATE POLICY "School admin insert library resources"
  ON public.library_resources FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update library resources"
  ON public.library_resources FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete library resources"
  ON public.library_resources FOR DELETE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- discipline_records: school admin + teacher CRUD
CREATE POLICY "School admin insert discipline"
  ON public.discipline_records FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id());

CREATE POLICY "School admin update discipline"
  ON public.discipline_records FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete discipline"
  ON public.discipline_records FOR DELETE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- book_lending: school admin CRUD
CREATE POLICY "School admin insert lending"
  ON public.book_lending FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin update lending"
  ON public.book_lending FOR UPDATE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

CREATE POLICY "School admin delete lending"
  ON public.book_lending FOR DELETE TO authenticated
  USING (school_id = get_user_school_id() AND has_role(auth.uid(), 'school_admin'));

-- error_logs: SaaS admin can update (resolve) and delete
CREATE POLICY "SaaS admin update errors"
  ON public.error_logs FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admin delete errors"
  ON public.error_logs FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'saas_admin'));

-- ============================================================
-- 2. Add level column to fee_categories for department-based fees
-- ============================================================
ALTER TABLE public.fee_categories
  ADD COLUMN level text DEFAULT 'all';

-- ============================================================
-- 3. Make classes national (managed by SaaS admin, not school admin)
--    - Make school_id nullable (national classes have no school_id)
--    - Drop school_admin policies, add saas_admin policies
-- ============================================================
ALTER TABLE public.classes ALTER COLUMN school_id DROP NOT NULL;

-- Drop existing school_admin policies on classes
DROP POLICY IF EXISTS "School admin delete classes" ON public.classes;
DROP POLICY IF EXISTS "School admin insert classes" ON public.classes;
DROP POLICY IF EXISTS "School admin update classes" ON public.classes;
DROP POLICY IF EXISTS "School members view classes" ON public.classes;

-- SaaS admin manages classes
CREATE POLICY "SaaS admin insert classes"
  ON public.classes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admin update classes"
  ON public.classes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'saas_admin'));

CREATE POLICY "SaaS admin delete classes"
  ON public.classes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'saas_admin'));

-- All authenticated users can view classes (they are national/CBC-standard)
CREATE POLICY "Authenticated view classes"
  ON public.classes FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 4. Add class_teacher_id to streams for attendance control
-- ============================================================
ALTER TABLE public.streams
  ADD COLUMN class_teacher_id uuid REFERENCES public.profiles(id);

-- ============================================================
-- 5. Update attendance INSERT policies so only class teachers can mark
-- ============================================================
DROP POLICY IF EXISTS "Teachers insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers manage attendance" ON public.attendance;

CREATE POLICY "Class teachers insert attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    school_id = get_user_school_id()
    AND (
      -- Class teacher of the stream
      EXISTS (
        SELECT 1 FROM public.streams
        WHERE streams.id = stream_id
        AND streams.class_teacher_id = auth.uid()
      )
      -- Or school admin
      OR has_role(auth.uid(), 'school_admin')
    )
  );

-- Class teachers and school admins can update attendance
DROP POLICY IF EXISTS "School admin update attendance" ON public.attendance;
CREATE POLICY "Class teachers update attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    school_id = get_user_school_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.streams
        WHERE streams.id = stream_id
        AND streams.class_teacher_id = auth.uid()
      )
      OR has_role(auth.uid(), 'school_admin')
    )
  );
