import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useDropdownOptions } from "@/hooks/useDropdownOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Loader2, UploadCloud, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SYSTEM_FIELDS = [
  { key: "missionCode", label: "كود المهمة" },
  { key: "projectCode", label: "كود المشروع", required: true },
  { key: "governorate", label: "محافظة التنفيذ", dropdownKey: "governorate" },
  { key: "activityClassification", label: "تصنيف النشاط", dropdownKey: "activity_classification" },
  { key: "activityType", label: "نوع النشاط", dropdownKey: "activity_type" },
  { key: "activityDetails", label: "تفاصيل النشاط" },
  { key: "typeName", label: "اسم النوع", dropdownKey: "type_name" },
  { key: "classification", label: "التصنيف", dropdownKey: "classification" },
  { key: "classificationName", label: "اسم التصنيف", dropdownKey: "classification_name" },
  { key: "activityDate", label: "تاريخ النشاط", required: true },
  { key: "executionPlace", label: "مكان التنفيذ" },
  { key: "missionName", label: "اسم المهمة", required: true },
  { key: "latitude", label: "خط العرض" },
  { key: "longitude", label: "خط الطول" },
  { key: "followUpResponsible", label: "مسؤول المتابعة" },
  { key: "followUpPhone", label: "رقم تليفون المتابعة" },
  { key: "hasBeneficiaries", label: "هل بها مستفيدين؟ (نعم/لا)" },
  { key: "isOpenMission", label: "هل المهمة مفتوحة؟ (نعم/لا)" },
];

interface SmartExcelUploaderProps {
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function SmartExcelUploader({ onSuccess, trigger }: SmartExcelUploaderProps) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 4.5 | 5>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  // validation state
  const [valueMapping, setValueMapping] = useState<Record<string, Record<string, string>>>({});
  const [invalidValues, setInvalidValues] = useState<{ fieldKey: string; excelValue: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState<{ rowIndex: number; error: string }[]>([]);

  // Duplicate handling state
  const [duplicateMissions, setDuplicateMissions] = useState<string[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update" | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Load dropdown options for validation
  const govOpts = useDropdownOptions("governorate");
  const actClassOpts = useDropdownOptions("activity_classification");
  const actTypeOpts = useDropdownOptions("activity_type");
  const typeNameOpts = useDropdownOptions("type_name");
  const classOpts = useDropdownOptions("classification");
  const classNameOpts = useDropdownOptions("classification_name");

  const dropdownsData = useMemo(() => {
    return {
      "governorate": govOpts.options,
      "activity_classification": actClassOpts.options,
      "activity_type": actTypeOpts.options,
      "type_name": typeNameOpts.options,
      "classification": classOpts.options,
      "classification_name": classNameOpts.options,
    };
  }, [govOpts.options, actClassOpts.options, actTypeOpts.options, typeNameOpts.options, classOpts.options, classNameOpts.options]);

  const areDropdownsLoading = govOpts.loading || actClassOpts.loading || actTypeOpts.loading || typeNameOpts.loading || classOpts.loading || classNameOpts.loading;

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setStep(1);
      setExcelData([]);
      setExcelHeaders([]);
      setColumnMapping({});
      setValueMapping({});
      setInvalidValues([]);
      setUploadErrors([]);
      setDuplicateMissions([]);
      setDuplicateAction(null);
      setIsCheckingDuplicates(false);
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        if (json.length > 10000) {
          toast.error("الحد الأقصى للرفع هو 10000 صف في المرة الواحدة لتجنب توقف المتصفح.");
          return;
        }

        const headers = Object.keys(json[0] || {});
        setExcelData(json);
        setExcelHeaders(headers);

        // Try to auto-map based on similar text or identical
        const initialMap: Record<string, string> = {};
        SYSTEM_FIELDS.forEach(sf => {
          const match = headers.find(h => h.trim() === sf.label.trim() || h.includes(sf.label) || sf.label.includes(h));
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

  const validateData = () => {
    const newInvalidValues: { fieldKey: string; excelValue: string }[] = [];
    const uniqueInvalidMap = new Set<string>();

    excelData.forEach((row, rowIndex) => {
      SYSTEM_FIELDS.forEach(sf => {
        const mappedHeader = columnMapping[sf.key];
        if (!mappedHeader) return;
        
        let val = String(row[mappedHeader] || "").trim();
        
        if (sf.key === 'followUpPhone' && val) {
          // auto fix phone numbers if they are 10 digits and should start with 0
          if (val.length === 10 && !val.startsWith("0")) {
            val = "0" + val;
          }
        }

        if (sf.dropdownKey) {
          if (!val) return; // skip empty

          // check if already mapped
          if (valueMapping[sf.key]?.[val]) {
            val = valueMapping[sf.key][val];
          }

          const options = dropdownsData[sf.dropdownKey as keyof typeof dropdownsData] || [];
          const isValid = options.some(o => o.value === val || o.label === val);

          if (!isValid) {
            const key = `${sf.key}::${val}`;
            if (!uniqueInvalidMap.has(key)) {
              uniqueInvalidMap.add(key);
              newInvalidValues.push({ fieldKey: sf.key, excelValue: val });
            }
          }
        }
      });
    });

    setInvalidValues(newInvalidValues);
    if (newInvalidValues.length === 0) {
      setStep(4); // Everything valid, go to upload
    } else {
      setStep(3); // Fix errors
    }
  };

  const handleApplyValueMapping = (fieldKey: string, excelValue: string, validValue: string) => {
    setValueMapping(prev => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {}),
        [excelValue]: validValue
      }
    }));
  };

