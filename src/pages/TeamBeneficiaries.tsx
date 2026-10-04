import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Search, Download, Key, ShieldCheck, Upload, Save, Eye, Edit, UserPlus, Users, Trash2, Filter, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Utility: SHA-256 hash
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple AES-GCM encryption/decryption using a static key
const ENCRYPTION_KEY = "12345678901234567890123456789012"; // 32 bytes

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

async function decryptData(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return "";
  try {
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getCryptoKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    return "********";
  }
}

async function encryptData(text: string): Promise<string> {
  if (!text) return "";
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );
  
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

const ColumnFilter = ({ 
  columnKey, 
  label, 
  dataList, 
  availableCustomFields, 
  columnFilters, 
  setColumnFilters 
}: { 
  columnKey: string, 
  label: string, 
  dataList: any[], 
  availableCustomFields: string[],
  columnFilters: Record<string, string[]>,
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
}) => {
  const uniqueValues = Array.from(new Set(dataList.map(item => {
     if (availableCustomFields.includes(columnKey)) {
        return item.custom_metadata?.[columnKey] || "";
     }
     return item[columnKey] || "";
  }).filter(v => v !== ""))).sort();

  const selectedValues = columnFilters[columnKey] || [];

  const toggleValue = (val: string) => {
    setColumnFilters(prev => {
      const current = prev[columnKey] || [];
      if (current.includes(val)) {
        return { ...prev, [columnKey]: current.filter(v => v !== val) };
      }
      return { ...prev, [columnKey]: [...current, val] };
    });
  };

  const isActive = selectedValues.length > 0;

  return (
    <div className="flex items-center justify-between gap-1">
      <span>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className={`h-6 w-6 shrink-0 ${isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}>
            <Filter className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm leading-none border-b pb-2">تصفية {label}</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {uniqueValues.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد بيانات</p> : null}
              {uniqueValues.map((val: string) => (
                <div key={val} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id={`${columnKey}-${val}`} 
                    checked={selectedValues.includes(val)}
                    onCheckedChange={() => toggleValue(val)}
                  />
                  <label htmlFor={`${columnKey}-${val}`} className="text-sm cursor-pointer select-none truncate">
                    {val}
                  </label>
                </div>
              ))}
            </div>
            {isActive && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-destructive"
                onClick={() => setColumnFilters(prev => ({...prev, [columnKey]: []}))}
              >
                إلغاء التصفية
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default function TeamBeneficiaries() {
  const { profile, hasRole } = useAuth();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const isGlobalAdmin = hasRole("data_manager") || hasRole("admin") || hasRole("management");
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const [indivBens, setIndivBens] = useState<any[]>([]);
  const [groupBens, setGroupBens] = useState<any[]>([]);
  const [originalIndivBens, setOriginalIndivBens] = useState<any[]>([]);
  const [originalGroupBens, setOriginalGroupBens] = useState<any[]>([]);
  
  // Custom Metadata Dynamic Fields
  const [availableCustomFields, setAvailableCustomFields] = useState<string[]>([]);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterGov, setFilterGov] = useState("");
  const [filterMission, setFilterMission] = useState("");
  const [filterDetails, setFilterDetails] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragSelection, setDragSelection] = useState<{ type: 'indiv'|'group', startIdx: number, endIdx: number, field: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Import Excel state
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMissions, setImportMissions] = useState<any[]>([]);
  const [importSelectedMissionId, setImportSelectedMissionId] = useState("");
  const [importPendingFile, setImportPendingFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importStep, setImportStep] = useState<'select-mission' | 'preview' | 'done'>('select-mission');

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const teamId = isGlobalAdmin ? selectedTeamId : (profile?.team_id || "");
  const teamCode = isGlobalAdmin ? (teams.find(t => t.id === selectedTeamId)?.code || "") : (profile?.team_code || "");

  useEffect(() => {
    if (isGlobalAdmin) {
      setIsAuthenticated(true);
      const fetchTeams = async () => {
        const { data, error } = await supabase.from("teams").select("id, code, name").order("code");
        if (error) console.error("Error fetching teams:", error);
        if (data) setTeams(data);
        setLoading(false);
      };
      fetchTeams();
    }
  }, [isGlobalAdmin]);

  useEffect(() => {
    if (teamId && !isGlobalAdmin) {
      checkTeamStatus();
    } else if (teamId && isGlobalAdmin) {
      fetchBeneficiaries(teamId);
    }
  }, [teamId, isGlobalAdmin]);

  const checkTeamStatus = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('team_settings')
      .select('team_id')
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (!data) {
      setIsFirstTime(true);
    } else {
      setIsFirstTime(false);
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (password.length < 4) return toast.error("كلمة المرور يجب أن تكون 4 أرقام أو حروف على الأقل");
    setBusy(true);
    // Normalize Arabic numerals to English before setting
    const normalizedPass = password.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const hash = await sha256(normalizedPass);
    const { error } = await supabase.from('team_settings').upsert({
      team_id: teamId,
      pin_hash: hash
    });
    setBusy(false);

    if (error) {
      toast.error("فشل حفظ كلمة المرور: " + error.message);
    } else {
      toast.success("تم تعيين كلمة المرور بنجاح");
      setIsFirstTime(false);
      setIsAuthenticated(true);
      fetchBeneficiaries();
    }
  };

  const handleLogin = async () => {
    if (!password) return toast.error("برجاء إدخال كلمة المرور");
    setBusy(true);
    
    // Check multiple variants: exact, forced English, forced Arabic
    const toEnglish = password.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const toArabic = password.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
    
    const hashExact = await sha256(password);
    const hashEnglish = await sha256(toEnglish);
    const hashArabic = await sha256(toArabic);

    const { data } = await supabase
      .from('team_settings')
      .select('pin_hash')
      .eq('team_id', teamId)
      .maybeSingle();
    setBusy(false);

    if (data && (data.pin_hash === hashExact || data.pin_hash === hashEnglish || data.pin_hash === hashArabic)) {
      setIsAuthenticated(true);
      fetchBeneficiaries();
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  const fetchBeneficiaries = async (tid: string = teamId) => {
    if (!tid) return;
    setLoading(true);
    
    // Fetch Individual
    const { data: indData, error: indErr } = await supabase
      .from('beneficiaries_individual')
      .select(`
        id,
        full_name,
        encrypted_id,
        phone,
        service_type,
        service_quantity,
        birthdate,
        nationality,
        gender,
        custom_metadata,
        created_at,
        missions!inner(id, team_id, mission_code, mission_name, activity_date, governorate, activity_details)
      `)
      .eq('missions.team_id', tid)
      .order('created_at', { ascending: false });

    if (indData) {
       const decryptedData = await Promise.all(indData.map(async (r: any) => {
          return {
             ...r,
             decrypted_id: r.encrypted_id ? await decryptData(r.encrypted_id) : "",
             mission_id: r.missions?.id || "",
             mission_name: r.missions?.mission_name || "",
             mission_code: r.missions?.mission_code || "",
             governorate: r.missions?.governorate || "",
             activity_date: r.missions?.activity_date || "",
             activity_details: r.missions?.activity_details || "",
          };
       }));
       setIndivBens(decryptedData);
       setOriginalIndivBens(JSON.parse(JSON.stringify(decryptedData)));
    }

    // Fetch Group
    const { data: grpData, error: grpErr } = await supabase
      .from('beneficiaries_group')
      .select(`
        id,
        nationality,
        gender,
        age_category,
        count,
        service_type,
        service_quantity,
        custom_metadata,
        created_at,
        missions!inner(id, team_id, mission_code, mission_name, activity_date, governorate, activity_details)
      `)
      .eq('missions.team_id', tid)
      .order('created_at', { ascending: false });

    if (grpData) {
      const formattedGrp = grpData.map((r: any) => ({
        ...r,
        mission_id: r.missions?.id || "",
        mission_name: r.missions?.mission_name || "",
        mission_code: r.missions?.mission_code || "",
        governorate: r.missions?.governorate || "",
        activity_date: r.missions?.activity_date || "",
        activity_details: r.missions?.activity_details || "",
      }));
      setGroupBens(formattedGrp);
      setOriginalGroupBens(JSON.parse(JSON.stringify(formattedGrp)));
    }

    setLoading(false);
  };

  useEffect(() => {
    const keys = new Set<string>();
    indivBens.forEach(b => {
      if (b.custom_metadata) Object.keys(b.custom_metadata).forEach(k => keys.add(k));
    });
    groupBens.forEach(b => {
      if (b.custom_metadata) Object.keys(b.custom_metadata).forEach(k => keys.add(k));
    });
    setAvailableCustomFields(Array.from(keys));
  }, [indivBens, groupBens]);

  const handleIndivChange = (id: string, field: string, value: string, isCustom = false) => {
    setIndivBens(prev => prev.map(row => {
      if (row.id !== id) return row;
      if (isCustom) {
        return { ...row, custom_metadata: { ...(row.custom_metadata || {}), [field]: value } };
      }
      return { ...row, [field]: value };
    }));
  };

  const handleGroupChange = (id: string, field: string, value: string, isCustom = false) => {
    setGroupBens(prev => prev.map(row => {
      if (row.id !== id) return row;
      if (isCustom) {
        return { ...row, custom_metadata: { ...(row.custom_metadata || {}), [field]: value } };
      }
      return { ...row, [field]: value };
    }));
  };

  const handleDeleteIndiv = async (id: string) => {
    if (!confirm("هل أنت متأكد من طلب حذف هذا المستفيد؟")) return;
    setLoading(true);
    const { error } = await supabase.from('edit_requests').insert({
      record_id: id,
      entity_type: 'beneficiary',
      team_id: teamId,
      requested_by: profile?.id,
      changes: { _request_deletion: true, _type: 'individual', reason: 'تم طلب الحذف من واجهة الفريق' }
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إرسال طلب الحذف للمراجعة");
      // Optionally hide it from view, or let it stay until approved.
      // We will let it stay but you could mark it locally if you had a flag.
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("هل أنت متأكد من طلب حذف هذه البيانات؟")) return;
    setLoading(true);
    const { error } = await supabase.from('edit_requests').insert({
      record_id: id,
      entity_type: 'beneficiary',
      team_id: teamId,
      requested_by: profile?.id,
      changes: { _request_deletion: true, _type: 'group', reason: 'تم طلب الحذف من واجهة الفريق' }
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إرسال طلب الحذف للمراجعة");
    }
  };

  const handleIndivPaste = (e: React.ClipboardEvent, startId: string, field: string, isCustom = false) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").split(/\r?\n/).filter(Boolean);
    if (pasteData.length === 0) return;

    const indivColumns = ["full_name", "decrypted_id", "phone", "birthdate", "gender", "nationality", "service_type", "service_quantity", ...selectedCustomFields];
    const startColIndex = indivColumns.indexOf(field);
    if (startColIndex === -1) return;

    const startVisibleIdx = filteredIndiv.findIndex(r => r.id === startId);
    if (startVisibleIdx === -1) return;

    setIndivBens(prev => {
      const next = [...prev];

      // Single value pasted into a multi-cell selection
      if (pasteData.length === 1 && dragSelection?.type === 'indiv' && dragSelection.field === field) {
        const minRow = Math.min(dragSelection.startIdx, dragSelection.endIdx);
        const maxRow = Math.max(dragSelection.startIdx, dragSelection.endIdx);
        if (startVisibleIdx >= minRow && startVisibleIdx <= maxRow) {
          for (let r = minRow; r <= maxRow; r++) {
            const targetId = filteredIndiv[r]?.id;
            const targetIndex = next.findIndex(n => n.id === targetId);
            if (targetIndex !== -1) {
              const val = pasteData[0].trim();
              if (isCustom) {
                next[targetIndex] = { ...next[targetIndex], custom_metadata: { ...(next[targetIndex].custom_metadata || {}), [field]: val } };
              } else {
                next[targetIndex] = { ...next[targetIndex], [field]: val };
              }
            }
          }
          return next;
        }
      }

      // Normal paste (1D or 2D grid) downwards
      for (let r = 0; r < pasteData.length && startVisibleIdx + r < filteredIndiv.length; r++) {
        const targetId = filteredIndiv[startVisibleIdx + r].id;
        const targetIndex = next.findIndex(n => n.id === targetId);
        if (targetIndex === -1) continue;

        const rowData = pasteData[r].split('\t');
        for (let c = 0; c < rowData.length && startColIndex + c < indivColumns.length; c++) {
          const currentField = indivColumns[startColIndex + c];
          const val = rowData[c].trim();
          
          if (selectedCustomFields.includes(currentField)) {
            next[targetIndex] = { ...next[targetIndex], custom_metadata: { ...(next[targetIndex].custom_metadata || {}), [currentField]: val } };
          } else {
            next[targetIndex] = { ...next[targetIndex], [currentField]: val };
          }
        }
      }
      return next;
    });
  };

  const handleGroupPaste = (e: React.ClipboardEvent, startId: string, field: string, isCustom = false) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").split(/\r?\n/).filter(Boolean);
    if (pasteData.length === 0) return;

    const groupColumns = ["nationality", "gender", "age_category", "count", "service_type", "service_quantity", ...selectedCustomFields];
    const startColIndex = groupColumns.indexOf(field);
    if (startColIndex === -1) return;

    const startVisibleIdx = filteredGroup.findIndex(r => r.id === startId);
    if (startVisibleIdx === -1) return;

    setGroupBens(prev => {
      const next = [...prev];

      // Single value pasted into a multi-cell selection
      if (pasteData.length === 1 && dragSelection?.type === 'group' && dragSelection.field === field) {
        const minRow = Math.min(dragSelection.startIdx, dragSelection.endIdx);
        const maxRow = Math.max(dragSelection.startIdx, dragSelection.endIdx);
        if (startVisibleIdx >= minRow && startVisibleIdx <= maxRow) {
          for (let r = minRow; r <= maxRow; r++) {
            const targetId = filteredGroup[r]?.id;
            const targetIndex = next.findIndex(n => n.id === targetId);
            if (targetIndex !== -1) {
              const val = pasteData[0].trim();
              if (isCustom) {
                next[targetIndex] = { ...next[targetIndex], custom_metadata: { ...(next[targetIndex].custom_metadata || {}), [field]: val } };
              } else {
                next[targetIndex] = { ...next[targetIndex], [field]: val };
              }
            }
          }
          return next;
        }
      }

      // Normal paste (1D or 2D grid) downwards
      for (let r = 0; r < pasteData.length && startVisibleIdx + r < filteredGroup.length; r++) {
        const targetId = filteredGroup[startVisibleIdx + r].id;
        const targetIndex = next.findIndex(n => n.id === targetId);
        if (targetIndex === -1) continue;

        const rowData = pasteData[r].split('\t');
        for (let c = 0; c < rowData.length && startColIndex + c < groupColumns.length; c++) {
          const currentField = groupColumns[startColIndex + c];
          const val = rowData[c].trim();
          
          if (selectedCustomFields.includes(currentField)) {
            next[targetIndex] = { ...next[targetIndex], custom_metadata: { ...(next[targetIndex].custom_metadata || {}), [currentField]: val } };
          } else {
            next[targetIndex] = { ...next[targetIndex], [currentField]: val };
          }
        }
      }
      return next;
    });
  };

  const getSelectionProps = (type: 'indiv'|'group', idx: number, field: string) => {
    const isSelected = dragSelection?.type === type && dragSelection?.field === field && 
      idx >= Math.min(dragSelection.startIdx, dragSelection.endIdx) && 
      idx <= Math.max(dragSelection.startIdx, dragSelection.endIdx);
    
    return {
      onMouseDown: () => {
        setDragSelection({ type, startIdx: idx, endIdx: idx, field });
        setIsDragging(true);
      },
      onMouseEnter: () => {
        if (isDragging && dragSelection?.type === type && dragSelection?.field === field) {
          setDragSelection(prev => prev ? { ...prev, endIdx: idx } : null);
        }
      },
      className: `h-8 w-full ${isSelected ? 'ring-2 ring-primary bg-primary/20 transition-all' : ''}`
    };
  };

  // ─── Import Excel ─────────────────────────────────────────────────────────

  const openImportFlow = async (file: File) => {
    setImportPendingFile(file);
    setImportPreview([]);
    setImportSelectedMissionId("");

    // Peek at file headers to detect round-trip export (has record_id column)
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length > 0) {
        const headers = Object.keys(rows[0]);
        const hasRecordId = headers.some(h => String(h).trim() === 'record_id');
        if (hasRecordId) {
          // All rows know their record already → skip mission selection, go to preview
          setImportStep('preview');
          setImportDialogOpen(true);
          parseExcelFile(file, "");
          return;
        }
      }
    } catch {
      // Fall through to normal flow if peeking fails
    }

    // Normal flow: no record_id → user must pick a mission for new rows
    setImportStep('select-mission');
    setImportDialogOpen(true);
    const { data: missionsData } = await supabase
      .from('missions')
      .select('id, mission_code, mission_name, activity_date, governorate')
      .eq('team_id', teamId)
      .order('activity_date', { ascending: false });
    setImportMissions(missionsData || []);
  };

  const parseExcelFile = async (file: File, missionId: string = "") => {
    setImportLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonRows.length === 0) {
        toast.error("الملف لا يحتوي على بيانات");
        setImportLoading(false);
        return;
      }

      // Normalize column names
      const colMap: Record<string, string> = {
        'record_id': 'record_id',                                              // round-trip update key
        'اسم المستفيد': 'full_name', 'الاسم': 'full_name', 'full_name': 'full_name',
        'الرقم القومي': 'national_id', 'رقم قومي': 'national_id', 'national_id': 'national_id',
        'التليفون': 'phone', 'الهاتف': 'phone', 'phone': 'phone',
        'تاريخ الميلاد': 'birthdate', 'birthdate': 'birthdate',
        'النوع': 'gender', 'الجنس': 'gender', 'gender': 'gender',
        'الجنسية': 'nationality', 'nationality': 'nationality',
        'نوع الخدمة': 'service_type', 'service_type': 'service_type',
        'الكمية': 'service_quantity', 'service_quantity': 'service_quantity',
        // group fields
        'الفئة العمرية': 'age_category', 'age_category': 'age_category',
        'عدد المستفيدين': 'count', 'count': 'count',
        'كمية الخدمة (لكل فرد)': 'service_quantity',
      };
      // Read-only info columns that should not be imported as custom fields
      const skipCols = new Set([
        'كود المهمة', 'اسم المهمة', 'تاريخ النشاط', 'المحافظة', 'تفاصيل النشاط',
        'mission_code', 'mission_name', 'activity_date', 'governorate', 'activity_details',
      ]);

      const normalized = jsonRows.map(row => {
        const mapped: any = { custom_metadata: {} };
        for (const [key, val] of Object.entries(row)) {
          const trimmedKey = String(key).trim();
          if (skipCols.has(trimmedKey)) continue;
          const mappedField = colMap[trimmedKey];
          if (mappedField) {
            mapped[mappedField] = String(val).trim();
          } else {
            if (trimmedKey) mapped.custom_metadata[trimmedKey] = String(val).trim();
          }
        }
        // For rows without record_id, assign the chosen mission
        if (!mapped.record_id && missionId) {
          mapped.mission_id = missionId;
        }
        return mapped;
      });

      setImportPreview(normalized);
      setImportStep('preview');
    } catch (err: any) {
      toast.error("فشل قراءة الملف: " + err.message);
    }
    setImportLoading(false);
  };

  const commitImport = async () => {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    setImportProgress({ current: 0, total: importPreview.length });
    let updatedCount = 0;
    let insertedCount = 0;
    let failCount = 0;

    // Split rows into UPDATE (have record_id) and INSERT (no record_id)
    const updateRows = importPreview.filter(r => r.record_id?.trim());
    const insertRows = importPreview.filter(r => !r.record_id?.trim());

    // ── 1. Process UPDATEs in parallel chunks of 20 ─────────────────────────
    const CHUNK = 20;
    for (let i = 0; i < updateRows.length; i += CHUNK) {
      const chunk = updateRows.slice(i, i + CHUNK);
      const results = await Promise.all(
        chunk.map(async (row) => {
          const nationalId = row.national_id || "";
          let id_hash = null;
          let encrypted_id = null;
          if (nationalId) {
            id_hash = await sha256(nationalId);
            encrypted_id = await encryptData(nationalId);
          }
          const payload: any = {
            full_name: row.full_name || null,
            phone: row.phone || null,
            birthdate: row.birthdate || null,
            gender: row.gender || null,
            nationality: row.nationality || null,
            service_type: row.service_type || null,
            service_quantity: parseInt(row.service_quantity) || 1,
            custom_metadata: Object.keys(row.custom_metadata || {}).length > 0 ? row.custom_metadata : null,
          };
          if (id_hash) { payload.id_hash = id_hash; payload.encrypted_id = encrypted_id; }
          const { error } = await supabase
            .from('beneficiaries_individual')
            .update(payload)
            .eq('id', row.record_id.trim());
          return error ? 'fail' : 'ok';
        })
      );
      results.forEach(r => r === 'ok' ? updatedCount++ : failCount++);
      setImportProgress(prev => ({ ...prev, current: Math.min(prev.total, i + CHUNK + insertedCount) }));
    }

    // ── 2. Batch-insert new rows (no record_id) all at once ──────────────────
    if (insertRows.length > 0) {
      // Encrypt IDs first (can be parallelised)
      const prepared = await Promise.all(
        insertRows.map(async (row) => {
          const nationalId = row.national_id || "";
          let id_hash = null;
          let encrypted_id = null;
          if (nationalId) {
            id_hash = await sha256(nationalId);
            encrypted_id = await encryptData(nationalId);
          }
          return {
            mission_id: row.mission_id,
            full_name: row.full_name || null,
            phone: row.phone || null,
            birthdate: row.birthdate || null,
            gender: row.gender || null,
            nationality: row.nationality || null,
            service_type: row.service_type || null,
            service_quantity: parseInt(row.service_quantity) || 1,
            id_hash,
            encrypted_id,
            custom_metadata: Object.keys(row.custom_metadata || {}).length > 0 ? row.custom_metadata : null,
          };
        })
      );
      // Insert in chunks of 200 to avoid payload limits
      for (let i = 0; i < prepared.length; i += 200) {
        const { error } = await supabase
          .from('beneficiaries_individual')
          .insert(prepared.slice(i, i + 200));
        if (error) { failCount += Math.min(200, prepared.length - i); console.error(error); }
        else insertedCount += Math.min(200, prepared.length - i);
        setImportProgress(prev => ({ ...prev, current: updatedCount + insertedCount + failCount }));
      }
    }

    setImportProgress(prev => ({ ...prev, current: prev.total }));
    setImportLoading(false);
    setImportStep('done');
    const total = updatedCount + insertedCount;
    if (total > 0) {
      const parts = [];
      if (updatedCount > 0) parts.push(`تم تحديث ${updatedCount} سجل`);
      if (insertedCount > 0) parts.push(`إضافة ${insertedCount} سجل جديد`);
      if (failCount > 0) parts.push(`${failCount} فشل`);
      toast.success(parts.join(' · '));
      fetchBeneficiaries();
    } else {
      toast.error("فشل الاستيراد، يرجى مراجعة الملف");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const saveAllIndiv = async () => {
    setSaving(true);
    let successCount = 0;
    const modifiedRows = indivBens.filter(row => {
      const orig = originalIndivBens.find(o => o.id === row.id);
      return JSON.stringify(row) !== JSON.stringify(orig);
    });

    if (modifiedRows.length === 0) {
      toast.info("لا توجد تعديلات لحفظها");
      setSaving(false);
      return;
    }

    for (const row of modifiedRows) {
      let hash = null;
      let enc = null;
      if (row.decrypted_id) {
        hash = await sha256(row.decrypted_id);
        enc = await encryptData(row.decrypted_id);
      }

      const { error } = await supabase
        .from("beneficiaries_individual")
        .update({
          full_name: row.full_name,
          phone: row.phone,
          service_type: row.service_type,
          service_quantity: parseInt(row.service_quantity) || 1,
          birthdate: row.birthdate,
          nationality: row.nationality,
          gender: row.gender,
          id_hash: hash,
          encrypted_id: enc,
          custom_metadata: row.custom_metadata,
        })
        .eq("id", row.id);

      if (!error) successCount++;
    }

    if (successCount === modifiedRows.length) {
      toast.success(`تم حفظ ${successCount} سجل بنجاح`);
      setOriginalIndivBens(JSON.parse(JSON.stringify(indivBens)));
    } else {
      toast.error("حدث خطأ أثناء حفظ بعض السجلات");
    }
    setSaving(false);
  };

  const saveAllGroup = async () => {
    setSaving(true);
    let successCount = 0;
    const modifiedRows = groupBens.filter(row => {
      const orig = originalGroupBens.find(o => o.id === row.id);
      return JSON.stringify(row) !== JSON.stringify(orig);
    });

    if (modifiedRows.length === 0) {
      toast.info("لا توجد تعديلات لحفظها");
      setSaving(false);
      return;
    }

    for (const row of modifiedRows) {
      const { error } = await supabase
        .from("beneficiaries_group")
        .update({
          nationality: row.nationality,
          gender: row.gender,
          age_category: row.age_category,
          count: parseInt(row.count) || 1,
          service_type: row.service_type,
          service_quantity: parseInt(row.service_quantity) || 1,
          custom_metadata: row.custom_metadata,
        })
        .eq("id", row.id);

      if (!error) successCount++;
    }

    if (successCount === modifiedRows.length) {
      toast.success(`تم حفظ ${successCount} سجل بنجاح`);
      setOriginalGroupBens(JSON.parse(JSON.stringify(groupBens)));
    } else {
      toast.error("حدث خطأ أثناء حفظ بعض السجلات");
    }
    setSaving(false);
  };

  const applyFilters = (data: any[], originalData: any[]) => {
    return data.filter(b => {
      const matchSearch = searchTerm ? (
        (b.full_name && b.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.decrypted_id && b.decrypted_id.includes(searchTerm)) ||
        (b.phone && b.phone.includes(searchTerm))
      ) : true;
      const matchDate = filterDate ? (b.activity_date === filterDate) : true;
      const matchGov = filterGov ? (b.governorate && b.governorate.includes(filterGov)) : true;
      const matchMission = filterMission ? (b.mission_name && b.mission_name.includes(filterMission)) : true;
      const matchDetails = filterDetails ? (b.activity_details && b.activity_details.includes(filterDetails)) : true;
      
      let matchColumns = true;
      for (const [col, values] of Object.entries(columnFilters)) {
        if (values.length > 0) {
          // Use original data for column filtering so rows don't disappear while editing
          const originalRow = originalData.find(o => o.id === b.id) || b;
          let cellValue = "";
          if (availableCustomFields.includes(col)) {
            cellValue = originalRow.custom_metadata?.[col] || "";
          } else {
            cellValue = originalRow[col] || "";
          }
          if (!values.includes(cellValue)) {
            matchColumns = false;
            break;
          }
        }
      }

      return matchSearch && matchDate && matchGov && matchMission && matchDetails && matchColumns;
    });
  };

  const filteredIndiv = applyFilters(indivBens, originalIndivBens);
  const filteredGroup = applyFilters(groupBens, originalGroupBens);

  // ─── Export Excel ──────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // ─ Sheet 1: Individual beneficiaries
    const allCustomKeysIndiv = Array.from(
      new Set(filteredIndiv.flatMap(r => Object.keys(r.custom_metadata || {})))
    );

    // record_id is the first column so re-import can identify rows for update
    const indivHeaders = [
      'record_id',
      'كود المهمة', 'اسم المهمة', 'تاريخ النشاط', 'المحافظة', 'تفاصيل النشاط',
      'اسم المستفيد', 'الرقم القومي', 'التليفون', 'تاريخ الميلاد',
      'النوع', 'الجنسية', 'نوع الخدمة', 'الكمية',
      ...allCustomKeysIndiv,
    ];

    const indivRows = filteredIndiv.map(r => [
      r.id || '',
      r.mission_code || '',
      r.mission_name || '',
      r.activity_date || '',
      r.governorate || '',
      r.activity_details || '',
      r.full_name || '',
      r.decrypted_id || '',
      r.phone || '',
      r.birthdate || '',
      r.gender || '',
      r.nationality || '',
      r.service_type || '',
      r.service_quantity ?? 1,
      ...allCustomKeysIndiv.map(k => r.custom_metadata?.[k] ?? ''),
    ]);

    const wsIndiv = XLSX.utils.aoa_to_sheet([indivHeaders, ...indivRows]);
    wsIndiv['!cols'] = indivHeaders.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, wsIndiv, 'مستفيدين فردي');

    // ─ Sheet 2: Group beneficiaries
    const allCustomKeysGroup = Array.from(
      new Set(filteredGroup.flatMap(r => Object.keys(r.custom_metadata || {})))
    );

    const groupHeaders = [
      'record_id',
      'كود المهمة', 'اسم المهمة', 'تاريخ النشاط', 'المحافظة', 'تفاصيل النشاط',
      'الجنسية', 'النوع', 'الفئة العمرية', 'عدد المستفيدين',
      'نوع الخدمة', 'كمية الخدمة (لكل فرد)',
      ...allCustomKeysGroup,
    ];

    const groupRows = filteredGroup.map(r => [
      r.id || '',
      r.mission_code || '',
      r.mission_name || '',
      r.activity_date || '',
      r.governorate || '',
      r.activity_details || '',
      r.nationality || '',
      r.gender || '',
      r.age_category || '',
      r.count ?? 1,
      r.service_type || '',
      r.service_quantity ?? 1,
      ...allCustomKeysGroup.map(k => r.custom_metadata?.[k] ?? ''),
    ]);

    const wsGroup = XLSX.utils.aoa_to_sheet([groupHeaders, ...groupRows]);
    wsGroup['!cols'] = groupHeaders.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, wsGroup, 'مستفيدين جماعي');

    // Generate filename with date
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `بيانات_فريق_${teamCode}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`تم تصدير ${filteredIndiv.length + filteredGroup.length} سجل بنجاح`);
  };
  // ─────────────────────────────────────────────────────────────────────────

  if (loading && !isAuthenticated) {
    return (
      <AppLayout title="جاري التحميل...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin w-10 h-10 text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="قاعدة بيانات الفريق">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 w-full max-w-md space-y-6 shadow-xl border-primary/20 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {isFirstTime ? <Key className="w-8 h-8 text-primary" /> : <Lock className="w-8 h-8 text-primary" />}
              </div>
              <h2 className="text-2xl font-bold">{isFirstTime ? "إعداد الفريق لأول مرة" : "دخول الفريق"}</h2>
              <p className="text-muted-foreground text-sm">
                {isFirstTime 
                  ? `برجاء تعيين كلمة مرور لفريقك (${teamCode}) للبدء` 
                  : `برجاء إدخال كلمة مرور الفريق (${teamCode})`}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>كلمة المرور</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="****"
                  className="text-center text-lg tracking-widest"
                  onKeyDown={(e) => e.key === 'Enter' && (isFirstTime ? handleSetPassword() : handleLogin())}
                />
              </div>
              {isFirstTime ? (
                <Button onClick={handleSetPassword} disabled={busy} className="w-full gap-2">
                  {busy ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  حفظ وتفعيل الدخول
                </Button>
              ) : (
                <Button onClick={handleLogin} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : "دخول"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`قاعدة بيانات فريق ${teamCode}`}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="flex gap-2 bg-muted/50 p-1 rounded-md">
            <Button 
              size="sm" 
              variant={!isEditMode ? "default" : "ghost"} 
              onClick={() => setIsEditMode(false)}
              className="rounded-sm"
            >
              <Eye className="w-4 h-4 ml-2" />
              وضع العرض
            </Button>
            <Button 
              size="sm" 
              variant={isEditMode ? "default" : "ghost"} 
              onClick={() => setIsEditMode(true)}
              className="rounded-sm"
            >
              <Edit className="w-4 h-4 ml-2" />
              وضع التعديل الذكي
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsAuthenticated(false); setPassword(""); }} className="text-xs">
              <Lock className="w-3 h-3 ml-1" /> قفل
            </Button>
            {/* Hidden file input for Excel import */}
            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) openImportFlow(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => importFileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" /> استيراد Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={handleExportExcel}
            >
              <Download className="w-4 h-4" /> تصدير Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 border-primary/10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث سريع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-9" />
            </div>
            <Input placeholder="التاريخ" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            
            <select 
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
              value={filterGov}
              onChange={e => setFilterGov(e.target.value)}
            >
              <option value="">المحافظة (الكل)</option>
              {Array.from(new Set([...indivBens, ...groupBens].map(b => b.governorate).filter(Boolean))).sort().map(gov => (
                <option key={gov} value={gov} className="text-foreground">{gov}</option>
              ))}
            </select>
            
            <Input placeholder="اسم المهمة" value={filterMission} onChange={e => setFilterMission(e.target.value)} />
            
            <select 
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
              value={filterDetails}
              onChange={e => setFilterDetails(e.target.value)}
            >
              <option value="">تفاصيل النشاط (الكل)</option>
              {Array.from(new Set([...indivBens, ...groupBens].map(b => b.activity_details).filter(Boolean))).sort().map(det => (
                <option key={det} value={det} className="text-foreground">{det}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4">
            {isGlobalAdmin && (
              <div className="w-1/3">
                <Label className="text-xs text-muted-foreground mb-1 block">الفريق</Label>
                <select 
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">اختر الفريق لعرض المستفيدين</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>
            )}
            
            {availableCustomFields.length > 0 && (
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">عرض الحقول المخصصة للتعديل</Label>
                <div className="flex flex-wrap gap-2">
                  {availableCustomFields.map(field => {
                    const isSelected = selectedCustomFields.includes(field);
                    return (
                      <button
                        key={field}
                        onClick={() => {
                          setSelectedCustomFields(prev => 
                            isSelected ? prev.filter(f => f !== field) : [...prev, field]
                          );
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md transition-all border ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      >
                        {field}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="individual" className="py-2.5"><UserPlus className="w-4 h-4 ml-2" /> الفردي</TabsTrigger>
            <TabsTrigger value="group" className="py-2.5"><Users className="w-4 h-4 ml-2" /> الجماعي</TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            {isEditMode && (
              <div className="flex justify-end mb-4">
                <Button onClick={saveAllIndiv} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ كافة التعديلات (الفردي)
                </Button>
              </div>
            )}
            <Card className="overflow-hidden border-primary/10 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[80px]">المهمة</TableHead>
                      <TableHead className="w-[150px]">التاريخ / المحافظة</TableHead>
                      <TableHead className="w-[200px]"><ColumnFilter columnKey="full_name" label="اسم المستفيد" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[150px]"><ColumnFilter columnKey="decrypted_id" label="الرقم القومي" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[120px]"><ColumnFilter columnKey="phone" label="التليفون" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[120px]"><ColumnFilter columnKey="birthdate" label="تاريخ الميلاد" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[100px]"><ColumnFilter columnKey="gender" label="النوع" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[100px]"><ColumnFilter columnKey="nationality" label="الجنسية" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[120px]"><ColumnFilter columnKey="service_type" label="نوع الخدمة" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[80px]"><ColumnFilter columnKey="service_quantity" label="الكمية" dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      {selectedCustomFields.map(field => (
                        <TableHead key={field} className="w-[150px] whitespace-normal min-w-[120px]">
                          <ColumnFilter columnKey={field} label={field} dataList={indivBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} />
                        </TableHead>
                      ))}
                      {isEditMode && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndiv.map((b, index) => (
                      <TableRow key={b.id} className="hover:bg-muted/30 transition-colors whitespace-nowrap">
                        <TableCell 
                          className="text-xs font-bold text-primary cursor-pointer hover:underline" 
                          onClick={() => navigate(`/missions/${b.mission_id}`)}
                        >
                          {b.mission_code}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.activity_date}<br/>{b.governorate}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "full_name")}
                              value={b.full_name || ""} 
                              onChange={(e) => handleIndivChange(b.id, "full_name", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "full_name")}
                            />
                          ) : <span className="font-bold">{b.full_name}</span>}
                        </TableCell>
                        <TableCell dir="ltr">
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "decrypted_id")}
                              value={b.decrypted_id || ""} 
                              onChange={(e) => handleIndivChange(b.id, "decrypted_id", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "decrypted_id")}
                              dir="ltr"
                            />
                          ) : (b.decrypted_id || "—")}
                        </TableCell>
                        <TableCell dir="ltr">
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "phone")}
                              value={b.phone || ""} 
                              onChange={(e) => handleIndivChange(b.id, "phone", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "phone")}
                              dir="ltr"
                            />
                          ) : (b.phone || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "birthdate")}
                              value={b.birthdate || ""} 
                              onChange={(e) => handleIndivChange(b.id, "birthdate", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "birthdate")}
                              type="date"
                            />
                          ) : (b.birthdate || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "gender")}
                              value={b.gender || ""} 
                              onChange={(e) => handleIndivChange(b.id, "gender", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "gender")}
                            />
                          ) : (b.gender || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "nationality")}
                              value={b.nationality || ""} 
                              onChange={(e) => handleIndivChange(b.id, "nationality", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "nationality")}
                            />
                          ) : (b.nationality || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "service_type")}
                              value={b.service_type || ""} 
                              onChange={(e) => handleIndivChange(b.id, "service_type", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "service_type")}
                            />
                          ) : <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{b.service_type || "—"}</span>}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("indiv", index, "service_quantity")}
                              value={b.service_quantity || "1"} 
                              onChange={(e) => handleIndivChange(b.id, "service_quantity", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "service_quantity")}
                              type="number"
                              min="1"
                            />
                          ) : (b.service_quantity || "1")}
                        </TableCell>
                        {selectedCustomFields.map(field => (
                          <TableCell key={field}>
                            {isEditMode ? (
                              <Input 
                                {...getSelectionProps("indiv", index, field)}
                                value={b.custom_metadata?.[field] || ""} 
                                onChange={(e) => handleIndivChange(b.id, field, e.target.value, true)} 
                                onPaste={(e) => handleIndivPaste(e, b.id, field, true)} 
                              />
                            ) : (b.custom_metadata?.[field] || "—")}
                          </TableCell>
                        ))}
                        {isEditMode && (
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive" 
                              onClick={() => handleDeleteIndiv(b.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {filteredIndiv.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-20 text-muted-foreground">
                          {loading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "لا توجد بيانات فردية"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="group">
            {isEditMode && (
              <div className="flex justify-end mb-4">
                <Button onClick={saveAllGroup} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ كافة التعديلات (الجماعي)
                </Button>
              </div>
            )}
            <Card className="overflow-hidden border-primary/10 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[80px]">المهمة</TableHead>
                      <TableHead className="w-[120px]">التاريخ / المحافظة</TableHead>
                      <TableHead className="w-[100px]"><ColumnFilter columnKey="nationality" label="الجنسية" dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[100px]"><ColumnFilter columnKey="gender" label="النوع" dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[120px]"><ColumnFilter columnKey="age_category" label="الفئة العمرية" dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[100px]"><ColumnFilter columnKey="count" label="العدد (المستفيدين)" dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[120px]"><ColumnFilter columnKey="service_type" label="نوع الخدمة" dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      <TableHead className="w-[100px]"><ColumnFilter columnKey="service_quantity" label="كمية الخدمة (لكل فرد)" dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} /></TableHead>
                      {selectedCustomFields.map(field => (
                        <TableHead key={field} className="w-[150px] whitespace-normal min-w-[120px]">
                          <ColumnFilter columnKey={field} label={field} dataList={groupBens} availableCustomFields={availableCustomFields} columnFilters={columnFilters} setColumnFilters={setColumnFilters} />
                        </TableHead>
                      ))}
                      {isEditMode && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroup.map((b, index) => (
                      <TableRow key={b.id} className="hover:bg-muted/30 transition-colors whitespace-nowrap">
                        <TableCell 
                          className="text-xs font-bold text-primary cursor-pointer hover:underline" 
                          onClick={() => navigate(`/missions/${b.mission_id}`)}
                        >
                          {b.mission_code}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.activity_date}<br/>{b.governorate}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("group", index, "nationality")}
                              value={b.nationality || ""} 
                              onChange={(e) => handleGroupChange(b.id, "nationality", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "nationality")}
                            />
                          ) : (b.nationality || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("group", index, "gender")}
                              value={b.gender || ""} 
                              onChange={(e) => handleGroupChange(b.id, "gender", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "gender")}
                            />
                          ) : (b.gender || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("group", index, "age_category")}
                              value={b.age_category || ""} 
                              onChange={(e) => handleGroupChange(b.id, "age_category", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "age_category")}
                            />
                          ) : (b.age_category || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("group", index, "count")}
                              value={b.count || ""} 
                              onChange={(e) => handleGroupChange(b.id, "count", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "count")}
                              type="number"
                            />
                          ) : <span className="font-bold">{b.count || "1"}</span>}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("group", index, "service_type")}
                              value={b.service_type || ""} 
                              onChange={(e) => handleGroupChange(b.id, "service_type", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "service_type")}
                            />
                          ) : <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{b.service_type || "—"}</span>}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              {...getSelectionProps("group", index, "service_quantity")}
                              value={b.service_quantity || "1"} 
                              onChange={(e) => handleGroupChange(b.id, "service_quantity", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "service_quantity")}
                              type="number"
                              min="1"
                            />
                          ) : (b.service_quantity || "1")}
                        </TableCell>
                        {selectedCustomFields.map(field => (
                          <TableCell key={field}>
                            {isEditMode ? (
                              <Input 
                                {...getSelectionProps("group", index, field)}
                                value={b.custom_metadata?.[field] || ""} 
                                onChange={(e) => handleGroupChange(b.id, field, e.target.value, true)} 
                                onPaste={(e) => handleGroupPaste(e, b.id, field, true)} 
                              />
                            ) : (b.custom_metadata?.[field] || "—")}
                          </TableCell>
                        ))}
                        {isEditMode && (
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive" 
                              onClick={() => handleDeleteGroup(b.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {filteredGroup.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                          {loading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "لا توجد بيانات جماعية"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      {/* ── Import Excel Dialog ────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={(o) => { if (!importLoading) { setImportDialogOpen(o); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              استيراد مستفيدين من Excel
            </DialogTitle>
            <DialogDescription>
              {importStep === 'select-mission' && 'اختر المهمة التي ستُضاف إليها السجلات الجديدة (السجلات التي تحتوي على record_id سيتم تحديثها تلقائياً)'}
              {importStep === 'preview' && `معاينة ${importPreview.length} سجل — السجلات بـ record_id ستُحدَّث، وبدونه ستُضاف جديدة`}
              {importStep === 'done' && 'تم الاستيراد بنجاح'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1 – Mission selection */}
          {importStep === 'select-mission' && (
            <div className="space-y-4 py-2">
              <Label>اختر المهمة</Label>
              {importMissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد مهام مسجلة لهذا الفريق</p>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                  {importMissions.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setImportSelectedMissionId(m.id)}
                      className={`w-full text-right px-4 py-2.5 text-sm transition-colors ${
                        importSelectedMissionId === m.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="font-bold">{m.mission_code}</span>
                      {m.mission_name && ` – ${m.mission_name}`}
                      {m.activity_date && <span className="text-xs opacity-70 mr-2">({m.activity_date})</span>}
                      {m.governorate && <span className="text-xs opacity-70"> · {m.governorate}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 – Preview */}
          {importStep === 'preview' && (() => {
            const updateRows = importPreview.filter(r => r.record_id?.trim());
            const newRows = importPreview.filter(r => !r.record_id?.trim());
            return (
            <div className="space-y-3 py-2">
              <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {updateRows.length > 0 && <span className="font-semibold text-blue-700">🔄 {updateRows.length} سيتم تحديثهم </span>}
                  {newRows.length > 0 && <span className="font-semibold text-green-700">✚ {newRows.length} سيتم إضافتهم جدد </span>}
                </span>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <table className="text-xs w-full">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-right font-medium">#</th>
                      <th className="px-3 py-2 text-right font-medium">الحالة</th>
                      <th className="px-3 py-2 text-right font-medium">الاسم</th>
                      <th className="px-3 py-2 text-right font-medium">الرقم القومي</th>
                      <th className="px-3 py-2 text-right font-medium">الهاتف</th>
                      <th className="px-3 py-2 text-right font-medium">النوع</th>
                      <th className="px-3 py-2 text-right font-medium">الجنسية</th>
                      <th className="px-3 py-2 text-right font-medium">نوع الخدمة</th>
                      <th className="px-3 py-2 text-right font-medium">الكمية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importPreview.slice(0, 50).map((row, i) => (
                      <tr key={i} className={`hover:bg-muted/30 ${row.record_id?.trim() ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          {row.record_id?.trim()
                            ? <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">تحديث</span>
                            : <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">جديد</span>
                          }
                        </td>
                        <td className="px-3 py-1.5">{row.full_name || '—'}</td>
                        <td className="px-3 py-1.5" dir="ltr">{row.national_id || '—'}</td>
                        <td className="px-3 py-1.5" dir="ltr">{row.phone || '—'}</td>
                        <td className="px-3 py-1.5">{row.gender || '—'}</td>
                        <td className="px-3 py-1.5">{row.nationality || '—'}</td>
                        <td className="px-3 py-1.5">{row.service_type || '—'}</td>
                        <td className="px-3 py-1.5">{row.service_quantity || '1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">يتم عرض أول 50 سجل فقط للمعاينة</p>
              )}
            </div>
            );
          })()}

          {/* Step 3 – Done */}
          {importStep === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              <p className="text-lg font-semibold">اكتمل الاستيراد!</p>
              <p className="text-sm text-muted-foreground">يمكنك الآن إغلاق هذه النافذة ومراجعة البيانات.</p>
            </div>
          )}

          <DialogFooter className="gap-2 flex-row-reverse">
            {importStep === 'select-mission' && (
              <>
                <Button
                  onClick={() => {
                    if (!importSelectedMissionId) { toast.error('يرجى اختيار مهمة أولاً'); return; }
                    if (importPendingFile) parseExcelFile(importPendingFile, importSelectedMissionId);
                  }}
                  disabled={!importSelectedMissionId || importLoading}
                  className="gap-2"
                >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  معاينة البيانات
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>إلغاء</Button>
              </>
            )}
            {importStep === 'preview' && (
              <>
                {importLoading && (
                  <div className="w-full mb-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>جاري المعالجة...</span>
                      <span>{importProgress.current} / {importProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}% — لا تغلق هذه النافذة
                    </p>
                  </div>
                )}
                <Button
                  onClick={commitImport}
                  disabled={importLoading}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importLoading ? `جاري المعالجة (${importProgress.current}/${importProgress.total})` : `تأكيد الاستيراد (${importPreview.length} سجل)`}
                </Button>
                <Button variant="outline" onClick={() => setImportStep('select-mission')} disabled={importLoading}>رجوع</Button>
              </>
            )}
            {importStep === 'done' && (
              <Button onClick={() => setImportDialogOpen(false)}>إغلاق</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
