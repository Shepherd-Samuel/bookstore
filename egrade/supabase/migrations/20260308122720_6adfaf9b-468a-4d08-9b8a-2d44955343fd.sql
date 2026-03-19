-- Allow SaaS admin to manage national subjects
CREATE POLICY "SaaS admin insert subjects"
ON public.subjects FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'saas_admin'::app_role));

CREATE POLICY "SaaS admin update subjects"
ON public.subjects FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));

CREATE POLICY "SaaS admin delete subjects"
ON public.subjects FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'saas_admin'::app_role));