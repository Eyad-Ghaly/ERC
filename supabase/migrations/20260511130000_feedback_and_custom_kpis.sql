-- Add custom_targets column to team_kpi_targets
ALTER TABLE public.team_kpi_targets ADD COLUMN IF NOT EXISTS custom_targets JSONB DEFAULT '{}'::jsonb;

-- Create team_custom_kpis table
CREATE TABLE public.team_custom_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code TEXT NOT NULL,
  kpi_label TEXT NOT NULL,
  kpi_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_custom_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read team custom kpis" ON public.team_custom_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage team custom kpis" ON public.team_custom_kpis FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'data_manager'));

-- Create feedback_custom_questions table
CREATE TABLE public.feedback_custom_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_custom_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read feedback questions" ON public.feedback_custom_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage feedback questions" ON public.feedback_custom_questions FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'data_manager'));

-- Create mission_feedback table
CREATE TABLE public.mission_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE UNIQUE,
  service_rating INTEGER,
  communication_rating INTEGER,
  importance_rating INTEGER,
  notes TEXT,
  photos TEXT[],
  custom_answers JSONB DEFAULT '{}'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read mission feedback" ON public.mission_feedback FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert mission feedback" ON public.mission_feedback FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'data_manager') OR 
  (public.has_role(auth.uid(), 'department_entry') AND EXISTS (
    SELECT 1 FROM public.missions WHERE missions.id = mission_feedback.mission_id AND missions.created_by = auth.uid()
  ))
);

CREATE POLICY "Update mission feedback" ON public.mission_feedback FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.has_role(auth.uid(), 'data_manager') OR 
  (public.has_role(auth.uid(), 'department_entry') AND EXISTS (
    SELECT 1 FROM public.missions WHERE missions.id = mission_feedback.mission_id AND missions.created_by = auth.uid()
  ))
);

CREATE TRIGGER audit_mission_feedback AFTER INSERT OR UPDATE OR DELETE ON public.mission_feedback FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER touch_mission_feedback BEFORE UPDATE ON public.mission_feedback FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Note for Supabase Storage:
-- Please create a public storage bucket named "feedback_photos" from the Supabase Dashboard.
