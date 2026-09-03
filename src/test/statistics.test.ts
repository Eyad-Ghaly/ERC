import { describe, it, expect } from "vitest";
import {
  normalizeMission,
  normalizeTarget,
  normalizeTeam,
  NormalizedMission,
} from "@/services/statistics/fieldMapping";
import {
  calculateKpis,
  filterMissions,
  calculateTargetSummary,
  calculateTimelineTrend,
  calculateClassificationTree,
  calculateGovernoratesDistribution,
  calculateResponseTypeDistribution,
  calculateServicesDistribution,
  calculateGenderDistribution,
  calculateNationalityDistribution,
  INITIAL_STATISTICS_FILTERS,
  StatisticsFilterState,
} from "@/services/statistics/statisticsCalculator";

describe("Statistics Normalization Layer", () => {
  it("should normalize raw mission with nested volunteers and beneficiaries", () => {
    const raw = {
      id: "m-1",
      mission_code: "P19-001",
      mission_name: "توزيع مساعدات غذائية",
      activity_date: "2026-08-15",
      status: "monitored",
      is_canceled: false,
      governorate: "القاهرة",
      activity_classification: "إغاثة",
      activity_type: "توزيع سلات",
      activity_details: "توزيع في حي الأسمرات",
      type_name: "استجابة طارئة",
      team_id: "team-1",
      mission_volunteers: [
        { id: "v1", membership_number: "VOL-101", full_name: "أحمد علي", hours: 5, points: 10 },
        { id: "v2", membership_number: "VOL-102", full_name: "محمود حسن", hours: 4, points: 10 },
      ],
      beneficiaries_individual: [
        { id: "b1", id_hash: "hash123", service_type: "سلة غذائية", service_quantity: 1, gender: "ذكر", nationality: "مصري" },
        { id: "b2", id_hash: "hash456", service_type: "سلة غذائية", service_quantity: 2, gender: "أنثى", nationality: "سوري" },
      ],
      beneficiaries_group: [
        { id: "g1", count: 25, service_type: "توعية صحية", gender: "غير محدد", nationality: "مصري", is_repeated: false },
      ],
    };

    const normalized = normalizeMission(raw);

    expect(normalized.id).toBe("m-1");
    expect(normalized.code).toBe("P19-001");
    expect(normalized.name).toBe("توزيع مساعدات غذائية");
    expect(normalized.date).toBe("2026-08-15");
    expect(normalized.volunteers).toHaveLength(2);
    expect(normalized.volunteers[0].membershipNumber).toBe("VOL-101");
    expect(normalized.beneficiariesIndividual).toHaveLength(2);
    expect(normalized.beneficiariesGroup).toHaveLength(1);
    expect(normalized.beneficiariesGroup[0].count).toBe(25);
  });

  it("should normalize raw target and custom KPIs", () => {
    const rawTarget = {
      id: "tgt-1",
      team_id: "team-1",
      target_month: "2026-08",
      target_missions: 10,
      target_unique_volunteers: 30,
      target_volunteer_participations: 50,
      target_beneficiaries: 500,
      custom_targets: { workshops: 5 },
    };

    const target = normalizeTarget(rawTarget);
    expect(target.targetMissions).toBe(10);
    expect(target.targetUniqueVolunteers).toBe(30);
    expect(target.targetBeneficiaries).toBe(500);
    expect(target.customTargets.workshops).toBe(5);
  });
});

