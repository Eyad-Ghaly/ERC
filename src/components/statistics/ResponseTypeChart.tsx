import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { DistributionItem } from "@/services/statistics/statisticsCalculator";
import { Radio, PieChart as PieIcon } from "lucide-react";

interface ResponseTypeChartProps {
  data: DistributionItem[];
  selectedResponseType: string;
  onSelectResponseType: (type: string) => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
];

export function ResponseTypeChart({
  data,
  selectedResponseType,
  onSelectResponseType,
}: ResponseTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 card-elevated flex flex-col items-center justify-center min-h-[250px] text-muted-foreground text-center">
        <Radio className="w-8 h-8 mb-2 opacity-30" />
        <p className="font-bold">لا توجد بيانات لأنواع الاستجابة</p>
      </Card>
    );
  }

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              نوع الاستجابة وطبيعة المهمة
            </h3>
            <p className="text-xs text-muted-foreground">
              توزيع المهام بحسب نوع الاستجابة الميدانية
            </p>
          </div>
        </div>

        {selectedResponseType && (
          <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary border border-primary/30 text-xs">
            تصفية: {selectedResponseType}
          </Badge>
        )}
      </div>

      <div className="h-[270px] w-full relative" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              onClick={(entry) => {
                if (entry && entry.name) {
                  onSelectResponseType(selectedResponseType === entry.name ? "" : entry.name);
                }
              }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={selectedResponseType === entry.name ? "#f59e0b" : COLORS[i % COLORS.length]}
                  stroke={selectedResponseType === entry.name ? "#fff" : "transparent"}
                  strokeWidth={selectedResponseType === entry.name ? 2.5 : 0}
                  className="cursor-pointer transition-all hover:opacity-85"
                />
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
              formatter={(val: unknown, name: unknown) => [`${val} مهمة`, String(name)]}
            />
            <Legend
              wrapperStyle={{ direction: "rtl", fontSize: "11px", paddingTop: "10px" }}
              formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
        {data.slice(0, 6).map((item, idx) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelectResponseType(selectedResponseType === item.name ? "" : item.name)}
            className={`p-2 rounded-lg border text-right transition-all flex items-center justify-between ${
              selectedResponseType === item.name
                ? "bg-primary/10 border-primary font-bold text-primary"
                : "bg-muted/20 border-border/70 hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="truncate">{item.name}</span>
            </div>
            <span className="font-mono text-foreground font-semibold shrink-0">
              {item.value} ({item.percentage}%)
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
