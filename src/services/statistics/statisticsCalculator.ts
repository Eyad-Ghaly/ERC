import {
  NormalizedMission,
  NormalizedTarget,
  NormalizedCustomKpi,
} from "./fieldMapping";

export interface StatisticsFilterState {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  teamId: string; // "all" or ID
  governorate: string;
  classification: string;
  activityType: string;
  activityDetail: string;
  responseType: string;
  serviceType: string;
  status: string; // "all" or specific status
  gender: string;
  nationality: string;
  searchQuery: string;
}

export const INITIAL_STATISTICS_FILTERS: StatisticsFilterState = {
  startDate: "",
  endDate: "",
  teamId: "all",
  governorate: "",
  classification: "",
  activityType: "",
  activityDetail: "",
  responseType: "",
  serviceType: "",
  status: "all",
  gender: "",
  nationality: "",
  searchQuery: "",
};

export interface CalculatedKpis {
  totalMissions: number;
  completedMissions: number;
  plannedMissions: number;
  canceledMissions: number;
  totalVolunteersCount: number; // sum of volunteer participation
  uniqueVolunteersCount: number; // deduplicated volunteers
  totalVolunteerHours: number;
  totalVolunteerPoints: number;
  individualBeneficiariesCount: number;
  groupBeneficiariesCount: number;
  totalActualBeneficiaries: number; // unique individual + non-repeated group
  totalServicesCount: number; // sum of individual services + group services
  avgBeneficiariesPerMission: number;
  avgVolunteersPerMission: number;
}

export interface TargetProgressItem {
  key: string;
  label: string;
  actual: number;
  target: number;
  percentage: number;
  color: string;
}

export interface TargetSummary {
  hasTargets: boolean;
  missionsTarget: number;
  uniqueVolsTarget: number;
  totalVolsTarget: number;
  beneficiariesTarget: number;
  progressItems: TargetProgressItem[];
  customProgressItems: TargetProgressItem[];
}

export interface TimelineDataPoint {
  period: string; // "2026-08" or "2026-08-15"
  displayLabel: string;
  missions: number;
  beneficiaries: number;
  volunteers: number;
  services: number;
}

export interface ClassificationTreeNode {
  classification: string;
  totalMissions: number;
  percentage: number;
  types: {
    type: string;
    count: number;
    percentage: number;
  }[];
}

export interface DistributionItem {
  name: string;
  value: number;
  percentage?: number;
  secondaryValue?: number;
}

export interface BeneficiaryModalityData {
  individualBeneficiaries: number;
  groupBeneficiaries: number;
  individualServices: number;
  groupServices: number;
  totalBeneficiaries: number;
  totalServices: number;
  individualPct: number;
  groupPct: number;
}

export interface ServiceDemographicItem {
  service: string;
  totalServices: number;
  maleServices: number;
  femaleServices: number;
  unspecifiedGenderServices: number;
  egyptianServices: number;
  foreignServices: number;
}

export interface VolunteerEffortData {
  totalHours: number;
  totalPoints: number;
  uniqueVolunteers: number;
  leaderParticipations: number;
  memberParticipations: number;
  leaderHours: number;
  memberHours: number;
  avgHoursPerVolunteer: number;
  avgHoursPerMission: number;
  hoursBrackets: { range: string; count: number; percentage: number }[];
}

export interface DayOfWeekItem {
  dayName: string;
  dayIndex: number;
  missionsCount: number;
  beneficiariesCount: number;
  servicesCount: number;
  percentage: number;
}

export interface DetailedMissionTableRow {
  id: string;
  code: string;
  name: string;
  date: string;
  status: string;
  governorate: string;
  classification: string;
  activityType: string;
  responseType: string;
  volunteersCount: number;
  beneficiariesCount: number;
  servicesCount: number;
}

/**
 * Filters the missions list based on user selections
 */
