-- 1. Create team_settings table to store PIN hashes
CREATE TABLE IF NOT EXISTS public.team_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_code TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,         -- SHA-256 of the team's PIN
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

-- Policies for team_settings
CREATE POLICY "Allow authenticated to read team_settings" ON public.team_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated to insert/update team_settings" ON public.team_settings FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- 2. Add encrypted_id column to beneficiaries_individual
ALTER TABLE public.beneficiaries_individual ADD COLUMN IF NOT EXISTS encrypted_id TEXT;

-- 3. Trigger for updated_at
CREATE TRIGGER touch_team_settings BEFORE UPDATE ON public.team_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
