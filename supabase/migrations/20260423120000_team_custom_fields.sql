-- 1. Create team_custom_fields table
CREATE TABLE public.team_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code TEXT NOT NULL,
  field_key TEXT NOT NULL,         -- machine key, e.g. "specialty"
  field_label TEXT NOT NULL,       -- Arabic label, e.g. "التخصص"
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'number' | 'select' | 'date'
  field_options JSONB DEFAULT '[]'::jsonb, -- for type=select: ["باطنة","عظام"]
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manages team_custom_fields" ON public.team_custom_fields FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "authenticated read team_custom_fields" ON public.team_custom_fields FOR SELECT TO authenticated
USING (true);

-- 2. Add custom_metadata JSONB column to beneficiaries_individual
ALTER TABLE public.beneficiaries_individual
  ADD COLUMN IF NOT EXISTS custom_metadata JSONB DEFAULT '{}'::jsonb;
