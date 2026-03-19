-- Allow SaaS admins to insert curriculum_designs
CREATE POLICY "SaaS admin insert curriculum"
ON public.curriculum_designs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

-- Allow SaaS admins to update curriculum_designs
CREATE POLICY "SaaS admin update curriculum"
ON public.curriculum_designs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));

-- Allow SaaS admins to delete curriculum_designs
CREATE POLICY "SaaS admin delete curriculum"
ON public.curriculum_designs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));