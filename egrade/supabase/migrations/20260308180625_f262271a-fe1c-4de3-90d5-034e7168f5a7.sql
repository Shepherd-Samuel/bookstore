-- Allow parents to view their own parent record via user_id
CREATE POLICY "Parents view own record" ON public.parents
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Allow parents to view student_parents links for their children
CREATE POLICY "Parents view own links" ON public.student_parents
FOR SELECT TO authenticated
USING (parent_id IN (SELECT id FROM public.parents WHERE user_id = auth.uid()));
