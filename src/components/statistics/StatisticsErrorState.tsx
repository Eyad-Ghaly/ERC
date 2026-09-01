import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface StatisticsErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function StatisticsErrorState({ error, onRetry }: StatisticsErrorStateProps) {
  return (
    <Card className="p-8 md:p-10 card-elevated border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-8 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-inner">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-foreground">
          تعذر تحميل بيانات الإحصائيات
        </h3>
        <p className="text-xs text-muted-foreground max-w-md font-mono bg-background/80 p-2.5 rounded-lg border border-destructive/20 text-destructive text-left dir-ltr">
          {error}
        </p>
      </div>

      <Button onClick={onRetry} variant="default" className="gradient-primary gap-2 text-xs font-bold shadow">
        <RefreshCw className="w-3.5 h-3.5" />
        إعادة المحاولة
      </Button>
    </Card>
  );
}