export function filterMissions(
  missions: NormalizedMission[],
  filters: StatisticsFilterState
): NormalizedMission[] {
  return missions.filter((m) => {
    // 1. Canceled status filter
    if (filters.status === "all") {
      // Default: exclude canceled missions unless explicitly selected
      if (m.isCanceled || m.status === "canceled") return false;
    } else if (filters.status === "canceled") {
      if (!m.isCanceled && m.status !== "canceled") return false;
    } else {
      if (m.status !== filters.status) return false;
    }

    // 2. Date filters
    if (filters.startDate && m.date && m.date < filters.startDate) return false;
    if (filters.endDate && m.date && m.date > filters.endDate) return false;

    // 3. Team filter
    if (filters.teamId && filters.teamId !== "all" && m.teamId !== filters.teamId) return false;

    // 4. Categorical filters
    if (filters.governorate && m.governorate !== filters.governorate) return false;
    if (filters.classification && m.classification !== filters.classification) return false;
    if (filters.activityType && m.activityType !== filters.activityType) return false;
    if (filters.activityDetail && m.activityDetail !== filters.activityDetail) return false;
    if (filters.responseType && m.responseType !== filters.responseType) return false;

    // 5. Service filter
    if (filters.serviceType) {
      const hasIndiv = m.beneficiariesIndividual.some((b) => b.serviceType === filters.serviceType);
      const hasGroup = m.beneficiariesGroup.some((g) => g.serviceType === filters.serviceType);
      if (!hasIndiv && !hasGroup) return false;
    }

    // 6. Demographics filter
    if (filters.gender) {
      const hasIndivGender = m.beneficiariesIndividual.some((b) => b.gender === filters.gender);
      const hasGroupGender = m.beneficiariesGroup.some((g) => g.gender === filters.gender);
      if (!hasIndivGender && !hasGroupGender) return false;
    }

    if (filters.nationality) {
      const hasIndivNat = m.beneficiariesIndividual.some((b) => b.nationality === filters.nationality);
      const hasGroupNat = m.beneficiariesGroup.some((g) => g.nationality === filters.nationality);
      if (!hasIndivNat && !hasGroupNat) return false;
    }

    // 7. Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchCode = m.code.toLowerCase().includes(q);
      const matchGov = m.governorate.toLowerCase().includes(q);
      const matchCls = m.classification.toLowerCase().includes(q);
      const matchAct = m.activityType.toLowerCase().includes(q);
      const matchDetail = m.activityDetail.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchGov && !matchCls && !matchAct && !matchDetail) return false;
    }

    return true;
  });
}

/**
 * Calculates high-level KPI metrics
 */
