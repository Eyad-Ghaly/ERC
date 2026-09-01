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
} from "recharts";
import { DistributionItem } from "@/services/statistics/statisticsCalculator";
import { MapPin, Map } from "lucide-react";

interface GovernoratesRankingChartProps {
  data: DistributionItem[];
  selectedGovernorate: string;
  onSelectGovernorate: (gov: string) => void;
}

export function GovernoratesRankingChart({
  data,
  selectedGovernorate,
  onSelectGovernorate,
}: GovernoratesRankingChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 card-elevated flex flex-col items-center justify-center min-h-[280px] text-muted-foreground text-center">
        <Map className="w-8 h-8 mb-2 opacity-30" />
        <p className="font-bold">لا توجد بيانات محافظات مسجلة</p>
      </Card>
    );
  }

  const topGovernorates = data.slice(0, 10);

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              توزيع المهام على المحافظات
            </h3>
            <p className="text-xs text-muted-foreground">
              ترتيب المحافظات الأكثر نشاطاً وتنفيذاً للمهام
            </p>
          </div>
        </div>

        {selectedGovernorate && (
          <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary border border-primary/30 text-xs">
            تصفية: {selectedGovernorate}
          </Badge>
        )}
      </div>

      <div className="h-[280px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topGovernorates}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              tick={{ fontSize: 12, fill: "currentColor", cursor: "pointer" }}
              onClick={(tick) => {
                if (tick && tick.value) {
                  onSelectGovernorate(selectedGovernorate === tick.value ? "" : tick.value);
                }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "10px",
                direction: "rtl",
                textAlign: "right",
              }}
              formatter={(val: unknown) => [`${val} مهمة`, "عدد المهام"]}
            />
            <Bar
              dataKey="value"
              name="عدد المهام"
              radius={[0, 6, 6, 0]}
              barSize={18}
              onClick={(entry) => {
                if (entry && entry.name) {
                  onSelectGovernorate(selectedGovernorate === entry.name ? "" : entry.name);
                }
              }}
            >
              {topGovernorates.map((entry, index) => (
                <Cell
                  key={`gov-cell-${index}`}
                  fill={selectedGovernorate === entry.name ? "#f59e0b" : "hsl(var(--primary))"}
                  className="cursor-pointer transition-all hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick ranking chips */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t text-xs">
        {data.slice(0, 8).map((gov) => (
          <button
            key={gov.name}
            type="button"
            onClick={() => onSelectGovernorate(selectedGovernorate === gov.name ? "" : gov.name)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
              selectedGovernorate === gov.name
                ? "bg-primary text-primary-foreground font-bold border-primary shadow-sm"
                : "bg-muted/30 border-border/80 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <span>{gov.name}</span>
            <span className="font-mono text-[10px] opacity-75">({gov.value})</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
