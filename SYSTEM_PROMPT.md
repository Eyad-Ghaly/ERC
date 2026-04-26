# 🚀 Prompt شامل لإعادة بناء Backend + Database

> انسخ هذا الملف كاملاً والصقه في أي أداة AI (Lovable / Cursor / Claude / ChatGPT) مع مشروع Supabase جديد لإعادة بناء نفس الهيكل بالكامل.

---

## 1) نظرة عامة على النظام

نظام إدارة مهام/استمارات ميدانية للعمل التطوعي والإنساني. يتعامل مع:
- إنشاء **استمارات (Missions)** من قِبل فرق الإدخال.
- مراجعة الاستمارات عبر سلسلة من الأدوار (Workflow).
- إدارة **المتطوعين والسائقين ونقاط المرور** المرتبطة بكل مهمة.
- قوائم منسدلة (dropdowns) ديناميكية مُدارة من الأدمن مع إمكانية تخصيصها لكل مستخدم.
- **سجل تعديلات (audit log)** كامل لكل تغيير على الجداول الحساسة.

### الأدوار (8 roles)
| Role | الاسم بالعربية | الوظيفة |
|---|---|---|
| `admin` | مدير النظام | صلاحيات كاملة |
| `data_manager` | مسؤول إدارة وتحليل البيانات | إدارة الجداول والتقارير |
| `department_entry` | مسؤول الفريق (إدخال) | إنشاء الاستمارات الجديدة |
| `operations_room` | غرفة العمليات | مراجعة أولى وإرسال للجوكر |
| `joker` | الجوكر | مراجعة وإرسال لغرفة الشباب |
| `youth_room` | غرفة الشباب والتطوع | مراجعة وإرسال للمشرف |
| `operations_supervisor` | مشرف غرفة العمليات | الاعتماد النهائي |
| `stakeholder` | Dashboard – أصحاب المصلحة | قراءة فقط (تقارير) |

### دورة حياة الاستمارة (Workflow)
```
department_entry → operations_room → joker → youth_room → operations_supervisor
   (coded)           (entered)       (reviewed)  (sent_to_youth)   (monitored)
   الفريق           العمليات          الجوكر       غرفة الشباب       اعتماد المشرف
```

تسميات الحالات (UI – عربي):
- `planned` → "مخطط لها"
- `coded` → "تم التكويد من الفريق"
- `entered` → "تم مراجعة الغرفة"
- `reviewed` → "تم مراجعة الجوكر"
- `sent_to_youth` → "تم مراجعة الشباب"
- `sent_to_supervisor` → "تم الإرسال للمشرف"
- `monitored` → "مكتملة"

---

## 2) Enums (الأنواع المخصصة)

```sql
CREATE TYPE public.app_role AS ENUM (
  'admin','data_manager','department_entry','operations_room',
  'operations_supervisor','joker','youth_room','stakeholder'
);

CREATE TYPE public.mission_status AS ENUM (
  'planned','coded','entered','reviewed','sent_to_youth','sent_to_supervisor','monitored'
);

CREATE TYPE public.region AS ENUM ('delta','saaid','qanal','markaz_3am');
CREATE TYPE public.mission_type AS ENUM ('internal','external');
CREATE TYPE public.transport_mode AS ENUM ('public','driver');
CREATE TYPE public.data_source AS ENUM ('whatsapp','wireless','phone');

CREATE TYPE public.volunteer_change_reason AS ENUM (
  'apologized','redirected','unavailable','other'
);

CREATE TYPE public.volunteer_note_type AS ENUM (
  'not_renewed','not_present','membership_number',
  'base_not_updated','separated','suspended'
);
```

---

## 3) الجداول (11 جدول)

### العلاقات (ASCII)
```
auth.users (Supabase managed)
   │
   ├──> profiles            (user_id)
   ├──> user_roles          (user_id, role)
   └──> user_dropdown_options (user_id) ──> dropdown_options (option_id)

missions
   ├──> mission_drivers      (mission_id)
   ├──> mission_routes       (mission_id)
   ├──> mission_volunteers   (mission_id)
   │       └──> volunteer_notes (volunteer_id, mission_id)
   └──> volunteer_notes      (mission_id)

mission_code_sequences  (team_code → last_seq)
audit_log               (table_name, record_id, action, diff, changed_by)
```

> ⚠️ **مهم:** لا تستخدم Foreign Key مباشرة على `auth.users`. اربط فقط بـ `user_id uuid` بدون REFERENCES.