describe("Statistics Calculations and KPIs", () => {
  const sampleMissions: NormalizedMission[] = [
    {
      id: "m-1",
      code: "P19-001",
      name: "مهمة أولى",
      date: "2026-08-10",
      status: "monitored",
      isCanceled: false,
      governorate: "القاهرة",
      classification: "إغاثة",
      activityType: "توزيع",
      activityDetail: "توزيع مواد غذائية",
      responseType: "استجابة طارئة",
      projectCode: null,
      adminCode: null,
      teamId: "team-1",
      departmentId: "dept-1",
      region: "delta",
      createdBy: "user-1",
      createdAt: "2026-08-10T10:00:00Z",
      volunteers: [
        { id: "v1", membershipNumber: "V1", fullName: "أحمد", hours: 4, points: 10, isLeader: false, removed: false },
        { id: "v2", membershipNumber: "V2", fullName: "سارة", hours: 4, points: 10, isLeader: true, removed: false },
      ],
      beneficiariesIndividual: [
        { id: "b1", fullName: "مستفيد 1", encryptedId: null, idHash: "h1", registryId: null, phone: null, serviceType: "سلة", quantity: 1, gender: "ذكر", nationality: "مصري", age: 30, governorate: "القاهرة", createdAt: "" },
        { id: "b2", fullName: "مستفيد 2", encryptedId: null, idHash: "h2", registryId: null, phone: null, serviceType: "سلة", quantity: 1, gender: "أنثى", nationality: "سوري", age: 25, governorate: "القاهرة", createdAt: "" },
      ],
      beneficiariesGroup: [
        { id: "g1", count: 20, serviceType: "توعية", gender: "غير محدد", nationality: "مصري", isRepeated: false, targetGroup: "أهالي", createdAt: "" },
      ],
    },
    {
      id: "m-2",
      code: "P19-002",
      name: "مهمة ثانية",
      date: "2026-08-15",
      status: "planned",
      isCanceled: false,
      governorate: "الجيزة",
      classification: "صحة",
      activityType: "قافلة",
      activityDetail: "قافلة طبية",
      responseType: "خدمة مجتمعية",
      projectCode: null,
      adminCode: null,
      teamId: "team-1",
      departmentId: "dept-1",
      region: "delta",
      createdBy: "user-1",
      createdAt: "2026-08-15T10:00:00Z",
      volunteers: [
        { id: "v3", membershipNumber: "V1", fullName: "أحمد", hours: 3, points: 10, isLeader: false, removed: false }, // Repeat volunteer V1
        { id: "v4", membershipNumber: "V3", fullName: "علي", hours: 3, points: 10, isLeader: false, removed: false },
      ],
      beneficiariesIndividual: [
        { id: "b3", fullName: "مستفيد 3", encryptedId: null, idHash: "h3", registryId: null, phone: null, serviceType: "كشف طبي", quantity: 1, gender: "ذكر", nationality: "مصري", age: 40, governorate: "الجيزة", createdAt: "" },
      ],
      beneficiariesGroup: [],
    },
    {
      id: "m-3",
      code: "P19-003",
      name: "مهمة ملغاة",
      date: "2026-08-20",
      status: "canceled",
      isCanceled: true,
      governorate: "الإسكندرية",
      classification: "إغاثة",
      activityType: "توزيع",
      activityDetail: "توزيع",
      responseType: "عام",
      projectCode: null,
      adminCode: null,
      teamId: "team-1",
      departmentId: "dept-1",
      region: "delta",
      createdBy: "user-1",
      createdAt: "2026-08-20T10:00:00Z",
      volunteers: [],
      beneficiariesIndividual: [],
      beneficiariesGroup: [],
    },
  ];

  it("should filter out canceled missions by default", () => {
    const filtered = filterMissions(sampleMissions, INITIAL_STATISTICS_FILTERS);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((m) => m.id)).toEqual(["m-1", "m-2"]);
  });

  it("should filter missions by governorate", () => {
    const filters: StatisticsFilterState = {
      ...INITIAL_STATISTICS_FILTERS,
      governorate: "الجيزة",
    };
    const filtered = filterMissions(sampleMissions, filters);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("m-2");
  });

  it("should calculate correct KPIs including unique volunteers and actual beneficiaries", () => {
    const filtered = filterMissions(sampleMissions, INITIAL_STATISTICS_FILTERS);
    const kpis = calculateKpis(filtered, INITIAL_STATISTICS_FILTERS);

    expect(kpis.totalMissions).toBe(2);
    expect(kpis.completedMissions).toBe(1);
    expect(kpis.plannedMissions).toBe(1);

    // Total volunteer participations: 2 (m1) + 2 (m2) = 4
    expect(kpis.totalVolunteersCount).toBe(4);
    // Unique volunteers: V1, V2, V3 = 3
    expect(kpis.uniqueVolunteersCount).toBe(3);
    // Total hours: 4+4 + 3+3 = 14
    expect(kpis.totalVolunteerHours).toBe(14);

    // Individual unique beneficiaries: h1, h2, h3 = 3
    // Group non-repeated: 20
    // Total actual beneficiaries = 3 + 20 = 23
    expect(kpis.totalActualBeneficiaries).toBe(23);
    // Services count = 1+1+20+1 = 23
    expect(kpis.totalServicesCount).toBe(23);
  });

  it("should calculate distributions correctly", () => {
    const filtered = filterMissions(sampleMissions, INITIAL_STATISTICS_FILTERS);

    const govs = calculateGovernoratesDistribution(filtered);
    expect(govs).toHaveLength(2);
    expect(govs.find((g) => g.name === "القاهرة")?.value).toBe(1);
    expect(govs.find((g) => g.name === "الجيزة")?.value).toBe(1);

    const tree = calculateClassificationTree(filtered);
    expect(tree).toHaveLength(2); // إغاثة and صحة

    const genders = calculateGenderDistribution(filtered);
    expect(genders.find((g) => g.name === "ذكر")?.value).toBe(2);
    expect(genders.find((g) => g.name === "أنثى")?.value).toBe(1);
  });
});
