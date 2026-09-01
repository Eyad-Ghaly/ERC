import { useEffect, useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import {
  NormalizedMission,
  NormalizedTarget,
  NormalizedCustomKpi,
  NormalizedTeam,
} from "@/services/statistics/fieldMapping";
import {
  fetchStatisticsTeams,
  fetchStatisticsTargets,
  fetchStatisticsMissions,
} from "@/services/statistics/statisticsService";
import {
  StatisticsFilterState,
  INITIAL_STATISTICS_FILTERS,
  filterMissions,
  calculateKpis,
  calculateTargetSummary,
  calculateTimelineTrend,
  calculateClassificationTree,
  calculateGovernoratesDistribution,
  calculateResponseTypeDistribution,
  calculateServicesDistribution,
  calculateActivityDetailsRanking,
  calculateGenderDistribution,
  calculateNationalityDistribution,
  formatDetailedTableRows,
} from "@/services/statistics/statisticsCalculator";

import { StatisticsHeader } from "@/components/statistics/StatisticsHeader";
import { StatisticsFilters } from "@/components/statistics/StatisticsFilters";
import { KpiCardsSection } from "@/components/statistics/KpiCardsSection";
import { TargetProgressSection } from "@/components/statistics/TargetProgressSection";
import { TrendTimelineChart } from "@/components/statistics/TrendTimelineChart";
import { ActivityClassificationChart } from "@/components/statistics/ActivityClassificationChart";
import { ResponseTypeChart } from "@/components/statistics/ResponseTypeChart";
import { GovernoratesRankingChart } from "@/components/statistics/GovernoratesRankingChart";
import { ServicesBreakdownChart } from "@/components/statistics/ServicesBreakdownChart";
import { DemographicsSection } from "@/components/statistics/DemographicsSection";
import { ActivityDetailsRanking } from "@/components/statistics/ActivityDetailsRanking";
import { StatisticsDataTable } from "@/components/statistics/StatisticsDataTable";
import { StatisticsEmptyState } from "@/components/statistics/StatisticsEmptyState";
import { StatisticsLoadingSkeleton } from "@/components/statistics/StatisticsLoadingSkeleton";
import { StatisticsErrorState } from "@/components/statistics/StatisticsErrorState";

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
  const [targets, setTargets] = useState<NormalizedTarget[]>([]);
  const [customKpiDefs, setCustomKpiDefs] = useState<NormalizedCustomKpi[]>([]);

  // Filter State
  const [filters, setFilters] = useState<StatisticsFilterState>(() => {
    return {
      ...INITIAL_STATISTICS_FILTERS,
      teamId: profile?.team_id || "all",
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

      // 3. Fetch targets
      const teamIds =
        filters.teamId !== "all"
          ? [filters.teamId]
          : loadedTeams.length > 0
          ? loadedTeams.map((t) => t.id)
          : profile?.team_id
          ? [profile.team_id]
          : [];

      const { targets: loadedTargets, customKpis: loadedCustomKpis } =
        await fetchStatisticsTargets(teamIds);
      setTargets(loadedTargets);
      setCustomKpiDefs(loadedCustomKpis);
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

  // Cross-filtering helpers
  const handleSelectGovernorate = (gov: string) => {
    handleFilterChange("governorate", gov);
  };

  const handleSelectClassification = (cls: string) => {
    handleFilterChange("classification", cls);
  };

  const handleSelectActivityType = (cls: string, act: string) => {
    setFilters((prev) => ({
      ...prev,
      classification: cls,
      activityType: act,
    }));
  };

  const handleSelectResponseType = (resp: string) => {
    handleFilterChange("responseType", resp);
  };

  const handleSelectService = (srv: string) => {
    handleFilterChange("serviceType", srv);
  };

  const handleSelectGender = (gender: string) => {
    handleFilterChange("gender", gender);
  };

  const handleSelectNationality = (nat: string) => {
    handleFilterChange("nationality", nat);
  };

  const handleSelectDetail = (detail: string) => {
    handleFilterChange("activityDetail", detail);
  };

  // Aggregated calculations
  const filteredMissions = useMemo(() => {
    return filterMissions(rawMissions, filters);
  }, [rawMissions, filters]);

  const kpis = useMemo(() => {
    return calculateKpis(filteredMissions, filters);
  }, [filteredMissions, filters]);

  const targetSummary = useMemo(() => {
    return calculateTargetSummary(targets, customKpiDefs, kpis, filters);
  }, [targets, customKpiDefs, kpis, filters]);

  const timelineMonthly = useMemo(() => {
    return calculateTimelineTrend(filteredMissions, "month");
  }, [filteredMissions]);

  const timelineDaily = useMemo(() => {
    return calculateTimelineTrend(filteredMissions, "day");
  }, [filteredMissions]);

  const classificationTree = useMemo(() => {
    return calculateClassificationTree(filteredMissions);
  }, [filteredMissions]);

  const governoratesData = useMemo(() => {
    return calculateGovernoratesDistribution(filteredMissions);
  }, [filteredMissions]);

  const responseTypeData = useMemo(() => {
    return calculateResponseTypeDistribution(filteredMissions);
  }, [filteredMissions]);

  const servicesData = useMemo(() => {
    return calculateServicesDistribution(filteredMissions);
  }, [filteredMissions]);

  const activityDetailsData = useMemo(() => {
    return calculateActivityDetailsRanking(filteredMissions);
  }, [filteredMissions]);

  const genderData = useMemo(() => {
    return calculateGenderDistribution(filteredMissions);
  }, [filteredMissions]);

  const nationalityData = useMemo(() => {
    return calculateNationalityDistribution(filteredMissions);
  }, [filteredMissions]);

  const detailedTableRows = useMemo(() => {
    return formatDetailedTableRows(filteredMissions);
  }, [filteredMissions]);

  // Active Team info
  const activeTeamObj = teams.find((t) => t.id === filters.teamId);
  const activeTeamName = activeTeamObj?.name || (filters.teamId === "all" ? "جميع الفرق" : "");
  const activeTeamCode = activeTeamObj?.code || (filters.teamId === "all" ? undefined : profile?.team_code);

  const dateRangeText = useMemo(() => {
    if (filters.startDate && filters.endDate) return `${filters.startDate} إلى ${filters.endDate}`;
    if (filters.startDate) return `من ${filters.startDate}`;
    if (filters.endDate) return `حتى ${filters.endDate}`;
    return undefined;
  }, [filters.startDate, filters.endDate]);

  const hasActiveFilters = Boolean(
    filters.startDate ||
      filters.endDate ||
      (filters.teamId && filters.teamId !== "all") ||
      filters.governorate ||
      filters.classification ||
      filters.activityType ||
      filters.activityDetail ||
      filters.responseType ||
      filters.serviceType ||
      (filters.status && filters.status !== "all") ||
      filters.gender ||
      filters.nationality ||
      filters.searchQuery
  );

  return (
    <AppLayout title="الإحصائيات وتحليل البيانات">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header */}
        <StatisticsHeader
          activeTeamName={activeTeamName}
          activeTeamCode={activeTeamCode}
          dateRangeText={dateRangeText}
          loading={loading}
          onRefresh={loadData}
          filteredMissions={filteredMissions}
          kpis={kpis}
        />

        {/* Filters */}
        <StatisticsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          teams={teams}
          canSelectTeam={isManagementOrAdmin}
          rawMissions={rawMissions}
        />

        {/* Loading State */}
        {loading && <StatisticsLoadingSkeleton />}

        {/* Error State */}
        {!loading && error && <StatisticsErrorState error={error} onRetry={loadData} />}

        {/* Empty State */}
        {!loading && !error && filteredMissions.length === 0 && (
          <StatisticsEmptyState
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
            statisticName={
              filters.serviceType
                ? `خدمة "${filters.serviceType}"`
                : filters.governorate
                ? `محافظة "${filters.governorate}"`
                : filters.classification
                ? `تصنيف "${filters.classification}"`
                : undefined
            }
          />
        )}

        {/* Dashboard Visualizations */}
        {!loading && !error && filteredMissions.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. KPIs Section */}
            <KpiCardsSection kpis={kpis} targetSummary={targetSummary} />

            {/* 2. Target Progress (If targets exist) */}
            {targetSummary.hasTargets && (
              <TargetProgressSection targetSummary={targetSummary} />
            )}

            {/* 3. Timeline Trend Chart */}
            <TrendTimelineChart
              timelineMonthly={timelineMonthly}
              timelineDaily={timelineDaily}
            />

            {/* 4. Activity Classification & Response Type Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityClassificationChart
                treeData={classificationTree}
                selectedClassification={filters.classification}
                selectedActivityType={filters.activityType}
                onSelectClassification={handleSelectClassification}
                onSelectActivityType={handleSelectActivityType}
              />
              <ResponseTypeChart
                data={responseTypeData}
                selectedResponseType={filters.responseType}
                onSelectResponseType={handleSelectResponseType}
              />
            </div>

            {/* 5. Governorates & Services Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GovernoratesRankingChart
                data={governoratesData}
                selectedGovernorate={filters.governorate}
                onSelectGovernorate={handleSelectGovernorate}
              />
              <ServicesBreakdownChart
                data={servicesData}
                selectedService={filters.serviceType}
                onSelectService={handleSelectService}
              />
            </div>

            {/* 6. Demographics (Gender & Nationality) */}
            <DemographicsSection
              genderData={genderData}
              nationalityData={nationalityData}
              selectedGender={filters.gender}
              selectedNationality={filters.nationality}
              onSelectGender={handleSelectGender}
              onSelectNationality={handleSelectNationality}
            />

            {/* 7. Activity Details Ranking */}
            <ActivityDetailsRanking
              data={activityDetailsData}
              selectedDetail={filters.activityDetail}
              onSelectDetail={handleSelectDetail}
            />

            {/* 8. Detailed Data Tables & Excel Export */}
            <StatisticsDataTable
              missions={detailedTableRows}
              governoratesData={governoratesData}
              servicesData={servicesData}
              genderData={genderData}
              nationalityData={nationalityData}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
