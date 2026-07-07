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
import { CheckCircle2, UserPlus, Users, Loader2, ListTodo, CheckSquare, Search, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Utility: SHA-256 hash of a string (browser native)
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
  const { user } = useAuth();
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
  const [indivServiceType, setIndivServiceType] = useState("");
  const [indivServiceQuantity, setIndivServiceQuantity] = useState("1");

  // Group State
  const [groupNationality, setGroupNationality] = useState("");
  const [groupGender, setGroupGender] = useState("");
  const [groupAgeCategory, setGroupAgeCategory] = useState("");
  const [groupCount, setGroupCount] = useState("1");
  const [groupServiceType, setGroupServiceType] = useState("");
  const [busy, setBusy] = useState(false);

  const triggerLookup = async (id: string) => {
    if (!id || id.length < 5) return;
    setLookingUp(true);
    const hash = await sha256(id);
    const { data } = await supabase.from('beneficiaries_registry').select('*').eq('id_hash', hash).maybeSingle();
    if (data) {
      setRegistryMatch(data);
      setIndivFullName(data.full_name || indivFullName);
      setIndivNationality(data.nationality || indivNationality);
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
    const { data: mData, error } = await supabase
      .from("missions")
      .select("id, mission_code, mission_name, execution_place, activity_date, team_id, team:teams(code), is_open_mission, beneficiaries_status")
      .eq("has_beneficiaries", true);
    
    if (error || !mData) { setLoading(false); return; }

    const { data: drData } = await supabase
      .from("mission_daily_reports")
      .select("id, mission_id, day_number, report_date, beneficiaries_status");

    const singleTargets = mData
      .filter((m) => !m.is_open_mission && m.beneficiaries_status === statusFilter)
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
      .filter((dr) => dr.beneficiaries_status === statusFilter)
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
    setRegisteredIndivs(ind || []);
    setRegisteredGroups(grp || []);
  };

  useEffect(() => {
    if (user) fetchTargets();
  }, [user, statusFilter]);

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
    
    let finalRegistryId = registryMatch?.id || null;
    
    // Upsert registry if we have an ID
    if (hash && !registryMatch) {
      const { data: newReg } = await supabase.from('beneficiaries_registry').insert({
        id_hash: hash,
        full_name: indivFullName,
        nationality: indivNationality || null,
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
        birthdate: indivBirthdate || null,
        phone: indivPhone || null,
      }).eq('id', registryMatch.id);
    } else if (!hash && indivFullName.trim()) {
      // No ID but we still create a registry entry by name only
      const { data: newReg } = await supabase.from('beneficiaries_registry').insert({
        full_name: indivFullName,
        nationality: indivNationality || null,
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
      national_id: indivNationalId.trim() || null,
      id_hash: hash,
      registry_id: finalRegistryId,
      full_name: indivFullName,
      phone: indivPhone || null,
      birthdate: indivBirthdate || null,
      nationality: indivNationality || null,
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
      setIndivBirthdate(""); setIndivNationality(""); setIndivServiceType(""); setIndivServiceQuantity("1");
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
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="p-6 border-primary/20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <Label className="text-base font-semibold text-primary">اختر المهمة لإدخال مستفيديها:</Label>
             <div className="flex bg-muted/50 p-1 rounded-md">
                <Button size="sm" variant={statusFilter === 'pending' ? 'default' : 'ghost'} onClick={() => { setStatusFilter('pending'); setSelectedTargetId(""); }} className="rounded-sm"><ListTodo className="w-4 h-4 ms-2"/> قيد الانتظار</Button>
                <Button size="sm" variant={statusFilter === 'completed' ? 'default' : 'ghost'} onClick={() => { setStatusFilter('completed'); setSelectedTargetId(""); }} className="rounded-sm"><CheckSquare className="w-4 h-4 ms-2"/> مكتملة</Button>
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

                  {customFieldDefs.map(f => (
                      <div key={f.field_key} className="space-y-1.5">
                        <Label>{f.field_label}{f.is_required && "*"}</Label>
                        {f.field_type === "select" ? (
                          <Select value={customValues[f.field_key] ?? ""} onValueChange={(v) => setCustomValues(prev => ({ ...prev, [f.field_key]: v }))}>
                            <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                            <SelectContent>{(f.field_options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input type={f.field_type === "number" ? "number" : f.field_type === "date" ? "date" : "text"} value={customValues[f.field_key] ?? ""} onChange={(e) => setCustomValues(prev => ({ ...prev, [f.field_key]: e.target.value }))} />
                        )}
                      </div>
                    ))}
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
                            <TableCell dir="ltr">{r.national_id || "—"}</TableCell>
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
      </div>
    </AppLayout>
  );
}
