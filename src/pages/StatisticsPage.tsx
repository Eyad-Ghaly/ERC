import { useEffect, useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import {
  NormalizedMission,
  NormalizedTeam,
} from "@/services/statistics/fieldMapping";
import {
  fetchStatisticsTeams,
  fetchStatisticsMissions,
} from "@/services/statistics/statisticsService";
import {
  StatisticsFilterState,
  INITIAL_STATISTICS_FILTERS,
  filterMissions,
} from "@/services/statistics/statisticsCalculator";
import { StatisticsFilters } from "@/components/statistics/StatisticsFilters";
import { BeneficiariesRegistryExplorer } from "@/components/statistics/BeneficiariesRegistryExplorer";
import { StatisticsLoadingSkeleton } from "@/components/statistics/StatisticsLoadingSkeleton";
import { StatisticsErrorState } from "@/components/statistics/StatisticsErrorState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, HeartHandshake, FileSpreadsheet, RotateCcw, ShieldCheck } from "lucide-react";

export default function StatisticsPage() {
  const { user, profile, roles, hasRole } = useAuth();

  const isManagementOrAdmin =
    hasRole("management") ||
    hasRole("department_admin") ||
    hasRole("admin") ||
    hasRole("data_manager");

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<NormalizedTeam[]>([]);
  const [rawMissions, setRawMissions] = useState<NormalizedMission[]>([]);

  // Filter State
  const [filters, setFilters] = useState<StatisticsFilterState>(() => {
    return {
      ...INITIAL_STATISTICS_FILTERS,
      teamId: "all",
    };
  });

  // Load Data
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch available teams
      const loadedTeams = await fetchStatisticsTeams({
        roles,
        departmentId: profile?.department_id,
        userId: user.id,
      });
      setTeams(loadedTeams);

      // 2. Fetch missions
      const loadedMissions = await fetchStatisticsMissions(
        {
          roles,
          departmentId: profile?.department_id,
          teamId: profile?.team_id,
          userId: user.id,
          selectedTeamId: filters.teamId,
        },
        loadedTeams
      );
      setRawMissions(loadedMissions);
    } catch (err: unknown) {
      console.error("Error loading statistics:", err);
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تحميل البيانات";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, profile, roles, filters.teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter handling
  const handleFilterChange = (key: keyof StatisticsFilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      ...INITIAL_STATISTICS_FILTERS,
      teamId: isManagementOrAdmin ? "all" : profile?.team_id || "all",
    });
  };

  // Aggregated filtered data
  const filteredMissions = useMemo(() => {
    return filterMissions(rawMissions, filters);
  }, [rawMissions, filters]);

  // Quick Beneficiaries summary counts
  const beneficiariesStats = useMemo(() => {
    let indivBens = 0;
    let groupBens = 0;
    let totalServices = 0;

    const sourceMissions = filteredMissions.length > 0 ? filteredMissions : rawMissions;

    sourceMissions.forEach((m) => {
      (m.beneficiariesIndividual || []).forEach((b) => {
        indivBens++;
        totalServices += Number(b.quantity || 1);
      });
      (m.beneficiariesGroup || []).forEach((g) => {
        groupBens += Number(g.count || 0);
        totalServices += Number(g.count || 0);
      });
    });

    return {
      indivBens,
      groupBens,
      totalBens: indivBens + groupBens,
      totalServices,
    };
  }, [filteredMissions, rawMissions]);

  return (
    <AppLayout title="سجل المستفيدين الشامل والإحصائيات">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header Summary Card */}
        <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">
                    سجل المستفيدين الشامل والبحث الفوري
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    استعراض وتدقيق وبحث فوري في بيانات كافة المستفيدين المسجلين وفك التشفير وتصدير Excel
                  </p>
                </div>
              </div>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="py-1.5 px-3 bg-primary/10 text-primary border-primary/30 text-xs font-bold gap-1.5">
                <Users className="w-4 h-4" />
                إجمالي المستفيدين: {beneficiariesStats.totalBens.toLocaleString("ar-EG")}
              </Badge>
              <Badge variant="outline" className="py-1.5 px-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-bold gap-1.5">
                <HeartHandshake className="w-4 h-4" />
                إجمالي الخدمات: {beneficiariesStats.totalServices.toLocaleString("ar-EG")}
              </Badge>
              <Badge variant="outline" className="py-1.5 px-3 bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs font-bold gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                تسجيل فردي (بالرقم القومي): {beneficiariesStats.indivBens.toLocaleString("ar-EG")}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-1.5 text-xs h-9"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <StatisticsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          teams={teams}
          canSelectTeam={true}
          rawMissions={rawMissions}
        />

        {/* Loading State */}
        {loading && <StatisticsLoadingSkeleton />}

        {/* Error State */}
        {!loading && error && <StatisticsErrorState error={error} onRetry={loadData} />}

        {/* The Full Beneficiaries Registry Table */}
        {!loading && !error && (
          <div className="animate-in fade-in duration-300">
            <BeneficiariesRegistryExplorer
              missions={filteredMissions.length > 0 ? filteredMissions : rawMissions}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
