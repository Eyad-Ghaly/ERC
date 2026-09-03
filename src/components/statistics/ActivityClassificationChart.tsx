import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClassificationTreeNode } from "@/services/statistics/statisticsCalculator";
import { FolderTree, Check, Sparkles } from "lucide-react";

interface ActivityClassificationChartProps {
  treeData: ClassificationTreeNode[];
  selectedClassification: string;
  selectedActivityType: string;
  onSelectClassification: (cls: string) => void;
  onSelectActivityType: (cls: string, act: string) => void;
}

const PALETTE = [
  "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-500",
  "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-500",
  "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-500",
  "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-500",
  "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-500",
  "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-500",
];

export function ActivityClassificationChart({
  treeData,
  selectedClassification,
  selectedActivityType,
  onSelectClassification,
  onSelectActivityType,
}: ActivityClassificationChartProps) {
  if (!treeData || treeData.length === 0) {
    return (
      <Card className="p-6 card-elevated flex flex-col items-center justify-center min-h-[250px] text-muted-foreground text-center">
        <FolderTree className="w-8 h-8 mb-2 opacity-30" />
        <p className="font-bold">لا توجد تصنيفات أنشطة مسجلة</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              الهيكل الشجري: تصنيفات وأنواع الأنشطة
            </h3>
            <p className="text-xs text-muted-foreground">
              توزيع المهام حسب التصنيف الرئيسي والأنشطة المنبثقة (اضغط للتصفية)
            </p>
          </div>
        </div>

        {(selectedClassification || selectedActivityType) && (
          <Badge variant="secondary" className="gap-1 bg-amber-500/15 text-amber-500 border border-amber-500/30 text-xs">
            تصفية نشطة
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {treeData.map((item, idx) => {
          const isClsSelected = selectedClassification === item.classification;
          const styleClass = PALETTE[idx % PALETTE.length];

          return (
            <div
              key={item.classification}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isClsSelected
                  ? "bg-primary/10 border-primary shadow-md ring-1 ring-primary/40"
                  : "bg-muted/20 border-border/70 hover:bg-muted/40"
              }`}
            >
              {/* Classification Header */}
              <div
                className="flex items-center justify-between cursor-pointer mb-2.5"
                onClick={() => onSelectClassification(isClsSelected ? "" : item.classification)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${styleClass.split(" ")[0]} shrink-0`} />
                  <span className={`font-bold text-sm truncate ${isClsSelected ? "text-primary" : "text-foreground"}`}>
                    {item.classification}
                  </span>
                  {isClsSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">%{item.percentage}</span>
                  <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                    {item.totalMissions} مهمة
                  </Badge>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-primary/70 rounded-full transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              {/* Sub activity types */}
              <div className="flex flex-wrap gap-1.5 ps-4 border-r-2 border-primary/20 pt-1">
                {item.types.map((typeObj) => {
                  const isTypeSelected = selectedActivityType === typeObj.type && isClsSelected;
                  return (
                    <button
                      key={typeObj.type}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectActivityType(item.classification, isTypeSelected ? "" : typeObj.type);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all border ${
                        isTypeSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-sm border-primary"
                          : "bg-background/90 hover:border-primary/40 text-foreground border-border/80"
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{typeObj.type}</span>
                      <span className="opacity-70 text-[10px] font-mono">({typeObj.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
