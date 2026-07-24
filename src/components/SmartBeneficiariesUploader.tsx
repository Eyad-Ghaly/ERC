import { useState, useRef, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Loader2, UploadCloud, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Save, Upload, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

// Utility functions for ID encryption
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ENCRYPTION_KEY = "12345678901234567890123456789012";

async function getCryptoKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(text: string): Promise<string> {
  if (!text) return "";
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(text));
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

const INDIVIDUAL_SYSTEM_FIELDS = [
  { key: "missionCode", label: "كود المهمة", required: true },
  { key: "nationalId", label: "رقم البطاقة / الجواز" },
  { key: "fullName", label: "الاسم بالكامل", required: true },
  { key: "gender", label: "النوع" },
  { key: "phone", label: "رقم التليفون" },
  { key: "birthdate", label: "تاريخ الميلاد" },
  { key: "nationality", label: "الجنسية" },
  { key: "serviceType", label: "نوع الخدمة" },
  { key: "serviceQuantity", label: "عدد الخدمة" },
];

const GROUP_SYSTEM_FIELDS = [
  { key: "missionCode", label: "كود المهمة", required: true },
  { key: "count", label: "العدد", required: true },
  { key: "nationality", label: "الجنسية" },
  { key: "gender", label: "النوع" },
  { key: "ageCategory", label: "الفئة العمرية" },
  { key: "serviceType", label: "نوع الخدمة" },
];

interface Props {
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function SmartBeneficiariesUploader({ onSuccess, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [uploadType, setUploadType] = useState<"individual" | "group">("individual");
  const [isGroupRepeated, setIsGroupRepeated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const [customFields, setCustomFields] = useState<Record<string, unknown>[]>([]);
  
  // validation state
  const [valueMapping, setValueMapping] = useState<Record<string, Record<string, string>>>({});
  const [invalidValues, setInvalidValues] = useState<{ fieldKey: string; excelValue: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState<{ rowIndex: number; error: string }[]>([]);

  useEffect(() => {
    if (!open) {
      setStep(0); setUploadType("individual"); setExcelData([]); setExcelHeaders([]); setColumnMapping({});
      setValueMapping({}); setInvalidValues([]); setUploadErrors([]);
    } else {
      // Load custom fields
      supabase.from("team_custom_fields").select("*, team:teams(code)").then(({ data }) => {
        setCustomFields(data || []);
      });
    }
  }, [open]);

  const getActiveFields = () => {
    if (uploadType === "group") return GROUP_SYSTEM_FIELDS;
    
    // Individual
    const fields: Record<string, unknown>[] = [...INDIVIDUAL_SYSTEM_FIELDS];
    customFields.forEach(cf => {
        fields.push({
            key: `custom_${cf.id}`,
            label: `${cf.field_label} (${cf.team?.code || 'عام'})`,
            required: cf.is_required,
            isCustom: true,
            originalField: cf
        });
    });
    return fields;
  };

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
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, unknown>[];

        if (json.length === 0) {
          toast.error("الملف فارغ");
          return;
        }

        if (json.length > 5000) {
          toast.error("الحد الأقصى للرفع هو 5000 صف في المرة الواحدة لتجنب توقف المتصفح.");
          return;
        }

        const headers = Object.keys(json[0] || {});
        setExcelData(json);
        setExcelHeaders(headers);

        const initialMap: Record<string, string> = {};
        const activeFields = getActiveFields();
        activeFields.forEach(sf => {
          const match = headers.find(h => h.trim() === sf.label.trim() || h.includes(sf.label) || sf.label.includes(h));
          if (match) initialMap[sf.key] = match;
        });
        setColumnMapping(initialMap);
        setStep(2);
      } catch (err: unknown) {
        toast.error("فشل قراءة الملف: " + (err as Error).message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateData = () => {
    const newInvalidValues: { fieldKey: string; excelValue: string }[] = [];
    const uniqueInvalidMap = new Set<string>();
    const activeFields = getActiveFields();


    excelData.forEach((row, rowIndex) => {
      activeFields.forEach(sf => {
        const mappedHeader = columnMapping[sf.key];
        if (!mappedHeader) return;
        
        let val = String(row[mappedHeader] || "").trim();
        if (valueMapping[sf.key]?.[val]) {
            val = valueMapping[sf.key][val];
        }
        
        if (sf.key === 'phone' && val) {
          if (val.length === 10 && !val.startsWith("0")) {
            val = "0" + val;
          }
        }
        
        if (sf.key === 'gender' && val) {
           if (val !== "ذكر" && val !== "أنثى" && (uploadType === "individual" || val !== "مختلط")) {
              const key = `gender::${val}`;
              if (!uniqueInvalidMap.has(key)) {
                uniqueInvalidMap.add(key);
                newInvalidValues.push({ fieldKey: sf.key, excelValue: val });
              }
           }
        }

        if (sf.key === 'ageCategory' && val) {
           if (val !== "رضيع" && val !== "طفل" && val !== "بالغ" && val !== "كبار سن") {
              const key = `ageCategory::${val}`;
              if (!uniqueInvalidMap.has(key)) {
                uniqueInvalidMap.add(key);
                newInvalidValues.push({ fieldKey: sf.key, excelValue: val });
              }
           }
        }

        if (sf.isCustom && sf.originalField?.field_type === 'select' && val) {
            const options = sf.originalField.field_options || [];
            if (!options.includes(val)) {
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
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const handleApplyValueMapping = (fieldKey: string, excelValue: string, validValue: string) => {
    setValueMapping(prev => ({
      ...prev,
      [fieldKey]: { ...(prev[fieldKey] || {}), [excelValue]: validValue }
    }));
  };

  const executeUpload = async () => {
    if (!user) return;
    setIsUploading(true);
    setUploadProgress({ current: 0, total: excelData.length });
    const errors: { rowIndex: number; error: string }[] = [];

    // Cache missions
    const missionCache: Record<string, { id: string; team_id: string; daily_report_id: string | null }> = {};

    for (let i = 0; i < excelData.length; i++) {
      setUploadProgress({ current: i + 1, total: excelData.length });
      const row = excelData[i];
      
      const getValue = (key: string) => {
        const header = columnMapping[key];
        if (!header) return "";
        let val = String(row[header] || "").trim();
        if (valueMapping[key]?.[val]) val = valueMapping[key][val];
        return val;
      };

      const missionCode = getValue("missionCode");

      if (!missionCode) {
        errors.push({ rowIndex: i + 2, error: "كود المهمة متطلب أساسي" });
        continue;
      }

      // Find mission
      if (!missionCache[missionCode]) {
        const baseCode = missionCode.split('-')[0];
        const { data: missions } = await supabase.from('missions').select('id, team_id').eq('mission_code', baseCode).limit(1);
        if (!missions || missions.length === 0) {
           errors.push({ rowIndex: i + 2, error: `المهمة غير موجودة: ${baseCode}` });
           continue;
        }
        
        const targetId = missions[0].id;
        let dailyReportId = null;
        
        if (missionCode.includes('-')) {
           const dayNum = parseInt(missionCode.split('-')[1]);
           if (!isNaN(dayNum)) {
              const { data: dr } = await supabase.from('mission_daily_reports').select('id').eq('mission_id', targetId).eq('day_number', dayNum).limit(1);
              if (dr && dr.length > 0) {
                 dailyReportId = dr[0].id;
              }
           }
        }
        
        missionCache[missionCode] = { mission_id: targetId, daily_report_id: dailyReportId, team_id: missions[0].team_id };
      }

      const targetMission = missionCache[missionCode];
      if (!targetMission) continue; // Already errored

      try {
        if (uploadType === "group") {
            const count = parseInt(getValue("count")) || 1;
            const nationality = getValue("nationality");
            const gender = getValue("gender");
            const ageCategory = getValue("ageCategory");
            const serviceType = getValue("serviceType");

            const { data: newGroup, error: groupErr } = await supabase.from('beneficiaries_group').insert({
               mission_id: targetMission.mission_id,
               daily_report_id: targetMission.daily_report_id,
               count: count,
               nationality: nationality || null,
               gender: gender || null,
               age_category: ageCategory || null,
               service_type: serviceType || null,
               is_repeated: isGroupRepeated
            }).select();
            
            if (groupErr) errors.push({ rowIndex: i + 2, error: groupErr.message });

        } else {
            // Individual Upload
            const nationalId = getValue("nationalId");
            const fullName = getValue("fullName");
            const gender = getValue("gender");
            const phone = getValue("phone");
            const birthdate = getValue("birthdate");
            const nationality = getValue("nationality");
            const serviceType = getValue("serviceType");
            const serviceQuantity = getValue("serviceQuantity");

            if (!fullName) {
               errors.push({ rowIndex: i + 2, error: "الاسم بالكامل متطلب أساسي للفردي" });
               continue;
            }

            const customData: Record<string, unknown> = {};
            customFields.forEach(cf => {
                // Only save custom field if it belongs to the target mission's team
                if (cf.team_id === targetMission.team_id) {
                    const val = getValue(`custom_${cf.id}`);
                    if (val) customData[cf.field_key] = val;
                }
            });

            const hash = nationalId ? await sha256(nationalId) : null;
            const encryptedId = nationalId ? await encryptData(nationalId) : null;

            let finalRegistryId = null;

            if (hash) {
            const { data: existingReg } = await supabase.from('beneficiaries_registry').select('id').eq('id_hash', hash).maybeSingle();
            if (existingReg) {
                finalRegistryId = existingReg.id;
                await supabase.from('beneficiaries_registry').update({
                full_name: fullName,
                gender: gender || null,
                nationality: nationality || null,
                birthdate: birthdate || null,
                phone: phone || null,
                }).eq('id', finalRegistryId);
            } else {
                const { data: newReg } = await supabase.from('beneficiaries_registry').insert({
                id_hash: hash,
                full_name: fullName,
                gender: gender || null,
                nationality: nationality || null,
                birthdate: birthdate || null,
                phone: phone || null,
                first_registered_by: user.id,
                first_team_id: targetMission.team_id,
                }).select('id').single();
                finalRegistryId = newReg?.id;
            }
            } else {
            const { data: newReg } = await supabase.from('beneficiaries_registry').insert({
                full_name: fullName,
                gender: gender || null,
                nationality: nationality || null,
                birthdate: birthdate || null,
                phone: phone || null,
                first_registered_by: user.id,
                first_team_id: targetMission.team_id,
                }).select('id').single();
                finalRegistryId = newReg?.id;
            }

            const { error: insertErr } = await supabase.from("beneficiaries_individual").insert({
                mission_id: targetMission.mission_id,
                daily_report_id: targetMission.daily_report_id,
                encrypted_id: encryptedId,
                id_hash: hash,
                registry_id: finalRegistryId,
                full_name: fullName,
                gender: gender || null,
                phone: phone || null,
                birthdate: birthdate || null,
                nationality: nationality || null,
                service_type: serviceType || null,
                service_quantity: parseInt(serviceQuantity) || 1,
                custom_metadata: Object.keys(customData).length > 0 ? customData : null,
            });

            if (insertErr) {
                errors.push({ rowIndex: i + 2, error: insertErr.message });
            }
        }
      } catch (err: unknown) {
        errors.push({ rowIndex: i + 2, error: (err as Error).message });
      }
    }

    setUploadErrors(errors);
    if (errors.length === 0) {
      toast.success("تم الرفع بنجاح");
      onSuccess();
      setOpen(false);
    } else {
      toast.warning(`تم الرفع مع وجود ${errors.length} أخطاء.`);
      onSuccess(); // Refresh the background list with the ones that succeeded
      
      // Keep only failed rows in memory to prevent duplicates if user clicks confirm again
      const failedIndices = new Set(errors.map(e => e.rowIndex - 2));
      const remainingData = excelData.filter((_, idx) => failedIndices.has(idx));
      setExcelData(remainingData);
    }
    setIsUploading(false);
  };

  const activeFields = getActiveFields();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline"><Upload className="w-4 h-4 ml-2" /> رفع من إكسل</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>رفع المستفيدين مجمع عبر Excel</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-6 mt-4">
          {[0, 1, 2, 3, 4].map(s => (
            <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg text-center mb-6">اختر نوع المستفيدين في ملف الإكسل</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={`cursor-pointer hover:border-primary transition-all p-6 text-center border-2 ${uploadType === 'individual' ? 'border-primary bg-primary/5' : 'border-transparent'}`} onClick={() => setUploadType('individual')}>
                <User className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h4 className="font-bold text-lg mb-2">تسجيل أفراد</h4>
                <p className="text-sm text-muted-foreground">يحتوي الإكسل على أسماء المستفيدين وبياناتهم الفردية التفصيلية (الاسم، الرقم القومي...)</p>
              </Card>
              <Card className={`cursor-pointer hover:border-primary transition-all p-6 text-center border-2 ${uploadType === 'group' ? 'border-primary bg-primary/5' : 'border-transparent'}`} onClick={() => setUploadType('group')}>
                <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h4 className="font-bold text-lg mb-2">تسجيل مجمع / جماعي</h4>
                <p className="text-sm text-muted-foreground">يحتوي الإكسل على أعداد المستفيدين المجمعة فقط بدون تفاصيلهم الفردية (كود المهمة، العدد...)</p>
              </Card>
            </div>
            <div className="flex justify-end mt-6">
               <Button onClick={() => setStep(1)}>التالي <ChevronLeft className="w-4 h-4 mr-2"/></Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}><ChevronRight className="w-4 h-4"/></Button>
                <h3 className="font-semibold text-lg">تحميل الملف ({uploadType === 'individual' ? 'أفراد' : 'مجموعات'})</h3>
            </div>
            
            {uploadType === "group" && (
              <div className="bg-muted/30 p-4 rounded-lg border">
                <p className="font-semibold mb-3">نوع المستفيدين في هذا الملف:</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="groupType" checked={!isGroupRepeated} onChange={() => setIsGroupRepeated(false)} className="w-4 h-4 text-primary" />
                    <span>مستفيدون جدد (أول مرة)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="groupType" checked={isGroupRepeated} onChange={() => setIsGroupRepeated(true)} className="w-4 h-4 text-primary" />
                    <span>مستفيدون مكررون (إضافة كخدمات فقط، ولن يتم احتسابهم كمستفيدين جدد)</span>
                  </label>
                </div>
              </div>
            )}

            <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-muted/50 transition-colors">
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">اسحب ملف Excel أو انقر للاختيار</p>
                <p className="text-sm text-muted-foreground mt-1">يجب أن يحتوي الملف على الأقل على: كود المهمة، و{uploadType === 'individual' ? 'الاسم' : 'العدد'}</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>اختيار ملف</Button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2"><ChevronLeft className="w-5 h-5 text-primary" /> مطابقة الأعمدة</h3>
            <p className="text-sm text-muted-foreground mb-4">قم بربط حقول النظام بالأعمدة الموجودة في ملف الإكسل الذي قمت برفعه.</p>
            
            <div className="grid gap-3">
              {activeFields.map((sf, index) => (
                <div key={`${sf.key}-${index}`} className="grid grid-cols-2 items-center gap-4 p-3 bg-muted/20 rounded-lg border">
                  <div className="font-medium flex items-center gap-2">
                    {sf.label}
                    {sf.required && <Badge variant="destructive" className="text-[10px] px-1">إلزامي</Badge>}
                    {sf.isCustom && <Badge variant="secondary" className="text-[10px] px-1">حقل مخصص</Badge>}
                  </div>
                  <Select value={columnMapping[sf.key] || ""} onValueChange={(val) => setColumnMapping(p => ({ ...p, [sf.key]: val }))}>
                    <SelectTrigger><SelectValue placeholder="تجاهل (لا يوجد)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">تجاهل (لا يوجد)</SelectItem>
                      {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>السابق</Button>
              <Button onClick={validateData}>التالي: تحقق من البيانات</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
             <h3 className="font-semibold text-lg flex items-center gap-2 text-destructive"><AlertCircle className="w-5 h-5" /> تصحيح البيانات غير المطابقة</h3>
             <p className="text-sm text-muted-foreground mb-4">هناك قيم في الإكسل لا تتطابق مع الخيارات المتاحة في النظام (مثل النوع أو القوائم المنسدلة). يرجى مطابقتها هنا مرة واحدة.</p>

             <div className="grid gap-4">
               {invalidValues.map((inv, idx) => {
                 const fieldDef = activeFields.find(f => f.key === inv.fieldKey);
                 const currentMapped = valueMapping[inv.fieldKey]?.[inv.excelValue] || "";
                 return (
                   <div key={idx} className="p-4 border border-destructive/30 bg-destructive/5 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <div>
                       <div className="text-sm text-muted-foreground mb-1">في عمود: {fieldDef?.label}</div>
                       <div className="font-bold text-lg text-destructive bg-background px-3 py-1 rounded border inline-block">{inv.excelValue || "(فارغ)"}</div>
                     </div>
                     <div>
                       <div className="text-sm text-muted-foreground mb-1">تغيير إلى:</div>
                       <Select value={currentMapped} onValueChange={(v) => handleApplyValueMapping(inv.fieldKey, inv.excelValue, v)}>
                         <SelectTrigger><SelectValue placeholder="اختر القيمة الصحيحة" /></SelectTrigger>
                         <SelectContent>
                           {inv.fieldKey === "gender" && (
                              <>
                                <SelectItem value="ذكر">ذكر</SelectItem>
                                <SelectItem value="أنثى">أنثى</SelectItem>
                                {uploadType === "group" && <SelectItem value="مختلط">مختلط</SelectItem>}
                              </>
                           )}
                           {inv.fieldKey === "ageCategory" && (
                              <>
                                <SelectItem value="رضيع">رضيع</SelectItem>
                                <SelectItem value="طفل">طفل</SelectItem>
                                <SelectItem value="بالغ">بالغ</SelectItem>
                                <SelectItem value="كبار سن">كبار سن</SelectItem>
                              </>
                           )}
                           {fieldDef?.isCustom && fieldDef.originalField?.field_options?.map((opt: string) => (
                               <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                 );
               })}
             </div>

             <div className="flex justify-end gap-3 mt-6">
               <Button variant="outline" onClick={() => setStep(2)}>السابق</Button>
               <Button onClick={validateData}>إعادة التحقق</Button>
             </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="font-semibold text-2xl">تم التحقق من البيانات بنجاح!</h3>
            <p className="text-muted-foreground">سيتم إدراج {excelData.length} {uploadType === 'individual' ? 'مستفيد' : 'مجموعة'}.</p>
            
            {uploadErrors.length > 0 && (
              <div className="mt-6 text-right max-w-lg mx-auto bg-destructive/10 text-destructive p-4 rounded-lg text-sm max-h-40 overflow-y-auto">
                <div className="font-bold mb-2">أخطاء المحاولة السابقة:</div>
                <ul className="list-disc list-inside">
                  {uploadErrors.map((e, i) => (
                    <li key={i}>صف {e.rowIndex}: {e.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isUploading}>رجوع للتعديل</Button>
              <Button onClick={executeUpload} disabled={isUploading} className="min-w-[150px]">
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الرفع ({uploadProgress.current}/{uploadProgress.total})
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" /> تأكيد وحفظ
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
