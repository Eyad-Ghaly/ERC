import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TargetSummary } from "@/services/statistics/statisticsCalculator";
import { Target, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";

interface TargetProgressSectionProps {
  targetSummary: TargetSummary;
}

export function TargetProgressSection({ targetSummary }: TargetProgressSectionProps) {
  if (!targetSummary.hasTargets && targetSummary.customProgressItems.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 card-elevated border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              مؤشرات تحقيق المستهدفات المعتمدة
            </h3>
            <p className="text-xs text-muted-foreground">
              مقارنة الإنجاز الفعلي مقابل الخطط والمستهدفات للفترة المحددة
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30 text-xs">
          <TrendingUp className="w-3 h-3" />
          مستهدفات الفترة
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {targetSummary.progressItems.map((item) => {
          if (!item.target || item.target === 0) return null;
          const isComplete = item.actual >= item.target;
          return (
            <div
              key={item.key}
              className="p-4 rounded-xl bg-background/80 border border-border/80 space-y-2.5 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{item.label}</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isComplete
                      ? "bg-success/15 text-success border border-success/30"
                      : item.percentage >= 70
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                  }`}
                >
                  %{item.percentage}
                </span>
              </div>

              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground text-sm">
                  {item.actual.toLocaleString("ar-EG")}
                </span>
                <span>المستهدف: {item.target.toLocaleString("ar-EG")}</span>
              </div>

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isComplete ? "bg-success" : item.percentage >= 70 ? "bg-primary" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {targetSummary.customProgressItems.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>المؤشرات المخصصة للفريق (Custom KPIs):</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {targetSummary.customProgressItems.map((kpi) => (
              <div key={kpi.key} className="p-3 rounded-lg bg-background/50 border text-xs flex justify-between items-center">
                <span className="font-medium text-muted-foreground truncate">{kpi.label}</span>
                <span className="font-mono font-bold text-primary">{kpi.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
