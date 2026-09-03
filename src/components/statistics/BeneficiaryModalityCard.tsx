import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BeneficiaryModalityData } from "@/services/statistics/statisticsCalculator";
import { UserCheck, Users, PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface BeneficiaryModalityCardProps {
  data: BeneficiaryModalityData;
}

const COLORS = ["#3b82f6", "#10b981"];

export function BeneficiaryModalityCard({ data }: BeneficiaryModalityCardProps) {
  const chartData = [
    { name: "تسجيل فردي (سجل موثق)", value: data.individualBeneficiaries, services: data.individualServices },
    { name: "تسجيل جماعي (أنشطة عامة)", value: data.groupBeneficiaries, services: data.groupServices },
  ].filter((d) => d.value > 0);

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              نمط تسجيل المستفيدين (فردي مقابل جماعي)
            </h3>
            <p className="text-xs text-muted-foreground">
              مقارنة المستفيدين بالرقم القومي والسجلات الموثقة مقابل الفئات الجماعية
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          إجمالي المستفيدين: {data.totalBeneficiaries.toLocaleString("ar-EG")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Visual Donut Chart */}
        <div className="h-[180px] w-full" dir="ltr">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "10px",
                    direction: "rtl",
                    textAlign: "right",
                  }}
                  formatter={(val: unknown, name: string, item: any) => [
                    `${val} مستفيد (${item.payload.services} خدمة)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              لا توجد بيانات مسجلة
            </div>
          )}
        </div>

        {/* Detailed Breakdown Metrics */}
        <div className="space-y-3">
          {/* Individual */}
          <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>تسجيل فردي (بالرقم القومي)</span>
              </div>
              <span className="font-mono font-bold text-blue-600">%{data.individualPct}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{data.individualBeneficiaries.toLocaleString("ar-EG")} مستفيد</span>
              <span>{data.individualServices.toLocaleString("ar-EG")} خدمة ممنوحة</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.individualPct}%` }} />
            </div>
          </div>

          {/* Group */}
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>تسجيل جماعي (فعاليات وحملات)</span>
              </div>
              <span className="font-mono font-bold text-emerald-600">%{data.groupPct}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{data.groupBeneficiaries.toLocaleString("ar-EG")} مستفيد</span>
              <span>{data.groupServices.toLocaleString("ar-EG")} خدمة ممنوحة</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.groupPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
