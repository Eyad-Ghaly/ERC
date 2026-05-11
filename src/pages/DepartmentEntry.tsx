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
import { Plus, Trash2, Send, Save, AlertCircle, FileUp, Loader2, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VolunteerPicker, VolunteerData } from "@/components/VolunteerPicker";

// Trigger build to sync Excel feature

interface Volunteer { full_name: string; membership_number: string; branch: string; }

const HEADER_MAP: Record<string, string> = {
  "كود المشروع": "projectCode",
  "كود الإدارة": "adminCode",
  "محافظة التنفيذ": "governorate",
  "تصنيف النشاط": "activityClassification",
  "نوع النشاط": "activityType",
  "تفاصيل النشاط": "activityDetails",
  "طبيعة المهمة": "missionNature",
  "اسم النوع": "typeName",
  "التصنيف": "classification",
  "اسم التصنيف": "classificationName",
  "تاريخ النشاط": "activityDate",
  "مكان التنفيذ": "executionPlace",
  "اسم المهمة بالتفصيل": "missionName",
  "اسم المهمة": "missionName",
  "خط العرض": "latitude",
  "خط الطول": "longitude",
  "مسؤول المتابعة": "followUpResponsible",
  "رقم تليفون مسؤول المتابعة": "followUpPhone",
  "هل بها مستفيدين": "hasBeneficiaries",
  "هل المهمة مفتوحة": "isOpenMission",
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { options: projectCodeTeams } = useDropdownOptions("project_code_teams");

  const [teamCode, setTeamCode] = useState(profile?.team_code ?? "");
  const [projectCode, setProjectCode] = useState("");
  const [governorate, setGovernorate] = useState("");
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
  const [isAutoMissionName, setIsAutoMissionName] = useState(true);

  const [volunteers, setVolunteers] = useState<Volunteer[]>([{ full_name: "", membership_number: "", branch: "" }]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
          setIsAutoMissionName(false);
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

  useEffect(() => {
    if (isAutoMissionName && !id && !uploading) {
      const parts = [activityClassification, activityType, executionPlace].filter(p => p && p.trim() !== "");
      if (parts.length > 0) {
        setMissionName(parts.join(" - "));
      } else {
        setMissionName("");
      }
    }
  }, [activityClassification, activityType, executionPlace, isAutoMissionName, id, uploading]);

  const addVolunteer = () => setVolunteers((v) => [...v, { full_name: "", membership_number: "", branch: "" }]);
  const removeVolunteer = (i: number) => setVolunteers((v) => v.filter((_, idx) => idx !== i));
  const updateVolunteer = (i: number, key: keyof Volunteer, val: string) =>
    setVolunteers((v) => v.map((x, idx) => (idx === i ? { ...x, [key]: val } : x)));

  const handlePickVolunteer = (v: VolunteerData) => {
    // Check if empty row exists, update it, else append
    const emptyIdx = volunteers.findIndex(row => !row.full_name && !row.membership_number);
    const newVol = { full_name: v.full_name, membership_number: v.membership_number || "", branch: v.branch || "" };

    if (emptyIdx >= 0) {
      setVolunteers(prev => prev.map((row, i) => i === emptyIdx ? newVol : row));
    } else {
      setVolunteers(prev => [...prev, newVol]);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (json.length === 0) {
          toast.error("الملف فارغ");
          return;
        }

        if (json.length === 1) {
          // Fill form for single row
          const row = json[0];
          fillFormFromRow(row);
          toast.success("تم تعبئة البيانات من الملف");
        } else {
          // Bulk upload for multiple rows
          if (confirm(`هل تريد رفع عدد ${json.length} مهمة دفعة واحدة؟`)) {
            await bulkUploadMissions(json);
          }
        }
      } catch (err: any) {
        toast.error("فشل قراءة الملف: " + err.message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const fillFormFromRow = (row: any) => {
    const mapped: any = {};
    Object.entries(row).forEach(([key, val]) => {
      const field = HEADER_MAP[key] || key;
      mapped[field] = val;
    });

    if (mapped.projectCode) setProjectCode(String(mapped.projectCode));
    if (mapped.governorate) setGovernorate(String(mapped.governorate));
    if (mapped.activityClassification) setActivityClassification(String(mapped.activityClassification));
    if (mapped.activityType) setActivityType(String(mapped.activityType));
    if (mapped.activityDetails) setActivityDetails(String(mapped.activityDetails));
    if (mapped.missionNature) setMissionNature(String(mapped.missionNature));
    if (mapped.typeName) setTypeName(String(mapped.typeName));
    if (mapped.classification) setClassification(String(mapped.classification));
    if (mapped.classificationName) setClassificationName(String(mapped.classificationName));
    if (mapped.activityDate) {
      // Handle Excel date format
      let d = mapped.activityDate;
      if (typeof d === "number") {
        const date = XLSX.SSF.parse_date_code(d);
        d = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      setActivityDate(String(d));
    }
    if (mapped.executionPlace) setExecutionPlace(String(mapped.executionPlace));
    if (mapped.missionName) {
      setMissionName(String(mapped.missionName));
      setIsAutoMissionName(false);
    }
    if (mapped.latitude) setLatitude(String(mapped.latitude));
    if (mapped.longitude) setLongitude(String(mapped.longitude));
    if (mapped.followUpResponsible) setFollowUpResponsible(String(mapped.followUpResponsible));
    if (mapped.followUpPhone) setFollowUpPhone(String(mapped.followUpPhone));
    if (mapped.hasBeneficiaries !== undefined) {
      const val = String(mapped.hasBeneficiaries).toLowerCase();
      setHasBeneficiaries(val === "true" || val === "نعم" || val === "1");
    }
    if (mapped.isOpenMission !== undefined) {
      const val = String(mapped.isOpenMission).toLowerCase();
      setIsOpenMission(val === "true" || val === "نعم" || val === "1");
    }
  };

  const bulkUploadMissions = async (rows: any[]) => {
    if (!user || !teamCode) return;

    setBusy(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of rows) {
      const mapped: any = {};
      Object.entries(row).forEach(([key, val]) => {
        const field = HEADER_MAP[key] || key;
        mapped[field] = val;
      });

      try {
        const pCode = String(mapped.projectCode || "");
        if (!pCode) throw new Error("كود المشروع مفقود");

        const { data: generatedCode, error: codeErr } = await supabase.rpc("generate_mission_code", {
          _project_code: pCode, _team_code: teamCode,
        });
        if (codeErr) throw codeErr;

        let actDate = mapped.activityDate;
        if (typeof actDate === "number") {
          const date = XLSX.SSF.parse_date_code(actDate);
          actDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }

        const hasBen = String(mapped.hasBeneficiaries || "").toLowerCase();
        const isOpen = String(mapped.isOpenMission || "").toLowerCase();

        const { error: insErr } = await supabase.from("missions").insert({
          mission_code: generatedCode as string,
          status: "planned",
          created_by: user.id,
          team_code: teamCode,
          project_code: pCode,
          governorate: mapped.governorate ? String(mapped.governorate) : null,
          admin_code: mapped.adminCode ? String(mapped.adminCode) : (profile?.department_code || null),
          activity_classification: mapped.activityClassification ? String(mapped.activityClassification) : null,
          activity_type: mapped.activityType ? String(mapped.activityType) : null,
          activity_details: mapped.activityDetails ? String(mapped.activityDetails) : null,
          mission_nature: mapped.missionNature ? String(mapped.missionNature) : null,
          type_name: mapped.typeName ? String(mapped.typeName) : null,
          classification: mapped.classification ? String(mapped.classification) : null,
          classification_name: mapped.classificationName ? String(mapped.classificationName) : null,
          activity_date: actDate ? String(actDate) : new Date().toISOString().split('T')[0],
          execution_place: mapped.executionPlace ? String(mapped.executionPlace) : null,
          mission_name: mapped.missionName ? String(mapped.missionName) : "مهمة مستوردة",
          latitude: mapped.latitude ? Number(mapped.latitude) : null,
          longitude: mapped.longitude ? Number(mapped.longitude) : null,
          follow_up_responsible: mapped.followUpResponsible ? String(mapped.followUpResponsible) : null,
          follow_up_phone: mapped.followUpPhone ? String(mapped.followUpPhone) : null,
          has_beneficiaries: hasBen === "true" || hasBen === "نعم" || hasBen === "1",
          is_open_mission: isOpen === "true" || isOpen === "نعم" || isOpen === "1",
        });

        if (insErr) throw insErr;
        successCount++;
      } catch (err) {
        console.error("Row failed:", err, row);
        failCount++;
      }
    }

    setBusy(false);
    toast.success(`تم رفع ${successCount} مهمة بنجاح. فشل ${failCount} مهمة.`);
    if (successCount > 0) navigate("/department-dashboard");
  };

  const submit = async (sendNow: boolean) => {
    if (!user) return;
    if (!teamCode) { toast.error("لا يوجد كود فريق مرتبط بحسابك. تواصل مع المدير."); return; }
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
          governorate, admin_code: profile?.department_code || null,
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
          governorate, admin_code: profile?.department_code || null,
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
        {!id && (
          <Card className="p-4 border-dashed border-primary/40 bg-primary/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-primary">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">إدخال سريع من إكسيل</p>
                <p className="text-xs text-muted-foreground">يمكنك رفع ملف إكسيل لتعبئة البيانات تلقائياً</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || busy}
                className="gradient-primary shadow-lg shadow-primary/20"
              >
                {uploading ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <Plus className="w-4 h-4 ms-2" />}
                تحميل البيانات الآن
              </Button>
            </div>
          </Card>
        )}

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
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary"><Search className="w-4 h-4 ms-1" />إضافة من القاعدة</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>اختيار متطوع من قاعدة البيانات</DialogTitle></DialogHeader>
                  <VolunteerPicker onSelect={handlePickVolunteer} className="mt-4" />
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={addVolunteer}><Plus className="w-4 h-4 ms-1" />متطوع جديد</Button>
            </div>
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
