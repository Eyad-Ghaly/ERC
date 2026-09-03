import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VolunteerEffortData } from "@/services/statistics/statisticsCalculator";
import { Clock, Award, ShieldAlert, Users, TrendingUp, Zap } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface VolunteerEffortAnalyticsProps {
  data: VolunteerEffortData;
}

const BRACKET_COLORS = ["#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"];

export function VolunteerEffortAnalytics({ data }: VolunteerEffortAnalyticsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Hours Brackets Distribution */}
      <Card className="p-5 md:p-6 card-elevated border-border lg:col-span-2 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground">
                توزيع ساعات التطوع بين المتطوعين (Productivity Curve)
              </h3>
              <p className="text-xs text-muted-foreground">
                كثافة وساعات العطاء الميداني للمتطوعين خلال الفترة
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
            إجمالي الساعات: {data.totalHours.toLocaleString("ar-EG")} ساعة
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-[200px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hoursBrackets} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "10px",
                    direction: "rtl",
                    textAlign: "right",
                  }}
                  formatter={(val: unknown) => [`${val} متطوع`, "العدد"]}
                />
                <Bar dataKey="count" name="عدد المتطوعين" radius={[6, 6, 0, 0]}>
                  {data.hoursBrackets.map((_, i) => (
                    <Cell key={i} fill={BRACKET_COLORS[i % BRACKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5">
            {data.hoursBrackets.map((b, idx) => (
              <div key={b.range} className="p-2.5 rounded-xl border bg-muted/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRACKET_COLORS[idx] }} />
                  <span className="font-medium text-foreground">{b.range}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{b.count} متطوع</span>
                  <span className="font-mono text-muted-foreground font-semibold">(%{b.percentage})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Volunteer Leadership & Performance Summary */}
      <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-600 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              مؤشرات الأداء التطوعي
            </h3>
            <p className="text-xs text-muted-foreground">
              معدلات الكفاءة والقيادة والنقاط
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">متوسط الساعات لكل متطوع:</span>
            </div>
            <span className="text-sm font-mono font-bold text-foreground">
              {data.avgHoursPerVolunteer} ساعة
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">إجمالي النقاط التطوعية:</span>
            </div>
            <span className="text-sm font-mono font-bold text-amber-600">
              {data.totalPoints.toLocaleString("ar-EG")} نقطة
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">مشاركات القادة في المهام:</span>
            </div>
            <span className="text-sm font-mono font-bold text-violet-600">
              {data.leaderParticipations} ({data.leaderHours} ساعة)
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              <span className="text-xs text-muted-foreground">مشاركات الأعضاء المتطوعين:</span>
            </div>
            <span className="text-sm font-mono font-bold text-sky-600">
              {data.memberParticipations} ({data.memberHours} ساعة)
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
