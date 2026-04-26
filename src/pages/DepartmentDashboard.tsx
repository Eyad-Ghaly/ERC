import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Edit2, Eye, Trash2, Calendar, Target, Users, BarChart } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function DepartmentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: mData, error } = await supabase
      .from("missions")
      .select("*, mission_volunteers(id), beneficiaries_individual(id), beneficiaries_group(count)")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) toast.error("حدث خطأ أثناء جلب البيانات");
    else setMissions(mData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة نهائياً؟")) return;
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم الحذف بنجاح");
      loadData();
    }
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
    let indivBens = 0;
    let groupBens = 0;
    
    filteredMissions.forEach(m => {
      vols += (m.mission_volunteers || []).length;
      indivBens += (m.beneficiaries_individual || []).length;
      (m.beneficiaries_group || []).forEach((g: any) => {
        groupBens += (g.count || 0);
      });
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
      <div className="space-y-6">
        {/* Date Filter */}
        <Card className="p-4 border-primary/20 bg-card/50 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-bold text-muted-foreground">من تاريخ</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-bold text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" />
          </div>
          <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); }} className="mb-0.5">
            مسح الفلتر
          </Button>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 card-elevated flex items-center gap-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">المهام المسجلة</p>
              <h3 className="text-3xl font-extrabold">{kpis.totalMissions}</h3>
            </div>
          </Card>
          <Card className="p-6 card-elevated flex items-center gap-4 bg-gradient-to-br from-info/10 to-transparent border-info/20">
            <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">المتطوعون المشاركون</p>
              <h3 className="text-3xl font-extrabold">{kpis.totalVolunteers}</h3>
            </div>
          </Card>
          <Card className="p-6 card-elevated flex items-center gap-4 bg-gradient-to-br from-success/10 to-transparent border-success/20">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <BarChart className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-bold">إجمالي المستفيدين</p>
              <h3 className="text-3xl font-extrabold">{kpis.totalBeneficiaries}</h3>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <Card className="p-6 card-elevated lg:col-span-1 border-primary/20">
            <h3 className="font-bold mb-4 text-primary">تصنيف المهام</h3>
            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333' }} itemStyle={{ color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات للفترة المحددة</div>
              )}
            </div>
          </Card>

          {/* Table */}
          <Card className="p-4 card-elevated lg:col-span-2 border-primary/20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">مهامي السابقة</h3>
              <Button size="sm" onClick={() => navigate("/department-entry")}><Edit2 className="w-4 h-4 ms-2" /> مهمة جديدة</Button>
            </div>
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>كود المهمة</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                  ) : filteredMissions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد مهام مسجلة</TableCell></TableRow>
                  ) : (
                    filteredMissions.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell><code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{m.mission_code}</code></TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={m.mission_name}>{m.mission_name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.activity_date}</TableCell>
                        <TableCell><StatusBadge status={m.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* View Button */}
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/missions/${m.id}`)}>
                              <Eye className="w-4 h-4 text-info" />
                            </Button>
                            
                            {/* Edit / Delete only if status === 'planned' */}
                            {m.status === 'planned' && (
                              <>
                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/department-entry/${m.id}`)}>
                                  <Edit2 className="w-4 h-4 text-warning" />
                                </Button>
                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleDelete(m.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
