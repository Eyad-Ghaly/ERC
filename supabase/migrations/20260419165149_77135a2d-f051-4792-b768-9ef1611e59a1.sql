
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','data_manager','department_entry','operations_room','operations_supervisor','joker','youth_room','stakeholder');
CREATE TYPE public.mission_status AS ENUM ('planned','coded','entered','reviewed','sent_to_youth','sent_to_supervisor','monitored');
CREATE TYPE public.region AS ENUM ('delta','saaid','qanal','markaz_3am');
CREATE TYPE public.mission_type AS ENUM ('internal','external');
CREATE TYPE public.transport_mode AS ENUM ('public','driver');
CREATE TYPE public.data_source AS ENUM ('whatsapp','wireless','phone');
CREATE TYPE public.volunteer_change_reason AS ENUM ('apologized','redirected','unavailable','other');
CREATE TYPE public.volunteer_note_type AS ENUM ('not_renewed','not_present','membership_number','base_not_updated','separated','suspended');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  team_code TEXT,
  department_code TEXT,
  region public.region,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- DROPDOWN SYSTEM
CREATE TABLE public.dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_key, value)
);
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.dropdown_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, option_id)
);
ALTER TABLE public.user_dropdown_options ENABLE ROW LEVEL SECURITY;

-- MISSION CODE SEQUENCE (per team)
CREATE TABLE public.mission_code_sequences (
  team_code TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.mission_code_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_mission_code(_project_code TEXT, _team_code TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _next INTEGER;
BEGIN
  INSERT INTO public.mission_code_sequences (team_code, last_seq) VALUES (_team_code, 1)
  ON CONFLICT (team_code) DO UPDATE SET last_seq = public.mission_code_sequences.last_seq + 1
  RETURNING last_seq INTO _next;
  RETURN _project_code || _team_code || lpad(_next::TEXT, 5, '0');
END;
$$;

-- MISSIONS
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_code TEXT NOT NULL UNIQUE,
  status public.mission_status NOT NULL DEFAULT 'planned',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  team_code TEXT NOT NULL,
  project_code TEXT NOT NULL,
  governorate TEXT,
  admin_code TEXT,
  activity_classification TEXT,
  activity_type TEXT,
  activity_details TEXT,
  mission_nature TEXT,
  type_name TEXT,
  classification TEXT,
  classification_name TEXT,
  activity_date DATE NOT NULL,
  execution_place TEXT,
  mission_name TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  follow_up_responsible TEXT,
  follow_up_phone TEXT,
  region public.region,
  mission_type public.mission_type,
  transport_mode public.transport_mode,
  supervisor TEXT,
  filler_volunteer TEXT,
  reviewer_volunteer TEXT,
  reviewing_supervisor TEXT,
  completing_volunteer TEXT,
  joker_name TEXT,
  data_sources public.data_source[],
  monitor_name TEXT,
  youth_reviewer TEXT,
  youth_notes TEXT,
  submitted_at TIMESTAMPTZ,
  ops_entered_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  sent_to_youth_at TIMESTAMPTZ,
  sent_to_supervisor_at TIMESTAMPTZ,
  monitored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_missions_activity_date ON public.missions(activity_date);
CREATE INDEX idx_missions_status ON public.missions(status);
CREATE INDEX idx_missions_team_code ON public.missions(team_code);

CREATE TABLE public.mission_volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  membership_number TEXT,
  branch TEXT,
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  hours NUMERIC GENERATED ALWAYS AS (
    CASE WHEN arrival_time IS NOT NULL AND departure_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (departure_time - arrival_time))/3600.0 ELSE NULL END
  ) STORED,
  points INTEGER,
  change_reason public.volunteer_change_reason,
  change_note TEXT,
  added_in_ops BOOLEAN NOT NULL DEFAULT false,
  removed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_volunteers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mv_mission ON public.mission_volunteers(mission_id);

CREATE TABLE public.volunteer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES public.mission_volunteers(id) ON DELETE CASCADE,
  note_type public.volunteer_note_type NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.volunteer_notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mission_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  vehicle_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_drivers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mission_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  place TEXT NOT NULL,
  route_time TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_routes ENABLE ROW LEVEL SECURITY;

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  diff JSONB
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_record ON public.audit_log(table_name, record_id);

CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _diff JSONB; _id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN _diff := to_jsonb(OLD); _id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN _diff := to_jsonb(NEW); _id := NEW.id;
  ELSE _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)); _id := NEW.id;
  END IF;
  INSERT INTO public.audit_log (table_name, record_id, action, changed_by, diff)
  VALUES (TG_TABLE_NAME, _id, TG_OP, auth.uid(), _diff);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER missions_audit AFTER INSERT OR UPDATE OR DELETE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER mv_audit AFTER INSERT OR UPDATE OR DELETE ON public.mission_volunteers FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER vn_audit AFTER INSERT OR UPDATE OR DELETE ON public.volunteer_notes FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER drivers_audit AFTER INSERT OR UPDATE OR DELETE ON public.mission_drivers FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER routes_audit AFTER INSERT OR UPDATE OR DELETE ON public.mission_routes FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER missions_touch BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER mv_touch BEFORE UPDATE ON public.mission_volunteers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- AUTO PROFILE + ADMIN BOOTSTRAP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, approved)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'midololob@gmail.com' THEN true ELSE false END);
  IF NEW.email = 'midololob@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room']::public.app_role[]));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "user sees own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth read dropdowns" ON public.dropdown_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write dropdowns" ON public.dropdown_options FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user reads own restrictions" ON public.user_dropdown_options FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage restrictions" ON public.user_dropdown_options FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin read sequences" ON public.mission_code_sequences FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "creator and elevated read missions" ON public.missions FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::public.app_role[]));
