import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Loader2, UploadCloud, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Save, FileSpreadsheet, Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const SYSTEM_FIELDS = [
  { key: "full_name", label: "الاسم بالكامل", required: true },
  { key: "membership_number", label: "رقم العضوية" },
  { key: "branch", label: "الفرع" },
  { key: "phone_number", label: "رقم التليفون" },
  { key: "national_id", label: "الرقم القومي / الجواز" },
  { key: "gender", label: "النوع / الجنس" },
  { key: "education_status", label: "المؤهل / الحالة التعليمية" },
  { key: "join_date", label: "تاريخ الانضمام" },
];

interface SmartVolunteersUploaderProps {
  teamId?: string;
  teamCode?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function SmartVolunteersUploader({ teamId, teamCode, onSuccess, trigger }: SmartVolunteersUploaderProps) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Teams selection state
  const [targetTeamId, setTargetTeamId] = useState<string>(teamId || profile?.team_id || "");
  const [teamsList, setTeamsList] = useState<{ id: string; code: string; name?: string }[]>([]);

  // Excel data & mapping
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState({ added: 0, updated: 0, errors: 0 });

  // Update targetTeamId when prop changes
  useEffect(() => {
    if (teamId) {
      setTargetTeamId(teamId);
    } else if (profile?.team_id) {
      setTargetTeamId(profile.team_id);
    }
  }, [teamId, profile]);

