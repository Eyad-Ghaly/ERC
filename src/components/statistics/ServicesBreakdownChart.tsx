import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import { DistributionItem } from "@/services/statistics/statisticsCalculator";
import { Award, HeartHandshake } from "lucide-react";

interface ServicesBreakdownChartProps {
  data: DistributionItem[];
  selectedService: string;
  onSelectService: (service: string) => void;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
];

export function ServicesBreakdownChart({
  data,
  selectedService,
  onSelectService,
}: ServicesBreakdownChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 card-elevated flex flex-col items-center justify-center min-h-[280px] text-muted-foreground text-center">
        <Award className="w-8 h-8 mb-2 opacity-30" />
        <p className="font-bold">لا توجد خدمات مسجلة</p>
      </Card>
    );
  }

  const topServices = data.slice(0, 10);

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              إحصائيات الخدمات المقدمة
            </h3>
            <p className="text-xs text-muted-foreground">
              حجم الخدمات والمستفيدين المصنفين حسب نوع الخدمة
            </p>
          </div>
        </div>

        {selectedService && (
          <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary border border-primary/30 text-xs">
            تصفية: {selectedService}
          </Badge>
        )}
      </div>

      <div className="h-[300px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topServices}
            margin={{ top: 20, right: 20, left: 10, bottom: 50 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="name"
              angle={-30}
              textAnchor="end"
              height={50}
              tick={{ fontSize: 11, fill: "currentColor" }}
            />
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "10px",
                direction: "rtl",
                textAlign: "right",
              }}
              formatter={(val: unknown, name: unknown) => [
                `${val} ${String(name) === "value" ? "خدمة" : "مستفيد"}`,
                String(name) === "value" ? "عدد الخدمات المقدمة" : "المستفيدين",
              ]}
            />
            <Bar
              dataKey="value"
              name="عدد الخدمات"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
              onClick={(entry) => {
                if (entry && entry.name) {
                  onSelectService(selectedService === entry.name ? "" : entry.name);
                }
              }}
            >
              {topServices.map((entry, index) => (
                <Cell
                  key={`srv-cell-${index}`}
                  fill={selectedService === entry.name ? "#f59e0b" : COLORS[index % COLORS.length]}
                  className="cursor-pointer transition-all hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t">
        {data.slice(0, 6).map((srv, idx) => (
          <div
            key={srv.name}
            onClick={() => onSelectService(selectedService === srv.name ? "" : srv.name)}
            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
              selectedService === srv.name
                ? "bg-primary/10 border-primary shadow-sm"
                : "bg-muted/20 border-border/70 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="font-bold text-foreground truncate">{srv.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-bold text-primary">{srv.value} خدمة</span>
              {srv.secondaryValue !== undefined && (
                <span className="font-mono text-muted-foreground text-[10px]">({srv.secondaryValue} مستفيد)</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
