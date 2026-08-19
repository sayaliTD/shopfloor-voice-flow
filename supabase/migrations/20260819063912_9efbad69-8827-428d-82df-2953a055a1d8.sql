CREATE TABLE IF NOT EXISTS public.employees (
  employee_id varchar(10) PRIMARY KEY,
  full_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view employees"
ON public.employees FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "HR and system managers can insert employees"
ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'system_manager'));

CREATE POLICY "HR and system managers can update employees"
ON public.employees FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'system_manager'))
WITH CHECK (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'system_manager'));

CREATE POLICY "HR and system managers can delete employees"
ON public.employees FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'system_manager'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "System managers can delete kaizens"
ON public.kaizens FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'system_manager'));