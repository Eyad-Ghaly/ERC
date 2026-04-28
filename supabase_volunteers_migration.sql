-- Create volunteers_base table
CREATE TABLE public.volunteers_base (
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

-- Create volunteer_teams table
CREATE TABLE public.volunteer_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL REFERENCES public.volunteers_base(id) ON DELETE CASCADE,
    team_code VARCHAR NOT NULL,
    join_date DATE,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(volunteer_id, team_code) -- Prevent duplicate entries for the same volunteer in the same team
);

-- Enable RLS
ALTER TABLE public.volunteers_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_teams ENABLE ROW LEVEL SECURITY;

-- Policies for volunteers_base
CREATE POLICY "Allow authenticated users to read volunteers_base"
ON public.volunteers_base FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert volunteers_base"
ON public.volunteers_base FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow admin to modify volunteers_base"
ON public.volunteers_base FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Policies for volunteer_teams
CREATE POLICY "Allow authenticated users to read volunteer_teams"
ON public.volunteer_teams FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert volunteer_teams"
ON public.volunteer_teams FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow admin to update volunteer_teams"
ON public.volunteer_teams FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
