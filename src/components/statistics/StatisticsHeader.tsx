import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, BarChart2, Calendar, FileSpreadsheet, Layers } from "lucide-react";
import * as XLSX from "xlsx";
import { NormalizedMission } from "@/services/statistics/fieldMapping";
import { CalculatedKpis } from "@/services/statistics/statisticsCalculator";

interface StatisticsHeaderProps {
  title?: string;
  subtitle?: string;
  activeTeamName?: string;
  activeTeamCode?: string;
  dateRangeText?: string;
  loading: boolean;
  onRefresh: () => void;
  filteredMissions: NormalizedMission[];
  kpis: CalculatedKpis;
}

export function StatisticsHeader({
  title = "منظومة الإحصائيات وتحليل البيانات",
  subtitle = "لوحة تحليلية متكاملة لمؤشرات الأداء والمستهدفات الميدانية والمستفيدين",
  activeTeamName,
  activeTeamCode,
  dateRangeText,
  loading,
  onRefresh,
  filteredMissions,
  kpis,
}: StatisticsHeaderProps) {
  const handleExportExcel = () => {
    try {
      // 1. Missions Sheet
      const missionsData = filteredMissions.map((m) => {
        let bens = 0;
        let srvs = 0;
        m.beneficiariesIndividual.forEach((b) => {
          bens += 1;
          srvs += b.quantity || 1;
        });
        m.beneficiariesGroup.forEach((g) => {
          if (!g.isRepeated) bens += g.count || 0;
          srvs += g.count || 0;
        });

        return {
          "كود المهمة": m.code,
          "اسم المهمة": m.name,
          "التاريخ": m.date,
          "المحافظة": m.governorate,
          "التصنيف": m.classification,
          "نوع النشاط": m.activityType,
          "تفاصيل النشاط": m.activityDetail,
          "نوع الاستجابة": m.responseType,
          "الحالة": m.status,
          "عدد المتطوعين": m.volunteers.length,
          "عدد المستفيدين": bens,
          "عدد الخدمات": srvs,
        };
      });

      // 2. Summary Sheet
      const summaryData = [
        { "المؤشر": "إجمالي المهام", "القيمة": kpis.totalMissions },
        { "المؤشر": "المهام المكتملة", "القيمة": kpis.completedMissions },
        { "المؤشر": "المتطوعون المنفردون", "القيمة": kpis.uniqueVolunteersCount },
        { "المؤشر": "إجمالي المشاركات التطوعية", "القيمة": kpis.totalVolunteersCount },
        { "المؤشر": "إجمالي ساعات التطوع", "القيمة": kpis.totalVolunteerHours },
        { "المؤشر": "إجمالي المستفيدين الفعليين", "القيمة": kpis.totalActualBeneficiaries },
        { "المؤشر": "إجمالي الخدمات المقدمة", "القيمة": kpis.totalServicesCount },
      ];

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsMissions = XLSX.utils.json_to_sheet(missionsData);

      XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص المؤشرات");
      XLSX.utils.book_append_sheet(wb, wsMissions, "المهام التفصيلية");

      const dateStr = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(wb, `ERC_Statistics_Report_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-l from-primary/10 via-card to-card border border-primary/20 shadow-sm">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold shadow-inner">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            {title}
          </h1>
          {activeTeamCode && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono text-xs px-2.5 py-0.5">
              {activeTeamName ? `${activeTeamName} (${activeTeamCode})` : activeTeamCode}
            </Badge>
          )}
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {dateRangeText && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{dateRangeText}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="gap-2 bg-background hover:bg-muted font-medium text-xs h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>تحديث</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleExportExcel}
          disabled={filteredMissions.length === 0}
          className="gap-2 gradient-primary shadow-sm hover:opacity-95 font-medium text-xs h-9"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>تصدير إكسيل</span>
        </Button>
      </div>
    </div>
  );
}
