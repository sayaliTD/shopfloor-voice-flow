DROP POLICY IF EXISTS "HR and system managers can insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR and system managers can update employees" ON public.employees;

CREATE POLICY "Staff can insert employees"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update employees"
ON public.employees FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));