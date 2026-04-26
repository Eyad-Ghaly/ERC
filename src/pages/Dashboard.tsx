import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS, REGIONS } from "@/lib/constants";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Activity, Users, Clock, Award } from "lucide-react";

const COLORS = ["hsl(354 78% 46%)", "hsl(38 92% 50%)", "hsl(142 64% 38%)", "hsl(210 90% 50%)", "hsl(280 60% 50%)"];

interface Stats {
  totalMissions: number; totalVolunteers: number; totalHours: number; totalPoints: number;
  byStatus: { name: string; value: number }[];
  byRegion: { name: string; value: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: missions }, { data: vols }] = await Promise.all([
        supabase.from("missions").select("status, region"),
        supabase.from("mission_volunteers").select("hours, points"),
      ]);
      const m = missions ?? [];
      const v = vols ?? [];

      const byStatusMap: Record<string, number> = {};
      const byRegionMap: Record<string, number> = {};
      m.forEach((x: any) => {
        byStatusMap[x.status] = (byStatusMap[x.status] ?? 0) + 1;
        if (x.region) byRegionMap[x.region] = (byRegionMap[x.region] ?? 0) + 1;
      });

      setStats({
        totalMissions: m.length,
        totalVolunteers: v.length,
        totalHours: v.reduce((s: number, x: any) => s + Number(x.hours ?? 0), 0),
        totalPoints: v.reduce((s: number, x: any) => s + Number(x.points ?? 0), 0),
        byStatus: Object.entries(byStatusMap).map(([k, val]) => ({ name: STATUS_LABELS[k] ?? k, value: val })),
        byRegion: Object.entries(byRegionMap).map(([k, val]) => ({ name: REGIONS[k] ?? k, value: val })),
      });
    })();
  }, []);

  if (!stats) return <AppLayout title="Dashboard"><Card className="p-8">جاري التحميل...</Card></AppLayout>;

  return (
    <AppLayout title="Dashboard - مؤشرات الأداء">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI icon={Activity} label="إجمالي المهام" value={stats.totalMissions} color="text-primary" />
          <KPI icon={Users} label="إجمالي المتطوعين" value={stats.totalVolunteers} color="text-info" />
          <KPI icon={Clock} label="إجمالي الساعات" value={Number(stats.totalHours.toFixed(1))} color="text-warning" />
          <KPI icon={Award} label="إجمالي النقاط" value={stats.totalPoints} color="text-success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-elevated p-6">
            <h3 className="font-bold mb-4">المهام حسب الحالة</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.byStatus}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="card-elevated p-6">
            <h3 className="font-bold mb-4">التوزيع حسب الإقليم</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.byRegion} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label>
                  {stats.byRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="card-elevated p-5">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}
