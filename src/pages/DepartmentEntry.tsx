import { useEffect, useState } from "react";
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
import { Plus, Trash2, Send, Save, AlertCircle } from "lucide-react";

interface Volunteer { full_name: string; membership_number: string; branch: string; }

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

  const [teamCode, setTeamCode] = useState(profile?.team_code ?? "");
  const [projectCode, setProjectCode] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [activityClassification, setActivityClassification] = useState("");
  const [activityType, setActivityType] = useState("");
  const [activityDetails, setActivityDetails] = useState("");
  const [missionNature, setMissionNature] = useState("");
  const [typeName, setTypeName] = useState("");
  const [classification, setClassification] = useState("");
  const [classificationName, setClassificationName] = useState("");

  const [activityDate, setActivityDate] = useState("");
  const [executionPlace, setExecutionPlace] = useState("");
  const [missionName, setMissionName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [followUpResponsible, setFollowUpResponsible] = useState("");
  const [followUpPhone, setFollowUpPhone] = useState("");
  const [hasBeneficiaries, setHasBeneficiaries] = useState(false);
  const [isOpenMission, setIsOpenMission] = useState(false);

  const [volunteers, setVolunteers] = useState<Volunteer[]>([{ full_name: "", membership_number: "", branch: "" }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { 
    if (profile?.team_code && !id) setTeamCode(profile.team_code); 
  }, [profile, id]);

  useEffect(() => {
    if (id) {
      const loadMission = async () => {
        setBusy(true);
        const { data: mission } = await supabase.from("missions").select("*").eq("id", id).single();
        if (mission) {
          setTeamCode(mission.team_code || "");
          setProjectCode(mission.project_code || "");
          setGovernorate(mission.governorate || "");
          setAdminCode(mission.admin_code || "");
          setActivityClassification(mission.activity_classification || "");
          setActivityType(mission.activity_type || "");
          setActivityDetails(mission.activity_details || "");
          setMissionNature(mission.mission_nature || "");
          setTypeName(mission.type_name || "");
          setClassification(mission.classification || "");
          setClassificationName(mission.classification_name || "");
          setActivityDate(mission.activity_date || "");
          setExecutionPlace(mission.execution_place || "");
          setMissionName(mission.mission_name || "");
          setLatitude(mission.latitude ? String(mission.latitude) : "");
          setLongitude(mission.longitude ? String(mission.longitude) : "");
          setFollowUpResponsible(mission.follow_up_responsible || "");
          setFollowUpPhone(mission.follow_up_phone || "");
          setHasBeneficiaries(mission.has_beneficiaries || false);
          setIsOpenMission(mission.is_open_mission || false);
        }
        
        const { data: vols } = await supabase.from("mission_volunteers").select("*").eq("mission_id", id);
        if (vols && vols.length > 0) {
          setVolunteers(vols.map(v => ({ full_name: v.full_name || "", membership_number: v.membership_number || "", branch: v.branch || "" })));
        }
        setBusy(false);
      };
      loadMission();
    }
  }, [id]);

  const addVolunteer = () => setVolunteers((v) => [...v, { full_name: "", membership_number: "", branch: "" }]);
  const removeVolunteer = (i: number) => setVolunteers((v) => v.filter((_, idx) => idx !== i));
  const updateVolunteer = (i: number, key: keyof Volunteer, val: string) =>
    setVolunteers((v) => v.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)));

  const submit = async (sendNow: boolean) => {
    if (!user) return;
    if (!teamCode) { toast.error("لا يوجد كود فريق مرتبط بحسابك. تواصل مع المدير."); return; }
    if (!projectCode) { toast.error("اختر كود المشروع"); return; }
    if (!missionName.trim()) { toast.error("أدخل اسم المهمة"); return; }
    if (!activityDate) { toast.error("أدخل تاريخ النشاط"); return; }

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
          governorate, admin_code: adminCode,
          activity_classification: activityClassification,
          activity_type: activityType,
          activity_details: activityDetails,
          mission_nature: missionNature,
          type_name: typeName,
          classification, classification_name: classificationName,
          activity_date: activityDate,
          execution_place: executionPlace,
          mission_name: missionName,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          follow_up_responsible: followUpResponsible,
          follow_up_phone: followUpPhone,
          has_beneficiaries: hasBeneficiaries,
          is_open_mission: isOpenMission,
          submitted_at: sendNow ? new Date().toISOString() : null,
        }).eq("id", id);
        if (updErr) throw updErr;

        // Delete existing volunteers to re-insert
        await supabase.from("mission_volunteers").delete().eq("mission_id", id);

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
          team_code: teamCode,
          project_code: projectCode,
          governorate, admin_code: adminCode,
          activity_classification: activityClassification,
          activity_type: activityType,
          activity_details: activityDetails,
          mission_nature: missionNature,
          type_name: typeName,
          classification, classification_name: classificationName,
          activity_date: activityDate,
          execution_place: executionPlace,
          mission_name: missionName,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          follow_up_responsible: followUpResponsible,
          follow_up_phone: followUpPhone,
          has_beneficiaries: hasBeneficiaries,
          is_open_mission: isOpenMission,
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
          validVols.map((v) => ({ mission_id: currentMissionId, full_name: v.full_name, membership_number: v.membership_number, branch: v.branch }))
        );
        if (volErr) throw volErr;
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
        {!profile?.team_code && (
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
            <FieldSelect fieldKey="project_code" value={projectCode} onChange={setProjectCode} label="كود المشروع *" />
            <FieldSelect fieldKey="admin_code" value={adminCode} onChange={setAdminCode} label="كود الإدارة" />
            <FieldSelect fieldKey="governorate" value={governorate} onChange={setGovernorate} label="محافظة التنفيذ" />
            <FieldSelect fieldKey="activity_classification" value={activityClassification} onChange={setActivityClassification} label="تصنيف النشاط" />
            <FieldSelect fieldKey="activity_type" value={activityType} onChange={setActivityType} label="نوع النشاط" />
            <FieldSelect fieldKey="activity_details" value={activityDetails} onChange={setActivityDetails} label="تفاصيل النشاط" />
            <FieldSelect fieldKey="mission_nature" value={missionNature} onChange={setMissionNature} label="طبيعة المهمة" />
            <FieldSelect fieldKey="type_name" value={typeName} onChange={setTypeName} label="اسم النوع" />
            <FieldSelect fieldKey="classification" value={classification} onChange={setClassification} label="التصنيف" />
            <FieldSelect fieldKey="classification_name" value={classificationName} onChange={setClassificationName} label="اسم التصنيف" />
          </div>
        </Card>

        <Card className="card-elevated p-6 space-y-5">
          <h3 className="font-bold">تفاصيل المهمة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>تاريخ النشاط *</Label><Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>مكان التنفيذ</Label><Input value={executionPlace} onChange={(e) => setExecutionPlace(e.target.value)} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>اسم المهمة بالتفصيل *</Label><Textarea rows={2} value={missionName} onChange={(e) => setMissionName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>خط العرض</Label><Input value={latitude} onChange={(e) => setLatitude(e.target.value)} dir="ltr" placeholder="30.0444" /></div>
            <div className="space-y-1.5"><Label>خط الطول</Label><Input value={longitude} onChange={(e) => setLongitude(e.target.value)} dir="ltr" placeholder="31.2357" /></div>
            <div className="space-y-1.5"><Label>مسؤول المتابعة</Label><Input value={followUpResponsible} onChange={(e) => setFollowUpResponsible(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>رقم تليفون مسؤول المتابعة</Label><Input value={followUpPhone} onChange={(e) => setFollowUpPhone(e.target.value)} dir="ltr" /></div>
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
          </div>
        </Card>

        <Card className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">المتطوعون</h3>
            <Button size="sm" variant="outline" onClick={addVolunteer}><Plus className="w-4 h-4 ms-1" />إضافة متطوع</Button>
          </div>
          {volunteers.map((v, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border">
              <div className="md:col-span-5 space-y-1"><Label className="text-xs">الاسم</Label><Input value={v.full_name} onChange={(e) => updateVolunteer(i, "full_name", e.target.value)} /></div>
              <div className="md:col-span-3 space-y-1"><Label className="text-xs">رقم العضوية</Label><Input value={v.membership_number} onChange={(e) => updateVolunteer(i, "membership_number", e.target.value)} dir="ltr" /></div>
              <div className="md:col-span-3 space-y-1"><Label className="text-xs">الفرع</Label><Input value={v.branch} onChange={(e) => updateVolunteer(i, "branch", e.target.value)} /></div>
              <div className="md:col-span-1"><Button size="icon" variant="ghost" onClick={() => removeVolunteer(i)} disabled={volunteers.length === 1}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
            </div>
          ))}
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => submit(false)} disabled={busy}><Save className="w-4 h-4 ms-2" />حفظ</Button>
          <Button onClick={() => submit(true)} disabled={busy}><Send className="w-4 h-4 ms-2" />إرسال</Button>
        </div>
      </div>
    </AppLayout>
  );
}
