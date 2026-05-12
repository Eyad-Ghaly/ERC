import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Edit2, Eye, Trash2, Target, Users, BarChart as BarChartIcon, ListTodo, UserCheck, Activity, Map, Database } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { AddVolunteerDialog } from "@/components/AddVolunteerDialog";

export default function DepartmentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Missions state
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Volunteers state
  const [teamVolunteers, setTeamVolunteers] = useState<any[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);

  // Targets state
  const [targets, setTargets] = useState<any[]>([]);
  const [customKpis, setCustomKpis] = useState<any[]>([]);

  const loadMissions = async () => {
    if (!user) return;
    setLoading(true);
    const { data: mData, error } = await supabase
      .from("missions")
      .select("*, mission_volunteers(id, membership_number, full_name), beneficiaries_individual(id, national_id, service_type), beneficiaries_group(count, service_type)")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) toast.error("حدث خطأ أثناء جلب المهام");
    else setMissions(mData || []);
    setLoading(false);
  };

  const loadVolunteers = async () => {
    if (!profile?.team_code) return;
    setLoadingVols(true);
    const { data, error } = await supabase
      .from("volunteer_teams")
      .select(`
        id, is_approved, join_date, team_code, team_phone, team_national_id,
        volunteers_base ( id, full_name, membership_number, branch, phone_number )
      `)
      .eq("team_code", profile.team_code);

    if (!error && data) {
      setTeamVolunteers(data);
    }
    setLoadingVols(false);
  };

  const loadTargets = async () => {
    if (!profile?.team_code) return;
    const { data } = await supabase.from("team_kpi_targets").select("*").eq("team_code", profile.team_code);
    if (data) setTargets(data);

    const { data: kpisData } = await supabase.from("team_custom_kpis").select("*").eq("team_code", profile.team_code);
    if (kpisData) setCustomKpis(kpisData);
  };

  useEffect(() => {
    loadMissions();
    if (profile?.team_code) {
      loadVolunteers();
      loadTargets();
    }
  }, [user, profile]);

  const handleDeleteMission = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة نهائياً؟")) return;
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف بنجاح"); loadMissions(); }
  };

  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      if (startDate && m.activity_date < startDate) return false;
      if (endDate && m.activity_date > endDate) return false;
      return true;
    });
  }, [missions, startDate, endDate]);

  const kpis = useMemo(() => {
    let vols = 0;
    let groupBens = 0;
    const uniqueVolunteersSet = new Set();
    const uniqueBeneficiariesSet = new Set();

    filteredMissions.forEach(m => {
      vols += (m.mission_volunteers || []).length;
      
      (m.mission_volunteers || []).forEach((v: any) => {
        if (v.membership_number) uniqueVolunteersSet.add(v.membership_number);
        else if (v.full_name) uniqueVolunteersSet.add(v.full_name);
        else uniqueVolunteersSet.add(v.id);
      });

      (m.beneficiaries_individual || []).forEach((b: any) => {
        if (b.national_id) uniqueBeneficiariesSet.add(b.national_id);
        else uniqueBeneficiariesSet.add(b.id);
      });

      (m.beneficiaries_group || []).forEach((g: any) => { 
        groupBens += (g.count || 0); 
      });
    });

    return {
      totalMissions: filteredMissions.length,
      totalVolunteers: vols, // Participations
      uniqueVolunteers: uniqueVolunteersSet.size,
      totalBeneficiaries: uniqueBeneficiariesSet.size + groupBens
    };
  }, [filteredMissions]);

  const aggregatedTargets = useMemo(() => {
    if (!targets.length) return null;
    
    // Determine the month range based on filters, or default to current month
    let startMonth = "";
    let endMonth = "";
    
    if (startDate) startMonth = startDate.substring(0, 7);
    if (endDate) endMonth = endDate.substring(0, 7);
    
    if (!startDate && !endDate) {
      const today = new Date();
      startMonth = endMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    let tMissions = 0;
    let tUniqueVols = 0;
    let tTotalVols = 0;
    let tBens = 0;
    let tCustom: Record<string, number> = {};

    targets.forEach(t => {
      const m = t.target_month;
      if ((!startMonth || m >= startMonth) && (!endMonth || m <= endMonth)) {
        tMissions += t.target_missions || 0;
        tUniqueVols += t.target_unique_volunteers || 0;
        tTotalVols += t.target_volunteer_participations || 0;
        tBens += t.target_beneficiaries || 0;
        
        const ct = t.custom_targets as Record<string, number> || {};
        for (const k in ct) {
          tCustom[k] = (tCustom[k] || 0) + Number(ct[k] || 0);
        }
      }
    });

    return {
      missions: tMissions,
      uniqueVols: tUniqueVols,
      totalVols: tTotalVols,
      bens: tBens,
      custom: tCustom
    };
  }, [targets, startDate, endDate]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMissions.forEach(m => {
      const cls = m.activity_classification || "غير مصنف";
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredMissions]);

  const governoratesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMissions.forEach(m => {
      const gov = m.governorate || "غير محدد";
      counts[gov] = (counts[gov] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredMissions]);

  const servicesData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMissions.forEach(m => {
      (m.beneficiaries_individual || []).forEach((b: any) => {
         const service = b.service_type || "غير محدد";
         counts[service] = (counts[service] || 0) + 1;
      });
      (m.beneficiaries_group || []).forEach((g: any) => {
         const service = g.service_type || "غير محدد";
         counts[service] = (counts[service] || 0) + (g.count || 0);
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredMissions]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'];

  const renderKpiValue = (actual: number, target: number | undefined, colorClass: string) => {
    if (!target) return <h3 className="text-2xl font-extrabold">{actual}</h3>;
    const percent = Math.min(100, Math.round((actual / target) * 100)) || 0;
    return (
      <div className="w-full mt-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-extrabold">{actual}</h3>
          <span className="text-sm text-muted-foreground font-medium">/ {target}</span>
        </div>
        <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
          <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="لوحة معلومات فريقي">
      <Tabs defaultValue="missions" className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="missions" className="px-6"><ListTodo className="w-4 h-4 ml-2" /> مهام الفريق</TabsTrigger>
            <TabsTrigger value="volunteers" className="px-6"><UserCheck className="w-4 h-4 ml-2" /> متطوعو الفريق</TabsTrigger>
          </TabsList>
          {profile?.team_code && (
            <Badge variant="outline" className="hidden md:inline-flex">كود الفريق: {profile.team_code}</Badge>
          )}
        </div>

        <TabsContent value="missions" className="space-y-6 mt-0">
          <Card className="p-4 border-primary/20 bg-card/50 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]"><label className="text-sm font-bold text-muted-foreground">من تاريخ</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" /></div>
            <div className="space-y-1.5 flex-1 min-w-[200px]"><label className="text-sm font-bold text-muted-foreground">إلى تاريخ</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" /></div>
            <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); }} className="mb-0.5">مسح الفلتر</Button>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-1"><Target className="w-6 h-6 text-primary" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المهام المسجلة</p>{renderKpiValue(kpis.totalMissions, aggregatedTargets?.missions, "bg-primary")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1"><Users className="w-6 h-6 text-indigo-500" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المتطوعون (منفردون)</p>{renderKpiValue(kpis.uniqueVolunteers, aggregatedTargets?.uniqueVols, "bg-indigo-500")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-info/10 to-transparent border-info/20">
              <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center shrink-0 mt-1"><Activity className="w-6 h-6 text-info" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المشاركات التطوعية</p>{renderKpiValue(kpis.totalVolunteers, aggregatedTargets?.totalVols, "bg-info")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-success/10 to-transparent border-success/20">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center shrink-0 mt-1"><BarChartIcon className="w-6 h-6 text-success" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المستفيدون (فعليون)</p>{renderKpiValue(kpis.totalBeneficiaries, aggregatedTargets?.bens, "bg-success")}</div>
            </Card>
          </div>

          {customKpis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {customKpis.map((kpi, idx) => (
                <Card key={kpi.id} className="p-4 card-elevated border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">{kpi.kpi_label}</p>
                    <h3 className="text-2xl font-extrabold mt-1 text-primary">
                      {aggregatedTargets?.custom[kpi.kpi_key] || 0}
                    </h3>
                  </div>
                  <Target className="w-8 h-8 text-primary/20" />
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 card-elevated border-primary/20">
              <h3 className="font-bold mb-4 text-primary">تصنيف النشاط</h3>
              <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>

            <Card className="p-6 card-elevated border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">توزيع المهام على المحافظات</h3>
                <Map className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="h-[250px] w-full">
                {governoratesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={governoratesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#888" />
                      <YAxis dataKey="name" type="category" width={80} stroke="#888" tick={{ fill: '#888', fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Bar dataKey="value" name="عدد المهام" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <Card className="p-6 card-elevated border-primary/20">
              <h3 className="font-bold mb-4 text-primary">إحصائيات الخدمات</h3>
              <div className="h-[300px] w-full">
                {servicesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={60} tick={{ fill: '#888', fontSize: 12 }} />
                      <YAxis stroke="#888" />
                      <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Bar dataKey="value" name="عدد الخدمات المستفاد منها" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {servicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>
          </div>

          <Card className="p-4 card-elevated border-primary/20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">مهامي السابقة</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/team-beneficiaries")} className="bg-primary/5 border-primary/20"><Database className="w-4 h-4 ms-2" /> قاعدة بيانات المستفيدين</Button>
                <Button size="sm" onClick={() => navigate("/department-entry")}><Edit2 className="w-4 h-4 ms-2" /> مهمة جديدة</Button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>التاريخ</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                    : filteredMissions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">لا توجد مهام</TableCell></TableRow>
                      : filteredMissions.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell><code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{m.mission_code}</code></TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate" title={m.mission_name}>{m.mission_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{m.activity_date}</TableCell>
                          <TableCell><StatusBadge status={m.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/missions/${m.id}`)}><Eye className="w-4 h-4 text-info" /></Button>
                              {m.status === 'planned' && (
                                <>
                                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/department-entry/${m.id}`)}><Edit2 className="w-4 h-4 text-warning" /></Button>
                                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleDeleteMission(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers" className="mt-0 space-y-6">
          <Card className="p-5 border-primary/20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-primary">المتطوعون المنضمون للفريق</h3>
                <p className="text-sm text-muted-foreground mt-1">يظهر هنا جميع المتطوعين المرتبطين بكود الفريق ({profile?.team_code || "غير محدد"})</p>
              </div>
              {profile?.team_code && (
                <AddVolunteerDialog teamCode={profile.team_code} onAdded={loadVolunteers} />
              )}
            </div>

            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>رقم العضوية</TableHead>
                    <TableHead>التليفون</TableHead>
                    <TableHead>تاريخ الانضمام</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVols ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري تحميل المتطوعين...</TableCell></TableRow>
                  ) : teamVolunteers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد متطوعين في فريقك حالياً</TableCell></TableRow>
                  ) : (
                    teamVolunteers.map((vt) => {
                      const v = vt.volunteers_base;
                      if (!v) return null;
                      return (
                        <TableRow key={vt.id} className={!vt.is_approved ? "opacity-60 bg-muted/20 grayscale" : ""}>
                          <TableCell className="font-bold">{v.full_name}</TableCell>
                          <TableCell>{v.branch || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-right">{v.membership_number || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-right">{vt.team_phone || v.phone_number || "—"}</TableCell>
                          <TableCell>{vt.join_date || "—"}</TableCell>
                          <TableCell>
                            {vt.is_approved ? (
                              <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">معتمد</Badge>
                            ) : (
                              <Badge variant="secondary" className="border-warning text-warning bg-warning/10">قيد الاعتماد</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
