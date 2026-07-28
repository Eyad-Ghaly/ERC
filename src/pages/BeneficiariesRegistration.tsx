import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useDropdownOptions } from "@/hooks/useDropdownOptions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, UserPlus, Users, Loader2, ListTodo, CheckSquare, Search, History, HeartHandshake, Globe, BarChart as BarChartIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SmartBeneficiariesUploader } from "@/components/SmartBeneficiariesUploader";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Utility: SHA-256 hash of a string (browser native)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
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
    return "********"; // Return masked on error
  }
}

// مكون فرعي لاختيار القوائم المنسدلة بناءً على المفتاح
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

export default function BeneficiariesRegistration() {
  const { user, profile } = useAuth();
  const [targets, setTargets] = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending'|'completed'>('pending');

  const [registeredIndivs, setRegisteredIndivs] = useState<any[]>([]);
  const [registeredGroups, setRegisteredGroups] = useState<any[]>([]);

  // Custom fields for this team
  const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  // Registry lookup
  const [registryMatch, setRegistryMatch] = useState<any | null>(null);
  const [prevServices, setPrevServices] = useState<any[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [lookingUp, setLookingUp] = useState(false);

  // Individual State
  const [indivNationalId, setIndivNationalId] = useState("");
  const [indivFullName, setIndivFullName] = useState("");
  const [indivPhone, setIndivPhone] = useState("");
  const [indivBirthdate, setIndivBirthdate] = useState("");
  const [indivNationality, setIndivNationality] = useState("");
  const [indivGender, setIndivGender] = useState("");
  const [indivServiceType, setIndivServiceType] = useState("");
  const [indivServiceQuantity, setIndivServiceQuantity] = useState("1");

  // Group State
  const [groupNationality, setGroupNationality] = useState("");
  const [groupGender, setGroupGender] = useState("");
  const [groupAgeCategory, setGroupAgeCategory] = useState("");
  const [groupCount, setGroupCount] = useState("1");
  const [groupServiceType, setGroupServiceType] = useState("");
  const [busy, setBusy] = useState(false);

  // Global Beneficiaries Search & Stats State
  const [allIndivBens, setAllIndivBens] = useState<any[]>([]);
  const [allGroupBens, setAllGroupBens] = useState<any[]>([]);
  const [benSearchQuery, setBenSearchQuery] = useState("");

  const fetchAllBeneficiaries = async () => {
    if (!user) return;
    let allMissions: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      let query = supabase
        .from("missions")
        .select("id, mission_code, mission_name, activity_date, beneficiaries_individual(*), beneficiaries_group(*)")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error("fetchAllBeneficiaries error:", error);
        break;
      }

      if (data && data.length > 0) {
        allMissions = [...allMissions, ...data];
        if (data.length < pageSize) hasMore = false;
        else page++;
      } else {
        hasMore = false;
      }
    }

    let indivList: any[] = [];
    let groupList: any[] = [];

    allMissions.forEach((m) => {
      (m.beneficiaries_individual || []).forEach((b: any) => {
        indivList.push({
          ...b,
          mission_code: m.mission_code,
          mission_name: m.mission_name,
          date: m.activity_date,
        });
      });
      (m.beneficiaries_group || []).forEach((g: any) => {
        groupList.push({
          ...g,
          mission_code: m.mission_code,
          mission_name: m.mission_name,
          date: m.activity_date,
        });
      });
    });

    const decryptedIndivs = await Promise.all(
      indivList.map(async (b) => ({
        ...b,
        decrypted_id: b.encrypted_id
          ? await decryptData(b.encrypted_id)
          : b.id_hash
          ? "مسجل بالهاش"
          : "غير مدخل",
      }))
    );

    setAllIndivBens(decryptedIndivs);
    setAllGroupBens(groupList);
  };

  const totalServicesCount = (allIndivBens.reduce((acc, b) => acc + Number(b.service_quantity || 1), 0)) +
    (allGroupBens.reduce((acc, g) => acc + Number(g.count || 0), 0));

  const totalBeneficiariesCount = allIndivBens.length + (allGroupBens.reduce((acc, g) => acc + Number(g.count || 0), 0));

  const genderData = (() => {
    const counts: Record<string, number> = {};
    allIndivBens.forEach((b) => {
      let g = b.gender || "غير محدد";
      if (g.trim().includes("ذكر") || g.toLowerCase() === "male") g = "ذكر";
      else if (g.trim().includes("أنثى") || g.toLowerCase() === "female") g = "أنثى";
      counts[g] = (counts[g] || 0) + (b.service_quantity || 1);
    });
    allGroupBens.forEach((g) => {
      let gen = g.gender || "غير محدد";
      if (gen.trim().includes("ذكر") || gen.toLowerCase() === "male") gen = "ذكر";
      else if (gen.trim().includes("أنثى") || gen.toLowerCase() === "female") gen = "أنثى";
      counts[gen] = (counts[gen] || 0) + (g.count || 0);
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const nationalityData = (() => {
    const counts: Record<string, number> = {};
    allIndivBens.forEach((b) => {
      const nat = b.nationality || "غير محدد";
      counts[nat] = (counts[nat] || 0) + (b.service_quantity || 1);
    });
    allGroupBens.forEach((g) => {
      const nat = g.nationality || "غير محدد";
      counts[nat] = (counts[nat] || 0) + (g.count || 0);
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  const filteredAllBens = (() => {
    if (!benSearchQuery.trim()) return allIndivBens;
    const q = benSearchQuery.trim().toLowerCase();
    return allIndivBens.filter(
      (b) =>
        (b.full_name && b.full_name.toLowerCase().includes(q)) ||
        (b.decrypted_id && b.decrypted_id.includes(q)) ||
        (b.phone && b.phone.includes(q)) ||
        (b.mission_code && b.mission_code.toLowerCase().includes(q)) ||
        (b.service_type && b.service_type.toLowerCase().includes(q))
    );
  })();

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

  const triggerLookup = async (id: string) => {
    if (!id || id.length < 5) return;
    setLookingUp(true);
    const hash = await sha256(id);
    const { data } = await supabase.from('beneficiaries_registry').select('*').eq('id_hash', hash).maybeSingle();
    if (data) {
      setRegistryMatch(data);
      setIndivFullName(data.full_name || indivFullName);
      setIndivNationality(data.nationality || indivNationality);
      setIndivGender(data.gender || indivGender);
      setIndivBirthdate(data.birthdate || indivBirthdate);
      setIndivPhone(data.phone || indivPhone);
      // Fetch previous services
      const { data: prev } = await supabase
        .from('beneficiaries_individual')
        .select('service_type, service_quantity, created_at, mission_id, missions(mission_code, mission_name, team:teams(code))')
        .eq('registry_id', data.id)
        .order('created_at', { ascending: false });
      setPrevServices(prev || []);
    } else {
      setRegistryMatch(null);
      setPrevServices([]);
    }
    setLookingUp(false);
  };

  const fetchTargets = async () => {
    setLoading(true);
    let query = supabase
      .from("missions")
      .select("id, mission_code, mission_name, execution_place, activity_date, team_id, team:teams(code), is_open_mission, beneficiaries_status")
      .eq("has_beneficiaries", true)
      .limit(10000);

    if (profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    } else {
      query = query.eq("created_by", user.id);
    }

    const { data: mData, error } = await query;
    
    if (error || !mData) { setLoading(false); return; }

    const { data: drData } = await supabase
      .from("mission_daily_reports")
      .select("id, mission_id, day_number, report_date, beneficiaries_status");

    // Fetch sets of mission_ids and daily_report_ids that have registered beneficiaries
    const [{ data: indivMissions }, { data: groupMissions }] = await Promise.all([
      supabase.from("beneficiaries_individual").select("mission_id, daily_report_id"),
      supabase.from("beneficiaries_group").select("mission_id, daily_report_id"),
    ]);

    const missionsWithBens = new Set<string>();
    const reportsWithBens = new Set<string>();

    (indivMissions || []).forEach(b => {
      if (b.daily_report_id) reportsWithBens.add(b.daily_report_id);
      if (b.mission_id) missionsWithBens.add(b.mission_id);
    });

    (groupMissions || []).forEach(g => {
      if (g.daily_report_id) reportsWithBens.add(g.daily_report_id);
      if (g.mission_id) missionsWithBens.add(g.mission_id);
    });

    const isMissionCompleted = (m: any) => {
      return m.beneficiaries_status === 'completed' || missionsWithBens.has(m.id);
    };

    const isReportCompleted = (dr: any) => {
      return dr.beneficiaries_status === 'completed' || reportsWithBens.has(dr.id);
    };

    const singleTargets = mData
      .filter((m) => {
        if (m.is_open_mission) return false;
        const completed = isMissionCompleted(m);
        return statusFilter === 'completed' ? completed : !completed;
      })
      .map((m) => ({
        id: m.id,
        mission_id: m.id,
        daily_report_id: null,
        mission_code: m.mission_code,
        mission_name: m.mission_name,
        team_id: m.team_id,
        date: m.activity_date,
        place: m.execution_place,
        display_name: `${m.mission_code} - ${m.mission_name}`,
      }));

    const openTargets = (drData || [])
      .filter((dr) => {
        const completed = isReportCompleted(dr);
        return statusFilter === 'completed' ? completed : !completed;
      })
      .map((dr) => {
        const m = mData.find((x) => x.id === dr.mission_id);
        if (!m) return null;
        return {
          id: dr.id,
          mission_id: m.id,
          daily_report_id: dr.id,
          mission_code: `${m.mission_code}-${dr.day_number}`,
          mission_name: m.mission_name,
          team_id: m.team_id,
          date: dr.report_date,
          place: m.execution_place,
          display_name: `${m.mission_code}-${dr.day_number} (${dr.report_date}) - ${m.mission_name}`,
        };
      })
      .filter(Boolean);

    setTargets([...singleTargets, ...openTargets]);
    setLoading(false);
  };

  const fetchRegistered = async (target: any) => {
    if (!target) {
      setRegisteredIndivs([]);
      setRegisteredGroups([]);
      return;
    }
    let indivQ = supabase.from("beneficiaries_individual").select("*").eq("mission_id", target.mission_id);
    let groupQ = supabase.from("beneficiaries_group").select("*").eq("mission_id", target.mission_id);

    if (target.daily_report_id) {
      indivQ = indivQ.eq("daily_report_id", target.daily_report_id);
      groupQ = groupQ.eq("daily_report_id", target.daily_report_id);
    } else {
      indivQ = indivQ.is("daily_report_id", null);
      groupQ = groupQ.is("daily_report_id", null);
    }

    const [{ data: ind }, { data: grp }] = await Promise.all([indivQ, groupQ]);
    
    if (ind) {
       const decryptedInd = await Promise.all(ind.map(async (r: any) => {
          return {
             ...r,
             decrypted_id: r.encrypted_id ? await decryptData(r.encrypted_id) : "—"
          };
       }));
       setRegisteredIndivs(decryptedInd);
    } else {
       setRegisteredIndivs([]);
    }
    
    setRegisteredGroups(grp || []);
  };

  useEffect(() => {
    if (user) {
      fetchTargets();
      fetchAllBeneficiaries();
    }
  }, [user, profile, statusFilter]);

  useEffect(() => {
    const target = targets.find(t => t.id === selectedTargetId);
    fetchRegistered(target);

    // Fetch custom field definitions for this team
    if (target?.team_id) {
      supabase
        .from("team_custom_fields")
        .select("*")
        .eq("team_id", target.team_id)
        .order("sort_order")
        .then(({ data }) => {
          setCustomFieldDefs(data ?? []);
          setCustomValues({});
        });
    } else {
      setCustomFieldDefs([]);
      setCustomValues({});
    }
  }, [selectedTargetId, targets]);

  // Lookup by national ID hash when ID field loses focus
  const handleIdBlur = async () => {
    const trimmed = indivNationalId.trim();
    if (!trimmed) { setRegistryMatch(null); setPrevServices([]); return; }
    setLookingUp(true);
    const hash = await sha256(trimmed);
    const { data } = await supabase.from('beneficiaries_registry').select('*').eq('id_hash', hash).maybeSingle();
    if (data) {
      setRegistryMatch(data);
      setIndivFullName(data.full_name || indivFullName);
      setIndivNationality(data.nationality || indivNationality);
      setIndivGender(data.gender || indivGender);
      setIndivBirthdate(data.birthdate || indivBirthdate);
      setIndivPhone(data.phone || indivPhone);
      // Fetch previous services
      const { data: prev } = await supabase
        .from('beneficiaries_individual')
        .select('service_type, service_quantity, created_at, mission_id, missions(mission_code, mission_name, team:teams(code))')
        .eq('registry_id', data.id)
        .order('created_at', { ascending: false });
      setPrevServices(prev || []);
    } else {
      setRegistryMatch(null);
      setPrevServices([]);
    }
    setLookingUp(false);
  };

  // Autocomplete by name — search the entire shared registry
  const handleNameChange = async (val: string) => {
    setIndivFullName(val);
    setRegistryMatch(null);
    setPrevServices([]);
    if (val.length < 2) { setNameSuggestions([]); return; }
    const { data } = await supabase
      .from('beneficiaries_registry')
      .select('id, full_name, nationality, birthdate, phone, id_hash')
      .ilike('full_name', `%${val}%`)
      .order('full_name')
      .limit(8);
    setNameSuggestions(data || []);
  };

  const applyRegistrySuggestion = async (reg: any) => {
    setIndivFullName(reg.full_name);
    setIndivNationality(reg.nationality || "");
    setIndivGender(reg.gender || "");
    setIndivBirthdate(reg.birthdate || "");
    setIndivPhone(reg.phone || "");
    setNameSuggestions([]);
    setRegistryMatch(reg);
    if (reg.id) {
      const { data: prev } = await supabase
        .from('beneficiaries_individual')
        .select('service_type, service_quantity, created_at, mission_id, missions(mission_code, mission_name, team:teams(code))')
        .eq('registry_id', reg.id)
        .order('created_at', { ascending: false });
      setPrevServices(prev || []);
    }
  };

  const submitIndividual = async () => {
    if (!selectedTargetId) return toast.error("اختر المهمة أولاً");
    if (!indivFullName.trim()) return toast.error("أدخل اسم المستفيد");
    if (indivPhone && indivPhone.length !== 11) return toast.error("رقم التليفون يجب أن يكون 11 رقماً بالضبط");
    
    const target = targets.find(t => t.id === selectedTargetId);
    if (!target) return;

    setBusy(true);
    
    // Hash the national ID if provided
    const hash = indivNationalId.trim() ? await sha256(indivNationalId.trim()) : null;
    const encryptedId = indivNationalId.trim() ? await encryptData(indivNationalId.trim()) : null;
    
    let finalRegistryId = registryMatch?.id || null;
    
    // Upsert registry if we have an ID
    if (hash && !registryMatch) {
      const { data: newReg } = await supabase.from('beneficiaries_registry').insert({
        id_hash: hash,
        full_name: indivFullName,
        nationality: indivNationality || null,
        gender: indivGender || null,
        birthdate: indivBirthdate || null,
        phone: indivPhone || null,
        first_registered_by: user?.id,
        first_team_id: target?.team_id || null,
      }).select().single();
      finalRegistryId = newReg?.id || null;
    } else if (hash && registryMatch) {
      // Update registry with latest data
      await supabase.from('beneficiaries_registry').update({
        full_name: indivFullName,
        nationality: indivNationality || null,
        gender: indivGender || null,
        birthdate: indivBirthdate || null,
        phone: indivPhone || null,
      }).eq('id', registryMatch.id);
    } else if (!hash && indivFullName.trim()) {
      // No ID but we still create a registry entry by name only
      const { data: newReg } = await supabase.from('beneficiaries_registry').insert({
        full_name: indivFullName,
        nationality: indivNationality || null,
        gender: indivGender || null,
        birthdate: indivBirthdate || null,
        phone: indivPhone || null,
        first_registered_by: user?.id,
        first_team_id: target?.team_id || null,
      }).select().single();
      finalRegistryId = newReg?.id || null;
    }

    const { error } = await supabase.from("beneficiaries_individual").insert({
      mission_id: target.mission_id,
      daily_report_id: target.daily_report_id,
      encrypted_id: encryptedId,
      id_hash: hash,
      registry_id: finalRegistryId,
      full_name: indivFullName,
      phone: indivPhone || null,
      birthdate: indivBirthdate || null,
      nationality: indivNationality || null,
      gender: indivGender || null,
      service_type: indivServiceType || null,
      service_quantity: parseInt(indivServiceQuantity) || 1,
      custom_metadata: Object.keys(customValues).length > 0 ? customValues : null,
    });
    setBusy(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إضافة المستفيد بنجاح");
      setIndivNationalId(""); setIndivFullName(""); setIndivPhone("");
      setIndivBirthdate(""); setIndivNationality(""); setIndivGender(""); setIndivServiceType(""); setIndivServiceQuantity("1");
      setCustomValues({}); setRegistryMatch(null); setPrevServices([]); setNameSuggestions([]);
      fetchRegistered(target);
    }
  };

  const submitGroup = async () => {
    if (!selectedTargetId) return toast.error("اختر المهمة أولاً");
    if (!groupCount || parseInt(groupCount) < 1) return toast.error("أدخل عدد صحيح");

    const target = targets.find(t => t.id === selectedTargetId);
    if (!target) return;

    setBusy(true);
    const { error } = await supabase.from("beneficiaries_group").insert({
      mission_id: target.mission_id,
      daily_report_id: target.daily_report_id,
      nationality: groupNationality || null,
      gender: groupGender || null,
      age_category: groupAgeCategory || null,
      count: parseInt(groupCount),
      service_type: groupServiceType || null,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إضافة المجموعة بنجاح");
      setGroupCount("1");
      fetchRegistered(target);
    }
  };

  const finishRegistration = async () => {
    if (!selectedTargetId) return;
    const target = targets.find(t => t.id === selectedTargetId);
    if (!target) return;

    setBusy(true);
    let error;
    if (target.daily_report_id) {
      const res = await supabase.from("mission_daily_reports").update({ beneficiaries_status: "completed" }).eq("id", target.daily_report_id);
      error = res.error;
    } else {
      const res = await supabase.from("missions").update({ beneficiaries_status: "completed" }).eq("id", target.mission_id);
      error = res.error;
    }
    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إنهاء تسجيل المستفيدين لهذه المهمة");
      setSelectedTargetId("");
      fetchTargets();
    }
  };

  return (
    <AppLayout title="تسجيل المستفيدين">
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* 1. Task Selection Card */}
        <Card className="p-6 border-primary/20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <Label className="text-base font-semibold text-primary">اختر المهمة لإدخال مستفيديها:</Label>
             <div className="flex items-center gap-4">
                 <SmartBeneficiariesUploader onSuccess={() => { fetchTargets(); fetchAllBeneficiaries(); if (selectedTargetId) fetchRegistered(targets.find(t => t.id === selectedTargetId)); }} />
                 <div className="flex bg-muted/50 p-1 rounded-md">
                    <Button size="sm" variant={statusFilter === 'pending' ? 'default' : 'ghost'} onClick={() => { setStatusFilter('pending'); setSelectedTargetId(""); }} className="rounded-sm"><ListTodo className="w-4 h-4 ms-2"/> قيد الانتظار</Button>
                    <Button size="sm" variant={statusFilter === 'completed' ? 'default' : 'ghost'} onClick={() => { setStatusFilter('completed'); setSelectedTargetId(""); }} className="rounded-sm"><CheckSquare className="w-4 h-4 ms-2"/> مكتملة</Button>
                 </div>
             </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="animate-spin w-5 h-5 ml-2" /> جاري التحميل...</div>
          ) : (
            <ScrollArea className="h-[250px] border rounded-md p-3 bg-muted/10">
               {targets.length === 0 ? (
                 <div className="text-center p-6 text-muted-foreground">لا توجد مهام في هذه القائمة</div>
               ) : (
                 <div className="grid gap-2">
                    {targets.map(t => (
                       <div 
                         key={t.id} 
                         onClick={() => setSelectedTargetId(t.id)}
                         className={`p-3 rounded-md border cursor-pointer transition-all ${selectedTargetId === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
                       >
                          <div className="flex items-center gap-2 mb-1">
                             <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">{t.mission_code}</code>
                             <span className="text-sm font-bold">{t.mission_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                             <span>{t.date}</span>
                             {t.place && <span>• {t.place}</span>}
                          </div>
                       </div>
                    ))}
                 </div>
               )}
            </ScrollArea>
          )}
        </Card>

        {selectedTargetId && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="individual" className="py-3"><UserPlus className="w-4 h-4 ml-2" /> تسجيل فردي</TabsTrigger>
                <TabsTrigger value="group" className="py-3"><Users className="w-4 h-4 ml-2" /> تسجيل جماعي</TabsTrigger>
              </TabsList>

              <TabsContent value="individual">
                <Card className="p-6 space-y-5 border-t-4 border-t-primary shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1">رقم البطاقة / الجواز {lookingUp && <Loader2 className="w-3 h-3 animate-spin" />}</Label>
                      <Input 
                        value={indivNationalId} 
                        onChange={(e) => { 
                          const val = e.target.value.trim();
                          setIndivNationalId(val); 
                          setRegistryMatch(null); 
                          setPrevServices([]); 
                          if (val.length === 14) triggerLookup(val);
                        }}
                        onBlur={handleIdBlur}
                        dir="ltr" 
                        placeholder="البحث بالرقم القومي (14 رقم)"
                      />
                    </div>
                    <div className="space-y-1.5 relative">
                      <Label>الاسم بالكامل *</Label>
                      <Input 
                        placeholder="اسم المستفيد" 
                        value={indivFullName} 
                        onChange={(e) => handleNameChange(e.target.value)} 
                        onBlur={() => setTimeout(() => setNameSuggestions([]), 150)}
                      />
                      {nameSuggestions.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                          {nameSuggestions.map((s: any) => (
                            <button key={s.id} className="w-full text-right px-3 py-2 text-sm hover:bg-primary/10 flex flex-col" onMouseDown={() => applyRegistrySuggestion(s)}>
                              <span className="font-bold">{s.full_name}</span>
                              <span className="text-muted-foreground text-xs">{s.nationality} • {s.birthdate || ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>رقم التليفون</Label>
                      <Input
                        value={indivPhone}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setIndivPhone(v);
                        }}
                        dir="ltr"
                        maxLength={11}
                        placeholder="01xxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-1.5"><Label>تاريخ الميلاد</Label><Input type="date" value={indivBirthdate} onChange={(e) => setIndivBirthdate(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>الجنسية</Label><Input value={indivNationality} onChange={(e) => setIndivNationality(e.target.value)} /></div>
                    <div className="space-y-1.5">
                      <Label>النوع</Label>
                      <Select value={indivGender} onValueChange={setIndivGender}>
                        <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ذكر">ذكر</SelectItem>
                          <SelectItem value="أنثى">أنثى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <FieldSelect fieldKey="service_type" value={indivServiceType} onChange={setIndivServiceType} label="نوع الخدمة" />
                    <div className="space-y-1.5"><Label>عدد الخدمة</Label><Input type="number" min="1" value={indivServiceQuantity} onChange={(e) => setIndivServiceQuantity(e.target.value)} /></div>

                  {registryMatch && (
                    <div className="md:col-span-2 bg-info/10 border border-info/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-info font-bold text-sm mb-2">
                        <Search className="w-4 h-4" />
                        مستفيد موجود في قاعدة البيانات — تم ملء البيانات تلقائياً
                      </div>
                      {prevServices.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 text-sm font-bold mt-3 mb-2 text-primary">
                            <History className="w-4 h-4" /> الخدمات السابقة ({prevServices.length})
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {prevServices.map((s: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 text-xs bg-background rounded-lg px-3 py-1.5">
                                <Badge variant="outline" className="text-xs shrink-0">{s.missions?.team?.code || '—'}</Badge>
                                <span className="font-medium">{s.missions?.mission_name || '—'}</span>
                                <span className="text-muted-foreground">{s.service_type || '—'}</span>
                                <span className="mr-auto text-muted-foreground">{new Date(s.created_at).toLocaleDateString('ar-EG')}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {customFieldDefs.map(f => {
                      const optionsList = (f.field_options || []).flatMap((opt: string) => 
                        typeof opt === "string" ? opt.split(/[,،\n]+/).map(s => s.trim()).filter(Boolean) : [opt]
                      );
                      return (
                        <div key={f.field_key} className="space-y-1.5">
                          <Label>{f.field_label}{f.is_required && "*"}</Label>
                          {f.field_type === "select" ? (
                            <Select value={customValues[f.field_key] ?? ""} onValueChange={(v) => setCustomValues(prev => ({ ...prev, [f.field_key]: v }))}>
                              <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                              <SelectContent>
                                {optionsList.map((opt: string, i: number) => (
                                  <SelectItem key={`${opt}-${i}`} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"} value={customValues[f.field_key] ?? ""} onChange={(e) => setCustomValues(prev => ({ ...prev, [f.field_key]: e.target.value }))} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button onClick={submitIndividual} disabled={busy} className="w-full md:w-auto mt-4"><UserPlus className="w-4 h-4 ml-2"/> حفظ المستفيد الفردي</Button>
                </Card>
              </TabsContent>

              <TabsContent value="group">
                <Card className="p-6 space-y-5 border-t-4 border-t-secondary shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label>الجنسية</Label><Input value={groupNationality} onChange={(e) => setGroupNationality(e.target.value)} /></div>
                    <div className="space-y-1.5">
                      <Label>النوع</Label>
                      <Select value={groupGender} onValueChange={setGroupGender}>
                        <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem><SelectItem value="مختلط">مختلط</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>الفئة العمرية</Label>
                      <Select value={groupAgeCategory} onValueChange={setGroupAgeCategory}>
                        <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent><SelectItem value="رضيع">رضيع</SelectItem><SelectItem value="طفل">طفل</SelectItem><SelectItem value="بالغ">بالغ</SelectItem><SelectItem value="كبار سن">كبار سن</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <FieldSelect fieldKey="service_type" value={groupServiceType} onChange={setGroupServiceType} label="نوع الخدمة" />
                    <div className="space-y-1.5"><Label>العدد *</Label><Input type="number" min="1" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} /></div>
                  </div>
                  <Button onClick={submitGroup} disabled={busy} className="w-full md:w-auto mt-4" variant="secondary"><Users className="w-4 h-4 ml-2"/> حفظ المجموعة</Button>
                </Card>
              </TabsContent>
            </Tabs>

            {statusFilter === 'pending' && (
              <Card className="p-5 bg-primary/5 border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
                <div className="text-sm"><strong>هل انتهيت من التسجيل؟</strong> اضغط لإنهاء حالة إدخال المستفيدين.</div>
                <Button variant="default" onClick={finishRegistration} disabled={busy}><CheckCircle2 className="w-4 h-4 ml-2" /> إنهاء تسجيل المستفيدين للمهمة</Button>
              </Card>
            )}

            <div className="space-y-4 mt-10">
              <h3 className="font-bold text-lg border-b border-border pb-2 text-primary">المستفيدون المسجلون مسبقاً</h3>
              {registeredIndivs.length > 0 && (
                <Card className="p-4 shadow-sm">
                  <h4 className="font-bold text-sm mb-3">تسجيل فردي</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>التليفون</TableHead><TableHead>الرقم القومي</TableHead><TableHead>الخدمة</TableHead><TableHead>العدد</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {registeredIndivs.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.full_name}</TableCell>
                            <TableCell dir="ltr">{r.phone || "—"}</TableCell>
                            <TableCell dir="ltr">{r.decrypted_id || "—"}</TableCell>
                            <TableCell>{r.service_type || "—"}</TableCell>
                            <TableCell>{r.service_quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* 4. التقسيمة الشاملة للمستفيدين والخدمات (الجنسية والنوع) */}
        <div className="space-y-4 mt-12 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-primary flex items-center gap-2">
              <BarChartIcon className="w-5 h-5" /> إحصائيات وتقسيمة جميع المستفيدين والخدمات
            </h3>
            <Badge variant="secondary" className="font-bold text-sm bg-amber-500/10 text-amber-600 border-amber-500/30">
              إجمالي عدد الخدمات المقدمة: {totalServicesCount}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 border-primary/20 shadow-sm">
              <h4 className="font-bold text-sm text-primary flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" /> توزيع المستفيدين والخدمات حسب الجنسية
              </h4>
              <div className="h-[220px] w-full">
                {nationalityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={nationalityData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                        {nationalityData.map((e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">لا توجد بيانات مسجلة</div>
                )}
              </div>
            </Card>

            <Card className="p-5 border-primary/20 shadow-sm">
              <h4 className="font-bold text-sm text-primary flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" /> توزيع المستفيدين والخدمات حسب النوع
              </h4>
              <div className="h-[220px] w-full">
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                        {genderData.map((e, i) => (
                          <Cell key={i} fill={e.name === 'ذكر' ? '#3b82f6' : e.name === 'أنثى' ? '#ec4899' : '#888888'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">لا توجد بيانات مسجلة</div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* 5. جدول البحث الشامل في سجل المستفيدين */}
        <Card className="p-6 border-primary/20 space-y-4 shadow-sm mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Search className="w-5 h-5" />
                سجل المستفيدين الشامل والبحث الفوري (بالاسم أو الرقم القومي)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">يمكنك البحث بالاسم، الرقم القومي (فك التشفير تلقائياً)، رقم الهاتف، أو كود المهمة</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
                <Input 
                  placeholder="ابحث بالاسم، الرقم القومي، الهاتف..." 
                  value={benSearchQuery} 
                  onChange={e => setBenSearchQuery(e.target.value)} 
                  className="pr-9" 
                />
              </div>
              <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary whitespace-nowrap">
                عدد النتائج: {filteredAllBens.length}
              </Badge>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold">كود المهمة</TableHead>
                  <TableHead className="font-bold">اسم المستفيد</TableHead>
                  <TableHead className="font-bold">الرقم القومي (مفكوك التشفير)</TableHead>
                  <TableHead className="font-bold">رقم الهاتف</TableHead>
                  <TableHead className="font-bold">الجنسية</TableHead>
                  <TableHead className="font-bold">النوع</TableHead>
                  <TableHead className="font-bold">نوع الخدمة</TableHead>
                  <TableHead className="font-bold text-center">الكمية</TableHead>
                  <TableHead className="font-bold text-center">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllBens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      لا يوجد مستفيدين مطابقين للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllBens.slice(0, 100).map((b: any, idx: number) => (
                    <TableRow key={b.id || idx} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-bold text-primary">{b.mission_code || '—'}</TableCell>
                      <TableCell className="font-bold">{b.full_name || 'غير محدد'}</TableCell>
                      <TableCell className="font-mono text-xs">{b.decrypted_id || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{b.phone || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{b.nationality || 'غير محدد'}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{b.gender || 'غير محدد'}</Badge></TableCell>
                      <TableCell className="font-medium text-xs">{b.service_type || 'غير محدد'}</TableCell>
                      <TableCell className="text-center font-bold">{b.service_quantity || 1}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{b.date || (b.created_at ? b.created_at.substring(0, 10) : '—')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredAllBens.length > 100 && (
            <p className="text-xs text-center text-muted-foreground">يتم عرض أول 100 نتيجة من أصل {filteredAllBens.length} مستفيد</p>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
