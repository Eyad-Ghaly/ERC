import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useDropdownOptions } from "@/hooks/useDropdownOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Send, Save, AlertCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VolunteerPicker, VolunteerData } from "@/components/VolunteerPicker";
import { NON_VOLUNTEER_ROLES } from "@/lib/constants";

// Trigger build to sync Excel feature

interface Volunteer { full_name: string; membership_number: string; branch: string; is_manual?: boolean; }


function FieldSelect({ fieldKey, value, onChange, label }: { fieldKey: string; value: string; onChange: (v: string) => void; label: string }) {
  const { options, loading } = useDropdownOptions(fieldKey);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger><SelectValue placeholder={loading ? "..." : "اختر"} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
          {options.length === 0 && !loading && <div className="p-2 text-sm text-muted-foreground">لا توجد خيارات</div>}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function DepartmentEntry() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const { options: projectCodeTeams } = useDropdownOptions("project_code_teams");

  const teamCode = profile?.team_code || "";
  const [teamId, setTeamId] = useState(profile?.team_id ?? "");
  const [projectCode, setProjectCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [activityClassification, setActivityClassification] = useState("");
  const [activityType, setActivityType] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [typeName, setTypeName] = useState("");
  const [classification, setClassification] = useState("");
  const [classificationName, setClassificationName] = useState("");
  const [organizingEntity, setOrganizingEntity] = useState("");

  const [activityDate, setActivityDate] = useState("");
  const [executionPlace, setExecutionPlace] = useState("");
  const [missionName, setMissionName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [followUpResponsible, setFollowUpResponsible] = useState("");
  const [followUpPhone, setFollowUpPhone] = useState("");
  const [hasBeneficiaries, setHasBeneficiaries] = useState(false);
  const [isOpenMission, setIsOpenMission] = useState(false);
  const [isAutoMissionName, setIsAutoMissionName] = useState(true);

  const [volunteers, setVolunteers] = useState<Volunteer[]>([{ full_name: "", membership_number: "", branch: "", is_manual: false }]);
  const [teamVolunteers, setTeamVolunteers] = useState<any[]>([]);
  const [nonVolunteers, setNonVolunteers] = useState<{ full_name: string; role: string; }[]>([]);
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isLateSubmission = activityDate ? activityDate < today : false;

  useEffect(() => {
    if (teamCode) {
      const fetchTeamVolunteers = async () => {
        const { data } = await supabase
          .from("volunteer_teams")
          .select(`volunteers_base(id, full_name, membership_number, branch)`)
          .eq("team_code", teamCode);
        if (data) {
          setTeamVolunteers(data.map((d: any) => d.volunteers_base).filter(Boolean));
        }
      };
      fetchTeamVolunteers();
    }
  }, [teamCode]);

  useEffect(() => {
    if (profile?.team_id && !id) setTeamId(profile.team_id);
  }, [profile, id]);

  useEffect(() => {
    if (id) {
      const loadMission = async () => {
        setBusy(true);
        const { data: mission } = await supabase.from("missions").select("*").eq("id", id).single();
        if (mission) {
          setTeamId(mission.team_id || "");
          setProjectCode(mission.project_code || "");
          setGovernorate(mission.governorate || "");
          setActivityClassification(mission.activity_classification || "");
          setActivityType(mission.activity_type || "");
          setActivityDetails(mission.activity_details || "");
          setTypeName(mission.type_name || "");
          setClassification(mission.classification || "");
          setClassificationName(mission.classification_name || "");
          setOrganizingEntity(mission.organizing_entity || "");
          setActivityDate(mission.activity_date || "");
          setExecutionPlace(mission.execution_place || "");
          setMissionName(mission.mission_name || "");
          setIsAutoMissionName(false);
          setLatitude(mission.latitude ? String(mission.latitude) : "");
          setLongitude(mission.longitude ? String(mission.longitude) : "");
          setFollowUpResponsible(mission.follow_up_responsible || "");
          setFollowUpPhone(mission.follow_up_phone || "");
          setHasBeneficiaries(mission.has_beneficiaries || false);
          setIsOpenMission(mission.is_open_mission || false);
        }

        const { data: vols } = await supabase.from("mission_volunteers").select("*").eq("mission_id", id).order("created_at");
        if (vols && vols.length > 0) {
          setVolunteers(vols.map((v: any) => ({ full_name: v.full_name, membership_number: v.membership_number || "", branch: v.branch || "", is_manual: v.full_name.includes("(مضاف يدوياً)") })));
        }

        const { data: nonVols } = await supabase.from("mission_non_volunteers").select("*").eq("mission_id", id).order("created_at");
        if (nonVols && nonVols.length > 0) {
          setNonVolunteers(nonVols.map((v: any) => ({ full_name: v.full_name, role: v.role || "" })));
        }

        setBusy(false);
      };
      loadMission();
    }
  }, [id]);

  useEffect(() => {
    if (isAutoMissionName && !id) {
      const parts = [activityClassification, activityType, executionPlace].filter(p => p && p.trim() !== "");
      if (parts.length > 0) {
        setMissionName(parts.join(" - "));
      } else {
        setMissionName("");
      }
    }
  }, [activityClassification, activityType, executionPlace, isAutoMissionName, id]);

  const addVolunteer = () => setVolunteers([...volunteers, { full_name: "", membership_number: "", branch: "", is_manual: false }]);
  const removeVolunteer = (index: number) => setVolunteers(volunteers.filter((_, i) => i !== index));
  const updateVolunteer = (index: number, field: keyof Volunteer, value: any) => {
    const updated = [...volunteers];
    updated[index] = { ...updated[index], [field]: value };
    setVolunteers(updated);
  };

  const addNonVolunteer = () => setNonVolunteers([...nonVolunteers, { full_name: "", role: "" }]);
  const removeNonVolunteer = (index: number) => setNonVolunteers(nonVolunteers.filter((_, i) => i !== index));
  const updateNonVolunteer = (index: number, field: keyof typeof nonVolunteers[0], value: string) => {
    const updated = [...nonVolunteers];
    updated[index] = { ...updated[index], [field]: value };
    setNonVolunteers(updated);
  };

  const submit = async (sendNow: boolean) => {
    if (!user) return;
    if (!teamId) { toast.error("لا يوجد فريق مرتبط بحسابك. تواصل مع المدير."); return; }
    if (!missionName.trim()) { toast.error("أدخل اسم المهمة"); return; }
    if (!activityDate) { toast.error("أدخل تاريخ النشاط"); return; }
    if (!followUpResponsible.trim()) { toast.error("أدخل مسؤول المتابعة"); return; }
    if (!/^\d{11}$/.test(followUpPhone.trim())) { toast.error("رقم تليفون مسؤول المتابعة يجب أن يكون 11 رقماً"); return; }

    setBusy(true);
    try {
      let currentMissionId = id;
      let code = "";

      if (id) {
        // Update existing mission
        const { data: mData } = await supabase.from("missions").select("mission_code").eq("id", id).single();
        code = mData?.mission_code || "";

        const { error: updErr } = await supabase.from("missions").update({
          status: sendNow ? (isOpenMission ? "open_active" : "coded") : "planned",
          project_code: projectCode,
          governorate, department_id: profile?.department_id || null,
          activity_classification: activityClassification,
          activity_type: activityType,
          activity_details: activityDetails,
          type_name: typeName,
          classification, classification_name: classificationName,
          organizing_entity: activityClassification === "تنمية معرفية ومهارية" ? organizingEntity : null,
          activity_date: activityDate,
          execution_place: executionPlace,
          mission_name: missionName,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          follow_up_responsible: followUpResponsible,
          follow_up_phone: followUpPhone,
          has_beneficiaries: hasBeneficiaries,
          is_open_mission: isOpenMission,
          is_late_submission: isLateSubmission,
          submitted_at: sendNow ? new Date().toISOString() : null,
        }).eq("id", id);
        if (updErr) throw updErr;

        // Delete existing volunteers to re-insert
        await supabase.from("mission_volunteers").delete().eq("mission_id", id);
        await supabase.from("mission_non_volunteers").delete().eq("mission_id", id);

      } else {
        // Create new mission
        const { data: generatedCode, error: codeErr } = await supabase.rpc("generate_mission_code", {
          _project_code: projectCode, _team_code: teamCode,
        });
        if (codeErr) throw codeErr;
        code = generatedCode as string;

        const { data: mission, error: insErr } = await supabase.from("missions").insert({
          mission_code: code,
          status: sendNow ? (isOpenMission ? "open_active" : "coded") : "planned",
          created_by: user.id,
          team_id: profile?.team_id || null,
          project_code: projectCode,
          governorate, department_id: profile?.department_id || null,
          activity_classification: activityClassification,
          activity_type: activityType,
          activity_details: activityDetails,
          type_name: typeName,
          classification, classification_name: classificationName,
          organizing_entity: activityClassification === "تنمية معرفية ومهارية" ? organizingEntity : null,
          activity_date: activityDate,
          execution_place: executionPlace,
          mission_name: missionName,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          follow_up_responsible: followUpResponsible,
          follow_up_phone: followUpPhone,
          has_beneficiaries: hasBeneficiaries,
          is_open_mission: isOpenMission,
          is_late_submission: isLateSubmission,
          submitted_at: sendNow ? new Date().toISOString() : null,
        }).select().single();
        if (insErr) throw insErr;
        currentMissionId = mission.id;

        if (isOpenMission) {
          const { error: repErr } = await supabase.from("mission_daily_reports").insert({
            mission_id: mission.id,
            day_number: 1,
            report_date: activityDate,
            status: 'pending_ops'
          });
          if (repErr) throw repErr;
        }
      }

      const validVols = volunteers.filter((v) => v.full_name.trim());
      if (validVols.length > 0) {
        const { error: volErr } = await supabase.from("mission_volunteers").insert(
          validVols.map((v) => ({ 
            mission_id: currentMissionId, 
            full_name: v.is_manual ? `${v.full_name} (مضاف يدوياً)` : v.full_name, 
            membership_number: v.membership_number, 
            branch: v.branch 
          }))
        );
        if (volErr) throw volErr;
      }

      const validNonVols = nonVolunteers.filter((v) => v.full_name.trim());
      if (validNonVols.length > 0) {
        const { error: nErr } = await supabase.from("mission_non_volunteers").insert(
          validNonVols.map((v) => ({ mission_id: currentMissionId, full_name: v.full_name, role: v.role }))
        );
        if (nErr) throw nErr;
      }

      toast.success(sendNow ? `تم إرسال المهمة بكود ${code}` : `تم حفظ المهمة بكود ${code}`);
      navigate(`/missions/${currentMissionId}`);
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout title={id ? "تعديل المهمة" : "إدخال مهمة جديدة"}>
      <div className="space-y-6 max-w-5xl">


        {!profile?.team_id && (
          <Card className="p-4 border-warning/50 bg-warning/10 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div className="text-sm">
              <strong>تنبيه:</strong> لم يتم تعيين كود فريق لحسابك. يرجى التواصل مع المدير لتعيين كود الفريق قبل إنشاء مهمة.
            </div>
          </Card>
        )}

        <Card className="card-elevated p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>كود الفريق (ثابت)</Label>
              <Input value={teamCode} disabled className="bg-muted font-mono" dir="ltr" />
            </div>
            <FieldSelect fieldKey="governorate" value={governorate} onChange={setGovernorate} label="محافظة التنفيذ" />
            <FieldSelect fieldKey="activity_classification" value={activityClassification} onChange={setActivityClassification} label="تصنيف النشاط" />
            <FieldSelect fieldKey="activity_type" value={activityType} onChange={setActivityType} label="نوع النشاط" />
            {activityClassification === "تنمية معرفية ومهارية" && (
              <div className="space-y-1.5 md:col-span-3">
                <Label>الجهة المنظمة</Label>
                <Input value={organizingEntity} onChange={(e) => setOrganizingEntity(e.target.value)} />
              </div>
            )}
            <FieldSelect fieldKey="activity_details" value={activityDetails} onChange={setActivityDetails} label="تفاصيل النشاط" />
            <FieldSelect fieldKey="type_name" value={typeName} onChange={setTypeName} label="اسم النوع" />
            <FieldSelect fieldKey="classification" value={classification} onChange={setClassification} label="التصنيف" />
            <FieldSelect fieldKey="classification_name" value={classificationName} onChange={setClassificationName} label="اسم التصنيف" />
          </div>
        </Card>

        <Card className="card-elevated p-6 space-y-5">
          <h3 className="font-bold">تفاصيل المهمة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>تاريخ النشاط *</Label>
              <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
              {isLateSubmission && (
                <p className="text-xs text-destructive font-bold flex items-center mt-1">
                  <AlertCircle className="w-3 h-3 ms-1" />
                  تنبيه: سيتم تسجيل ملاحظة تأخير على هذه المهمة لتسجيلها بتاريخ قديم
                </p>
              )}
            </div>
            <div className="space-y-1.5"><Label>مكان التنفيذ</Label><Input value={executionPlace} onChange={(e) => setExecutionPlace(e.target.value)} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>اسم المهمة بالتفصيل *</Label><Textarea rows={2} value={missionName} onChange={(e) => { setMissionName(e.target.value); setIsAutoMissionName(false); }} /></div>
            <div className="space-y-1.5"><Label>مسؤول المتابعة *</Label><Input value={followUpResponsible} onChange={(e) => setFollowUpResponsible(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>رقم تليفون مسؤول المتابعة *</Label><Input value={followUpPhone} onChange={(e) => setFollowUpPhone(e.target.value)} dir="ltr" maxLength={11} placeholder="01X XXXX XXXX" /></div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>هل طبيعة المهمة بها مستفيدين؟</Label>
              <Select value={hasBeneficiaries ? "true" : "false"} onValueChange={(v) => setHasBeneficiaries(v === "true")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">لا</SelectItem>
                  <SelectItem value="true">نعم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-primary font-bold">هل هذه مهمة مفتوحة؟ (ممتدة لعدة أيام)</Label>
              <Select value={isOpenMission ? "true" : "false"} onValueChange={(v) => setIsOpenMission(v === "true")}>
                <SelectTrigger className="border-primary/50 bg-primary/5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">لا (مهمة يوم واحد)</SelectItem>
                  <SelectItem value="true">نعم (مهمة مفتوحة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {projectCodeTeams.some(o => o.value === teamCode) && (
              <div className="md:col-span-2 pt-2 border-t border-border mt-2">
                <FieldSelect fieldKey="project_code" value={projectCode} onChange={setProjectCode} label="كود المشروع" />
              </div>
            )}
          </div>
        </Card>

        <Card className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">المتطوعون</h3>
            <Button size="sm" variant="outline" onClick={addVolunteer}><Plus className="w-4 h-4 ms-1" />إضافة متطوع آخر</Button>
          </div>
          {volunteers.map((v, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border">
              <div className="md:col-span-5 space-y-1">
                <Label className="text-xs">الاسم</Label>
                {v.is_manual ? (
                  <Input value={v.full_name} onChange={(e) => updateVolunteer(i, "full_name", e.target.value)} placeholder="اسم المتطوع" />
                ) : (
                  <Select 
                    value={v.full_name} 
                    onValueChange={(val) => {
                      const tv = teamVolunteers.find(x => x.full_name === val);
                      if (tv) {
                        updateVolunteer(i, "full_name", tv.full_name);
                        updateVolunteer(i, "membership_number", tv.membership_number || "");
                        updateVolunteer(i, "branch", tv.branch || "");
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر من متطوعي الفريق" /></SelectTrigger>
                    <SelectContent>
                      {teamVolunteers.map(tv => (
                        <SelectItem key={tv.id} value={tv.full_name}>
                          {tv.full_name} {tv.membership_number ? `(${tv.membership_number})` : ''}
                        </SelectItem>
                      ))}
                      {teamVolunteers.length === 0 && <div className="p-2 text-sm text-muted-foreground">لا يوجد متطوعين في فريقك</div>}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="md:col-span-3 space-y-1"><Label className="text-xs">رقم العضوية</Label><Input value={v.membership_number} onChange={(e) => updateVolunteer(i, "membership_number", e.target.value)} dir="ltr" disabled={!v.is_manual} /></div>
              <div className="md:col-span-3 space-y-1"><Label className="text-xs">الفرع</Label><Input value={v.branch} onChange={(e) => updateVolunteer(i, "branch", e.target.value)} disabled={!v.is_manual} /></div>
              <div className="md:col-span-1 flex flex-col gap-1 items-center justify-end">
                <Button size="icon" variant="ghost" onClick={() => removeVolunteer(i)} disabled={volunteers.length === 1} className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                {!v.is_manual && (
                  <Button size="sm" variant="link" className="text-[10px] p-0 h-auto" onClick={() => updateVolunteer(i, "is_manual", true)}>إضافة يدوي</Button>
                )}
              </div>
            </div>
          ))}
        </Card>

        <Card className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">المشاركين الغير متطوعين</h3>
            <Button size="sm" variant="outline" onClick={addNonVolunteer}><Plus className="w-4 h-4 ms-1" />إضافة مشارك</Button>
          </div>
          {nonVolunteers.map((v, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border">
              <div className="md:col-span-6 space-y-1">
                <Label className="text-xs">الاسم</Label>
                <Input value={v.full_name} onChange={(e) => updateNonVolunteer(i, "full_name", e.target.value)} placeholder="الاسم" />
              </div>
              <div className="md:col-span-5 space-y-1">
                <Label className="text-xs">الصفة</Label>
                <Select value={v.role} onValueChange={(val) => updateNonVolunteer(i, "role", val)}>
                  <SelectTrigger><SelectValue placeholder="اختر الصفة" /></SelectTrigger>
                  <SelectContent>
                    {NON_VOLUNTEER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1 flex flex-col gap-1 items-center justify-end">
                <Button size="icon" variant="ghost" onClick={() => removeNonVolunteer(i)} className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {nonVolunteers.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد مشاركين</p>}
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => submit(false)} disabled={busy}><Save className="w-4 h-4 ms-2" />حفظ</Button>
          <Button onClick={() => submit(true)} disabled={busy}><Send className="w-4 h-4 ms-2" />إرسال</Button>
        </div>
      </div>
    </AppLayout>
  );
}
