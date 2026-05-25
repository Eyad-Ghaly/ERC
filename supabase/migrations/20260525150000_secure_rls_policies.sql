-- Secure Row Level Security (RLS) Policies Migration
-- This migration secures the sensitive data (volunteers and beneficiaries) from unauthorized read/write access.

-- 1. Secure volunteers_base table
DROP POLICY IF EXISTS "Allow authenticated users to read volunteers_base" ON public.volunteers_base;
DROP POLICY IF EXISTS "Allow authenticated users to insert volunteers_base" ON public.volunteers_base;
DROP POLICY IF EXISTS "Allow admin to modify volunteers_base" ON public.volunteers_base;

CREATE POLICY "Allow approved users to read volunteers_base" ON public.volunteers_base FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Allow approved users to insert volunteers_base" ON public.volunteers_base FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Allow admin to modify volunteers_base" ON public.volunteers_base FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);

-- 2. Secure volunteer_teams table
DROP POLICY IF EXISTS "Allow authenticated users to read volunteer_teams" ON public.volunteer_teams;
DROP POLICY IF EXISTS "Allow authenticated users to insert volunteer_teams" ON public.volunteer_teams;
DROP POLICY IF EXISTS "Allow authenticated users to update volunteer_teams" ON public.volunteer_teams;
DROP POLICY IF EXISTS "Allow authenticated users to delete volunteer_teams" ON public.volunteer_teams;

CREATE POLICY "Allow approved users to read volunteer_teams" ON public.volunteer_teams FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Allow approved users to insert volunteer_teams" ON public.volunteer_teams FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Allow approved users to update volunteer_teams" ON public.volunteer_teams FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Allow approved users to delete volunteer_teams" ON public.volunteer_teams FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

-- 3. Secure beneficiaries_registry table
DROP POLICY IF EXISTS "Read beneficiaries_registry" ON public.beneficiaries_registry;
DROP POLICY IF EXISTS "Insert beneficiaries_registry" ON public.beneficiaries_registry;
DROP POLICY IF EXISTS "Update beneficiaries_registry" ON public.beneficiaries_registry;

CREATE POLICY "Read beneficiaries_registry" ON public.beneficiaries_registry FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Insert beneficiaries_registry" ON public.beneficiaries_registry FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

CREATE POLICY "Update beneficiaries_registry" ON public.beneficiaries_registry FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  )
);

-- 4. Secure beneficiaries_individual table
ALTER TABLE public.beneficiaries_individual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read beneficiaries_individual" ON public.beneficiaries_individual;
DROP POLICY IF EXISTS "Insert beneficiaries_individual" ON public.beneficiaries_individual;
DROP POLICY IF EXISTS "Update beneficiaries_individual" ON public.beneficiaries_individual;
DROP POLICY IF EXISTS "Delete beneficiaries_individual" ON public.beneficiaries_individual;

CREATE POLICY "Read beneficiaries_individual" ON public.beneficiaries_individual FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  ) AND (
    EXISTS (
      SELECT 1 FROM public.missions m WHERE m.id = beneficiaries_individual.mission_id
    )
  )
);

CREATE POLICY "Insert beneficiaries_individual" ON public.beneficiaries_individual FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  ) AND (
    public.is_admin(auth.uid()) OR
    (
      public.has_role(auth.uid(), 'department_entry') AND
      EXISTS (
        SELECT 1 FROM public.missions m WHERE m.id = mission_id AND m.created_by = auth.uid()
      )
    )
  )
);

CREATE POLICY "Update beneficiaries_individual" ON public.beneficiaries_individual FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  ) AND (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'data_manager') OR
    (
      public.has_role(auth.uid(), 'department_entry') AND
      EXISTS (
        SELECT 1 FROM public.missions m WHERE m.id = mission_id AND m.created_by = auth.uid() AND m.status = 'planned'
      )
    )
  )
);

CREATE POLICY "Delete beneficiaries_individual" ON public.beneficiaries_individual FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid())
);

-- 5. Secure beneficiaries_group table
ALTER TABLE public.beneficiaries_group ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read beneficiaries_group" ON public.beneficiaries_group;
DROP POLICY IF EXISTS "Insert beneficiaries_group" ON public.beneficiaries_group;
DROP POLICY IF EXISTS "Update beneficiaries_group" ON public.beneficiaries_group;
DROP POLICY IF EXISTS "Delete beneficiaries_group" ON public.beneficiaries_group;

CREATE POLICY "Read beneficiaries_group" ON public.beneficiaries_group FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  ) AND (
    EXISTS (
      SELECT 1 FROM public.missions m WHERE m.id = beneficiaries_group.mission_id
    )
  )
);

CREATE POLICY "Insert beneficiaries_group" ON public.beneficiaries_group FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  ) AND (
    public.is_admin(auth.uid()) OR
    (
      public.has_role(auth.uid(), 'department_entry') AND
      EXISTS (
        SELECT 1 FROM public.missions m WHERE m.id = mission_id AND m.created_by = auth.uid()
      )
    )
  )
);

CREATE POLICY "Update beneficiaries_group" ON public.beneficiaries_group FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.approved = true
  ) AND (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'data_manager') OR
    (
      public.has_role(auth.uid(), 'department_entry') AND
      EXISTS (
        SELECT 1 FROM public.missions m WHERE m.id = mission_id AND m.created_by = auth.uid() AND m.status = 'planned'
      )
    )
  )
);

CREATE POLICY "Delete beneficiaries_group" ON public.beneficiaries_group FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid())
);
