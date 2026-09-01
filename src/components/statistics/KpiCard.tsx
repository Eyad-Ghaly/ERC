import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export interface KpiCardProps {
  title: string;
  value: number | string;
  target?: number;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  gradientClass?: string;
  badgeText?: string;
  suffix?: string;
}

export function KpiCard({
  title,
  value,
  target,
  subtitle,
  icon: Icon,
  iconColorClass = "text-primary",
  gradientClass = "from-primary/15 to-transparent border-primary/20",
  badgeText,
  suffix,
}: KpiCardProps) {
  const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
  const hasTarget = typeof target === "number" && target > 0;
  const percentage = hasTarget ? Math.min(100, Math.round((numValue / target) * 100)) : null;

  return (
    <Card className={`p-4 md:p-5 card-elevated flex flex-col justify-between bg-gradient-to-br ${gradientClass} transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-bold text-muted-foreground truncate">{title}</p>
          {badgeText && (
            <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {badgeText}
            </span>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-background/80 shadow-sm border flex items-center justify-center shrink-0 ${iconColorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-2 mt-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
          </span>
          {suffix && <span className="text-xs text-muted-foreground font-semibold">{suffix}</span>}
          {hasTarget && (
            <span className="text-xs text-muted-foreground font-medium">
              / {target.toLocaleString("ar-EG")}
            </span>
          )}
        </div>

        {hasTarget && percentage !== null && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground font-medium">نسبة الإنجاز</span>
              <span className={`font-bold ${percentage >= 100 ? "text-success" : percentage >= 70 ? "text-primary" : "text-amber-500"}`}>
                %{percentage}
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentage >= 100 ? "bg-success" : percentage >= 70 ? "bg-primary" : "bg-amber-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {subtitle && (
          <p className="text-[11px] text-muted-foreground leading-tight pt-1">
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