export function calculateKpis(
  filteredMissions: NormalizedMission[],
  filters: StatisticsFilterState
): CalculatedKpis {
  let volunteersCount = 0;
  let volunteerHours = 0;
  let volunteerPoints = 0;
  let indivCount = 0;
  let groupCount = 0;
  let groupNonRepeated = 0;
  let indivServices = 0;
  let groupServices = 0;

  const uniqueVolunteersSet = new Set<string>();
  const uniqueBeneficiariesSet = new Set<string>();

  let completedMissions = 0;
  let plannedMissions = 0;
  let canceledMissions = 0;

  filteredMissions.forEach((m) => {
    if (m.isCanceled || m.status === "canceled") {
      canceledMissions++;
    } else if (m.status === "monitored") {
      completedMissions++;
    } else if (m.status === "planned") {
      plannedMissions++;
    }

    // Volunteers calculation
    m.volunteers.forEach((v) => {
      if (v.removed) return;
      volunteersCount++;
      volunteerHours += v.hours || 0;
      volunteerPoints += v.points || 0;

      if (v.membershipNumber) {
        uniqueVolunteersSet.add(`mem::${v.membershipNumber}`);
      } else if (v.fullName) {
        uniqueVolunteersSet.add(`name::${v.fullName.trim().toLowerCase()}`);
      } else {
        uniqueVolunteersSet.add(`id::${v.id}`);
      }
    });

    // Individual beneficiaries
    m.beneficiariesIndividual.forEach((b) => {
      if (filters.serviceType && b.serviceType !== filters.serviceType) return;
      if (filters.gender && b.gender !== filters.gender) return;
      if (filters.nationality && b.nationality !== filters.nationality) return;

      indivCount++;
      indivServices += b.quantity || 1;

      if (b.idHash) {
        uniqueBeneficiariesSet.add(`hash::${b.idHash}`);
      } else if (b.fullName && b.fullName.trim()) {
        uniqueBeneficiariesSet.add(`name::${b.fullName.trim().toLowerCase()}`);
      } else if (b.registryId) {
        uniqueBeneficiariesSet.add(`reg::${b.registryId}`);
      } else {
        uniqueBeneficiariesSet.add(`id::${b.id}`);
      }
    });

    // Group beneficiaries
    m.beneficiariesGroup.forEach((g) => {
      if (filters.serviceType && g.serviceType !== filters.serviceType) return;
      if (filters.gender && g.gender !== filters.gender) return;
      if (filters.nationality && g.nationality !== filters.nationality) return;

      groupCount += g.count || 0;
      groupServices += g.count || 0;
      if (!g.isRepeated) {
        groupNonRepeated += g.count || 0;
      }
    });
  });

  const totalActualBeneficiaries = uniqueBeneficiariesSet.size + groupNonRepeated;
  const totalMissions = filteredMissions.length;

  return {
    totalMissions,
    completedMissions,
    plannedMissions,
    canceledMissions,
    totalVolunteersCount: volunteersCount,
    uniqueVolunteersCount: uniqueVolunteersSet.size,
    totalVolunteerHours: Number(volunteerHours.toFixed(1)),
    totalVolunteerPoints: volunteerPoints,
    individualBeneficiariesCount: indivCount,
    groupBeneficiariesCount: groupCount,
    totalActualBeneficiaries,
    totalServicesCount: indivServices + groupServices,
    avgBeneficiariesPerMission: totalMissions > 0 ? Math.round(totalActualBeneficiaries / totalMissions) : 0,
    avgVolunteersPerMission: totalMissions > 0 ? Number((volunteersCount / totalMissions).toFixed(1)) : 0,
  };
}

/**
 * Calculates targets and progress comparison
 */
