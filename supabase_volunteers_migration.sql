-- 1. Create volunteers_base table (Core Central DB)
CREATE TABLE IF NOT EXISTS public.volunteers_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_number VARCHAR,
    full_name VARCHAR NOT NULL,
    branch VARCHAR,
    birthdate DATE,
    phone_number VARCHAR,
    national_id VARCHAR,
    nationality VARCHAR,
    residence VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create volunteer_teams table (Team Roster & Approval)
CREATE TABLE IF NOT EXISTS public.volunteer_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL REFERENCES public.volunteers_base(id) ON DELETE CASCADE,
    team_code VARCHAR NOT NULL,
    join_date DATE,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    
    -- Extra fields for the team's specific view of the volunteer
    team_phone VARCHAR,
    team_national_id VARCHAR,
    team_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(volunteer_id, team_code) -- Prevent duplicate entries for the same volunteer in the same team
);

-- 3. Link mission_volunteers to base_volunteer
ALTER TABLE public.mission_volunteers 
ADD COLUMN IF NOT EXISTS base_volunteer_id UUID REFERENCES public.volunteers_base(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.volunteers_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_teams ENABLE ROW LEVEL SECURITY;

-- Policies for volunteers_base
DROP POLICY IF EXISTS "Allow authenticated users to read volunteers_base" ON public.volunteers_base;
CREATE POLICY "Allow authenticated users to read volunteers_base" ON public.volunteers_base FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert volunteers_base" ON public.volunteers_base;
CREATE POLICY "Allow authenticated users to insert volunteers_base" ON public.volunteers_base FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin to modify volunteers_base" ON public.volunteers_base;
CREATE POLICY "Allow admin to modify volunteers_base" ON public.volunteers_base FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Policies for volunteer_teams
DROP POLICY IF EXISTS "Allow authenticated users to read volunteer_teams" ON public.volunteer_teams;
CREATE POLICY "Allow authenticated users to read volunteer_teams" ON public.volunteer_teams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert volunteer_teams" ON public.volunteer_teams;
CREATE POLICY "Allow authenticated users to insert volunteer_teams" ON public.volunteer_teams FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update volunteer_teams" ON public.volunteer_teams;
CREATE POLICY "Allow authenticated users to update volunteer_teams" ON public.volunteer_teams FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete volunteer_teams" ON public.volunteer_teams;
CREATE POLICY "Allow authenticated users to delete volunteer_teams" ON public.volunteer_teams FOR DELETE TO authenticated USING (true);