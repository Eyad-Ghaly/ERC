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
import { Edit2, Eye, Trash2, Target, Users, BarChart, ListTodo, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
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

  const loadMissions = async () => {
    if (!user) return;
    setLoading(true);
    const { data: mData, error } = await supabase
      .from("missions")
      .select("*, mission_volunteers(id), beneficiaries_individual(id), beneficiaries_group(count)")
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
        id, is_approved, join_date, team_code,
        volunteers_base ( id, full_name, membership_number, branch, phone_number )
      `)
      .eq("team_code", profile.team_code);

    if (!error && data) {
      setTeamVolunteers(data);
    }
    setLoadingVols(false);
  };

  useEffect(() => {
    loadMissions();
    if (profile?.team_code) {
      loadVolunteers();
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
    let vols = 0; let indivBens = 0; let groupBens = 0;
    filteredMissions.forEach(m => {
      vols += (m.mission_volunteers || []).length;
      indivBens += (m.beneficiaries_individual || []).length;
      (m.beneficiaries_group || []).forEach((g: any) => { groupBens += (g.count || 0); });
    });
    return {
      totalMissions: filteredMissions.length,
      totalVolunteers: vols,
      totalBeneficiaries: indivBens + groupBens
    };
  }, [filteredMissions]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredMissions.forEach(m => {
      const cls = m.activity_classification || "غير مصنف";
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredMissions]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 card-elevated flex items-center gap-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"><Target className="w-6 h-6 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground font-bold">المهام المسجلة</p><h3 className="text-3xl font-extrabold">{kpis.totalMissions}</h3></div>
            </Card>
            <Card className="p-6 card-elevated flex items-center gap-4 bg-gradient-to-br from-info/10 to-transparent border-info/20">
              <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center"><Users className="w-6 h-6 text-info" /></div>
              <div><p className="text-sm text-muted-foreground font-bold">المتطوعون المشاركون</p><h3 className="text-3xl font-extrabold">{kpis.totalVolunteers}</h3></div>
            </Card>
            <Card className="p-6 card-elevated flex items-center gap-4 bg-gradient-to-br from-success/10 to-transparent border-success/20">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center"><BarChart className="w-6 h-6 text-success" /></div>
              <div><p className="text-sm text-muted-foreground font-bold">إجمالي المستفيدين</p><h3 className="text-3xl font-extrabold">{kpis.totalBeneficiaries}</h3></div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 card-elevated lg:col-span-1 border-primary/20">
              <h3 className="font-bold mb-4 text-primary">تصنيف المهام</h3>
              <div className="h-[250px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>

            <Card className="p-4 card-elevated lg:col-span-2 border-primary/20 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">مهامي السابقة</h3>
                <Button size="sm" onClick={() => navigate("/department-entry")}><Edit2 className="w-4 h-4 ms-2" /> مهمة جديدة</Button>
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
          </div>
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
