-- Clean existing project/site data
DELETE FROM public.assignments;
DELETE FROM public.invoices;
DELETE FROM public.projects;
DELETE FROM public.employees;

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own clients" ON public.clients FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Projects: owner + client link
ALTER TABLE public.projects
  ADD COLUMN user_id uuid NOT NULL,
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN client_name text;

-- Sites
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sites" ON public.sites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employees / assignments / invoices ownership
ALTER TABLE public.employees ADD COLUMN user_id uuid NOT NULL;
ALTER TABLE public.assignments
  ADD COLUMN user_id uuid NOT NULL,
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN client_name text,
  ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN user_id uuid NOT NULL;

-- Replace shared policies with per-user policies
DROP POLICY IF EXISTS "Auth users manage projects" ON public.projects;
DROP POLICY IF EXISTS "Auth users manage employees" ON public.employees;
DROP POLICY IF EXISTS "Auth users manage assignments" ON public.assignments;
DROP POLICY IF EXISTS "Auth users manage invoices" ON public.invoices;

CREATE POLICY "Users manage own projects" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own employees" ON public.employees FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own assignments" ON public.assignments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own invoices" ON public.invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_projects_user ON public.projects(user_id);
CREATE INDEX idx_sites_project ON public.sites(project_id);
CREATE INDEX idx_assignments_user ON public.assignments(user_id);