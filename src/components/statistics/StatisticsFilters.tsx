import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Search, Calendar, Users, RotateCcw, ChevronDown, Sparkles } from "lucide-react";
import { StatisticsFilterState } from "@/services/statistics/statisticsCalculator";
import { NormalizedTeam, NormalizedMission } from "@/services/statistics/fieldMapping";
import { STATUS_LABELS } from "@/lib/constants";

interface StatisticsFiltersProps {
  filters: StatisticsFilterState;
  onFilterChange: (key: keyof StatisticsFilterState, value: string) => void;
  onResetFilters: () => void;
  teams: NormalizedTeam[];
  canSelectTeam: boolean;
  rawMissions: NormalizedMission[];
}

export function StatisticsFilters({
  filters,
  onFilterChange,
  onResetFilters,
  teams,
  canSelectTeam,
  rawMissions,
}: StatisticsFiltersProps) {
  // Extract distinct option lists from raw data
  const distinctOptions = useMemo(() => {
    const governorates = new Set<string>();
    const classifications = new Set<string>();
    const activityTypes = new Set<string>();
    const responseTypes = new Set<string>();
    const serviceTypes = new Set<string>();
    const nationalities = new Set<string>();

    rawMissions.forEach((m) => {
      if (m.governorate && m.governorate !== "غير محدد") governorates.add(m.governorate);
      if (m.classification && m.classification !== "غير مصنف") classifications.add(m.classification);
      if (m.activityType && m.activityType !== "عام") activityTypes.add(m.activityType);
      if (m.responseType && m.responseType !== "عام") responseTypes.add(m.responseType);

      m.beneficiariesIndividual.forEach((b) => {
        if (b.serviceType && b.serviceType !== "غير محدد") serviceTypes.add(b.serviceType);
        if (b.nationality && b.nationality !== "غير محدد") nationalities.add(b.nationality);
      });

      m.beneficiariesGroup.forEach((g) => {
        if (g.serviceType && g.serviceType !== "غير محدد") serviceTypes.add(g.serviceType);
        if (g.nationality && g.nationality !== "غير محدد") nationalities.add(g.nationality);
      });
    });

    return {
      governorates: Array.from(governorates).sort(),
      classifications: Array.from(classifications).sort(),
      activityTypes: Array.from(activityTypes).sort(),
      responseTypes: Array.from(responseTypes).sort(),
      serviceTypes: Array.from(serviceTypes).sort(),
      nationalities: Array.from(nationalities).sort(),
    };
  }, [rawMissions]);

  // Quick Date Range Presets
  const setQuickDatePreset = (preset: "thisMonth" | "last30Days" | "thisQuarter" | "thisYear" | "all") => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().substring(0, 10);

    if (preset === "all") {
      onFilterChange("startDate", "");
      onFilterChange("endDate", "");
      return;
    }

    if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onFilterChange("startDate", formatDate(firstDay));
      onFilterChange("endDate", formatDate(lastDay));
    } else if (preset === "last30Days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      onFilterChange("startDate", formatDate(thirtyDaysAgo));
      onFilterChange("endDate", formatDate(now));
    } else if (preset === "thisQuarter") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), quarterMonth, 1);
      const lastDay = new Date(now.getFullYear(), quarterMonth + 3, 0);
      onFilterChange("startDate", formatDate(firstDay));
      onFilterChange("endDate", formatDate(lastDay));
    } else if (preset === "thisYear") {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      onFilterChange("startDate", formatDate(firstDay));
      onFilterChange("endDate", formatDate(lastDay));
    }
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.teamId && filters.teamId !== "all") count++;
    if (filters.governorate) count++;
    if (filters.classification) count++;
    if (filters.activityType) count++;
    if (filters.activityDetail) count++;
    if (filters.responseType) count++;
    if (filters.serviceType) count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.gender) count++;
    if (filters.nationality) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  return (
    <Card className="p-4 md:p-5 card-elevated border-border space-y-4">
      {/* Top Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">تصفية وتخصيص البيانات</span>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-mono">
              {activeFiltersCount}
            </Badge>
          )}
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground me-1 hidden sm:inline">فترات سريعة:</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickDatePreset("thisMonth")}
            className="text-xs h-7 px-2.5 rounded-md hover:bg-primary/10 hover:text-primary"
          >
            هذا الشهر
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickDatePreset("last30Days")}
            className="text-xs h-7 px-2.5 rounded-md hover:bg-primary/10 hover:text-primary"
          >
            آخر 30 يوم
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickDatePreset("thisQuarter")}
            className="text-xs h-7 px-2.5 rounded-md hover:bg-primary/10 hover:text-primary"
          >
            الربع الحالي
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickDatePreset("thisYear")}
            className="text-xs h-7 px-2.5 rounded-md hover:bg-primary/10 hover:text-primary"
          >
            هذا العام
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickDatePreset("all")}
            className="text-xs h-7 px-2.5 rounded-md text-muted-foreground hover:text-foreground"
          >
            كل الفترات
          </Button>
        </div>
      </div>

      {/* Filter Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Date: Start Date */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">من تاريخ</label>
          <div className="relative">
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange("startDate", e.target.value)}
              className="text-xs bg-background h-9"
            />
          </div>
        </div>

        {/* Date: End Date */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">إلى تاريخ</label>
          <div className="relative">
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange("endDate", e.target.value)}
              className="text-xs bg-background h-9"
            />
          </div>
        </div>

        {/* Team Selector (Management & Admin) */}
        {canSelectTeam && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">الفريق</label>
            <Select value={filters.teamId || "all"} onValueChange={(val) => onFilterChange("teamId", val)}>
              <SelectTrigger className="text-xs bg-background h-9">
                <SelectValue placeholder="جميع الفرق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">✨ جميع الفرق ({teams.length})</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    فريق {t.code} {t.name ? `- ${t.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Governorate */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">المحافظة</label>
          <Select value={filters.governorate || "all"} onValueChange={(val) => onFilterChange("governorate", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="كل المحافظات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المحافظات</SelectItem>
              {distinctOptions.governorates.map((gov) => (
                <SelectItem key={gov} value={gov}>{gov}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Classification */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">تصنيف النشاط</label>
          <Select value={filters.classification || "all"} onValueChange={(val) => onFilterChange("classification", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="كل التصنيفات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {distinctOptions.classifications.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Type */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">نوع النشاط</label>
          <Select value={filters.activityType || "all"} onValueChange={(val) => onFilterChange("activityType", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="كل الأنواع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل أنواع الأنشطة</SelectItem>
              {distinctOptions.activityTypes.map((act) => (
                <SelectItem key={act} value={act}>{act}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Response Type */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">نوع الاستجابة</label>
          <Select value={filters.responseType || "all"} onValueChange={(val) => onFilterChange("responseType", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="كل الاستجابات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل أنواع الاستجابة</SelectItem>
              {distinctOptions.responseTypes.map((resp) => (
                <SelectItem key={resp} value={resp}>{resp}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Type */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">نوع الخدمة</label>
          <Select value={filters.serviceType || "all"} onValueChange={(val) => onFilterChange("serviceType", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="كل الخدمات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الخدمات</SelectItem>
              {distinctOptions.serviceTypes.map((srv) => (
                <SelectItem key={srv} value={srv}>{srv}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mission Status */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">حالة المهمة</label>
          <Select value={filters.status || "all"} onValueChange={(val) => onFilterChange("status", val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="المهام النشطة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">المهام الفعالة (الكل باستثناء الملغاة)</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Demographics: Gender */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">النوع</label>
          <Select value={filters.gender || "all"} onValueChange={(val) => onFilterChange("gender", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="الكل (ذكور وإناث)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل (ذكور وإناث)</SelectItem>
              <SelectItem value="ذكر">ذكر</SelectItem>
              <SelectItem value="أنثى">أنثى</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Demographics: Nationality */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">الجنسية</label>
          <Select value={filters.nationality || "all"} onValueChange={(val) => onFilterChange("nationality", val === "all" ? "" : val)}>
            <SelectTrigger className="text-xs bg-background h-9">
              <SelectValue placeholder="كل الجنسيات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الجنسيات</SelectItem>
              {distinctOptions.nationalities.map((nat) => (
                <SelectItem key={nat} value={nat}>{nat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Query */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">بحث بالاسم / الكود</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-3 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ابحث..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange("searchQuery", e.target.value)}
              className="text-xs bg-background h-9 pr-8"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Tags Bar */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t text-xs">
          <span className="text-muted-foreground font-medium me-1">الفلاتر المطبقة:</span>

          {filters.startDate && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              من: {filters.startDate}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("startDate", "")} />
            </Badge>
          )}

          {filters.endDate && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              إلى: {filters.endDate}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("endDate", "")} />
            </Badge>
          )}

          {filters.teamId && filters.teamId !== "all" && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              فريق: {teams.find(t => t.id === filters.teamId)?.code || filters.teamId}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("teamId", "all")} />
            </Badge>
          )}

          {filters.governorate && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              المحافظة: {filters.governorate}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("governorate", "")} />
            </Badge>
          )}

          {filters.classification && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              التصنيف: {filters.classification}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("classification", "")} />
            </Badge>
          )}

          {filters.activityType && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              نوع النشاط: {filters.activityType}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("activityType", "")} />
            </Badge>
          )}

          {filters.activityDetail && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              تفاصيل النشاط: {filters.activityDetail}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("activityDetail", "")} />
            </Badge>
          )}

          {filters.responseType && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              نوع الاستجابة: {filters.responseType}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("responseType", "")} />
            </Badge>
          )}

          {filters.serviceType && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              الخدمة: {filters.serviceType}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("serviceType", "")} />
            </Badge>
          )}

          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              الحالة: {STATUS_LABELS[filters.status] || filters.status}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("status", "all")} />
            </Badge>
          )}

          {filters.gender && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              النوع: {filters.gender}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("gender", "")} />
            </Badge>
          )}

          {filters.nationality && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              الجنسية: {filters.nationality}
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("nationality", "")} />
            </Badge>
          )}

          {filters.searchQuery && (
            <Badge variant="secondary" className="gap-1 py-0.5 px-2 bg-primary/10 text-primary border border-primary/20">
              بحث: "{filters.searchQuery}"
              <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onFilterChange("searchQuery", "")} />
            </Badge>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-xs h-6 px-2 text-destructive hover:bg-destructive/10 ms-auto font-bold gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            إعادة ضبط الفلاتر
          </Button>
        </div>
      )}
    </Card>
  );
}