  // Load available teams if not provided
  useEffect(() => {
    if (open) {
      const fetchTeams = async () => {
        const { data } = await supabase.from("teams").select("id, code, name").order("code");
        if (data && data.length > 0) {
          setTeamsList(data);
          if (!targetTeamId) {
            setTargetTeamId(data[0].id);
          }
        } else {
          // If no teams exist, create a default team
          const deptId = profile?.department_id || null;
          if (deptId) {
            const { data: newTeam } = await supabase.from("teams").insert({
              code: profile?.team_code || "P19",
              name: "فريق المتطوعين",
              department_id: deptId
            }).select("id, code, name").single();
            if (newTeam) {
              setTeamsList([newTeam]);
              setTargetTeamId(newTeam.id);
            }
          }
        }
      };
      fetchTeams();
    }
  }, [open, profile]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setExcelData([]);
      setExcelHeaders([]);
      setColumnMapping({});
      setUploadProgress({ current: 0, total: 0 });
      setSummary({ added: 0, updated: 0, errors: 0 });
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!targetTeamId) {
      toast.error("يرجى اختيار الفريق أولاً لربط المتطوعين به");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

        if (json.length === 0) {
          toast.error("الملف فارغ");
          return;
        }

        if (json.length > 5000) {
          toast.error("الحد الأقصى للرفع هو 5000 صف في المرة الواحدة.");
          return;
        }

        const headers = Object.keys(json[0] || {});
        setExcelData(json);
        setExcelHeaders(headers);

        // Auto map columns
        const initialMap: Record<string, string> = {};
        SYSTEM_FIELDS.forEach((sf) => {
          const sfClean = sf.label.replace(/[^أ-يa-zA-Z]/g, "");
          const match = headers.find((h) => {
            const hClean = h.replace(/[^أ-يa-zA-Z]/g, "");
            return (
              hClean === sfClean ||
              hClean.includes(sfClean) ||
              sfClean.includes(hClean) ||
              (sf.key === "full_name" && (h.includes("الاسم") || h.includes("اسم"))) ||
              (sf.key === "membership_number" && (h.includes("عضوية") || h.includes("كود"))) ||
              (sf.key === "phone_number" && (h.includes("تليفون") || h.includes("هاتف") || h.includes("موبايل"))) ||
              (sf.key === "national_id" && (h.includes("قومي") || h.includes("بطاقة") || h.includes("هوية"))) ||
              (sf.key === "branch" && h.includes("فرع")) ||
              (sf.key === "gender" && (h.includes("نوع") || h.includes("جنس"))) ||
              (sf.key === "education_status" && (h.includes("مؤهل") || h.includes("تعليم")))
            );
          });
          if (match) initialMap[sf.key] = match;
        });

        setColumnMapping(initialMap);
        setStep(2);
      } catch (err: any) {
        toast.error("فشل قراءة الملف: " + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStartImport = async () => {
    let activeTeamTarget = targetTeamId;
    if (!activeTeamTarget) {
      if (teamsList.length > 0) {
        activeTeamTarget = teamsList[0].id;
        setTargetTeamId(activeTeamTarget);
      } else {
        const { data: tData } = await supabase.from("teams").select("id").limit(1);
        if (tData && tData.length > 0) {
          activeTeamTarget = tData[0].id;
          setTargetTeamId(activeTeamTarget);
        } else {
          toast.error("الرجاء اختيار الفريق المراد ضم المتطوعين إليه");
          return;
        }
      }
    }

    const nameCol = columnMapping["full_name"];
    if (!nameCol) {
      toast.error("يرجى تحديد العمود الخاص بـ 'الاسم بالكامل'");
      return;
    }

    setStep(4);
    setIsUploading(true);
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let emptyNameCount = 0;

    const total = excelData.length;
    setUploadProgress({ current: 0, total });

    // ── Pre-fetch existing team volunteers once (efficient, avoids per-row DB calls) ──
    const { data: existingTeamVols } = await supabase
      .from("volunteer_teams")
      .select("volunteers_base!inner(id, full_name, membership_number)")
      .eq("team_id", activeTeamTarget);

    // Build a Set of "name__membership" keys for fast lookup
    // If membership_number is null, use name only as the key
    const existingKeys = new Set<string>(
      (existingTeamVols || []).map((t: any) => {
        const v = t.volunteers_base;
        return v?.membership_number
          ? `${v.full_name}__${v.membership_number}`
          : `${v?.full_name}__`;
      })
    );
    // Also build a map from the same key → volunteer id (for linking)
    const existingVolIdMap = new Map<string, string>(
      (existingTeamVols || []).map((t: any) => {
        const v = t.volunteers_base;
        const key = v?.membership_number
          ? `${v.full_name}__${v.membership_number}`
          : `${v?.full_name}__`;
        return [key, v?.id];
      })
    );

    for (let i = 0; i < total; i++) {
      const row = excelData[i];
      const fullName = String(row[nameCol] || "").trim();

      if (!fullName) {
        emptyNameCount++;
        errorCount++;
        console.warn(`[Row ${i + 1}] Skipped: empty name. Row data:`, row);
        setUploadProgress({ current: i + 1, total });
        continue;
      }

      const membershipNumber = columnMapping["membership_number"] ? String(row[columnMapping["membership_number"]] || "").trim() || null : null;
      const branch = columnMapping["branch"] ? String(row[columnMapping["branch"]] || "").trim() || null : null;
      let phone = columnMapping["phone_number"] ? String(row[columnMapping["phone_number"]] || "").trim() || null : null;
      const nationalId = columnMapping["national_id"] ? String(row[columnMapping["national_id"]] || "").trim() || null : null;
      const gender = columnMapping["gender"] ? String(row[columnMapping["gender"]] || "").trim() || null : null;
      const educationStatus = columnMapping["education_status"] ? String(row[columnMapping["education_status"]] || "").trim() || null : null;
      const joinDateStr = columnMapping["join_date"] ? String(row[columnMapping["join_date"]] || "").trim() : "";
      
      const joinDate = joinDateStr || new Date().toISOString().split("T")[0];

      if (phone && phone.length === 10 && !phone.startsWith("0")) {
        phone = "0" + phone;
      }

      try {
        // ── Phase 1: 3-step deduplication ────────────────────────────────────
        // Step 1: Already in THIS team? (in-memory, fast)
        const dupKey = membershipNumber
          ? `${fullName}__${membershipNumber}`
          : `${fullName}__`;

        if (existingKeys.has(dupKey)) {
          updatedCount++;
          setUploadProgress({ current: i + 1, total });
          continue;
        }

        // Step 2: Exists in volunteers_base globally? (name + membership_number)
        // This handles volunteers already in DB but not yet linked to this team.
        let volunteerId: string | null = null;

        if (membershipNumber) {
          const { data: existingInDb } = await supabase
            .from("volunteers_base")
            .select("id")
            .eq("full_name", fullName)
            .eq("membership_number", membershipNumber)
            .maybeSingle();
          if (existingInDb) volunteerId = existingInDb.id;
        }

        // If still not found → Step 3: insert as brand new volunteer
        if (!volunteerId) {
          const { data: newVol, error: insertError } = await supabase
            .from("volunteers_base")
            .insert({
              full_name: fullName,
              membership_number: membershipNumber,
              branch: branch,
              phone_number: phone,
              gender: gender,
              education_status: educationStatus,
            })
            .select("id")
            .single();

          if (insertError || !newVol) {
            console.error(`[Row ${i + 1}] Insert failed for "${fullName}":`, insertError);
            errorCount++;
            setUploadProgress({ current: i + 1, total });
            continue;
          }
          volunteerId = newVol.id;
          addedCount++;
        } else {
          updatedCount++;
        }

        // Add to in-memory set to prevent re-processing same volunteer in same file
        existingKeys.add(dupKey);

        // 3. Link volunteer to team in volunteer_teams
        const { data: existingTeamLink } = await supabase
          .from("volunteer_teams")
          .select("id")
          .eq("volunteer_id", volunteerId)
          .eq("team_id", activeTeamTarget)
          .maybeSingle();

        if (!existingTeamLink) {
          const { error: vtError } = await supabase.from("volunteer_teams").insert({
            volunteer_id: volunteerId,
            team_id: activeTeamTarget,
            join_date: joinDate,
            is_approved: true, // Approve directly since uploaded by leadership
          });

          if (vtError) {
            console.error("Error inserting into volunteer_teams:", vtError);
            toast.error(`فشل ربط المتطوع بالفريق: ${vtError.message}`);
          }
        }
      } catch (err) {
        errorCount++;
      }

      setUploadProgress({ current: i + 1, total });
    }

    setIsUploading(false);
    setSummary({ added: addedCount, updated: updatedCount, errors: errorCount });
    setStep(5);
    toast.success(`تم استيراد ${addedCount + updatedCount} متطوع بنجاح!`);
    if (onSuccess) onSuccess();
  };

  const selectedTeamName = teamsList.find((t) => t.id === targetTeamId)?.code || teamCode || "فريقك الحالي";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gradient-primary shadow-md">
            <FileSpreadsheet className="w-4 h-4 ms-2" />
            رفع متطوعين من إكسيل
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="w-5 h-5" />
            رفع متطوعين من ملف إكسيل
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload File & Select Team */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="bg-muted/40 p-4 rounded-lg border space-y-3">
              <Label className="font-bold text-sm">اختيار الفريق المراد ضم المتطوعين إليه *</Label>
              {teamsList.length > 0 ? (
                <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="اختر الفريق" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamsList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        فريق {t.code} {t.name ? `(${t.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium text-primary">الفريق المحدد: {selectedTeamName}</p>
              )}
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/40 rounded-xl p-8 text-center cursor-pointer hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3"
            >
              <UploadCloud className="w-12 h-12 text-primary animate-bounce" />
              <div>
                <p className="font-bold text-lg">اضغط هنا لاختيار ملف إكسيل</p>
                <p className="text-xs text-muted-foreground mt-1">يدعم ملفات .xlsx, .xls, .csv حتى 5,000 متطوع</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg border border-primary/20">
              <div>
                <p className="font-bold text-primary">مطابقة أعمدة ملف الإكسيل</p>
                <p className="text-xs text-muted-foreground">تم التعرف التلقائي على الأعمدة، يمكنك تعديل المطابقة إذا لزم الأمر.</p>
              </div>
              <Badge variant="outline" className="text-xs bg-background">
                الفريق: {selectedTeamName}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto p-1">
              {SYSTEM_FIELDS.map((sf) => (
                <div key={sf.key} className="flex flex-col gap-1.5 p-3 border rounded-md bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">
                      {sf.label} {sf.required && <span className="text-destructive">*</span>}
                    </Label>
                    {columnMapping[sf.key] ? (
                      <Badge className="bg-success/20 text-success border-success/30 text-[10px]">محدد</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">غير محدد</Badge>
                    )}
                  </div>
                  <Select
                    value={columnMapping[sf.key] || "none"}
                    onValueChange={(val) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [sf.key]: val === "none" ? "" : val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="اختر العمود المعادل..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- بلا --</SelectItem>
                      {excelHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronRight className="w-4 h-4 ms-2" /> رجوع
              </Button>
              <Button onClick={() => setStep(3)} disabled={!columnMapping["full_name"]}>
                التالي: معاينة البيانات <ChevronLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base">معاينة البيانات قبل الحفظ</p>
                <p className="text-xs text-muted-foreground">إجمالي المتطوعين الجاهزين للاستيراد: {excelData.length}</p>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30">الفريق المستهدف: {selectedTeamName}</Badge>
            </div>

            <div className="border rounded-md max-h-[300px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الاسم بالكامل</TableHead>
                    <TableHead>رقم العضوية</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>التليفون</TableHead>
                    <TableHead>الرقم القومي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelData.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{columnMapping["full_name"] ? row[columnMapping["full_name"]] : "—"}</TableCell>
                      <TableCell>{columnMapping["membership_number"] ? row[columnMapping["membership_number"]] : "—"}</TableCell>
                      <TableCell>{columnMapping["branch"] ? row[columnMapping["branch"]] : "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{columnMapping["phone_number"] ? row[columnMapping["phone_number"]] : "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{columnMapping["national_id"] ? row[columnMapping["national_id"]] : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {excelData.length > 10 && (
              <p className="text-center text-xs text-muted-foreground">يظهر أول 10 متطوعين من أصل {excelData.length}</p>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronRight className="w-4 h-4 ms-2" /> تعديل الأعمدة
              </Button>
              <Button onClick={handleStartImport} className="gradient-primary shadow-lg">
                بدء الحفظ والاضافة للفريق الآن <Save className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Progress */}
        {step === 4 && (
          <div className="py-12 text-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <div>
              <p className="font-bold text-lg">جاري استيراد وتوجيه المتطوعين للفريق...</p>
              <p className="text-sm text-muted-foreground mt-1">
                تم معالجة {uploadProgress.current} من أصل {uploadProgress.total} متطوع
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-3 max-w-md mx-auto overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / Math.max(uploadProgress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 5: Completion Summary */}
        {step === 5 && (
          <div className="py-6 text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-success">تمت عملية رفع المتطوعين بنجاح!</h3>
              <p className="text-sm text-muted-foreground mt-1">تمت إضافة وربط المتطوعين بفريق ({selectedTeamName}) بنجاح.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="p-3 border rounded-lg bg-success/10 text-success">
                <p className="text-2xl font-bold">{summary.added}</p>
                <p className="text-xs">متطوع جديد</p>
              </div>
              <div className="p-3 border rounded-lg bg-info/10 text-info">
                <p className="text-2xl font-bold">{summary.updated}</p>
                <p className="text-xs">متطوع مسجل مسبقاً (تم ضمّه)</p>
              </div>
              <div className="p-3 border rounded-lg bg-destructive/10 text-destructive">
                <p className="text-2xl font-bold">{summary.errors}</p>
                <p className="text-xs">صفوف متجاوزة / أخطاء</p>
              </div>
            </div>

            <Button onClick={() => setOpen(false)} className="w-full max-w-xs mt-4">
              إغلاق وتحديث القائمة
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
