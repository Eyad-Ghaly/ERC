import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Search, Download, Key, ShieldCheck, Upload, Save, Eye, Edit, UserPlus, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

export default function TeamBeneficiaries() {
  const { profile } = useAuth();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const [indivBens, setIndivBens] = useState<any[]>([]);
  const [groupBens, setGroupBens] = useState<any[]>([]);
  const [originalIndivBens, setOriginalIndivBens] = useState<any[]>([]);
  const [originalGroupBens, setOriginalGroupBens] = useState<any[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterGov, setFilterGov] = useState("");
  const [filterMission, setFilterMission] = useState("");
  const [filterDetails, setFilterDetails] = useState("");

  const [isEditMode, setIsEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const teamId = profile?.team_id || "";
  const teamCode = profile?.team_code || "";

  useEffect(() => {
    if (teamId) {
      checkTeamStatus();
    }
  }, [teamId]);

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
    const hash = await sha256(password);
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
    const hash = await sha256(password);
    const { data } = await supabase
      .from('team_settings')
      .select('pin_hash')
      .eq('team_id', teamId)
      .maybeSingle();
    setBusy(false);

    if (data && data.pin_hash === hash) {
      setIsAuthenticated(true);
      fetchBeneficiaries();
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  const fetchBeneficiaries = async () => {
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
        created_at,
        missions!inner(id, team_id, mission_code, mission_name, activity_date, governorate, activity_details)
      `)
      .eq('missions.team_id', teamId)
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
        created_at,
        missions!inner(id, team_id, mission_code, mission_name, activity_date, governorate, activity_details)
      `)
      .eq('missions.team_id', teamId)
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

  const handleIndivChange = (id: string, field: string, value: string) => {
    setIndivBens(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleGroupChange = (id: string, field: string, value: string) => {
    setGroupBens(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
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

  const handleIndivPaste = (e: React.ClipboardEvent, startId: string, field: string) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").split(/\r?\n/).filter(Boolean);
    if (pasteData.length === 0) return;

    setIndivBens(prev => {
      const next = [...prev];
      const startIndex = next.findIndex(r => r.id === startId);
      if (startIndex === -1) return prev;

      for (let i = 0; i < pasteData.length && startIndex + i < next.length; i++) {
        next[startIndex + i] = { ...next[startIndex + i], [field]: pasteData[i] };
      }
      return next;
    });
  };

  const handleGroupPaste = (e: React.ClipboardEvent, startId: string, field: string) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").split(/\r?\n/).filter(Boolean);
    if (pasteData.length === 0) return;

    setGroupBens(prev => {
      const next = [...prev];
      const startIndex = next.findIndex(r => r.id === startId);
      if (startIndex === -1) return prev;

      for (let i = 0; i < pasteData.length && startIndex + i < next.length; i++) {
        next[startIndex + i] = { ...next[startIndex + i], [field]: pasteData[i] };
      }
      return next;
    });
  };

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

  const applyFilters = (data: any[]) => {
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
      
      return matchSearch && matchDate && matchGov && matchMission && matchDetails;
    });
  };

  const filteredIndiv = applyFilters(indivBens);
  const filteredGroup = applyFilters(groupBens);

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
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Upload className="w-4 h-4" /> استيراد Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Download className="w-4 h-4" /> تصدير Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 border-primary/10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث سريع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-9" />
            </div>
            <Input placeholder="التاريخ" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            <Input placeholder="المحافظة" value={filterGov} onChange={e => setFilterGov(e.target.value)} />
            <Input placeholder="اسم المهمة" value={filterMission} onChange={e => setFilterMission(e.target.value)} />
            <Input placeholder="تفاصيل النشاط" value={filterDetails} onChange={e => setFilterDetails(e.target.value)} />
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
                      <TableHead className="w-[200px]">اسم المستفيد</TableHead>
                      <TableHead className="w-[150px]">الرقم القومي</TableHead>
                      <TableHead className="w-[120px]">التليفون</TableHead>
                      <TableHead className="w-[120px]">تاريخ الميلاد</TableHead>
                      <TableHead className="w-[100px]">النوع</TableHead>
                      <TableHead className="w-[100px]">الجنسية</TableHead>
                      <TableHead className="w-[120px]">نوع الخدمة</TableHead>
                      <TableHead className="w-[80px]">الكمية</TableHead>
                      {isEditMode && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndiv.map((b) => (
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
                              value={b.full_name || ""} 
                              onChange={(e) => handleIndivChange(b.id, "full_name", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "full_name")}
                              className="h-8 min-w-[150px]" 
                            />
                          ) : <span className="font-bold">{b.full_name}</span>}
                        </TableCell>
                        <TableCell dir="ltr">
                          {isEditMode ? (
                            <Input 
                              value={b.decrypted_id || ""} 
                              onChange={(e) => handleIndivChange(b.id, "decrypted_id", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "decrypted_id")}
                              className="h-8 min-w-[140px] text-left" 
                              dir="ltr"
                            />
                          ) : (b.decrypted_id || "—")}
                        </TableCell>
                        <TableCell dir="ltr">
                          {isEditMode ? (
                            <Input 
                              value={b.phone || ""} 
                              onChange={(e) => handleIndivChange(b.id, "phone", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "phone")}
                              className="h-8 min-w-[110px] text-left" 
                              dir="ltr"
                            />
                          ) : (b.phone || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.birthdate || ""} 
                              onChange={(e) => handleIndivChange(b.id, "birthdate", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "birthdate")}
                              className="h-8 min-w-[110px]" 
                              type="date"
                            />
                          ) : (b.birthdate || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.gender || ""} 
                              onChange={(e) => handleIndivChange(b.id, "gender", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "gender")}
                              className="h-8 min-w-[80px]" 
                            />
                          ) : (b.gender || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.nationality || ""} 
                              onChange={(e) => handleIndivChange(b.id, "nationality", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "nationality")}
                              className="h-8 min-w-[80px]" 
                            />
                          ) : (b.nationality || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.service_type || ""} 
                              onChange={(e) => handleIndivChange(b.id, "service_type", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "service_type")}
                              className="h-8 min-w-[120px]" 
                            />
                          ) : <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{b.service_type || "—"}</span>}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.service_quantity || ""} 
                              onChange={(e) => handleIndivChange(b.id, "service_quantity", e.target.value)} 
                              onPaste={(e) => handleIndivPaste(e, b.id, "service_quantity")}
                              className="h-8 min-w-[60px]" 
                              type="number"
                            />
                          ) : (b.service_quantity || "1")}
                        </TableCell>
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
                      <TableHead className="w-[150px]">التاريخ / المحافظة</TableHead>
                      <TableHead className="w-[100px]">الجنسية</TableHead>
                      <TableHead className="w-[100px]">النوع</TableHead>
                      <TableHead className="w-[120px]">الفئة العمرية</TableHead>
                      <TableHead className="w-[80px]">العدد</TableHead>
                      <TableHead className="w-[150px]">نوع الخدمة</TableHead>
                      <TableHead className="w-[100px]">كمية الخدمة</TableHead>
                      {isEditMode && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroup.map((b) => (
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
                              value={b.nationality || ""} 
                              onChange={(e) => handleGroupChange(b.id, "nationality", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "nationality")}
                              className="h-8 min-w-[80px]" 
                            />
                          ) : (b.nationality || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.gender || ""} 
                              onChange={(e) => handleGroupChange(b.id, "gender", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "gender")}
                              className="h-8 min-w-[80px]" 
                            />
                          ) : (b.gender || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.age_category || ""} 
                              onChange={(e) => handleGroupChange(b.id, "age_category", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "age_category")}
                              className="h-8 min-w-[100px]" 
                            />
                          ) : (b.age_category || "—")}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.count || ""} 
                              onChange={(e) => handleGroupChange(b.id, "count", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "count")}
                              className="h-8 min-w-[60px]" 
                              type="number"
                            />
                          ) : <span className="font-bold">{b.count || "1"}</span>}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.service_type || ""} 
                              onChange={(e) => handleGroupChange(b.id, "service_type", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "service_type")}
                              className="h-8 min-w-[120px]" 
                            />
                          ) : <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{b.service_type || "—"}</span>}
                        </TableCell>
                        <TableCell>
                          {isEditMode ? (
                            <Input 
                              value={b.service_quantity || ""} 
                              onChange={(e) => handleGroupChange(b.id, "service_quantity", e.target.value)} 
                              onPaste={(e) => handleGroupPaste(e, b.id, "service_quantity")}
                              className="h-8 min-w-[60px]" 
                              type="number"
                            />
                          ) : (b.service_quantity || "1")}
                        </TableCell>
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
    </AppLayout>
  );
}