### 3.1 profiles
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  team_code text,
  department_code text,
  region public.region,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### 3.2 user_roles (منفصل لمنع privilege escalation)
```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### 3.3 dropdown_options
```sql
CREATE TABLE public.dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL,        -- e.g. 'project_code','governorate','admin_code'...
  value text NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dropdown_options ENABLE ROW LEVEL SECURITY;
```

`field_key` المتوقعة: `project_code`, `governorate`, `admin_code`, `activity_classification`, `activity_type`, `activity_details`, `mission_nature`, `type_name`, `classification`, `classification_name`.

### 3.4 user_dropdown_options
```sql
CREATE TABLE public.user_dropdown_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  option_id uuid NOT NULL REFERENCES public.dropdown_options(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, option_id)
);
ALTER TABLE public.user_dropdown_options ENABLE ROW LEVEL SECURITY;
```

### 3.5 mission_code_sequences
```sql
CREATE TABLE public.mission_code_sequences (
  team_code text PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);
ALTER TABLE public.mission_code_sequences ENABLE ROW LEVEL SECURITY;
```

### 3.6 missions (الجدول الرئيسي)
```sql
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_code text NOT NULL UNIQUE,
  status public.mission_status NOT NULL DEFAULT 'planned',
  created_by uuid NOT NULL,
  team_code text NOT NULL,
  project_code text NOT NULL,

  -- التصنيف
  governorate text,
  admin_code text,
  activity_classification text,
  activity_type text,
  activity_details text,
  mission_nature text,
  type_name text,
  classification text,
  classification_name text,

  -- التفاصيل
  activity_date date NOT NULL,
  execution_place text,
  mission_name text NOT NULL,
  latitude numeric,
  longitude numeric,
  follow_up_responsible text,
  follow_up_phone text,

  region public.region,
  mission_type public.mission_type,
  transport_mode public.transport_mode,

  -- المسؤولون
  supervisor text,
  filler_volunteer text,
  reviewer_volunteer text,
  reviewing_supervisor text,
  joker_name text,
  monitor_name text,
  youth_reviewer text,
  completing_volunteer text,

  data_sources public.data_source[],
  youth_notes text,

  -- timestamps لكل مرحلة
  submitted_at timestamptz,
  ops_entered_at timestamptz,
  reviewed_at timestamptz,
  sent_to_youth_at timestamptz,
  sent_to_supervisor_at timestamptz,
  monitored_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
```

### 3.7 mission_drivers
```sql
CREATE TABLE public.mission_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  driver_name text NOT NULL,
  vehicle_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_drivers ENABLE ROW LEVEL SECURITY;
```

### 3.8 mission_routes
```sql
CREATE TABLE public.mission_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  place text NOT NULL,
  route_time timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_routes ENABLE ROW LEVEL SECURITY;
```

### 3.9 mission_volunteers
```sql
CREATE TABLE public.mission_volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  membership_number text,
  branch text,
  arrival_time timestamptz,
  departure_time timestamptz,
  hours numeric,
  points integer,                                -- 0 / 5 / 10 / 20
  change_reason public.volunteer_change_reason,
  change_note text,
  added_in_ops boolean NOT NULL DEFAULT false,
  removed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_volunteers ENABLE ROW LEVEL SECURITY;
```

### 3.10 volunteer_notes
```sql
CREATE TABLE public.volunteer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES public.mission_volunteers(id) ON DELETE CASCADE,
  note_type public.volunteer_note_type NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.volunteer_notes ENABLE ROW LEVEL SECURITY;
```

### 3.11 audit_log
```sql
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,           -- INSERT / UPDATE / DELETE
  changed_by uuid,
  diff jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
```

---

## 4) Database Functions

> كل دوال فحص الصلاحيات **يجب** أن تكون `SECURITY DEFINER` و `STABLE` و `SET search_path = public` لتجنّب الـ RLS recursion.

```sql
-- 4.1 has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 4.2 is_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- 4.3 has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- 4.4 generate_mission_code  (project_code + team_code + 5-digit seq)
CREATE OR REPLACE FUNCTION public.generate_mission_code(_project_code text, _team_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _next integer;
BEGIN
  INSERT INTO public.mission_code_sequences (team_code, last_seq)
  VALUES (_team_code, 1)
  ON CONFLICT (team_code) DO UPDATE
    SET last_seq = public.mission_code_sequences.last_seq + 1
  RETURNING last_seq INTO _next;
  RETURN _project_code || _team_code || lpad(_next::text, 5, '0');
END; $$;

-- 4.5 touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 4.6 log_audit
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _diff jsonb; _id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN _diff := to_jsonb(OLD); _id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN _diff := to_jsonb(NEW); _id := NEW.id;
  ELSE _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)); _id := NEW.id;
  END IF;
  INSERT INTO public.audit_log (table_name, record_id, action, changed_by, diff)
  VALUES (TG_TABLE_NAME, _id, TG_OP, auth.uid(), _diff);
  RETURN COALESCE(NEW, OLD);