export function calculateTargetSummary(
  targets: NormalizedTarget[],
  customKpiDefs: NormalizedCustomKpi[],
  kpis: CalculatedKpis,
  filters: StatisticsFilterState
): TargetSummary {
  if (!targets || targets.length === 0) {
    return {
      hasTargets: false,
      missionsTarget: 0,
      uniqueVolsTarget: 0,
      totalVolsTarget: 0,
      beneficiariesTarget: 0,
      progressItems: [],
      customProgressItems: [],
    };
  }

  let startMonth = "";
  let endMonth = "";
  if (filters.startDate) startMonth = filters.startDate.substring(0, 7);
  if (filters.endDate) endMonth = filters.endDate.substring(0, 7);

  let targetMissions = 0;
  let targetUniqueVols = 0;
  let targetTotalVols = 0;
  let targetBeneficiaries = 0;
  const customAccumulator: Record<string, number> = {};

  targets.forEach((t) => {
    if (filters.teamId && filters.teamId !== "all" && t.teamId !== filters.teamId) return;

    const m = t.targetMonth;
    if (m) {
      if (startMonth && m < startMonth) return;
      if (endMonth && m > endMonth) return;
    }

    targetMissions += t.targetMissions || 0;
    targetUniqueVols += t.targetUniqueVolunteers || 0;
    targetTotalVols += t.targetVolunteerParticipations || 0;
    targetBeneficiaries += t.targetBeneficiaries || 0;

    const ct = t.customTargets || {};
    for (const key in ct) {
      customAccumulator[key] = (customAccumulator[key] || 0) + Number(ct[key] || 0);
    }
  });

  const hasTargets = targetMissions > 0 || targetUniqueVols > 0 || targetBeneficiaries > 0 || targetTotalVols > 0;

  const calcPct = (actual: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  };

  const progressItems: TargetProgressItem[] = [
    {
      key: "missions",
      label: "المهام المنفذة",
      actual: kpis.totalMissions,
      target: targetMissions,
      percentage: calcPct(kpis.totalMissions, targetMissions),
      color: "hsl(var(--primary))",
    },
    {
      key: "uniqueVolunteers",
      label: "المتطوعون المنفردون",
      actual: kpis.uniqueVolunteersCount,
      target: targetUniqueVols,
      percentage: calcPct(kpis.uniqueVolunteersCount, targetUniqueVols),
      color: "#6366f1",
    },
    {
      key: "totalVolunteers",
      label: "المشاركات التطوعية",
      actual: kpis.totalVolunteersCount,
      target: targetTotalVols,
      percentage: calcPct(kpis.totalVolunteersCount, targetTotalVols),
      color: "#0ea5e9",
    },
    {
      key: "beneficiaries",
      label: "المستفيدون الفعليون",
      actual: kpis.totalActualBeneficiaries,
      target: targetBeneficiaries,
      percentage: calcPct(kpis.totalActualBeneficiaries, targetBeneficiaries),
      color: "#10b981",
    },
  ];

  const customProgressItems: TargetProgressItem[] = customKpiDefs.map((def) => {
    const targetVal = customAccumulator[def.kpiKey] || def.targetValue || 0;
    return {
      key: def.kpiKey,
      label: def.kpiLabel,
      actual: 0, // Custom actuals if any
      target: targetVal,
      percentage: 0,
      color: "#f59e0b",
    };
  });

  return {
    hasTargets,
    missionsTarget: targetMissions,
    uniqueVolsTarget: targetUniqueVols,
    totalVolsTarget: targetTotalVols,
    beneficiariesTarget: targetBeneficiaries,
    progressItems,
    customProgressItems,
  };
}

/**
 * Calculates timeline trend points (by month or by day)
 */
export function calculateTimelineTrend(
  missions: NormalizedMission[],
  groupBy: "month" | "day" = "month"
): TimelineDataPoint[] {
  const periodMap: Record<string, { missions: number; beneficiaries: number; volunteers: number; services: number }> = {};

  missions.forEach((m) => {
    if (!m.date) return;
    const period = groupBy === "month" ? m.date.substring(0, 7) : m.date;

    if (!periodMap[period]) {
      periodMap[period] = { missions: 0, beneficiaries: 0, volunteers: 0, services: 0 };
    }

    periodMap[period].missions += 1;
    periodMap[period].volunteers += m.volunteers.length;

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

    periodMap[period].beneficiaries += bens;
    periodMap[period].services += srvs;
  });

  const sortedPeriods = Object.keys(periodMap).sort();

  return sortedPeriods.map((p) => ({
    period: p,
    displayLabel: p,
    missions: periodMap[p].missions,
    beneficiaries: periodMap[p].beneficiaries,
    volunteers: periodMap[p].volunteers,
    services: periodMap[p].services,
  }));
}

/**
 * Calculates Activity Classification & Types tree data
 */