CREATE POLICY "department entry inserts" ON public.missions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(),'department_entry') OR public.is_admin(auth.uid())));
CREATE POLICY "elevated update missions" ON public.missions FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room']::public.app_role[])
  OR (created_by = auth.uid() AND status = 'planned'));
CREATE POLICY "admin delete missions" ON public.missions FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "read mission volunteers" ON public.mission_volunteers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_id AND (
  m.created_by = auth.uid() OR public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::public.app_role[]))));
CREATE POLICY "write mission volunteers" ON public.mission_volunteers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','department_entry']::public.app_role[]))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','department_entry']::public.app_role[]));

CREATE POLICY "read volunteer notes" ON public.volunteer_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_id AND (
  m.created_by = auth.uid() OR public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::public.app_role[]))));
CREATE POLICY "write volunteer notes" ON public.volunteer_notes FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','youth_room']::public.app_role[]))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','youth_room']::public.app_role[]));

CREATE POLICY "read mission drivers" ON public.mission_drivers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_id AND (
  m.created_by = auth.uid() OR public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::public.app_role[]))));
CREATE POLICY "write mission drivers" ON public.mission_drivers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::public.app_role[]))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::public.app_role[]));

CREATE POLICY "read mission routes" ON public.mission_routes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_id AND (
  m.created_by = auth.uid() OR public.is_admin(auth.uid())
  OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::public.app_role[]))));
CREATE POLICY "write mission routes" ON public.mission_routes FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::public.app_role[]))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::public.app_role[]));

CREATE POLICY "elevated read audit" ON public.audit_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'data_manager'));

-- SEED DROPDOWNS
INSERT INTO public.dropdown_options (field_key, value, label) VALUES
('project_code','P16','P16 - مشروع تطوير'),
('project_code','P22','P22 - مشروع الإغاثة'),
('project_code','P30','P30 - مشروع الصحة'),
('governorate','القاهرة','القاهرة'),
('governorate','الجيزة','الجيزة'),
('governorate','الإسكندرية','الإسكندرية'),
('governorate','الدقهلية','الدقهلية'),
('governorate','الشرقية','الشرقية'),
('governorate','أسوان','أسوان'),
('governorate','الأقصر','الأقصر'),
('governorate','الإسماعيلية','الإسماعيلية'),
('admin_code','D06','D06 - إدارة الإغاثة'),
('admin_code','D11','D11 - إدارة الصحة'),
('admin_code','D14','D14 - إدارة التطوع'),
('activity_classification','إغاثي','إغاثي'),
('activity_classification','صحي','صحي'),
('activity_classification','تنموي','تنموي'),
('activity_type','قافلة','قافلة'),
('activity_type','حملة','حملة'),
('activity_type','زيارة','زيارة'),
('activity_type','تدريب','تدريب'),
('activity_details','توزيع','توزيع'),
('activity_details','رصد','رصد'),
('activity_details','إسعافات','إسعافات'),
('mission_nature','ميداني','ميداني'),
('mission_nature','مكتبي','مكتبي'),
('type_name','عام','عام'),
('type_name','خاص','خاص'),
('classification','أ','أ'),
('classification','ب','ب'),
('classification','ج','ج'),
('classification_name','حساس','حساس'),
('classification_name','عادي','عادي');