END; $$;

-- 4.7 handle_new_user (إنشاء profile + bootstrap admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'midololob@gmail.com' THEN true ELSE false END
  );
  IF NEW.email = 'midololob@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
```

---

## 5) Triggers

```sql
-- 5.1 إنشاء profile تلقائياً عند تسجيل مستخدم جديد
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5.2 updated_at
CREATE TRIGGER trg_missions_touch
BEFORE UPDATE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_profiles_touch
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_volunteers_touch
BEFORE UPDATE ON public.mission_volunteers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5.3 audit
CREATE TRIGGER trg_missions_audit
AFTER INSERT OR UPDATE OR DELETE ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.log_audit();

CREATE TRIGGER trg_volunteers_audit
AFTER INSERT OR UPDATE OR DELETE ON public.mission_volunteers
FOR EACH ROW EXECUTE FUNCTION public.log_audit();
```

---

## 6) RLS Policies

### profiles
```sql
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room']::app_role[]));

CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
```

### user_roles
```sql
CREATE POLICY "user sees own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

### dropdown_options
```sql
CREATE POLICY "auth read dropdowns" ON public.dropdown_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write dropdowns" ON public.dropdown_options FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

### user_dropdown_options
```sql
CREATE POLICY "user reads own restrictions" ON public.user_dropdown_options FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "admin manage restrictions" ON public.user_dropdown_options FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
```

### mission_code_sequences
```sql
CREATE POLICY "admin read sequences" ON public.mission_code_sequences FOR SELECT TO authenticated
USING (is_admin(auth.uid()));
-- لا توجد سياسات INSERT/UPDATE/DELETE: تتم عبر دالة generate_mission_code (SECURITY DEFINER)
```

### missions
```sql
CREATE POLICY "creator and elevated read missions" ON public.missions FOR SELECT TO authenticated
USING (created_by = auth.uid() OR is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::app_role[]));

CREATE POLICY "department entry inserts" ON public.missions FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (has_role(auth.uid(),'department_entry') OR is_admin(auth.uid())));

CREATE POLICY "elevated update missions" ON public.missions FOR UPDATE TO authenticated
USING (is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room']::app_role[])
       OR (created_by = auth.uid() AND status = 'planned'));

CREATE POLICY "admin delete missions" ON public.missions FOR DELETE TO authenticated
USING (is_admin(auth.uid()));
```

### mission_drivers / mission_routes (نفس النمط)
```sql
CREATE POLICY "read mission drivers" ON public.mission_drivers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_drivers.mission_id
  AND (m.created_by = auth.uid() OR is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::app_role[]))));

CREATE POLICY "write mission drivers" ON public.mission_drivers FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::app_role[]))
WITH CHECK (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::app_role[]));

-- نفس السياسات بالضبط لـ mission_routes (مع استبدال الاسم)
CREATE POLICY "read mission routes" ON public.mission_routes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_routes.mission_id
  AND (m.created_by = auth.uid() OR is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::app_role[]))));

CREATE POLICY "write mission routes" ON public.mission_routes FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::app_role[]))
WITH CHECK (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker']::app_role[]));
```

### mission_volunteers
```sql
CREATE POLICY "read mission volunteers" ON public.mission_volunteers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = mission_volunteers.mission_id
  AND (m.created_by = auth.uid() OR is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::app_role[]))));

CREATE POLICY "write mission volunteers" ON public.mission_volunteers FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','department_entry']::app_role[]))
WITH CHECK (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','department_entry']::app_role[]));
```

### volunteer_notes
```sql
CREATE POLICY "read volunteer notes" ON public.volunteer_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.missions m WHERE m.id = volunteer_notes.mission_id
  AND (m.created_by = auth.uid() OR is_admin(auth.uid())
       OR has_any_role(auth.uid(), ARRAY['data_manager','operations_room','operations_supervisor','joker','youth_room','stakeholder']::app_role[]))));

