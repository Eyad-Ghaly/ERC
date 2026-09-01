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
  calculateBeneficiaryModality,
  calculateServicesDemographicsCross,
  calculateVolunteerEffortMetrics,
  calculateDayOfWeekActivity,
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
import { BeneficiaryModalityCard } from "@/components/statistics/BeneficiaryModalityCard";
import { ServicesDemographicsStackedChart } from "@/components/statistics/ServicesDemographicsStackedChart";
import { VolunteerEffortAnalytics } from "@/components/statistics/VolunteerEffortAnalytics";
import { DayOfWeekHeatmap } from "@/components/statistics/DayOfWeekHeatmap";
import { ActivityDetailsRanking } from "@/components/statistics/ActivityDetailsRanking";
import { StatisticsDataTable } from "@/components/statistics/StatisticsDataTable";
import { BeneficiariesRegistryExplorer } from "@/components/statistics/BeneficiariesRegistryExplorer";
import { StatisticsEmptyState } from "@/components/statistics/StatisticsEmptyState";
import { StatisticsLoadingSkeleton } from "@/components/statistics/StatisticsLoadingSkeleton";
import { StatisticsErrorState } from "@/components/statistics/StatisticsErrorState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, HeartHandshake, Users, MapPin, Table as TableIcon, Search } from "lucide-react";

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

  // Filter State - Defaults to "all" teams so it doesn't automatically restrict to P18
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

  const modalityData = useMemo(() => {
    return calculateBeneficiaryModality(filteredMissions);
  }, [filteredMissions]);

  const servicesDemographicsData = useMemo(() => {
    return calculateServicesDemographicsCross(filteredMissions);
  }, [filteredMissions]);

  const volunteerEffortData = useMemo(() => {
    return calculateVolunteerEffortMetrics(filteredMissions);
  }, [filteredMissions]);

  const dayOfWeekData = useMemo(() => {
    return calculateDayOfWeekActivity(filteredMissions);
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
          canSelectTeam={true}
          rawMissions={rawMissions}
        />

        {/* Loading State */}
        {loading && <StatisticsLoadingSkeleton />}

        {/* Error State */}
        {!loading && error && <StatisticsErrorState error={error} onRetry={loadData} />}

        {/* Dashboard Visualizations & Registry */}
        {!loading && !error && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {filteredMissions.length === 0 && hasActiveFilters && (
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

            {/* 1. High-Level KPIs Section */}
            <KpiCardsSection kpis={kpis} targetSummary={targetSummary} />

            {/* 2. Target Progress (If targets exist) */}
            {targetSummary.hasTargets && (
              <TargetProgressSection targetSummary={targetSummary} />
            )}

            {/* 3. Perspectives Tabs Navigator */}
            <Tabs defaultValue="all" className="w-full space-y-6">
              <div className="overflow-x-auto pb-1">
                <TabsList className="bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap gap-1 border">
                  <TabsTrigger value="all" className="rounded-lg gap-2 text-xs md:text-sm py-2 px-3">
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    اللوحة الشاملة 360°
                  </TabsTrigger>
                  <TabsTrigger value="registry" className="rounded-lg gap-2 text-xs md:text-sm py-2 px-3 bg-primary/5 text-primary border border-primary/20 font-bold">
                    <Search className="w-4 h-4 text-primary" />
                    سجل المستفيدين والبحث الفوري
                  </TabsTrigger>
                  <TabsTrigger value="beneficiaries" className="rounded-lg gap-2 text-xs md:text-sm py-2 px-3">
                    <HeartHandshake className="w-4 h-4 text-emerald-500" />
                    المستفيدين والخدمات
                  </TabsTrigger>
                  <TabsTrigger value="volunteers" className="rounded-lg gap-2 text-xs md:text-sm py-2 px-3">
                    <Users className="w-4 h-4 text-indigo-500" />
                    كفاءة وأداء المتطوعين
                  </TabsTrigger>
                  <TabsTrigger value="operations" className="rounded-lg gap-2 text-xs md:text-sm py-2 px-3">
                    <MapPin className="w-4 h-4 text-sky-500" />
                    الجغرافيا والنبض الزمني
                  </TabsTrigger>
                  <TabsTrigger value="data" className="rounded-lg gap-2 text-xs md:text-sm py-2 px-3">
                    <TableIcon className="w-4 h-4 text-amber-500" />
                    سجل المهام وتصدير Excel
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* View 1: Complete Dashboard */}
              <TabsContent value="all" className="space-y-6 m-0">
                {/* Timeline Trend Chart */}
                <TrendTimelineChart
                  timelineMonthly={timelineMonthly}
                  timelineDaily={timelineDaily}
                />

                {/* Beneficiary Modality & Services Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BeneficiaryModalityCard data={modalityData} />
                  <ServicesDemographicsStackedChart
                    data={servicesDemographicsData}
                    selectedService={filters.serviceType}
                    onSelectService={handleSelectService}
                  />
                </div>

                {/* Comprehensive Decrypted Beneficiaries Search Explorer */}
                <BeneficiariesRegistryExplorer missions={filteredMissions.length > 0 ? filteredMissions : rawMissions} />

                {/* Volunteer Effort Analytics */}
                <VolunteerEffortAnalytics data={volunteerEffortData} />

                {/* Activity Classification & Response Type Charts */}
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

                {/* Governorates & Services Breakdown */}
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

                {/* Demographics (Gender & Nationality) */}
                <DemographicsSection
                  genderData={genderData}
                  nationalityData={nationalityData}
                  selectedGender={filters.gender}
                  selectedNationality={filters.nationality}
                  onSelectGender={handleSelectGender}
                  onSelectNationality={handleSelectNationality}
                />

                {/* Weekly Rhythm & Activity Details Ranking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DayOfWeekHeatmap data={dayOfWeekData} />
                  <ActivityDetailsRanking
                    data={activityDetailsData}
                    selectedDetail={filters.activityDetail}
                    onSelectDetail={handleSelectDetail}
                  />
                </div>

                {/* Detailed Data Tables & Excel Export */}
                <StatisticsDataTable
                  missions={detailedTableRows}
                  governoratesData={governoratesData}
                  servicesData={servicesData}
                  genderData={genderData}
                  nationalityData={nationalityData}
                />
              </TabsContent>

              {/* View 2: Registry Dedicated Tab */}
              <TabsContent value="registry" className="space-y-6 m-0">
                <BeneficiariesRegistryExplorer missions={filteredMissions.length > 0 ? filteredMissions : rawMissions} />
              </TabsContent>

              {/* View 3: Beneficiaries & Services Focused */}
              <TabsContent value="beneficiaries" className="space-y-6 m-0">
                <BeneficiaryModalityCard data={modalityData} />

                {/* Searchable Beneficiaries Registry */}
                <BeneficiariesRegistryExplorer missions={filteredMissions.length > 0 ? filteredMissions : rawMissions} />

                <ServicesDemographicsStackedChart
                  data={servicesDemographicsData}
                  selectedService={filters.serviceType}
                  onSelectService={handleSelectService}
                />

                <DemographicsSection
                  genderData={genderData}
                  nationalityData={nationalityData}
                  selectedGender={filters.gender}
                  selectedNationality={filters.nationality}
                  onSelectGender={handleSelectGender}
                  onSelectNationality={handleSelectNationality}
                />

                <ServicesBreakdownChart
                  data={servicesData}
                  selectedService={filters.serviceType}
                  onSelectService={handleSelectService}
                />

                {/* Searchable Beneficiaries Registry */}
                <BeneficiariesRegistryExplorer missions={filteredMissions} />
              </TabsContent>

              {/* View 3: Volunteers Intelligence */}
              <TabsContent value="volunteers" className="space-y-6 m-0">
                <VolunteerEffortAnalytics data={volunteerEffortData} />

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
              </TabsContent>

              {/* View 4: Operations & Geography Flow */}
              <TabsContent value="operations" className="space-y-6 m-0">
                <TrendTimelineChart
                  timelineMonthly={timelineMonthly}
                  timelineDaily={timelineDaily}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GovernoratesRankingChart
                    data={governoratesData}
                    selectedGovernorate={filters.governorate}
                    onSelectGovernorate={handleSelectGovernorate}
                  />
                  <DayOfWeekHeatmap data={dayOfWeekData} />
                </div>

                <ActivityDetailsRanking
                  data={activityDetailsData}
                  selectedDetail={filters.activityDetail}
                  onSelectDetail={handleSelectDetail}
                />
              </TabsContent>

              {/* View 5: Data Table & Excel */}
              <TabsContent value="data" className="space-y-6 m-0">
                <BeneficiariesRegistryExplorer missions={filteredMissions} />

                <StatisticsDataTable
                  missions={detailedTableRows}
                  governoratesData={governoratesData}
                  servicesData={servicesData}
                  genderData={genderData}
                  nationalityData={nationalityData}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
