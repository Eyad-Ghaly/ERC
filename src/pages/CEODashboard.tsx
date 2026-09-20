import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Target, TrendingUp, Building2, Activity, ExternalLink,
  AlertCircle, CheckCircle2, Zap, ChevronRight, Award,
  BarChart3, Layers,
} from "lucide-react";

// ── Colour Palette ─────────────────────────────────────────────────────────────
const DEPT_COLORS = [
  "#e63946", "#457b9d", "#2a9d8f", "#e9c46a",
  "#f4a261", "#264653", "#8338ec", "#3a86ff",
  "#fb5607", "#06d6a0",
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function pct(achieved: number, target: number) {
  if (!target) return 0;
  return Math.min(Math.round((achieved / target) * 100), 100);
}

function RadialProgress({ value, size = 120, stroke = 12, color = "#e63946" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

function ProgressBar({ value, color = "#e63946" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

function getColor(idx: number) { return DEPT_COLORS[idx % DEPT_COLORS.length]; }

function pctColor(v: number) {
  if (v >= 80) return "#06d6a0";
  if (v >= 50) return "#e9c46a";
  return "#e63946";
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CEODashboard() {
  const [loading, setLoading] = useState(true);
  const [progressView, setProgressView] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allGoals, setAllGoals] = useState<any[]>([]);
  const [unlinkedMissions, setUnlinkedMissions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [
        { data: progress },
        { data: depts },
        { data: goals },
        { data: missions },
      ] = await Promise.all([
        supabase.from("indicator_progress_view").select("*"),
        supabase.from("departments").select("id, name, code").order("code"),
        supabase
          .from("department_goals")
          .select("id, code, title, department_id, department_objectives(id, code, title, department_indicators(id, code, title, target_value, unit, target_type, sector, source_of_fund))")
          .order("created_at", { ascending: true }),
        supabase
          .from("missions")
          .select("id, mission_code, mission_name, activity_date, status, team_id, department_id, activity_type, is_canceled")
          .is("department_id", null)
          .neq("status", "canceled")
          .eq("is_canceled", false)
          .order("activity_date", { ascending: false })
          .limit(200),
      ]);
      setProgressView(progress ?? []);
      setDepartments(depts ?? []);
      setAllGoals(goals ?? []);
      setUnlinkedMissions(missions ?? []);
      setLoading(false);
    })();
  }, []);

  // achieved map
  const achieved = useMemo(() => {
    const map: Record<string, number> = {};
    progressView.forEach((p: any) => { map[p.indicator_id] = Number(p.achieved_value ?? 0); });
    return map;
  }, [progressView]);

  // all indicators flat
  const allIndicators = useMemo(() => {
    const list: any[] = [];
    allGoals.forEach((g: any) => {
      (g.department_objectives ?? []).forEach((o: any) => {
        (o.department_indicators ?? []).forEach((ind: any) => {
          list.push({ ...ind, goalId: g.id, goalTitle: g.title, goalCode: g.code, objTitle: o.title, deptId: g.department_id });
        });
      });
    });
    return list;
  }, [allGoals]);

  // 1. Overall
  const overallStats = useMemo(() => {
    let totalTarget = 0, totalAchieved = 0;
    allIndicators.forEach((ind) => {
      totalTarget += Number(ind.target_value ?? 0);
      totalAchieved += achieved[ind.id] ?? 0;
    });
    return {
      target: totalTarget, achieved: totalAchieved,
      pct: pct(totalAchieved, totalTarget),
      indicatorsCount: allIndicators.length,
      goalsCount: allGoals.length,
    };
  }, [allIndicators, allGoals, achieved]);

  // 2. Per dept
  const deptStats = useMemo(() => {
    return departments.map((dept, idx) => {
      const inds = allIndicators.filter((i) => i.deptId === dept.id);
      const target = inds.reduce((s, i) => s + Number(i.target_value ?? 0), 0);
      const ach = inds.reduce((s, i) => s + (achieved[i.id] ?? 0), 0);
      const goalsCount = allGoals.filter((g) => g.department_id === dept.id).length;
      return { id: dept.id, name: dept.name, code: dept.code, target, achieved: ach, pct: pct(ach, target), color: getColor(idx), goalsCount, indicatorsCount: inds.length };
    }).filter((d) => d.indicatorsCount > 0).sort((a, b) => b.pct - a.pct);
  }, [departments, allIndicators, achieved, allGoals]);

  // 3. Per goal
  const goalStats = useMemo(() => {
    return allGoals.map((g: any, idx: number) => {
      const inds = allIndicators.filter((i) => i.goalId === g.id);
      const target = inds.reduce((s, i) => s + Number(i.target_value ?? 0), 0);
      const ach = inds.reduce((s, i) => s + (achieved[i.id] ?? 0), 0);
      const deptName = departments.find((d) => d.id === g.department_id)?.name ?? "";
      return { id: g.id, code: g.code, title: g.title, deptName, target, achieved: ach, pct: pct(ach, target), color: getColor(idx), indicatorsCount: inds.length };
    }).filter((g) => g.indicatorsCount > 0);
  }, [allGoals, allIndicators, achieved, departments]);

  // 4. Per sector
  const sectorStats = useMemo(() => {
    const sectorsMap = new Map<string, { target: number, achieved: number, count: number }>();
    
    allIndicators.forEach(ind => {
      const sector = ind.sector || "بدون تصنيف";
      if (!sectorsMap.has(sector)) {
        sectorsMap.set(sector, { target: 0, achieved: 0, count: 0 });
      }
      const data = sectorsMap.get(sector)!;
      data.target += Number(ind.target_value ?? 0);
      data.achieved += (achieved[ind.id] ?? 0);
      data.count += 1;
    });

    return Array.from(sectorsMap.entries()).map(([name, data], idx) => {
      return { 
        name, 
        target: data.target, 
        achieved: data.achieved, 
        pct: pct(data.achieved, data.target), 
        color: getColor(idx + 3), // Offset colors
        indicatorsCount: data.count 
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [allIndicators, achieved]);

  // 5. Per Funder/Project
  const funderStats = useMemo(() => {
    const map = new Map<string, { target: number, achieved: number, count: number }>();
    
    allIndicators.forEach(ind => {
      const funder = ind.source_of_fund || "بدون جهة تمويل";
      if (!map.has(funder)) {
        map.set(funder, { target: 0, achieved: 0, count: 0 });
      }
      const data = map.get(funder)!;
      data.target += Number(ind.target_value ?? 0);
      data.achieved += (achieved[ind.id] ?? 0);
      data.count += 1;
    });

    return Array.from(map.entries()).map(([name, data], idx) => {
      return { 
        name, 
        target: data.target, 
        achieved: data.achieved, 
        pct: pct(data.achieved, data.target), 
        color: getColor(idx + 7), // Offset colors
        indicatorsCount: data.count 
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [allIndicators, achieved]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="لوحة المدير التنفيذي">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-lg font-medium">جاري تحميل البيانات...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="لوحة المدير التنفيذي">
      <div className="space-y-8 pb-10" dir="rtl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, hsl(354 78% 40%) 0%, hsl(354 78% 20%) 100%)" }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)" }} />
          <div className="relative p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">لوحة المدير التنفيذي</h1>
                <p className="text-white/70 text-sm mt-1">نظرة عامة على أداء الخطة الاستراتيجية</p>
              </div>
            </div>
            <Link to="/department-dashboard"
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/20 shrink-0">
              عرض التفاصيل الكاملة
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Section 1: Overall ──────────────────────────────────────────── */}
        <section>
          <SectionTitle icon={<Zap className="w-5 h-5 text-primary" />} title="الإجمالي المحقق من الخطة" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-elevated p-6 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground font-medium">نسبة إنجاز الخطة الكلية</p>
              <div className="relative">
                <RadialProgress value={overallStats.pct} size={164} stroke={14} color={pctColor(overallStats.pct)} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black" style={{ color: pctColor(overallStats.pct) }}>
                    {overallStats.pct}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {overallStats.achieved.toLocaleString()} من أصل {overallStats.target.toLocaleString()} وحدة
              </p>
            </Card>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <MiniKPI icon={<Target className="w-5 h-5" />} label="إجمالي الأهداف العامة" value={overallStats.goalsCount} color="text-primary" bg="bg-primary/10" />
              <MiniKPI icon={<BarChart3 className="w-5 h-5" />} label="عدد المؤشرات" value={overallStats.indicatorsCount} color="text-info" bg="bg-info/10" />
              <MiniKPI icon={<TrendingUp className="w-5 h-5" />} label="إجمالي المستهدف" value={overallStats.target.toLocaleString()} color="text-warning" bg="bg-warning/10" isText />
              <MiniKPI icon={<CheckCircle2 className="w-5 h-5" />} label="إجمالي المحقق" value={overallStats.achieved.toLocaleString()} color="text-success" bg="bg-success/10" isText />
            </div>
          </div>
        </section>

        {/* ── Section 2: Per Dept ─────────────────────────────────────────── */}
        <section>
          <SectionTitle icon={<Building2 className="w-5 h-5 text-primary" />} title="الإنجاز حسب الإدارة" />
          {deptStats.length === 0 ? <EmptyState msg="لا توجد إدارات بخطة مرتبطة بعد" /> : (
            <>
              <Card className="card-elevated p-6 mb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptStats} margin={{ top: 10, right: 10, left: 0, bottom: 60 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "نسبة الإنجاز"]}
                      contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {deptStats.map((d, i) => <Cell key={d.id} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </section>

        {/* ── Section 2.5: Per Sector ─────────────────────────────────────── */}
        <section>
          <SectionTitle icon={<Target className="w-5 h-5 text-primary" />} title="الإنجاز حسب تصنيف النشاط (القطاع)" />
          {sectorStats.length === 0 ? <EmptyState msg="لا توجد قطاعات مسجلة" /> : (
            <>
              <Card className="card-elevated p-6 mb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={sectorStats} margin={{ top: 10, right: 10, left: 0, bottom: 60 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "نسبة الإنجاز"]}
                      contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {sectorStats.map((s, i) => <Cell key={s.name} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </section>

        {/* ── Section 2.6: Per Funder / Project ───────────────────────────── */}
        <section>
          <SectionTitle icon={<Building2 className="w-5 h-5 text-primary" />} title="الإنجاز حسب المشروع / جهة التمويل" />
          {funderStats.length === 0 ? <EmptyState msg="لا توجد جهات تمويل مسجلة" /> : (
            <>
              <Card className="card-elevated p-6 mb-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funderStats} margin={{ top: 10, right: 10, left: 0, bottom: 60 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, "نسبة الإنجاز"]}
                      contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={52}>
                      {funderStats.map((s, i) => <Cell key={s.name} fill={s.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deptStats.map((dept) => (
                  <Card key={dept.id} className="card-elevated p-5 hover:shadow-glow transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs font-mono text-muted-foreground">{dept.code}</span>
                        <h3 className="font-bold text-sm mt-0.5 leading-snug">{dept.name}</h3>
                      </div>
                      <span className="text-2xl font-black" style={{ color: pctColor(dept.pct) }}>{dept.pct}%</span>
                    </div>
                    <ProgressBar value={dept.pct} color={dept.color} />
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>{dept.achieved.toLocaleString()} محقق</span>
                      <span>{dept.target.toLocaleString()} مستهدف</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" />{dept.goalsCount} هدف</span>
                      <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{dept.indicatorsCount} مؤشر</span>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Section 3: Per Goal ─────────────────────────────────────────── */}
        <section>
          <SectionTitle icon={<Target className="w-5 h-5 text-primary" />} title="الإنجاز حسب الهدف" />
          {goalStats.length === 0 ? <EmptyState msg="لا توجد أهداف مسجلة بعد" /> : (
            <div className="space-y-3">
              {goalStats.map((goal, idx) => (
                <Card key={goal.id} className="card-elevated p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ background: goal.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{goal.code}</span>
                            <span className="text-xs text-muted-foreground">{goal.deptName}</span>
                          </div>
                          <p className="font-semibold text-sm mt-1 leading-snug">{goal.title}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-2xl font-black" style={{ color: pctColor(goal.pct) }}>{goal.pct}%</span>
                          <p className="text-xs text-muted-foreground">{goal.indicatorsCount} مؤشر</p>
                        </div>
                      </div>
                      <ProgressBar value={goal.pct} color={goal.color} />
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{goal.achieved.toLocaleString()} محقق</span>
                        <span>{goal.target.toLocaleString()} مستهدف</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 4: Unlinked activities ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={<AlertCircle className="w-5 h-5 text-warning" />}
              title="الأنشطة غير المرتبطة بخطة"
              subtitle={`${unlinkedMissions.length} نشاط`} noMargin />
            <Link to="/department-dashboard"
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              عرض الكل <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {unlinkedMissions.length === 0 ? (
            <Card className="card-elevated p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">لا توجد أنشطة غير مرتبطة بالخطة 🎉</p>
            </Card>
          ) : (
            <Card className="card-elevated overflow-hidden">
              <div className="divide-y divide-border">
                {unlinkedMissions.slice(0, 15).map((m: any) => (
                  <div key={m.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.mission_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{m.mission_code}</span>
                          {m.activity_type && <span>• {m.activity_type}</span>}
                          {m.team_id && <span>• {m.team_id}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{m.activity_date}</span>
                      <Link to={`/missions/${m.id}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Layers className="w-3 h-3" /> عرض
                      </Link>
                    </div>
                  </div>
                ))}
                {unlinkedMissions.length > 15 && (
                  <div className="px-5 py-3 text-center text-xs text-muted-foreground">
                    + {unlinkedMissions.length - 15} نشاط آخر —{" "}
                    <Link to="/department-dashboard" className="text-primary hover:underline">عرض الكل في الـ Dashboard</Link>
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>

      </div>
    </AppLayout>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionTitle({ icon, title, subtitle, noMargin = false }: {
  icon: React.ReactNode; title: string; subtitle?: string; noMargin?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${noMargin ? "" : "mb-4"}`}>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">{subtitle}</span>}
    </div>
  );
}

function MiniKPI({ icon, label, value, color, bg, isText = false }: {
  icon: React.ReactNode; label: string; value: number | string; color: string; bg: string; isText?: boolean;
}) {
  return (
    <Card className="card-elevated p-5 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-snug">{label}</p>
        <p className={`text-2xl font-black ${color} mt-0.5`}>{value}</p>
      </div>
    </Card>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <Card className="card-elevated p-10 text-center">
      <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{msg}</p>
    </Card>
  );
}
