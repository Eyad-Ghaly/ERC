-- Create team_kpi_targets table
CREATE TABLE public.team_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code TEXT NOT NULL,
  target_month TEXT NOT NULL, -- Format: YYYY-MM
  target_missions INTEGER NOT NULL DEFAULT 0,
  target_unique_volunteers INTEGER NOT NULL DEFAULT 0,
  target_volunteer_participations INTEGER NOT NULL DEFAULT 0,
  target_beneficiaries INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_code, target_month)
);

-- Enable RLS
ALTER TABLE public.team_kpi_targets ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Read access
CREATE POLICY "Read team targets" ON public.team_kpi_targets FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'data_manager') OR 
  (public.has_role(auth.uid(), 'department_entry') AND EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.team_code = team_kpi_targets.team_code
  ))
);

-- 2. Insert access
CREATE POLICY "Insert team targets" ON public.team_kpi_targets FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'data_manager') OR 
  (public.has_role(auth.uid(), 'department_entry') AND EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.team_code = team_kpi_targets.team_code
  ))
);

-- 3. Update access
CREATE POLICY "Update team targets" ON public.team_kpi_targets FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'data_manager') OR 
  (public.has_role(auth.uid(), 'department_entry') AND EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.team_code = team_kpi_targets.team_code
  ))
);

-- Audit and auto-update
CREATE TRIGGER audit_team_kpi_targets AFTER INSERT OR UPDATE OR DELETE ON public.team_kpi_targets FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER touch_team_kpi_targets BEFORE UPDATE ON public.team_kpi_targets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