export function calculateClassificationTree(missions: NormalizedMission[]): ClassificationTreeNode[] {
  const totalMissionsAll = missions.length || 1;
  const map: Record<string, { total: number; types: Record<string, number> }> = {};

  missions.forEach((m) => {
    const cls = m.classification || "غير مصنف";
    const act = m.activityType || "عام";

    if (!map[cls]) map[cls] = { total: 0, types: {} };
    map[cls].total += 1;
    map[cls].types[act] = (map[cls].types[act] || 0) + 1;
  });

  return Object.entries(map)
    .map(([cls, info]) => ({
      classification: cls,
      totalMissions: info.total,
      percentage: Math.round((info.total / totalMissionsAll) * 100),
      types: Object.entries(info.types)
        .map(([type, count]) => ({
          type,
          count,
          percentage: Math.round((count / info.total) * 100),
        }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.totalMissions - a.totalMissions);
}

/**
 * Calculates distribution of governorates
 */
export function calculateGovernoratesDistribution(missions: NormalizedMission[]): DistributionItem[] {
  const total = missions.length || 1;
  const counts: Record<string, number> = {};

  missions.forEach((m) => {
    const gov = m.governorate || "غير محدد";
    counts[gov] = (counts[gov] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculates response type distribution
 */
export function calculateResponseTypeDistribution(missions: NormalizedMission[]): DistributionItem[] {
  const total = missions.length || 1;
  const counts: Record<string, number> = {};

  missions.forEach((m) => {
    const resp = m.responseType || "عام";
    counts[resp] = (counts[resp] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculates services ranking distribution
 */
export function calculateServicesDistribution(missions: NormalizedMission[]): DistributionItem[] {
  const counts: Record<string, { totalServices: number; totalBeneficiaries: number }> = {};

  missions.forEach((m) => {
    m.beneficiariesIndividual.forEach((b) => {
      const s = b.serviceType || "غير محدد";
      if (!counts[s]) counts[s] = { totalServices: 0, totalBeneficiaries: 0 };
      counts[s].totalServices += b.quantity || 1;
      counts[s].totalBeneficiaries += 1;
    });

    m.beneficiariesGroup.forEach((g) => {
      const s = g.serviceType || "غير محدد";
      if (!counts[s]) counts[s] = { totalServices: 0, totalBeneficiaries: 0 };
      counts[s].totalServices += g.count || 0;
      if (!g.isRepeated) counts[s].totalBeneficiaries += g.count || 0;
    });
  });

  return Object.entries(counts)
    .map(([name, data]) => ({
      name,
      value: data.totalServices,
      secondaryValue: data.totalBeneficiaries,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculates top activity details
 */
export function calculateActivityDetailsRanking(missions: NormalizedMission[]): DistributionItem[] {
  const total = missions.length || 1;
  const counts: Record<string, number> = {};

  missions.forEach((m) => {
    const d = m.activityDetail || "غير محدد";
    counts[d] = (counts[d] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

/**
 * Calculates gender demographics
 */
export function calculateGenderDistribution(missions: NormalizedMission[]): DistributionItem[] {
  const counts: Record<string, number> = {};
  let total = 0;

  missions.forEach((m) => {
    m.beneficiariesIndividual.forEach((b) => {
      const g = b.gender || "غير محدد";
      const q = b.quantity || 1;
      counts[g] = (counts[g] || 0) + q;
      total += q;
    });

    m.beneficiariesGroup.forEach((g) => {
      const gen = g.gender || "غير محدد";
      const c = g.count || 0;
      counts[gen] = (counts[gen] || 0) + c;
      total += c;
    });
  });

  const totalSafe = total || 1;
  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalSafe) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculates nationality demographics
 */
export function calculateNationalityDistribution(missions: NormalizedMission[]): DistributionItem[] {
  const counts: Record<string, number> = {};
  let total = 0;

  missions.forEach((m) => {
    m.beneficiariesIndividual.forEach((b) => {
      const n = b.nationality || "غير محدد";
      const q = b.quantity || 1;
      counts[n] = (counts[n] || 0) + q;
      total += q;
    });

    m.beneficiariesGroup.forEach((g) => {
      const nat = g.nationality || "غير محدد";
      const c = g.count || 0;
      counts[nat] = (counts[nat] || 0) + c;
      total += c;
    });
  });

  const totalSafe = total || 1;
  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalSafe) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Formats table rows for detailed review
 */
export function formatDetailedTableRows(missions: NormalizedMission[]): DetailedMissionTableRow[] {
  return missions.map((m) => {
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
      id: m.id,
      code: m.code,
      name: m.name,
      date: m.date,
      status: m.status,
      governorate: m.governorate,
      classification: m.classification,
      activityType: m.activityType,
      responseType: m.responseType,
      volunteersCount: m.volunteers.length,
      beneficiariesCount: bens,
      servicesCount: srvs,
    };
  });
}

/**
 * Calculates beneficiary modality (Individual vs Group)
 */
export function calculateBeneficiaryModality(missions: NormalizedMission[]): BeneficiaryModalityData {
  let indivBens = 0;
  let groupBens = 0;
  let indivSrvs = 0;
  let groupSrvs = 0;

  missions.forEach((m) => {
    m.beneficiariesIndividual.forEach((b) => {
      indivBens += 1;
      indivSrvs += b.quantity || 1;
    });

    m.beneficiariesGroup.forEach((g) => {
      if (!g.isRepeated) groupBens += g.count || 0;
      groupSrvs += g.count || 0;
    });
  });

  const totalBeneficiaries = indivBens + groupBens || 1;
  const totalServices = indivSrvs + groupSrvs || 1;

  return {
    individualBeneficiaries: indivBens,
    groupBeneficiaries: groupBens,
    individualServices: indivSrvs,
    groupServices: groupSrvs,
    totalBeneficiaries: indivBens + groupBens,
    totalServices: indivSrvs + groupSrvs,
    individualPct: Math.round((indivBens / totalBeneficiaries) * 100),
    groupPct: Math.round((groupBens / totalBeneficiaries) * 100),
  };
}

/**
 * Calculates cross-demographics per service (Gender & Egyptian vs Non-Egyptian)
 */
export function calculateServicesDemographicsCross(missions: NormalizedMission[]): ServiceDemographicItem[] {
  const map: Record<
    string,
    {
      total: number;
      male: number;
      female: number;
      unspecified: number;
      egyptian: number;
      foreign: number;
    }
  > = {};

  missions.forEach((m) => {
    m.beneficiariesIndividual.forEach((b) => {
      const s = b.serviceType || "غير محدد";
      if (!map[s]) {
        map[s] = { total: 0, male: 0, female: 0, unspecified: 0, egyptian: 0, foreign: 0 };
      }
      const q = b.quantity || 1;
      map[s].total += q;

      const g = (b.gender || "").trim().toLowerCase();
      if (g.includes("ذكر") || g === "male") map[s].male += q;
      else if (g.includes("أنثى") || g === "female") map[s].female += q;
      else map[s].unspecified += q;

      const nat = (b.nationality || "").trim().toLowerCase();
      if (nat.includes("مصر") || nat.includes("egypt")) map[s].egyptian += q;
      else map[s].foreign += q;
    });

    m.beneficiariesGroup.forEach((g) => {
      const s = g.serviceType || "غير محدد";
      if (!map[s]) {
        map[s] = { total: 0, male: 0, female: 0, unspecified: 0, egyptian: 0, foreign: 0 };
      }
      const c = g.count || 0;
      map[s].total += c;

      const gen = (g.gender || "").trim().toLowerCase();
      if (gen.includes("ذكر") || gen === "male") map[s].male += c;
      else if (gen.includes("أنثى") || gen === "female") map[s].female += c;
      else map[s].unspecified += c;

      const nat = (g.nationality || "").trim().toLowerCase();
      if (nat.includes("مصر") || nat.includes("egypt")) map[s].egyptian += c;
      else map[s].foreign += c;
    });
  });

  return Object.entries(map)
    .map(([service, d]) => ({
      service,
      totalServices: d.total,
      maleServices: d.male,
      femaleServices: d.female,
      unspecifiedGenderServices: d.unspecified,
      egyptianServices: d.egyptian,
      foreignServices: d.foreign,
    }))
    .sort((a, b) => b.totalServices - a.totalServices)
    .slice(0, 10);
}

/**
 * Calculates volunteer productivity & engagement effort metrics
 */
export function calculateVolunteerEffortMetrics(missions: NormalizedMission[]): VolunteerEffortData {
  let totalHours = 0;
  let totalPoints = 0;
  let leaderParts = 0;
  let memberParts = 0;
  let leaderHours = 0;
  let memberHours = 0;

  const volHoursMap = new Map<string, number>();

  missions.forEach((m) => {
    m.volunteers.forEach((v) => {
      if (v.removed) return;
      const h = v.hours || 0;
      const p = v.points || 0;
      totalHours += h;
      totalPoints += p;

      if (v.isLeader) {
        leaderParts++;
        leaderHours += h;
      } else {
        memberParts++;
        memberHours += h;
      }

      const key = v.membershipNumber || v.fullName || v.id;
      volHoursMap.set(key, (volHoursMap.get(key) || 0) + h);
    });
  });

  const uniqueVolunteers = volHoursMap.size || 1;
  const totalMissions = missions.length || 1;

  // Bracket distribution
  let b1 = 0; // 1-5 hrs
  let b2 = 0; // 6-15 hrs
  let b3 = 0; // 16-30 hrs
  let b4 = 0; // 30+ hrs

  volHoursMap.forEach((hrs) => {
    if (hrs <= 5) b1++;
    else if (hrs <= 15) b2++;
    else if (hrs <= 30) b3++;
    else b4++;
  });

  const brackets = [
    { range: "1 - 5 ساعات", count: b1, percentage: Math.round((b1 / uniqueVolunteers) * 100) },
    { range: "6 - 15 ساعة", count: b2, percentage: Math.round((b2 / uniqueVolunteers) * 100) },
    { range: "16 - 30 ساعة", count: b3, percentage: Math.round((b3 / uniqueVolunteers) * 100) },
    { range: "أكثر من 30 ساعة", count: b4, percentage: Math.round((b4 / uniqueVolunteers) * 100) },
  ];

  return {
    totalHours: Number(totalHours.toFixed(1)),
    totalPoints,
    uniqueVolunteers: volHoursMap.size,
    leaderParticipations: leaderParts,
    memberParticipations: memberParts,
    leaderHours: Number(leaderHours.toFixed(1)),
    memberHours: Number(memberHours.toFixed(1)),
    avgHoursPerVolunteer: Number((totalHours / uniqueVolunteers).toFixed(1)),
    avgHoursPerMission: Number((totalHours / totalMissions).toFixed(1)),
    hoursBrackets: brackets,
  };
}

/**
 * Calculates day of week activity distribution
 */
export function calculateDayOfWeekActivity(missions: NormalizedMission[]): DayOfWeekItem[] {
  const days = [
    { name: "الأحد", count: 0, bens: 0, srvs: 0 },
    { name: "الإثنين", count: 0, bens: 0, srvs: 0 },
    { name: "الثلاثاء", count: 0, bens: 0, srvs: 0 },
    { name: "الأربعاء", count: 0, bens: 0, srvs: 0 },
    { name: "الخميس", count: 0, bens: 0, srvs: 0 },
    { name: "الجمعة", count: 0, bens: 0, srvs: 0 },
    { name: "السبت", count: 0, bens: 0, srvs: 0 },
  ];

  missions.forEach((m) => {
    if (!m.date) return;
    const dateObj = new Date(m.date);
    if (isNaN(dateObj.getTime())) return;
    const dayIdx = dateObj.getDay(); // 0 = Sunday

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

    if (days[dayIdx]) {
      days[dayIdx].count++;
      days[dayIdx].bens += bens;
      days[dayIdx].srvs += srvs;
    }
  });

  const totalMissions = missions.length || 1;

  // Reorder to start with Saturday for Egyptian work week
  const egyptianOrder = [6, 0, 1, 2, 3, 4, 5];
  return egyptianOrder.map((idx) => ({
    dayName: days[idx].name,
    dayIndex: idx,
    missionsCount: days[idx].count,
    beneficiariesCount: days[idx].bens,
    servicesCount: days[idx].srvs,
    percentage: Math.round((days[idx].count / totalMissions) * 100),
  }));
}
