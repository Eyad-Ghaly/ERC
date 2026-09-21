import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Plus, Trash2, Users, CalendarCheck, FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SmartBeneficiariesUploader } from "@/components/SmartBeneficiariesUploader";

export function ContinuousProgramsTab({ target, teamCode }: { target: any; teamCode: string }) {
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Program form
  const [programName, setProgramName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Roster & Sessions
  const [roster, setRoster] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  
  // Session creation
  const [newSessionDate, setNewSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (target?.mission_id) {
      loadProgram();
    }
  }, [target]);

  const loadProgram = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("continuous_programs")
      .select("*")
      .eq("mission_id", target.mission_id)
      .maybeSingle();

    if (data) {
      setProgram(data);
      await loadRoster(data.id);
      await loadSessions(data.id);
    } else {
      setProgram(null);
    }
    setLoading(false);
  };

  const loadRoster = async (progId: string) => {
    // Roster is derived from everyone who has a record in beneficiaries_individual for this mission
    const { data } = await supabase
      .from("beneficiaries_individual")
      .select("registry_id, beneficiaries_registry(full_name, id_hash, nationality, birthdate, phone)")
      .eq("mission_id", target.mission_id)
      .not("registry_id", "is", null);
      
    // Deduplicate by registry_id
    const uniqueMap = new Map();
    (data || []).forEach(d => {
      if (d.registry_id && !uniqueMap.has(d.registry_id)) {
        uniqueMap.set(d.registry_id, {
          id: d.registry_id,
          registry_id: d.registry_id,
          beneficiaries_registry: d.beneficiaries_registry
        });
      }
    });
    setRoster(Array.from(uniqueMap.values()));
  };

  const loadSessions = async (progId: string) => {
    const { data } = await supabase
      .from("continuous_program_sessions")
      .select("*")
      .eq("program_id", progId)
      .order("session_date", { ascending: false });
    setSessions(data || []);
    if (data && data.length > 0 && !selectedSessionId) {
      setSelectedSessionId(data[0].id);
      await loadAttendance(data[0].id);
    }
  };

  const loadAttendance = async (sessionId: string) => {
    const { data } = await supabase
      .from("beneficiaries_individual")
      .select("registry_id")
      .eq("program_session_id", sessionId);
      
    const attMap: Record<string, boolean> = {};
    (data || []).forEach(d => {
      if (d.registry_id) attMap[d.registry_id] = true;
    });
    setAttendance(attMap);
    setSelectedSessionId(sessionId);
  };

  const createProgram = async () => {
    if (!programName) return toast.error("أدخل اسم البرنامج");
    
    const { data, error } = await supabase.from("continuous_programs").insert({
      mission_id: target.mission_id,
      team_code: teamCode,
      name: programName,
      start_date: startDate || null,
      end_date: endDate || null
    }).select().single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إنشاء البرنامج بنجاح");
      setProgram(data);
    }
  };

  const addSession = async () => {
    if (!newSessionDate) return;
    const { data, error } = await supabase.from("continuous_program_sessions").insert({
      program_id: program.id,
      session_date: newSessionDate
    }).select().single();

    if (error) {
      toast.error("حدث خطأ أثناء إنشاء الجلسة: " + error.message);
    } else {
      toast.success("تم إضافة الجلسة");
      setSessions([data, ...sessions]);
      setSelectedSessionId(data.id);
      setAttendance({});
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الجلسة وكل الغيابات/الحضور المرتبط بها؟")) return;
    const { error } = await supabase.from("continuous_program_sessions").delete().eq("id", id);
    if (error) {
      toast.error("خطأ في الحذف: " + error.message);
    } else {
      toast.success("تم حذف الجلسة بنجاح");
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (selectedSessionId === id) {
        setSelectedSessionId(newSessions.length > 0 ? newSessions[0].id : null);
        if (newSessions.length > 0) loadAttendance(newSessions[0].id);
        else setAttendance({});
      }
    }
  };

  const saveAttendance = async () => {
    if (!selectedSessionId) return;
    
    // First, delete old attendance for this session
    await supabase.from("beneficiaries_individual").delete().eq("program_session_id", selectedSessionId);
    
    // Then insert the checked ones
    const checkedRegistryIds = Object.keys(attendance).filter(id => attendance[id]);
    if (checkedRegistryIds.length === 0) {
      toast.success("تم حفظ الحضور (لا يوجد حاضرين)");
      return;
    }

    const inserts = checkedRegistryIds.map(rid => {
      const p = roster.find(r => r.registry_id === rid);
      const reg = p?.beneficiaries_registry || {};
      return {
        mission_id: target.mission_id,
        daily_report_id: target.daily_report_id,
        registry_id: rid,
        full_name: reg.full_name || 'غير معروف',
        program_session_id: selectedSessionId,
        service_type: program.name,
        service_quantity: 1
      };
    });

    const { error } = await supabase.from("beneficiaries_individual").insert(inserts);
    if (error) {
      toast.error("خطأ في الحفظ: " + error.message);
    } else {
      toast.success("تم حفظ الحضور بنجاح وربطه بالخدمات!");
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  if (!program) {
    return (
      <Card className="p-6 max-w-xl mx-auto space-y-4">
        <h3 className="font-bold text-lg">إنشاء برنامج ممتد للمهمة: {target.display_name}</h3>
        <p className="text-sm text-muted-foreground">قم بتعريف البرنامج للبدء في إضافة المتدربين وتسجيل حضورهم.</p>
        
        <div className="space-y-3">
          <div>
            <Label>اسم البرنامج / الدورة</Label>
            <Input value={programName} onChange={e => setProgramName(e.target.value)} placeholder="مثال: دورة الخياطة المتقدمة" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>تاريخ البداية (اختياري)</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>تاريخ النهاية (اختياري)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={createProgram} className="w-full">إنشاء البرنامج</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-4">
      {/* Roster Section */}
      <Card className="p-4 space-y-4 shadow-sm border-t-4 border-t-primary">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            قائمة المسجلين (Roster)
          </h3>
          <Badge variant="outline">{roster.length} مسجل</Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          يتم ربط المستفيدين بالبرنامج بمجرد إضافتهم من التسجيل الفردي واختيار المهمة. سيظهر جميع مسجلي المهمة هنا.
        </p>

        <div className="bg-secondary/20 p-4 rounded-md">
           <SmartBeneficiariesUploader target={target} onUploadComplete={() => loadRoster(program?.id)} />
           <p className="text-xs text-muted-foreground mt-2 text-center">قم برفع إكسيل المتدربين (الرفع هنا يضيفهم إلى السجل تلقائياً)</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجنسية</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-bold">{r.beneficiaries_registry?.full_name}</TableCell>
                <TableCell>{r.beneficiaries_registry?.nationality || "-"}</TableCell>
                <TableCell>
                   <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="w-4 h-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
            {roster.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا يوجد مسجلين بعد</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Sessions & Attendance Section */}
      <Card className="p-4 space-y-4 shadow-sm border-t-4 border-t-blue-500">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-500" />
            الجلسات والحضور
          </h3>
        </div>

        <div className="flex gap-2">
          <Input type="date" value={newSessionDate} onChange={e => setNewSessionDate(e.target.value)} />
          <Button onClick={addSession} variant="secondary"><Plus className="w-4 h-4 ml-1"/> إضافة جلسة</Button>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-4 mt-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sessions.map(s => (
                <Button 
                  key={s.id} 
                  variant={selectedSessionId === s.id ? "default" : "outline"}
                  onClick={() => loadAttendance(s.id)}
                  className="shrink-0"
                >
                  {s.session_date}
                </Button>
              ))}
            </div>

            {selectedSessionId && (
              <div className="border rounded-md p-4 bg-background shadow-inner space-y-4">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">تسجيل حضور جلسة: {sessions.find(s=>s.id===selectedSessionId)?.session_date}</h4>
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteSession(selectedSessionId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button onClick={saveAttendance}><FileCheck className="w-4 h-4 ml-2"/> حفظ الحضور</Button>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">حضور</TableHead>
                      <TableHead>الاسم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox 
                            checked={attendance[r.registry_id] || false}
                            onCheckedChange={(c) => setAttendance({...attendance, [r.registry_id]: !!c})}
                          />
                        </TableCell>
                        <TableCell>{r.beneficiaries_registry?.full_name}</TableCell>
                      </TableRow>
                    ))}
                    {roster.length === 0 && (
                      <TableRow><TableCell colSpan={2} className="text-center">أضف متدربين أولاً</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md">
            لا توجد جلسات. قم بإضافة الجلسة الأولى لتسجيل الحضور.
          </div>
        )}
      </Card>
    </div>
  );
}
