import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { ROLES, DROPDOWN_FIELD_LABELS, type AppRole } from "@/lib/constants";
import { toast } from "sonner";
import { Trash2, Plus, Check } from "lucide-react";

interface ProfileRow {
  id: string; user_id: string; email: string; full_name: string | null;
  team_id: string | null; department_id: string | null; approved: boolean;
  team?: { code: string } | null; department?: { code: string } | null;
}
interface RoleRow { user_id: string; role: AppRole; }
interface OptionRow { id: string; field_key: string; value: string; label: string; active: boolean; }
interface TeamRow { id: string; code: string; }
interface DeptRow { id: string; code: string; }

export default function Admin() {
  return (
    <AppLayout title="لوحة المدير">
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">المستخدمون والصلاحيات</TabsTrigger>
          <TabsTrigger value="dropdowns">القوائم المنسدلة</TabsTrigger>
          <TabsTrigger value="restrictions">قيود لكل مستخدم</TabsTrigger>
          <TabsTrigger value="custom_fields">حقول مخصصة للفرق</TabsTrigger>
          <TabsTrigger value="team_kpis">مؤشرات مخصصة</TabsTrigger>
          <TabsTrigger value="feedback_questions">أسئلة تقييم الفريق</TabsTrigger>
          <TabsTrigger value="volunteer_approvals">اعتماد المتطوعين</TabsTrigger>
          <TabsTrigger value="audit">سجل التعديلات</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="dropdowns"><DropdownsTab /></TabsContent>
        <TabsContent value="restrictions"><RestrictionsTab /></TabsContent>
        <TabsContent value="custom_fields"><CustomFieldsTab /></TabsContent>
        <TabsContent value="team_kpis"><TeamCustomKpisTab /></TabsContent>
        <TabsContent value="feedback_questions"><FeedbackQuestionsTab /></TabsContent>
        <TabsContent value="volunteer_approvals"><VolunteerApprovalsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function UsersTab() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, AppRole[]>>({});
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [departments, setDepartments] = useState<DeptRow[]>([]);

  const load = async () => {
    const [{ data: ps }, { data: rs }, { data: ts }, { data: ds }] = await Promise.all([
      supabase.from("profiles").select("*, team:teams(code), department:departments(code)").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("teams").select("id, code"),
      supabase.from("departments").select("id, code"),
    ]);
    setProfiles((ps ?? []) as ProfileRow[]);
    setTeams(ts ?? []);
    setDepartments(ds ?? []);
    const m: Record<string, AppRole[]> = {};
    ((rs ?? []) as RoleRow[]).forEach((r) => { (m[r.user_id] ??= []).push(r.role); });
    setRolesMap(m);
  };
  useEffect(() => { load(); }, []);

  const toggleApproved = async (p: ProfileRow) => {
    await supabase.from("profiles").update({ approved: !p.approved }).eq("id", p.id);
    toast.success("تم التحديث");
    load();
  };

  const updateField = async (p: ProfileRow, field: "team_id" | "department_id", value: string) => {
    if (value === "none") value = null as any;
    const patch = field === "team_id" ? { team_id: value } : { department_id: value };
    await supabase.from("profiles").update(patch).eq("id", p.id);
    load();
  };

  const toggleRole = async (uid: string, role: AppRole, has: boolean) => {
    if (has) await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    else await supabase.from("user_roles").insert({ user_id: uid, role });
    load();
  };

  return (
    <Card className="card-elevated p-4 overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>البريد</TableHead><TableHead>الاسم</TableHead>
          <TableHead>الفريق</TableHead><TableHead>الإدارة</TableHead>
          <TableHead>معتمد</TableHead><TableHead>الأدوار</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {profiles.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.email}</TableCell>
              <TableCell>{p.full_name ?? "—"}</TableCell>
              <TableCell>
                <Select value={p.team_id ?? "none"} onValueChange={(v) => updateField(p, "team_id", v)}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="اختر الفريق" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد</SelectItem>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select value={p.department_id ?? "none"} onValueChange={(v) => updateField(p, "department_id", v)}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="اختر الإدارة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell><Switch checked={p.approved} onCheckedChange={() => toggleApproved(p)} /></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(ROLES) as AppRole[]).map((r) => {
                    const has = (rolesMap[p.user_id] ?? []).includes(r);
                    return (
                      <button key={r} onClick={() => toggleRole(p.user_id, r, has)}
                        className={`text-xs px-2 py-1 rounded-md border transition ${has ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                        {ROLES[r]}
                      </button>
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {profiles.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمون</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function DropdownsTab() {
  const [field, setField] = useState("project_code");
  const [opts, setOpts] = useState<OptionRow[]>([]);
  const [val, setVal] = useState(""); const [lbl, setLbl] = useState("");

  const load = async () => {
    const { data } = await supabase.from("dropdown_options").select("*").eq("field_key", field).order("label");
    setOpts((data ?? []) as OptionRow[]);
  };
  useEffect(() => { load(); }, [field]);

  const add = async () => {
    if (!val || !lbl) return;
    const { error } = await supabase.from("dropdown_options").insert({ field_key: field, value: val, label: lbl });
    if (error) toast.error(error.message); else { setVal(""); setLbl(""); load(); }
  };
  const del = async (id: string) => { await supabase.from("dropdown_options").delete().eq("id", id); load(); };
  const toggle = async (o: OptionRow) => { await supabase.from("dropdown_options").update({ active: !o.active }).eq("id", o.id); load(); };

  return (
    <Card className="card-elevated p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5"><Label>الحقل</Label>
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(DROPDOWN_FIELD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>القيمة (Value)</Label><Input value={val} onChange={(e) => setVal(e.target.value)} dir="ltr" /></div>
        <div className="space-y-1.5"><Label>الاسم المعروض</Label><Input value={lbl} onChange={(e) => setLbl(e.target.value)} /></div>
        <Button onClick={add}><Plus className="w-4 h-4 ms-2" />إضافة</Button>
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>القيمة</TableHead><TableHead>الاسم</TableHead><TableHead>نشط</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {opts.map((o) => (
            <TableRow key={o.id}>
              <TableCell><code>{o.value}</code></TableCell>
              <TableCell>{o.label}</TableCell>
              <TableCell><Switch checked={o.active} onCheckedChange={() => toggle(o)} /></TableCell>
              <TableCell><Button size="icon" variant="ghost" onClick={() => del(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function RestrictionsTab() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [allOptions, setAllOptions] = useState<OptionRow[]>([]);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("profiles").select("*").order("email").then(({ data }) => setProfiles((data ?? []) as ProfileRow[]));
    supabase.from("dropdown_options").select("*").eq("active", true).order("field_key").then(({ data }) => setAllOptions((data ?? []) as OptionRow[]));
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    supabase.from("user_dropdown_options").select("option_id").eq("user_id", selectedUser).then(({ data }) => {
      setAllowed(new Set((data ?? []).map((r: any) => r.option_id)));
    });
  }, [selectedUser]);

  const toggle = async (optId: string) => {
    if (!selectedUser) return;
    if (allowed.has(optId)) {
      await supabase.from("user_dropdown_options").delete().eq("user_id", selectedUser).eq("option_id", optId);
      setAllowed((s) => { const n = new Set(s); n.delete(optId); return n; });
    } else {
      await supabase.from("user_dropdown_options").insert({ user_id: selectedUser, option_id: optId });
      setAllowed((s) => new Set(s).add(optId));
    }
  };

  const grouped: Record<string, OptionRow[]> = {};
  allOptions.forEach((o) => { (grouped[o.field_key] ??= []).push(o); });

  return (
    <Card className="card-elevated p-4 space-y-4">
      <div className="space-y-1.5 max-w-md">
        <Label>اختر المستخدم</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.email}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedUser && (
        <>
          <p className="text-sm text-muted-foreground">حدد الخيارات المسموح بها لهذا المستخدم. إذا لم تحدد أي خيار في حقل ما، سيرى جميع الخيارات النشطة.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(grouped).map(([field, options]) => (
              <Card key={field} className="p-3">
                <div className="font-bold text-sm mb-2">{DROPDOWN_FIELD_LABELS[field] ?? field}</div>
                <div className="space-y-1.5">
                  {options.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={allowed.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function CustomFieldsTab() {
  const [teamCode, setTeamCode] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState("text");
  const [newOptions, setNewOptions] = useState("");
  const [newRequired, setNewRequired] = useState(false);

  const loadFields = async (code: string) => {
    if (!code.trim()) return;
    setLoadingFields(true);
    const { data } = await supabase
      .from("team_custom_fields")
      .select("*")
      .eq("team_code", code.trim())
      .order("sort_order");
    setFields(data ?? []);
    setLoadingFields(false);
  };

  const addField = async () => {
    if (!teamCode.trim()) return toast.error("أدخل كود الفريق أولاً");
    if (!newLabel.trim()) return toast.error("أدخل اسم الحقل");
    if (!newKey.trim()) return toast.error("أدخل مفتاح الحقل بالإنجليزية");

    const optionsArr = newType === "select"
      ? newOptions.split(",").map((o: string) => o.trim()).filter(Boolean)
      : [];

    const { error } = await supabase.from("team_custom_fields").insert({
      team_code: teamCode.trim(),
      field_key: newKey.trim().toLowerCase().replace(/\s+/g, "_"),
      field_label: newLabel.trim(),
      field_type: newType,
      field_options: optionsArr,
      is_required: newRequired,
      sort_order: fields.length,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إضافة الحقل بنجاح");
      setNewLabel(""); setNewKey(""); setNewType("text"); setNewOptions(""); setNewRequired(false);
      loadFields(teamCode);
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحقل؟")) return;
    await supabase.from("team_custom_fields").delete().eq("id", id);
    loadFields(teamCode);
  };

  return (
    <div className="space-y-6">
      <Card className="card-elevated p-4">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 flex-1 max-w-xs">
            <Label>كود الفريق (team_code)</Label>
            <Input
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              placeholder="مثال: P02"
              dir="ltr"
            />
          </div>
          <Button variant="outline" onClick={() => loadFields(teamCode)}>تحميل الحقول</Button>
        </div>
      </Card>

      {teamCode.trim() && (
        <>
          <Card className="card-elevated p-5 border-primary/30">
            <h3 className="font-bold text-primary mb-4">
              إضافة حقل جديد لفريق <code className="bg-primary/10 px-1.5 py-0.5 rounded">{teamCode}</code>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>اسم الحقل (عربي) *</Label>
                <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="مثال: التخصص" />
              </div>
              <div className="space-y-1.5">
                <Label>مفتاح الحقل (إنجليزي) *</Label>
                <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="specialty" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>نوع الحقل</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">نص حر (Text)</SelectItem>
                    <SelectItem value="number">رقم (Number)</SelectItem>
                    <SelectItem value="select">قائمة منسدلة (Select)</SelectItem>
                    <SelectItem value="date">تاريخ (Date)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newType === "select" && (
                <div className="space-y-1.5 md:col-span-2">
                  <Label>خيارات القائمة (افصلها بفاصلة ",")</Label>
                  <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} placeholder="باطنة, عظام, أطفال" />
                </div>
              )}
              <div className="flex items-center gap-3 pt-5">
                <Checkbox id="new_required" checked={newRequired} onCheckedChange={(v: any) => setNewRequired(!!v)} />
                <label htmlFor="new_required" className="text-sm cursor-pointer">حقل إجباري</label>
              </div>
            </div>
            <Button className="mt-4" onClick={addField}>
              <Plus className="w-4 h-4 ms-2" /> إضافة الحقل
            </Button>
          </Card>

          <Card className="card-elevated p-4">
            <h3 className="font-bold mb-3">الحقول الحالية لهذا الفريق</h3>
            {loadingFields ? (
              <p className="text-muted-foreground text-sm p-4">جاري التحميل...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الحقل</TableHead>
                    <TableHead>المفتاح</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الخيارات</TableHead>
                    <TableHead>إجباري</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد حقول مخصصة لهذا الفريق بعد</TableCell></TableRow>
                  ) : fields.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-bold">{f.field_label}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">{f.field_key}</code></TableCell>
                      <TableCell><Badge variant="outline">{f.field_type}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {f.field_type === "select" ? (f.field_options || []).join("، ") : "—"}
                      </TableCell>
                      <TableCell>
                        {f.is_required
                          ? <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">إجباري</Badge>
                          : <span className="text-muted-foreground text-xs">اختياري</span>}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteField(f.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function TeamCustomKpisTab() {
  const [teamCode, setTeamCode] = useState("");
  const [kpis, setKpis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");

  const loadKpis = async (tc: string) => {
    if (!tc) return;
    setLoading(true);
    const { data } = await supabase.from("team_custom_kpis").select("*").eq("team_code", tc).order("created_at");
    setKpis(data ?? []);
    setLoading(false);
  };

  const addKpi = async () => {
    if (!teamCode || !newLabel || !newKey) return toast.error("أكمل البيانات المطلوبة");
    const { error } = await supabase.from("team_custom_kpis").insert({ team_code: teamCode, kpi_label: newLabel, kpi_key: newKey });
    if (error) toast.error(error.message); else { toast.success("تمت الإضافة"); setNewLabel(""); setNewKey(""); loadKpis(teamCode); }
  };

  const deleteKpi = async (id: string) => {
    await supabase.from("team_custom_kpis").delete().eq("id", id);
    loadKpis(teamCode);
  };

  return (
    <div className="space-y-6">
      <Card className="card-elevated p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 max-w-[300px]">
            <Label>أدخل كود الفريق</Label>
            <Input value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="مثال: P02" dir="ltr" />
          </div>
          <Button variant="outline" onClick={() => loadKpis(teamCode)}>تحميل المؤشرات</Button>
        </div>
      </Card>
      {teamCode.trim() && (
        <>
          <Card className="card-elevated p-5 border-primary/30">
            <h3 className="font-bold text-primary mb-4">إضافة مؤشر أداء جديد لفريق <code className="bg-primary/10 px-1.5 py-0.5 rounded">{teamCode}</code></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>اسم المؤشر (عربي) *</Label><Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="مثال: عدد المستهدفين بالتوعية" /></div>
              <div className="space-y-1.5"><Label>مفتاح المؤشر (إنجليزي) *</Label><Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="awareness_target" dir="ltr" /></div>
            </div>
            <Button className="mt-4" onClick={addKpi}><Plus className="w-4 h-4 ms-2" /> إضافة المؤشر</Button>
          </Card>
          <Card className="card-elevated p-4">
            <h3 className="font-bold mb-3">المؤشرات الحالية</h3>
            {loading ? <p className="text-muted-foreground text-sm p-4">جاري التحميل...</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>اسم المؤشر</TableHead><TableHead>المفتاح</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {kpis.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">لا توجد مؤشرات</TableCell></TableRow>
                    : kpis.map(k => (
                      <TableRow key={k.id}>
                        <TableCell className="font-bold">{k.kpi_label}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">{k.kpi_key}</code></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => deleteKpi(k.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function FeedbackQuestionsTab() {
  const [teamCode, setTeamCode] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");

  const loadQuestions = async (tc: string) => {
    if (!tc) return;
    setLoading(true);
    const { data } = await supabase.from("feedback_custom_questions").select("*").eq("team_code", tc).order("created_at");
    setQuestions(data ?? []);
    setLoading(false);
  };

  const addQuestion = async () => {
    if (!teamCode || !newLabel || !newKey) return toast.error("أكمل البيانات المطلوبة");
    const { error } = await supabase.from("feedback_custom_questions").insert({ team_code: teamCode, question_text: newLabel, question_key: newKey });
    if (error) toast.error(error.message); else { toast.success("تمت الإضافة"); setNewLabel(""); setNewKey(""); loadQuestions(teamCode); }
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("feedback_custom_questions").delete().eq("id", id);
    loadQuestions(teamCode);
  };

  return (
    <div className="space-y-6">
      <Card className="card-elevated p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 max-w-[300px]">
            <Label>أدخل كود الفريق</Label>
            <Input value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="مثال: P02" dir="ltr" />
          </div>
          <Button variant="outline" onClick={() => loadQuestions(teamCode)}>تحميل الأسئلة</Button>
        </div>
      </Card>
      {teamCode.trim() && (
        <>
          <Card className="card-elevated p-5 border-primary/30">
            <h3 className="font-bold text-primary mb-4">إضافة سؤال تقييم جديد لفريق <code className="bg-primary/10 px-1.5 py-0.5 rounded">{teamCode}</code></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>نص السؤال (عربي) *</Label><Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="مثال: كيف تقيم سرعة الاستجابة؟" /></div>
              <div className="space-y-1.5"><Label>مفتاح السؤال (إنجليزي) *</Label><Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="response_speed" dir="ltr" /></div>
            </div>
            <Button className="mt-4" onClick={addQuestion}><Plus className="w-4 h-4 ms-2" /> إضافة السؤال</Button>
          </Card>
          <Card className="card-elevated p-4">
            <h3 className="font-bold mb-3">الأسئلة الحالية</h3>
            {loading ? <p className="text-muted-foreground text-sm p-4">جاري التحميل...</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>نص السؤال</TableHead><TableHead>المفتاح</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {questions.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">لا توجد أسئلة مخصصة</TableCell></TableRow>
                    : questions.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-bold">{q.question_text}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded" dir="ltr">{q.question_key}</code></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(200).then(({ data }) => setLogs(data ?? []));
  }, []);
  return (
    <Card className="card-elevated p-4 overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>التاريخ</TableHead><TableHead>الجدول</TableHead><TableHead>السجل</TableHead>
          <TableHead>العملية</TableHead><TableHead>المستخدم</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {logs.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{new Date(l.changed_at).toLocaleString("ar-EG")}</TableCell>
              <TableCell className="font-mono text-xs">{l.table_name}</TableCell>
              <TableCell className="font-mono text-xs">{l.record_id?.slice(0, 8)}…</TableCell>
              <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{l.action}</span></TableCell>
              <TableCell className="font-mono text-xs">{l.changed_by?.slice(0, 8) ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function VolunteerApprovalsTab() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("volunteer_teams")
      .select(`
        id, team_code, join_date, is_approved,
        volunteers_base ( full_name, membership_number, branch )
      `)
      .eq("is_approved", false)
      .order("created_at", { ascending: false });

    if (!error) {
      setPending(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.from("volunteer_teams").update({ is_approved: true }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الاعتماد بنجاح"); load(); }
  };

  const reject = async (id: string) => {
    if (!confirm("هل أنت متأكد من رفض طلب الانضمام؟")) return;
    const { error } = await supabase.from("volunteer_teams").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم رفض الطلب وحذفه"); load(); }
  };

  return (
    <Card className="card-elevated p-4 overflow-x-auto">
      <div className="mb-4">
        <h3 className="font-bold text-lg">طلبات انضمام المتطوعين للفرق</h3>
        <p className="text-sm text-muted-foreground">قم باعتماد أو رفض المتطوعين الذين أضافهم مسؤولو الفرق.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المتطوع</TableHead>
            <TableHead>رقم العضوية</TableHead>
            <TableHead>الفرع</TableHead>
            <TableHead>الفريق المطلوب</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
          ) : pending.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد طلبات انضمام قيد الانتظار</TableCell></TableRow>
          ) : (
            pending.map((p) => {
              const v = p.volunteers_base;
              if (!v) return null;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-bold">{v.full_name}</TableCell>
                  <TableCell dir="ltr">{v.membership_number || "—"}</TableCell>
                  <TableCell>{v.branch || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{p.team_code}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="default" className="bg-success text-success-foreground hover:bg-success/90 h-8" onClick={() => approve(p.id)}>
                        <Check className="w-4 h-4 ms-1" /> اعتماد
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => reject(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
