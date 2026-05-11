-- ========================================================
-- Unified Beneficiary Registry with hashed ID
-- ========================================================

-- 1. Create central registry table
CREATE TABLE public.beneficiaries_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hash TEXT UNIQUE,           -- SHA-256 hash of national_id/passport (for deduplication lookup)
  full_name TEXT NOT NULL,
  nationality TEXT,
  birthdate DATE,
  phone TEXT,
  first_registered_by UUID REFERENCES auth.users(id),
  first_team_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.beneficiaries_registry ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read & write (any team can look up or add)
CREATE POLICY "Read beneficiaries_registry" ON public.beneficiaries_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert beneficiaries_registry" ON public.beneficiaries_registry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update beneficiaries_registry" ON public.beneficiaries_registry FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER touch_beneficiaries_registry BEFORE UPDATE ON public.beneficiaries_registry FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Link beneficiaries_individual to registry (nullable, for existing data compatibility)
ALTER TABLE public.beneficiaries_individual ADD COLUMN IF NOT EXISTS registry_id UUID REFERENCES public.beneficiaries_registry(id) ON DELETE SET NULL;
ALTER TABLE public.beneficiaries_individual ADD COLUMN IF NOT EXISTS id_hash TEXT;  -- for quick lookup without joining

CREATE INDEX IF NOT EXISTS idx_beneficiaries_registry_id_hash ON public.beneficiaries_registry(id_hash);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_individual_registry_id ON public.beneficiaries_individual(registry_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_individual_id_hash ON public.beneficiaries_individual(id_hash);
