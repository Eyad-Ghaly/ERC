import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { DistributionItem } from "@/services/statistics/statisticsCalculator";
import { Users2, Globe, User } from "lucide-react";

interface DemographicsSectionProps {
  genderData: DistributionItem[];
  nationalityData: DistributionItem[];
  selectedGender: string;
  selectedNationality: string;
  onSelectGender: (g: string) => void;
  onSelectNationality: (n: string) => void;
}

const GENDER_COLORS: Record<string, string> = {
  "ذكر": "#3b82f6",
  "أنثى": "#ec4899",
  "غير محدد": "#94a3b8",
};

const NAT_COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#06b6d4",
  "#8b5cf6",
];

export function DemographicsSection({
  genderData,
  nationalityData,
  selectedGender,
  selectedNationality,
  onSelectGender,
  onSelectNationality,
}: DemographicsSectionProps) {
  const totalGender = genderData.reduce((acc, item) => acc + item.value, 0);
  const totalNationality = nationalityData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Gender Distribution */}
      <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground">
                التوزيع الديموغرافي: النوع (الجنس)
              </h3>
              <p className="text-xs text-muted-foreground">
                نسبة وتوزيع المستفيدين حسب النوع
              </p>
            </div>
          </div>

          {selectedGender && (
            <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary border border-primary/30 text-xs">
              تصفية: {selectedGender}
            </Badge>
          )}
        </div>

        {genderData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-[200px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    onClick={(entry) => {
                      if (entry && entry.name) {
                        onSelectGender(selectedGender === entry.name ? "" : entry.name);
                      }
                    }}
                  >
                    {genderData.map((entry) => (
                      <Cell
                        key={`gender-${entry.name}`}
                        fill={selectedGender === entry.name ? "#f59e0b" : GENDER_COLORS[entry.name] || "#6366f1"}
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
                    formatter={(val: unknown) => [`${val} مستفيد`, "العدد"]}
                  />
                  <Legend
                    wrapperStyle={{ direction: "rtl", fontSize: "11px" }}
                    formatter={(value) => <span className="text-foreground font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
              {genderData.map((item) => (
                <div
                  key={item.name}
                  onClick={() => onSelectGender(selectedGender === item.name ? "" : item.name)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedGender === item.name
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-muted/20 border-border/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-foreground">{item.name}</span>
                    <span className="font-mono font-bold text-primary">%{item.percentage}</span>
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {item.value.toLocaleString("ar-EG")} مستفيد
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
            لا توجد بيانات جنس مسجلة
          </div>
        )}
      </Card>

      {/* 2. Nationality Distribution */}
      <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground">
                التوزيع الديموغرافي: الجنسية
              </h3>
              <p className="text-xs text-muted-foreground">
                توزيع المستفيدين بحسب الجنسية والدول
              </p>
            </div>
          </div>

          {selectedNationality && (
            <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary border border-primary/30 text-xs">
              تصفية: {selectedNationality}
            </Badge>
          )}
        </div>

        {nationalityData.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {nationalityData.slice(0, 8).map((nat, idx) => {
              const isNatSelected = selectedNationality === nat.name;
              const color = NAT_COLORS[idx % NAT_COLORS.length];

              return (
                <div
                  key={nat.name}
                  onClick={() => onSelectNationality(isNatSelected ? "" : nat.name)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isNatSelected
                      ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30"
                      : "bg-muted/20 border-border/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-bold text-foreground">{nat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">
                        {nat.value.toLocaleString("ar-EG")} مستفيد
                      </span>
                      <span className="font-mono text-muted-foreground font-semibold">
                        (%{nat.percentage})
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${nat.percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
            لا توجد بيانات جنسيات مسجلة
          </div>
        )}
      </Card>
    </div>
  );
}
