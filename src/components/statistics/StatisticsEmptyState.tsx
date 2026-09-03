import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FilterX, RotateCcw, SearchX } from "lucide-react";

interface StatisticsEmptyStateProps {
  title?: string;
  description?: string;
  statisticName?: string;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

export function StatisticsEmptyState({
  title = "لا توجد بيانات مسجلة مطابقة",
  description = "لم يتم العثور على أي نتائج وفقاً لمعايير التصفية المحددة حالياً. يمكنك تغيير أو إعادة ضبط الفلاتر للاطلاع على الإحصائيات.",
  statisticName,
  hasActiveFilters = false,
  onResetFilters,
}: StatisticsEmptyStateProps) {
  return (
    <Card className="p-8 md:p-12 card-elevated border-dashed border-primary/30 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-8 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-inner">
        {hasActiveFilters ? <FilterX className="w-8 h-8" /> : <Database className="w-8 h-8" />}
      </div>

      <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
        {title}
      </h3>

      {statisticName && (
        <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3">
          المؤشر المتأثر: {statisticName}
        </span>
      )}

      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {hasActiveFilters && onResetFilters && (
        <Button
          onClick={onResetFilters}
          className="gradient-primary gap-2 text-xs font-bold shadow-md hover:opacity-95"
        >
          <RotateCcw className="w-4 h-4" />
          إعادة ضبط الفلاتر وعرض كافة البيانات
        </Button>
      )}
    </Card>
  );
}
