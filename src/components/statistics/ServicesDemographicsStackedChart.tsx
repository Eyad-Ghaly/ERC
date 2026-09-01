import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceDemographicItem } from "@/services/statistics/statisticsCalculator";
import { Layers, Users, Globe2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface ServicesDemographicsStackedChartProps {
  data: ServiceDemographicItem[];
  selectedService?: string;
  onSelectService?: (service: string) => void;
}

export function ServicesDemographicsStackedChart({
  data,
  selectedService,
  onSelectService,
}: ServicesDemographicsStackedChartProps) {
  const [breakdownMode, setBreakdownMode] = useState<"gender" | "nationality">("gender");

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              مصفوفة تفصيل الخدمات حسب الفئات (Data Matrix)
            </h3>
            <p className="text-xs text-muted-foreground">
              توزيع كمية كل خدمة بحسب النوع (ذكور/إناث) أو الجنسية (مصر/جنسيات أخرى)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border text-xs">
            <Button
              variant={breakdownMode === "gender" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setBreakdownMode("gender")}
            >
              <Users className="w-3.5 h-3.5 ml-1" />
              حسب النوع
            </Button>
            <Button
              variant={breakdownMode === "nationality" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setBreakdownMode("nationality")}
            >
              <Globe2 className="w-3.5 h-3.5 ml-1" />
              حسب الجنسية
            </Button>
          </div>

          {selectedService && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/30">
              محدد: {selectedService}
            </Badge>
          )}
        </div>
      </div>

      <div className="h-[280px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
            onClick={(e) => {
              if (e && e.activeLabel && onSelectService) {
                onSelectService(selectedService === e.activeLabel ? "" : e.activeLabel);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis
              dataKey="service"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "10px",
                direction: "rtl",
                textAlign: "right",
              }}
            />
            <Legend wrapperStyle={{ direction: "rtl", fontSize: "12px", paddingTop: "10px" }} />

            {breakdownMode === "gender" ? (
              <>
                <Bar dataKey="maleServices" name="خدمات الذكور" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="femaleServices" name="خدمات الإناث" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unspecifiedGenderServices" name="غير محدد" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <>
                <Bar dataKey="egyptianServices" name="مستفيدون مصريون" stackId="b" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="foreignServices" name="جنسيات أخرى / وافدون" stackId="b" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
