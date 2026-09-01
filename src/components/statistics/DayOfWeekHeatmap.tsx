import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DayOfWeekItem } from "@/services/statistics/statisticsCalculator";
import { CalendarDays, Activity } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";

interface DayOfWeekHeatmapProps {
  data: DayOfWeekItem[];
}

export function DayOfWeekHeatmap({ data }: DayOfWeekHeatmapProps) {
  const maxMissions = Math.max(...data.map((d) => d.missionsCount), 1);

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center font-bold">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              نبض النشاط الأسبوعي (Weekly Operational Rhythm)
            </h3>
            <p className="text-xs text-muted-foreground">
              توزيع تنفيذ المهام والخدمات بحسب أيام الأسبوع لتحديد أيام الذروة الميدانية
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-600 border-sky-500/30">
          <Activity className="w-3.5 h-3.5 ml-1" />
          توزيع 7 أيام
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Chart View */}
        <div className="lg:col-span-2 h-[220px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="dayName" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "10px",
                  direction: "rtl",
                  textAlign: "right",
                }}
                formatter={(val: unknown, name: string) => [
                  name === "missionsCount" ? `${val} مهمة` : `${val} مستفيد`,
                  name === "missionsCount" ? "المهام" : "المستفيدين",
                ]}
              />
              <Bar dataKey="missionsCount" name="المهام" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => {
                  const isPeak = entry.missionsCount === maxMissions && entry.missionsCount > 0;
                  return (
                    <Cell
                      key={`day-${index}`}
                      fill={isPeak ? "#f59e0b" : "#0ea5e9"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Highlights of Days */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {data.map((day) => {
            const isPeak = day.missionsCount === maxMissions && day.missionsCount > 0;
            return (
              <div
                key={day.dayName}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  isPeak
                    ? "bg-amber-500/10 border-amber-500/40 font-bold"
                    : "bg-muted/20 border-border/60 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPeak ? "bg-amber-500" : "bg-sky-500"
                    }`}
                  />
                  <span className="text-foreground">{day.dayName}</span>
                  {isPeak && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-amber-500/20 text-amber-700">
                      ذروة
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-primary font-bold">{day.missionsCount} مهمة</span>
                  <span className="text-muted-foreground text-[11px]">({day.servicesCount} خدمة)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
