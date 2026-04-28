import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  REGIONS, MISSION_TYPES, TRANSPORT_MODES, DATA_SOURCES,
  VOLUNTEER_CHANGE_REASONS, VOLUNTEER_NOTE_TYPES, POINTS_OPTIONS, STATUS_LABELS,
} from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Save, Send, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp, Lock, Calendar, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VolunteerPicker, VolunteerData } from "@/components/VolunteerPicker";
export default function MissionDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [mission, setMission] = useState<any | null>(null);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isOps = hasRole("operations_room") || hasRole("operations_supervisor") || hasRole("admin");
  const isJoker = hasRole("joker") || hasRole("admin");
  const isSup = hasRole("operations_supervisor") || hasRole("admin");
  const isYouth = hasRole("youth_room") || hasRole("admin");
  const isData = hasRole("data_manager") || hasRole("admin");
  const canEdit = isOps || isJoker || isSup || isYouth || isData;

  // Hidden in operations room (sensitive). Visible to joker/supervisor/data/admin.
  const opsHide = !(isJoker || isSup || isData || hasRole("admin"));

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: m }, { data: v }, { data: d }, { data: r }, { data: n }, { data: dr }] = await Promise.all([
      supabase.from("missions").select("*").eq("id", id).maybeSingle(),
      supabase.from("mission_volunteers").select("*").eq("mission_id", id).order("created_at"),
      supabase.from("mission_drivers").select("*").eq("mission_id", id),
      supabase.from("mission_routes").select("*").eq("mission_id", id).order("position"),
      supabase.from("volunteer_notes").select("*").eq("mission_id", id),
      supabase.from("mission_daily_reports").select("*").eq("mission_id", id).order("day_number"),
    ]);
    setMission(m); setVolunteers(v ?? []); setDrivers(d ?? []); setRoutes(r ?? []); setNotes(n ?? []); setDailyReports(dr ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <AppLayout title="..."><Card className="p-8">جاري التحميل...</Card></AppLayout>;
  if (!mission) return <AppLayout title="غير موجود"><Card className="p-8">المهمة غير موجودة</Card></AppLayout>;

  const updateMission = (patch: Partial<typeof mission>) => setMission({ ...mission, ...patch });

  const save = async (extraPatch: any = {}) => {
    setBusy(true);
    const patch: Record<string, any> = {};
    Object.keys(mission).forEach((k) => {
      if (!["id", "mission_code", "created_at", "updated_at", "created_by", "team_code"].includes(k)) {
        patch[k] = mission[k];
      }
    });
    Object.assign(patch, extraPatch);
    const { error } = await supabase.from("missions").update(patch as any).eq("id", mission.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
    toast.success("تم الحفظ");
  };

  const transition = async (newStatus: string, label: string) => {
    const stamp = new Date().toISOString();
    const stampField: Record<string, string> = {
      entered: "ops_entered_at",
      reviewed: "reviewed_at",
      sent_to_youth: "sent_to_youth_at",
      sent_to_supervisor: "sent_to_supervisor_at",
      monitored: "monitored_at",
    };
    const nextPatch = { status: newStatus, [stampField[newStatus] ?? "updated_at"]: stamp };
    setMission((current: any) => ({ ...current, ...nextPatch }));
    await save(nextPatch);
    toast.success(label);
  };

  const reloadVolunteers = async () => {
    const { data } = await supabase.from("mission_volunteers").select("*").eq("mission_id", mission.id).order("created_at");
    setVolunteers(data ?? []);
  };
  const reloadDrivers = async () => {
    const { data } = await supabase.from("mission_drivers").select("*").eq("mission_id", mission.id);
    setDrivers(data ?? []);
  };
  const reloadRoutes = async () => {
    const { data } = await supabase.from("mission_routes").select("*").eq("mission_id", mission.id).order("position");
    setRoutes(data ?? []);
  };

  // Volunteer ops
  const addVol = async () => {
    await supabase.from("mission_volunteers").insert({ mission_id: mission.id, full_name: "متطوع جديد", added_in_ops: true });
    reloadVolunteers();
  };
  const addVolFromDB = async (v: VolunteerData) => {
    await supabase.from("mission_volunteers").insert({ 
      mission_id: mission.id, 
      full_name: v.full_name, 
      membership_number: v.membership_number,
      branch: v.branch,
      added_in_ops: true 
    });
    reloadVolunteers();
  };
  const updateVol = async (vid: string, patch: any) => {
    await supabase.from("mission_volunteers").update(patch).eq("id", vid);
    reloadVolunteers();
  };
  const removeVol = async (vid: string) => {
    await supabase.from("mission_volunteers").update({ removed: true }).eq("id", vid);
    reloadVolunteers();
  };

  // Drivers
  const addDriver = async () => {
    await supabase.from("mission_drivers").insert({ mission_id: mission.id, driver_name: "" });
    reloadDrivers();
  };
  const updateDriver = async (did: string, patch: any) => { await supabase.from("mission_drivers").update(patch).eq("id", did); reloadDrivers(); };
  const delDriver = async (did: string) => { await supabase.from("mission_drivers").delete().eq("id", did); reloadDrivers(); };

  // Routes
  const addRoute = async () => {
    await supabase.from("mission_routes").insert({ mission_id: mission.id, place: "", position: routes.length });
    reloadRoutes();
  };
  const updateRoute = async (rid: string, patch: any) => { await supabase.from("mission_routes").update(patch).eq("id", rid); reloadRoutes(); };
  const delRoute = async (rid: string) => { await supabase.from("mission_routes").delete().eq("id", rid); reloadRoutes(); };

  const startNewDay = async () => {
    setBusy(true);
    const dayNum = dailyReports.length + 1;
    await supabase.from("mission_daily_reports").insert({
      mission_id: mission.id,
      day_number: dayNum,
      report_date: new Date().toISOString().split('T')[0],
      status: 'pending_ops'
    });
    await load();
    setBusy(false);
  };

  const closeMission = async () => {
    if (!confirm("هل أنت متأكد من إغلاق هذه المهمة نهائياً؟")) return;
    setBusy(true);
    const closedAt = new Date().toISOString();
    await supabase.from("missions").update({
      is_open_mission_closed: true,
      status: 'monitored',
      monitored_at: closedAt,
    }).eq("id", mission.id);
    await load();
    setBusy(false);
    toast.success("تم إغلاق المهمة بنجاح");
  };

  return (
    <AppLayout title={`المهمة ${mission.mission_code}`}>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <Card className="card-elevated p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <code className="text-sm font-mono bg-primary-soft text-primary px-2.5 py-1 rounded font-bold">{mission.mission_code}</code>
                <StatusBadge status={mission.status} />
              </div>
              <h2 className="text-xl font-bold">{mission.mission_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{mission.activity_date} • {mission.governorate ?? "—"} • {mission.execution_place ?? "—"}</p>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> كود المهمة لا يمكن تعديله
            </div>
          </div>
        </Card>

        {/* Visible mission data */}
        <Card className="card-elevated p-5 space-y-4">
          <h3 className="font-bold">بيانات المهمة</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Info label="اسم المهمة" value={mission.mission_name} />
            <Info label="المحافظة" value={mission.governorate} />
            <Info label="مكان التنفيذ" value={mission.execution_place} />
            <Info label="التاريخ" value={mission.activity_date} />
            <Info label="مسؤول المتابعة" value={mission.follow_up_responsible} />
            <Info label="تليفون المتابعة" value={mission.follow_up_phone} />
            {!opsHide && (
              <>
                <Info label="كود الإدارة" value={mission.admin_code} />
                <Info label="كود المشروع" value={mission.project_code} />
                <Info label="تصنيف النشاط" value={mission.activity_classification} />
                <Info label="نوع النشاط" value={mission.activity_type} />
                <Info label="تفاصيل النشاط" value={mission.activity_details} />
                <Info label="إحداثيات" value={mission.latitude ? `${mission.latitude}, ${mission.longitude}` : null} />
              </>
            )}
          </div>
        </Card>

        {/* Operations Room editing */}
        {(isOps || isJoker || isSup) && (
          <Card className="card-elevated p-5 space-y-4">
            <h3 className="font-bold">إعداد التنفيذ (غرفة العمليات)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>الإقليم</Label>
                <Select value={mission.region ?? ""} onValueChange={(v) => updateMission({ region: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{Object.entries(REGIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>نوع المهمة</Label>
                <Select value={mission.mission_type ?? ""} onValueChange={(v) => updateMission({ mission_type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{Object.entries(MISSION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {mission.mission_type === "external" && (
                <div className="space-y-1.5"><Label>المواصلات</Label>
                  <Select value={mission.transport_mode ?? ""} onValueChange={(v) => updateMission({ transport_mode: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{Object.entries(TRANSPORT_MODES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {mission.mission_type === "external" && mission.transport_mode === "driver" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>السائقون والعربيات</Label>
                  <Button size="sm" variant="outline" onClick={addDriver}><Plus className="w-4 h-4 ms-1" />إضافة سائق</Button></div>
                {drivers.map((d) => (
                  <div key={d.id} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-6" placeholder="اسم السائق" defaultValue={d.driver_name} onBlur={(e) => updateDriver(d.id, { driver_name: e.target.value })} />
                    <Input className="col-span-5" placeholder="رقم العربية" defaultValue={d.vehicle_number ?? ""} onBlur={(e) => updateDriver(d.id, { vehicle_number: e.target.value })} dir="ltr" />
                    <Button size="icon" variant="ghost" onClick={() => delDriver(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}

            {mission.mission_type === "external" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>خط السير</Label>
                  <Button size="sm" variant="outline" onClick={addRoute}><Plus className="w-4 h-4 ms-1" />نقطة مرور</Button></div>
                {routes.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-7" placeholder="المكان" defaultValue={r.place} onBlur={(e) => updateRoute(r.id, { place: e.target.value })} />
                    <Input className="col-span-4" type="datetime-local" defaultValue={r.route_time?.slice(0, 16) ?? ""} onBlur={(e) => updateRoute(r.id, { route_time: e.target.value || null })} />
                    <Button size="icon" variant="ghost" onClick={() => delRoute(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* Ops box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
              <div className="space-y-1.5"><Label>المشرف</Label><Input value={mission.supervisor ?? ""} onChange={(e) => updateMission({ supervisor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>القائم بتعبئة الاستمارة</Label><Input value={mission.filler_volunteer ?? ""} onChange={(e) => updateMission({ filler_volunteer: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>القائم بمراجعة الاستمارة</Label><Input value={mission.reviewer_volunteer ?? ""} onChange={(e) => updateMission({ reviewer_volunteer: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>المشرف المراجع</Label><Input value={mission.reviewing_supervisor ?? ""} onChange={(e) => updateMission({ reviewing_supervisor: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>المتطوع المستكمل للاستمارة</Label><Input value={mission.completing_volunteer ?? ""} onChange={(e) => updateMission({ completing_volunteer: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>الجوكر</Label><Input value={mission.joker_name ?? ""} onChange={(e) => updateMission({ joker_name: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>مصدر البيانات</Label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {Object.entries(DATA_SOURCES).map(([k, v]) => {
                    const sources: string[] = mission.data_sources ?? [];
                    const has = sources.includes(k);
                    return (
                      <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={has} onCheckedChange={() => updateMission({ data_sources: has ? sources.filter((x) => x !== k) : [...sources, k] })} />
                        {v}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Volunteers */}
        <Card className="card-elevated p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">المتطوعون</h3>
            {canEdit && (
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary"><Search className="w-4 h-4 ms-1" />إضافة من القاعدة</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>اختيار متطوع من قاعدة البيانات</DialogTitle></DialogHeader>
                    <VolunteerPicker onSelect={(v) => addVolFromDB(v)} className="mt-4" />
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="outline" onClick={addVol}><Plus className="w-4 h-4 ms-1" />متطوع جديد</Button>
              </div>
            )}
          </div>
          {volunteers.filter((v) => !v.removed).length === 0 && <p className="text-sm text-muted-foreground">لا يوجد متطوعون</p>}
          {volunteers.filter((v) => !v.removed).map((v) => (
            <Card key={v.id} className="p-3 space-y-2 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <Input className="md:col-span-3" defaultValue={v.full_name} onBlur={(e) => updateVol(v.id, { full_name: e.target.value })} placeholder="الاسم" />
                <Input className="md:col-span-2" defaultValue={v.membership_number ?? ""} onBlur={(e) => updateVol(v.id, { membership_number: e.target.value })} placeholder="رقم العضوية" dir="ltr" />
                <Input className="md:col-span-2" defaultValue={v.branch ?? ""} onBlur={(e) => updateVol(v.id, { branch: e.target.value })} placeholder="الفرع" />
                <Input className="md:col-span-2" type="datetime-local" defaultValue={v.arrival_time?.slice(0, 16) ?? ""} onBlur={(e) => updateVol(v.id, { arrival_time: e.target.value || null })} />
                <Input className="md:col-span-2" type="datetime-local" defaultValue={v.departure_time?.slice(0, 16) ?? ""} onBlur={(e) => updateVol(v.id, { departure_time: e.target.value || null })} />
                <Button size="icon" variant="ghost" onClick={() => removeVol(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                <div className="text-muted-foreground">الساعات: <strong className="text-foreground">{v.hours ? Number(v.hours).toFixed(2) : "—"}</strong></div>
                {isYouth && (
                  <div className="space-y-1"><Label className="text-xs">النقاط</Label>
                    <Select value={String(v.points ?? "")} onValueChange={(val) => updateVol(v.id, { points: Number(val) })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{POINTS_OPTIONS.map((p) => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1"><Label className="text-xs">سبب التغيير</Label>
                  <Select value={v.change_reason ?? ""} onValueChange={(val) => updateVol(v.id, { change_reason: val })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{Object.entries(VOLUNTEER_CHANGE_REASONS).map(([k, vv]) => <SelectItem key={k} value={k}>{vv}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {isYouth && (
                  <div className="space-y-1"><Label className="text-xs">ملاحظة</Label>
                    <Select value="" onValueChange={async (val) => {
                      await supabase.from("volunteer_notes").insert({ mission_id: mission.id, volunteer_id: v.id, note_type: val as any });
                      load(); toast.success("تمت إضافة الملاحظة");
                    }}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="إضافة ملاحظة" /></SelectTrigger>
                      <SelectContent>{Object.entries(VOLUNTEER_NOTE_TYPES).map(([k, vv]) => <SelectItem key={k} value={k}>{vv}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {notes.filter((n) => n.volunteer_id === v.id).length > 0 && (
                <div className="text-xs space-y-0.5 pt-1">
                  {notes.filter((n) => n.volunteer_id === v.id).map((n) => (
                    <div key={n.id} className="text-warning">• {VOLUNTEER_NOTE_TYPES[n.note_type as keyof typeof VOLUNTEER_NOTE_TYPES] ?? n.note_type}</div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </Card>

        {/* Youth box */}
        {!mission.is_open_mission && isYouth && (
          <Card className="card-elevated p-5 space-y-4">
            <h3 className="font-bold">صندوق غرفة الشباب</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>اسم الراصد</Label><Input value={mission.monitor_name ?? ""} onChange={(e) => updateMission({ monitor_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>اسم المراجع</Label><Input value={mission.youth_reviewer ?? ""} onChange={(e) => updateMission({ youth_reviewer: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>ملاحظات</Label><Textarea rows={3} value={mission.youth_notes ?? ""} onChange={(e) => updateMission({ youth_notes: e.target.value })} /></div>
            </div>
          </Card>
        )}

        {/* Workflow progress */}
        {!mission.is_open_mission && <WorkflowProgress status={mission.status} />}

        {/* Actions — gated by current mission status so each role sees only its valid next step */}
        {!mission.is_open_mission && (
          <Card className="card-elevated p-5">
            <div className="flex flex-wrap gap-2 justify-end">
              {canEdit && mission.status !== "monitored" && (
                <Button variant="outline" onClick={() => save()} disabled={busy}><Save className="w-4 h-4 ms-2" />حفظ</Button>
              )}
              {isOps && mission.status === "coded" && (
                <Button onClick={() => transition("entered", "تم مراجعة العمليات - أُرسلت للجوكر")} disabled={busy}><Send className="w-4 h-4 ms-2" />إرسال للجوكر</Button>
              )}
              {isJoker && mission.status === "entered" && (
                <Button onClick={() => transition("reviewed", "تم مراجعة الجوكر - أُرسلت للشباب")} disabled={busy}><Send className="w-4 h-4 ms-2" />إرسال لغرفة الشباب</Button>
              )}
              {isYouth && mission.status === "reviewed" && (
                <Button onClick={() => transition("sent_to_youth", "تم مراجعة الشباب - أُرسلت للمشرف")} disabled={busy}><Send className="w-4 h-4 ms-2" />إرسال للمشرف</Button>
              )}
              {isSup && mission.status === "sent_to_youth" && (
                <Button onClick={() => transition("monitored", "تم اعتماد الاستمارة")} disabled={busy}><Send className="w-4 h-4 ms-2" />اعتماد الاستمارة</Button>
              )}
            </div>
          </Card>
        )}

        {/* Workflow timeline */}
        {!mission.is_open_mission && (
          <Card className="card-elevated p-5">
            <h3 className="font-bold mb-3">سير العمل</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>الإنشاء: {new Date(mission.created_at).toLocaleString("ar-EG")}</div>
              {mission.submitted_at && <div>الإرسال: {new Date(mission.submitted_at).toLocaleString("ar-EG")}</div>}
              {mission.ops_entered_at && <div>الإدخال: {new Date(mission.ops_entered_at).toLocaleString("ar-EG")}</div>}
              {mission.reviewed_at && <div>المراجعة: {new Date(mission.reviewed_at).toLocaleString("ar-EG")}</div>}
              {mission.sent_to_youth_at && <div>إرسال للشباب: {new Date(mission.sent_to_youth_at).toLocaleString("ar-EG")}</div>}
              {mission.sent_to_supervisor_at && <div>إرسال للمشرف: {new Date(mission.sent_to_supervisor_at).toLocaleString("ar-EG")}</div>}
              {mission.monitored_at && <div>الرصد: {new Date(mission.monitored_at).toLocaleString("ar-EG")}</div>}
            </div>
          </Card>
        )}

        {/* --- OPEN MISSION DAILY REPORTS --- */}
        {mission.is_open_mission && (
          <div className="space-y-4 pt-4 border-t-2 border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                تقارير المتابعة اليومية
              </h3>
              {/* Close mission button — ops only, mission not yet closed */}
              {isOps && !mission.is_open_mission_closed && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={closeMission}
                  disabled={busy}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  إغلاق المهمة نهائياً
                </Button>
              )}
              {mission.is_open_mission_closed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                  <Lock className="w-4 h-4 text-destructive" />
                  <span>تم إغلاق المهمة في {new Date(mission.monitored_at).toLocaleDateString("ar-EG")}</span>
                </div>
              )}
            </div>

            {dailyReports.map((report) => (
              <DailyReportBox
                key={report.id}
                report={report}
                mission={mission}
                load={load}
                hasRole={hasRole}
              />
            ))}

            {isOps && (!dailyReports.length || dailyReports[dailyReports.length-1].status === 'completed') && !mission.is_open_mission_closed && (
              <div className="flex justify-end pt-2">
                <Button onClick={startNewDay} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <Plus className="w-4 h-4 ms-2" /> بدء تقرير يوم جديد
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const REPORT_STATUS_LABELS: Record<string, string> = {
  pending_ops: "عند العمليات",
  pending_joker: "مراجعة الجوكر",
  pending_youth: "مراجعة الشباب",
  completed: "مكتمل",
};

function DailyReportBox({ report, mission, load, hasRole }: any) {
  const [notes, setNotes] = useState({
    ops: report.ops_notes || "",
    joker: report.joker_notes || "",
    youth: report.youth_notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [execExpanded, setExecExpanded] = useState(false);
  const [youthExpanded, setYouthExpanded] = useState(
    report.status === 'pending_youth' || report.status === 'completed'
  );

  // Strict role checks — no role inflation via admin for button visibility
  const canSendToJoker = hasRole("operations_room") || hasRole("operations_supervisor");
  const canSendToYouth = hasRole("joker");
  const canComplete   = hasRole("youth_room");
  const isAdmin       = hasRole("admin");

  const isOpsUser  = canSendToJoker || isAdmin;
  const isJokerUser = canSendToYouth || isAdmin;
  const isYouthUser = canComplete || isAdmin;

  const update = async (patch: any) => {
    setBusy(true);
    await supabase.from("mission_daily_reports").update(patch).eq("id", report.id);
    await load();
    setBusy(false);
  };

  const transition = async (status: string) => {
    const patch: any = { status };
    if (status === 'pending_joker') {
      patch.ops_notes = notes.ops;
      patch.ops_closed_at = new Date().toISOString();
      // Auto-snapshot the mission's current execution fields into this report
      patch.execution_data = {
        region: mission?.region,
        mission_type: mission?.mission_type,
        supervisor: mission?.supervisor,
        filler_volunteer: mission?.filler_volunteer,
        reviewer_volunteer: mission?.reviewer_volunteer,
        reviewing_supervisor: mission?.reviewing_supervisor,
        completing_volunteer: mission?.completing_volunteer,
        joker_name: mission?.joker_name,
        data_sources: mission?.data_sources,
      };
    }
    if (status === 'pending_youth') {
      patch.joker_notes = notes.joker;
      patch.joker_reviewed_at = new Date().toISOString();
    }
    if (status === 'completed') {
      patch.youth_notes = notes.youth;
      patch.youth_reviewed_at = new Date().toISOString();
    }
    await update(patch);
  };

  const execLabels: Record<string, string> = {
    region: "الإقليم", mission_type: "نوع المهمة", supervisor: "المشرف",
    filler_volunteer: "القائم بالتعبئة", reviewer_volunteer: "القائم بالمراجعة",
    reviewing_supervisor: "المشرف المراجع", completing_volunteer: "المتطوع المستكمل",
    joker_name: "الجوكر", data_sources: "مصدر البيانات",
  };
  const execData: Record<string, any> = report.execution_data || {};
  const hasExecData = Object.values(execData).some(v => v);

  return (
    <Card className="border border-primary/20 shadow-sm bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h4 className="font-bold text-primary">
          تقرير اليوم ({report.day_number}) —{" "}
          <span className="font-mono text-muted-foreground font-normal text-sm">{report.report_date}</span>
        </h4>
        <div className="px-2.5 py-1 rounded-full bg-muted text-xs font-bold">
          {REPORT_STATUS_LABELS[report.status] || report.status}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* ── Saved execution snapshot (collapsible, read-only, only after sent) ── */}
        {report.status !== 'pending_ops' && hasExecData && (
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-bold"
              onClick={() => setExecExpanded(!execExpanded)}
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                بيانات التنفيذ (محفوظة)
              </span>
              {execExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {execExpanded && (
              <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(execLabels).map(([key, label]) =>
                  execData[key] ? (
                    <div key={key} className="space-y-0.5">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <div className="text-sm font-medium">{Array.isArray(execData[key]) ? execData[key].join("، ") : execData[key]}</div>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Ops notes ── */}
        {(isOpsUser || report.ops_notes) && (
          <div className="bg-background border rounded-lg p-4 space-y-2">
            <Label className="font-bold text-foreground text-sm">ملاحظات العمليات</Label>
            {report.status === 'pending_ops' && isOpsUser ? (
              <Textarea
                rows={2}
                value={notes.ops}
                onChange={(e) => setNotes({ ...notes, ops: e.target.value })}
                placeholder="أدخل ملاحظات العمليات لهذا اليوم..."
              />
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                {report.ops_notes || "لا توجد ملاحظات"}
              </div>
            )}
          </div>
        )}

        {/* ── Joker notes ── */}
        {(isJokerUser && report.status !== 'pending_ops' || report.joker_notes) && (
          <div className="bg-background border rounded-lg p-4 space-y-2 border-r-4 border-r-warning">
            <Label className="font-bold text-foreground text-sm">ملاحظات الجوكر</Label>
            {report.status === 'pending_joker' && isJokerUser ? (
              <Textarea rows={2} value={notes.joker} onChange={(e) => setNotes({ ...notes, joker: e.target.value })} placeholder="أدخل ملاحظات الجوكر..." />
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{report.joker_notes || "لا توجد ملاحظات"}</div>
            )}
          </div>
        )}

        {/* ── Youth notes (collapsible) ── */}
        {(isYouthUser && ['pending_youth','completed'].includes(report.status) || report.youth_notes) && (
          <div className="border rounded-lg overflow-hidden">
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 bg-success/5 hover:bg-success/10 transition-colors text-sm font-bold" onClick={() => setYouthExpanded(!youthExpanded)}>
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success inline-block"></span>ملاحظات غرفة الشباب</span>
              {youthExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {youthExpanded && (
              <div className="p-4 border-t border-r-4 border-r-success">
                {report.status === 'pending_youth' && isYouthUser ? (
                  <Textarea rows={2} value={notes.youth} onChange={(e) => setNotes({ ...notes, youth: e.target.value })} placeholder="أدخل ملاحظات غرفة الشباب..." />
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">{report.youth_notes || "لا توجد ملاحظات"}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Action buttons — based on SPECIFIC role, not inflated admin booleans ── */}
        <div className="flex justify-end pt-1 gap-2">
          {report.status === 'pending_ops' && (canSendToJoker || isAdmin) && (
            <Button onClick={() => transition('pending_joker')} disabled={busy}>
              <Send className="w-4 h-4 ms-2" /> إرسال للجوكر
            </Button>
          )}
          {report.status === 'pending_joker' && (canSendToYouth || isAdmin) && (
            <Button onClick={() => transition('pending_youth')} disabled={busy}>
              <Send className="w-4 h-4 ms-2" /> مراجعة وإرسال للشباب
            </Button>
          )}
          {report.status === 'pending_youth' && (canComplete || isAdmin) && (
            <Button onClick={() => transition('completed')} disabled={busy}>
              <Send className="w-4 h-4 ms-2" /> اعتماد وإنهاء التقرير
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

const WORKFLOW_STEPS: { key: string; label: string }[] = [
  { key: "coded", label: "الفريق" },
  { key: "entered", label: "العمليات" },
  { key: "reviewed", label: "الجوكر" },
  { key: "sent_to_youth", label: "غرفة الشباب" },
  { key: "monitored", label: "اعتماد المشرف" },
];

function WorkflowProgress({ status }: { status: string }) {
  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.key === status);
  return (
    <Card className="card-elevated p-5">
      <h3 className="font-bold mb-4 text-sm">مراحل الاستمارة</h3>
      <div className="flex items-center justify-between gap-1" dir="rtl">
        {WORKFLOW_STEPS.map((step, i) => {
          const done = currentIdx >= i;
          const active = currentIdx === i;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors " +
                    (done
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border") +
                    (active ? " ring-4 ring-primary/20" : "")
                  }
                >
                  {i + 1}
                </div>
                <span className={"text-[11px] text-center " + (done ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className={"h-0.5 flex-1 mx-1 " + (currentIdx > i ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