  const executeUpload = async () => {
    if (!user || !profile?.team_id) {
      toast.error("لا يوجد فريق مرتبط بحسابك");
      return;
    }

    if (duplicateAction === null) {
      setIsCheckingDuplicates(true);
      try {
        const mappedCodes = new Set<string>();
        const codeHeader = columnMapping["missionCode"];
        
        if (codeHeader) {
          excelData.forEach(row => {
            const code = String(row[codeHeader] || "").trim();
            if (code) mappedCodes.add(code);
          });
        }

        if (mappedCodes.size > 0) {
          const codesArray = Array.from(mappedCodes);
          // Query in batches if large
          const { data, error } = await supabase
            .from("missions")
            .select("mission_code")
            .in("mission_code", codesArray);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            setDuplicateMissions(data.map(m => m.mission_code));
            setStep(4.5);
            setIsCheckingDuplicates(false);
            return;
          }
        }
      } catch (err: any) {
        toast.error("فشل التحقق من التكرار: " + err.message);
        setIsCheckingDuplicates(false);
        return;
      }
      setIsCheckingDuplicates(false);
    }

    setIsUploading(true);
    setUploadProgress({ current: 0, total: excelData.length });
    let successCount = 0;
    let failCount = 0;
    const errors: { rowIndex: number; error: string }[] = [];

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const mapped: any = {};
      SYSTEM_FIELDS.forEach(sf => {
        const header = columnMapping[sf.key];
        let val = header ? row[header] : undefined;
        
        if (typeof val === 'string') val = val.trim();

        if (sf.dropdownKey && val && valueMapping[sf.key]?.[val]) {
          val = valueMapping[sf.key][val];
        }

        if (sf.key === 'followUpPhone' && val && String(val).length === 10 && !String(val).startsWith("0")) {
          val = "0" + val;
        }

        mapped[sf.key] = val;
      });

      try {
        let finalMissionCode = mapped.missionCode ? String(mapped.missionCode).trim() : "";

        const pCode = String(mapped.projectCode || "");
        if (!pCode) throw new Error("كود المشروع مفقود");

        if (!finalMissionCode) {
          const { data: generatedCode, error: codeErr } = await supabase.rpc("generate_mission_code", {
            _project_code: pCode, _team_code: profile.team_code,
          });
          if (codeErr) throw codeErr;
          finalMissionCode = generatedCode as string;
        }

        let actDate = mapped.activityDate;
        if (typeof actDate === "number") {
          const date = XLSX.SSF.parse_date_code(actDate);
          actDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }

        const hasBenStr = String(mapped.hasBeneficiaries || "").toLowerCase();
        const isOpenStr = String(mapped.isOpenMission || "").toLowerCase();
        
        const hasBen = hasBenStr === "true" || hasBenStr === "نعم" || hasBenStr === "1";
        const isOpen = isOpenStr === "true" || isOpenStr === "نعم" || isOpenStr === "1";

        const todayDate = new Date().toISOString().split('T')[0];
        const actDateStr = actDate ? String(actDate).split('T')[0] : todayDate;
        const isLate = actDateStr < todayDate;

        const payload = {
          project_code: pCode,
          governorate: mapped.governorate ? String(mapped.governorate) : null,
          department_id: profile?.department_id || null,
          activity_classification: mapped.activityClassification ? String(mapped.activityClassification) : null,
          activity_type: mapped.activityType ? String(mapped.activityType) : null,
          activity_details: mapped.activityDetails ? String(mapped.activityDetails) : null,
          type_name: mapped.typeName ? String(mapped.typeName) : null,
          classification: mapped.classification ? String(mapped.classification) : null,
          classification_name: mapped.classificationName ? String(mapped.classificationName) : null,
          activity_date: actDateStr,
          execution_place: mapped.executionPlace ? String(mapped.executionPlace) : null,
          mission_name: mapped.missionName ? String(mapped.missionName) : "مهمة مستوردة",
          latitude: mapped.latitude ? Number(mapped.latitude) : null,
          longitude: mapped.longitude ? Number(mapped.longitude) : null,
          follow_up_responsible: mapped.followUpResponsible ? String(mapped.followUpResponsible) : null,
          follow_up_phone: mapped.followUpPhone ? String(mapped.followUpPhone) : null,
          has_beneficiaries: hasBen,
          is_open_mission: isOpen,
          is_late_submission: isLate,
        };

        const isDuplicate = duplicateMissions.includes(finalMissionCode);
        
        if (isDuplicate && duplicateAction === "skip") {
          setUploadProgress(prev => ({ ...prev, current: i + 1 }));
          continue;
        }

        if (isDuplicate) {
          const { error: updErr } = await supabase.from("missions").update(payload).eq("mission_code", finalMissionCode);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from("missions").insert({
            mission_code: finalMissionCode,
            status: "planned",
            created_by: user.id,
            team_id: profile.team_id,
            ...payload
          });
          if (insErr) throw insErr;
        }
        successCount++;
      } catch (err: any) {
        console.error("Row failed:", err, row);
        failCount++;
        errors.push({ rowIndex: i + 2, error: err.message || String(err) }); // +2 for header and 0-index offset
      }

      setUploadProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsUploading(false);
    if (failCount > 0) {
      toast.error(`تم رفع ${successCount} مهمة بنجاح. فشل ${failCount} مهمة.`);
      setUploadErrors(errors);
      setStep(5);
      if (successCount > 0) {
        onSuccess();
      }
    } else {
      toast.success(`تم رفع ${successCount} مهمة بنجاح.`);
      onSuccess();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">إدخال سريع من إكسيل (ذكي)</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "اختيار الملف"}
            {step === 2 && "تطابق الأعمدة"}
            {step === 3 && "معالجة البيانات المفقودة أو الخاطئة"}
            {step === 4 && "تأكيد الرفع"}
            {step === 4.5 && "معالجة التكرار"}
            {step === 5 && "تقرير الأخطاء"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-primary/20 rounded-xl bg-primary/5">
              <UploadCloud className="w-16 h-16 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">قم باختيار ملف إكسيل (.xlsx)</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-sm">سيقوم النظام بقراءة البيانات وتوجيهك لربط الأعمدة بشكل ذكي مع النظام لضمان عدم وجود أخطاء.</p>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} size="lg">
                اختيار الملف الآن
              </Button>
            </div>
          )}

          {/* STEP 2: Mapping */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-info mt-0.5" />
                <div>
                  <h4 className="font-bold text-info">تطابق الأعمدة</h4>
                  <p className="text-sm text-muted-foreground">قم باختيار العمود المناسب من ملف الإكسيل الذي يقابل الحقل في النظام.</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>الحقل في النظام</TableHead>
                      <TableHead>العمود في الإكسيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SYSTEM_FIELDS.map(sf => (
                      <TableRow key={sf.key}>
                        <TableCell className="font-medium">
                          {sf.label} {sf.required && <span className="text-destructive">*</span>}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={columnMapping[sf.key] || "UNMAPPED"} 
                            onValueChange={(val) => setColumnMapping(prev => ({...prev, [sf.key]: val === "UNMAPPED" ? "" : val}))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNMAPPED">-- تجاهل / غير موجود --</SelectItem>
                              {excelHeaders.map(h => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* STEP 3: Validation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-warning/10 p-4 rounded-lg flex items-start gap-3 border border-warning/20">
                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <h4 className="font-bold text-warning">قيم غير مطابقة</h4>
                  <p className="text-sm text-muted-foreground">هناك بعض القيم في الملف غير مطابقة للخيارات المتاحة في النظام (مثلاً أخطاء إملائية). يرجى تعيين القيمة الصحيحة ليتم تطبيقها على جميع الصفوف.</p>
                </div>
              </div>

              <div className="space-y-4">
                {invalidValues.map((iv, idx) => {
                  const sf = SYSTEM_FIELDS.find(s => s.key === iv.fieldKey);
                  const options = sf?.dropdownKey ? (dropdownsData[sf.dropdownKey as keyof typeof dropdownsData] || []) : [];
                  
                  return (
                    <div key={idx} className="flex flex-col md:flex-row items-center gap-4 p-4 border rounded-lg bg-card">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{sf?.label}</Badge>
                        <p className="font-bold text-destructive">"{iv.excelValue}"</p>
                      </div>
                      <div className="w-full md:w-1/2">
                        <Select 
                          value={valueMapping[iv.fieldKey]?.[iv.excelValue] || ""}
                          onValueChange={(val) => handleApplyValueMapping(iv.fieldKey, iv.excelValue, val)}
                        >
                          <SelectTrigger className="border-info">
                            <SelectValue placeholder="اختر القيمة الصحيحة لتبديلها..." />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((o: any) => (
                              <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Ready to Upload */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
              <div className="w-24 h-24 bg-success/20 text-success rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">الملف جاهز للرفع!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  تم فحص {excelData.length} مهمة، وتطابق جميع البيانات بشكل صحيح مع النظام.
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg text-sm w-full max-w-md text-right">
                <ul className="space-y-2">
                  <li className="flex justify-between border-b pb-2">
                    <span>عدد الصفوف:</span> 
                    <strong>
                      {duplicateAction === "skip" 
                        ? `${excelData.filter(row => !duplicateMissions.includes(String(row[columnMapping["missionCode"]] || "").trim())).length} (بعد استبعاد المكرر)` 
                        : excelData.length}
                    </strong>
                  </li>
                  <li className="flex justify-between border-b pb-2"><span>الأعمدة المرتبطة:</span> <strong>{Object.values(columnMapping).filter(Boolean).length} / {SYSTEM_FIELDS.length}</strong></li>
                  <li className="flex justify-between"><span>تعديلات إملائية:</span> <strong>{Object.values(valueMapping).flatMap(v => Object.values(v)).length}</strong></li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 4.5: Duplicates Resolution */}
          {step === 4.5 && (
            <div className="flex flex-col items-center justify-center h-full space-y-8 text-center animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-warning/20 text-warning rounded-full flex items-center justify-center border-4 border-warning/30">
                <AlertCircle className="w-12 h-12" />
              </div>
              
              <div className="max-w-md">
                <h3 className="text-2xl font-bold mb-3 text-foreground">تنبيه: مهام متكررة</h3>
                <p className="text-muted-foreground text-lg mb-2">
                  تم العثور على <span className="font-bold text-warning text-xl mx-1">{duplicateMissions.length}</span> مهمة في الملف تم تسجيلها مسبقاً بنفس كود المهمة.
                </p>
                <p className="text-sm text-muted-foreground">
                  كيف تريد التعامل مع هذه المهام المكررة؟
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-24 flex flex-col items-center justify-center border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => {
                    setDuplicateAction("skip");
                    setStep(4); // Go back to step 4, then user clicks upload again and it will proceed
                  }}
                >
                  <span className="font-bold text-base mb-1">تخطي المكرر</span>
                  <span className="text-xs text-muted-foreground font-normal">إدخال المهام الجديدة فقط، وتجاهل المكرر تماماً</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="h-24 flex flex-col items-center justify-center border-2 border-info/20 hover:border-info/50 hover:bg-info/5"
                  onClick={() => {
                    setDuplicateAction("update");
                    setStep(4);
                  }}
                >
                  <span className="font-bold text-info text-base mb-1">تحديث المكرر</span>
                  <span className="text-xs text-muted-foreground font-normal">تعديل المهام القديمة لتطابق بيانات الإكسيل المرفوع</span>
                </Button>
              </div>
              
              <div className="mt-8">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setStep(4)}>
                  إلغاء والعودة
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Errors */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-destructive/10 p-4 rounded-lg flex items-start gap-3 border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-bold text-destructive">فشل في رفع بعض السجلات</h4>
                  <p className="text-sm text-muted-foreground">حدثت مشكلة أثناء إدخال هذه البيانات لقاعدة البيانات. يرجى مراجعة الجدول التالي، وتصحيح الأخطاء في ملف الإكسيل وإعادة رفعه، أو التأكد من إدخال جميع الحقول الإجبارية.</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-auto max-h-[50vh]">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[100px]">رقم الصف</TableHead>
                      <TableHead>السبب / الخطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadErrors.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-bold">{err.rowIndex}</TableCell>
                        <TableCell className="text-destructive font-medium">{err.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t flex justify-between mt-auto">
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep(step - 1 as any)}>
              <ChevronRight className="w-4 h-4 ms-2" /> السابق
            </Button>
          )}
          {step === 1 && <div></div>}
          
          {step === 2 && (
            <Button onClick={validateData} disabled={areDropdownsLoading}>
              التالي (مراجعة البيانات) <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          )}
          
          {step === 3 && (
            <Button onClick={validateData} className="bg-info text-white hover:bg-info/90">
              إعادة التحقق <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-2 items-center">
              <Button onClick={executeUpload} disabled={isUploading || isCheckingDuplicates} className="bg-success text-white hover:bg-success/90 w-full">
                {isUploading || isCheckingDuplicates ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <Save className="w-4 h-4 ms-2" />}
                {isCheckingDuplicates ? "جاري الفحص..." : isUploading ? `جاري الرفع... (${uploadProgress.current} من ${uploadProgress.total})` : "اعتماد ورفع البيانات"}
              </Button>
              {isUploading && (
                <div className="w-full bg-muted rounded-full h-2.5 mt-2 overflow-hidden">
                  <div className="bg-success h-2.5 rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <Button onClick={() => setOpen(false)} variant="outline">
              إغلاق وتصحيح الملف
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
