import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TimelineDataPoint } from "@/services/statistics/statisticsCalculator";
import { TrendingUp, Calendar, Layers } from "lucide-react";

interface TrendTimelineChartProps {
  timelineMonthly: TimelineDataPoint[];
  timelineDaily: TimelineDataPoint[];
}

export function TrendTimelineChart({
  timelineMonthly,
  timelineDaily,
}: TrendTimelineChartProps) {
  const [groupBy, setGroupBy] = useState<"month" | "day">("month");
  const [metricFocus, setMetricFocus] = useState<"all" | "missions" | "beneficiaries" | "volunteers">("all");

  const data = groupBy === "month" ? timelineMonthly : timelineDaily;

  if (!data || data.length === 0) {
    return (
      <Card className="p-6 card-elevated flex flex-col items-center justify-center min-h-[300px] text-muted-foreground text-center">
        <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
        <p className="font-bold">لا يوجد مسار زمني متاح للبيانات المحددة</p>
        <p className="text-xs">تأكد من وجود تواريخ مسجلة للمهام</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              المسار الزمني للأداء والأنشطة
            </h3>
            <p className="text-xs text-muted-foreground">
              تطور أعداد المهام، المستفيدين، والمتطوعين عبر الزمن
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric selector */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => setMetricFocus("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                metricFocus === "all" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setMetricFocus("missions")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                metricFocus === "missions" ? "bg-primary text-primary-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المهام
            </button>
            <button
              type="button"
              onClick={() => setMetricFocus("beneficiaries")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                metricFocus === "beneficiaries" ? "bg-emerald-600 text-white shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المستفيدون
            </button>
            <button
              type="button"
              onClick={() => setMetricFocus("volunteers")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                metricFocus === "volunteers" ? "bg-indigo-600 text-white shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المتطوعون
            </button>
          </div>

          {/* Grouping toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border text-xs">
            <button
              type="button"
              onClick={() => setGroupBy("month")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                groupBy === "month" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              شهري
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("day")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                groupBy === "day" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              يومي
            </button>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full pt-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMissions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorBeneficiaries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorVolunteers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="displayLabel" tick={{ fontSize: 11, fill: "currentColor" }} />
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                direction: "rtl",
                textAlign: "right",
              }}
            />
            <Legend wrapperStyle={{ direction: "rtl", fontSize: "12px", paddingTop: "10px" }} />

            {(metricFocus === "all" || metricFocus === "beneficiaries") && (
              <Area
                type="monotone"
                dataKey="beneficiaries"
                name="المستفيدون"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorBeneficiaries)"
              />
            )}

            {(metricFocus === "all" || metricFocus === "volunteers") && (
              <Area
                type="monotone"
                dataKey="volunteers"
                name="المتطوعون"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVolunteers)"
              />
            )}

            {(metricFocus === "all" || metricFocus === "missions") && (
              <Area
                type="monotone"
                dataKey="missions"
                name="المهام"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorMissions)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
