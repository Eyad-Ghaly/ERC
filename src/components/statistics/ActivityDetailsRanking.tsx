import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DistributionItem } from "@/services/statistics/statisticsCalculator";
import { ListOrdered, Sparkles } from "lucide-react";

interface ActivityDetailsRankingProps {
  data: DistributionItem[];
  selectedDetail: string;
  onSelectDetail: (detail: string) => void;
}

export function ActivityDetailsRanking({
  data,
  selectedDetail,
  onSelectDetail,
}: ActivityDetailsRankingProps) {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              تفاصيل الأنشطة الميدانية (الأعلى تنفيذاً)
            </h3>
            <p className="text-xs text-muted-foreground">
              ترتيب الأنشطة الميدانية الأكثر تنفيذاً وتكراراً
            </p>
          </div>
        </div>

        {selectedDetail && (
          <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary border border-primary/30 text-xs">
            تصفية: {selectedDetail}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {data.map((item, idx) => {
          const isSelected = selectedDetail === item.name;
          return (
            <div
              key={item.name}
              onClick={() => onSelectDetail(isSelected ? "" : item.name)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                isSelected
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-muted/20 border-border/70 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-bold text-foreground truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-bold text-primary">{item.value}</span>
                <span className="text-[10px] text-muted-foreground font-semibold">مهمة</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