CREATE POLICY "write volunteer notes" ON public.volunteer_notes FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','youth_room']::app_role[]))
WITH CHECK (is_admin(auth.uid()) OR has_any_role(auth.uid(), ARRAY['data_manager','youth_room']::app_role[]));
```

### audit_log (قراءة فقط للأدمن/البيانات)
```sql
CREATE POLICY "elevated read audit" ON public.audit_log FOR SELECT TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(),'data_manager'));
-- لا INSERT/UPDATE/DELETE لأي مستخدم: التسجيل يتم عبر trigger SECURITY DEFINER
```

---

## 7) Workflow / Status Lifecycle (تفصيلي)

```
┌────────────────┐  إنشاء   ┌────────────────┐  إرسال    ┌────────────────┐  إرسال   ┌────────────────┐  إرسال   ┌────────────────┐
│ department_entry│ ───────▶│ operations_room│ ────────▶ │     joker      │ ───────▶│   youth_room   │ ───────▶│operations_super.│
└────────────────┘  coded   └────────────────┘  entered  └────────────────┘ reviewed└────────────────┘sent_to_y└────────────────┘
                                                                                                               │ اعتماد
                                                                                                               ▼
                                                                                                          monitored
                                                                                                          (مكتملة)
```

قواعد الـ UI لكل دور:
- **department_entry**: إنشاء استمارة → الحالة `coded`، تظهر زرّ "حفظ".
- **operations_room**: عند `coded` يظهر فقط زرّ "إرسال للجوكر" → يحوّل إلى `entered` ويختم `ops_entered_at`.
- **joker**: عند `entered` يظهر فقط زرّ "إرسال لغرفة الشباب" → يحوّل إلى `reviewed` ويختم `reviewed_at`.
- **youth_room**: عند `reviewed` يظهر فقط زرّ "إرسال للمشرف" → يحوّل إلى `sent_to_youth` ويختم `sent_to_youth_at`.
- **operations_supervisor**: عند `sent_to_youth` يظهر زرّ "اعتماد الاستمارة" → يحوّل إلى `monitored` ويختم `monitored_at`.
- شريط تقدّم (Workflow Progress) ظاهر للجميع لتوضيح المرحلة الحالية.

---

## 8) Auth Configuration

- **Email + Password** مفعّل.
- **Auto-confirm email**: مفعّل (لتجربة سلسة، لا تحتاج تأكيد بريد).
- (اختياري) **Google OAuth**.
- **Bootstrap admin**: عند تسجيل بريد `midololob@gmail.com` يُمنح `admin` تلقائياً عبر `handle_new_user`.
- لا تستخدم anonymous sign-ups.
- في الواجهة: استخدم `supabase.auth.onAuthStateChange` ثم `getSession` (في هذا الترتيب) لتفادي ضياع الـ session.

---

## 9) ملاحظات تنفيذية حرجة

1. ❌ **لا** تضع FK على `auth.users`. اربط بـ `user_id uuid` فقط.
2. ✅ الأدوار **في جدول منفصل** (`user_roles`) — ليس عمود في `profiles` (لمنع privilege escalation).
3. ✅ كل دالة فحص أدوار: `SECURITY DEFINER` + `STABLE` + `SET search_path = public`.
4. ✅ استخدم `has_role` / `is_admin` / `has_any_role` داخل سياسات RLS بدل الاستعلام المباشر من `user_roles` (لتفادي recursion).
5. ✅ توليد `mission_code` فقط عبر `generate_mission_code(project_code, team_code)` لضمان تسلسل آمن.
6. ✅ `audit_log` لا يُكتب إليه إلا عبر trigger `log_audit` (لا توجد سياسة INSERT).
7. ✅ كل الجداول `ENABLE ROW LEVEL SECURITY`.
8. ✅ Frontend: استورد العميل من `@/integrations/supabase/client` فقط. لا تنشئ client يدوياً.

---

## 10) ترتيب التنفيذ المقترح

1. أنشئ كل الـ **Enums**.
2. أنشئ كل **الجداول** + فعّل RLS.
3. أنشئ **الدوال** (functions).
4. أنشئ **الـ Triggers**.
5. أنشئ كل **سياسات RLS**.
6. اضبط **Auth** (Email/Password + auto-confirm).
7. سجّل بـ `midololob@gmail.com` للحصول على admin تلقائي.

---

> ✅ بعد تشغيل كل ما سبق، سيكون عندك نسخة طبق الأصل من Backend الأصلي، جاهزة لربطها بأي Frontend.
