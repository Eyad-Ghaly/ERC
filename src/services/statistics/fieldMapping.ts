/**
 * Centralized Supabase Column Key Mapping Layer (STATISTICS_FIELD_MAP)
 * 
 * Maps raw database column names to normalized field identifiers.
 * If Supabase schema column names change in the future, only this configuration needs updating.
 */

export const STATISTICS_FIELD_MAP = {
  missions: {
    id: "id",
    code: "mission_code",
    name: "mission_name",
    date: "activity_date",
    status: "status",
    isCanceled: "is_canceled",
    governorate: "governorate",
    classification: "activity_classification",
    activityType: "activity_type",
    activityDetail: "activity_details",
    responseType: "type_name",
    missionNature: "mission_nature",
    projectCode: "project_code",
    adminCode: "admin_code",
    teamId: "team_id",
    departmentId: "department_id",
    region: "region",
    createdBy: "created_by",
    createdAt: "created_at",
  },
  volunteers: {
    id: "id",
    missionId: "mission_id",
    membershipNumber: "membership_number",
    fullName: "full_name",
    hours: "hours",
    points: "points",
    isLeader: "is_leader",
    addedInOps: "added_in_ops",
    removed: "removed",
  },
  beneficiariesIndividual: {
    id: "id",
    missionId: "mission_id",
    fullName: "full_name",
    encryptedId: "encrypted_id",
    idHash: "id_hash",
    registryId: "registry_id",
    phone: "phone",
    serviceType: "service_type",
    quantity: "service_quantity",
    gender: "gender",
    nationality: "nationality",
    age: "age",
    governorate: "governorate",
    createdAt: "created_at",
  },
  beneficiariesGroup: {
    id: "id",
    missionId: "mission_id",
    count: "count",
    serviceType: "service_type",
    gender: "gender",
    nationality: "nationality",
    isRepeated: "is_repeated",
    targetGroup: "target_group",
    createdAt: "created_at",
  },
  targets: {
    id: "id",
    teamId: "team_id",
    targetMonth: "target_month",
    targetMissions: "target_missions",
    targetUniqueVolunteers: "target_unique_volunteers",
    targetVolunteerParticipations: "target_volunteer_participations",
    targetBeneficiaries: "target_beneficiaries",
    customTargets: "custom_targets",
  },
  customKpis: {
    id: "id",
    teamId: "team_id",
    kpiKey: "kpi_key",
    kpiLabel: "kpi_label",
    targetValue: "target_value",
  },
  teams: {
    id: "id",
    code: "code",
    name: "name",
    departmentId: "department_id",
  },
} as const;

// Normalized data types
export interface NormalizedVolunteer {
  id: string;
  missionId?: string;
  membershipNumber: string | null;
  fullName: string | null;
  hours: number;
  points: number;
  isLeader: boolean;
  removed: boolean;
}

export interface NormalizedIndividualBeneficiary {
  id: string;
  missionId?: string;
  fullName: string | null;
  encryptedId: string | null;
  idHash: string | null;
  registryId: string | null;
  phone: string | null;
  serviceType: string;
  quantity: number;
  gender: string;
  nationality: string;
  age: number | null;
  governorate: string | null;
  createdAt: string;
}

export interface NormalizedGroupBeneficiary {
  id: string;
  missionId?: string;
  count: number;
  serviceType: string;
  gender: string;
  nationality: string;
  isRepeated: boolean;
  targetGroup: string | null;
  createdAt: string;
}

export interface NormalizedMission {
  id: string;
  code: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: string;
  isCanceled: boolean;
  governorate: string;
  classification: string;
  activityType: string;
  activityDetail: string;
  responseType: string;
  projectCode: string | null;
  adminCode: string | null;
  teamId: string | null;
  departmentId: string | null;
  region: string | null;
  createdBy: string | null;
  createdAt: string;
  volunteers: NormalizedVolunteer[];
  beneficiariesIndividual: NormalizedIndividualBeneficiary[];
  beneficiariesGroup: NormalizedGroupBeneficiary[];
}

export interface NormalizedTarget {
  id: string;
  teamId: string;
  targetMonth: string; // YYYY-MM
  targetMissions: number;
  targetUniqueVolunteers: number;
  targetVolunteerParticipations: number;
  targetBeneficiaries: number;
  customTargets: Record<string, number>;
}

export interface NormalizedCustomKpi {
  id: string;
  teamId: string;
  kpiKey: string;
  kpiLabel: string;
  targetValue?: number;
}

export interface NormalizedTeam {
  id: string;
  code: string;
  name: string;
  departmentId: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
}

export interface RawSupabaseMissionRecord {
  [key: string]: unknown;
  mission_volunteers?: Record<string, unknown>[];
  beneficiaries_individual?: Record<string, unknown>[];
  beneficiaries_group?: Record<string, unknown>[];
}

export interface RawSupabaseTargetRecord {
  [key: string]: unknown;
}

export interface RawSupabaseTeamRecord {
  id: string;
  code?: string;
  name?: string;
  department_id?: string | null;
  department?: {
    id?: string;
    code?: string;
    name?: string;
  } | null;
}

/**
 * Normalizes raw Supabase mission row
 */
export function normalizeMission(raw: RawSupabaseMissionRecord): NormalizedMission {
  const mKeys = STATISTICS_FIELD_MAP.missions;
  const vKeys = STATISTICS_FIELD_MAP.volunteers;
  const ibKeys = STATISTICS_FIELD_MAP.beneficiariesIndividual;
  const gbKeys = STATISTICS_FIELD_MAP.beneficiariesGroup;

  const volunteers: NormalizedVolunteer[] = (raw.mission_volunteers || []).map((v) => ({
    id: (v[vKeys.id] as string) ?? String(Math.random()),
    missionId: (v[vKeys.missionId] as string) ?? (raw[mKeys.id] as string),
    membershipNumber: v[vKeys.membershipNumber] ? String(v[vKeys.membershipNumber]).trim() : null,
    fullName: v[vKeys.fullName] ? String(v[vKeys.fullName]).trim() : null,
    hours: Number(v[vKeys.hours] || 0),
    points: Number(v[vKeys.points] || 0),
    isLeader: Boolean(v[vKeys.isLeader]),
    removed: Boolean(v[vKeys.removed]),
  }));

  const beneficiariesIndividual: NormalizedIndividualBeneficiary[] = (raw.beneficiaries_individual || []).map((b) => {
    let gender = String(b[ibKeys.gender] || "غير محدد").trim();
    if (gender.includes("ذكر") || gender.toLowerCase() === "male") gender = "ذكر";
    else if (gender.includes("أنثى") || gender.toLowerCase() === "female") gender = "أنثى";
    else if (!gender || gender === "null" || gender === "undefined") gender = "غير محدد";

    return {
      id: (b[ibKeys.id] as string) ?? String(Math.random()),
      missionId: (b[ibKeys.missionId] as string) ?? (raw[mKeys.id] as string),
      fullName: b[ibKeys.fullName] ? String(b[ibKeys.fullName]).trim() : null,
      encryptedId: (b[ibKeys.encryptedId] as string) || null,
      idHash: (b[ibKeys.idHash] as string) || null,
      registryId: (b[ibKeys.registryId] as string) || null,
      phone: (b[ibKeys.phone] as string) || null,
      serviceType: String(b[ibKeys.serviceType] || "غير محدد").trim(),
      quantity: Number(b[ibKeys.quantity] || 1),
      gender,
      nationality: String(b[ibKeys.nationality] || "غير محدد").trim(),
      age: b[ibKeys.age] ? Number(b[ibKeys.age]) : null,
      governorate: b[ibKeys.governorate] ? String(b[ibKeys.governorate]).trim() : null,
      createdAt: (b[ibKeys.createdAt] as string) || (raw[mKeys.createdAt] as string) || new Date().toISOString(),
    };
  });

  const beneficiariesGroup: NormalizedGroupBeneficiary[] = (raw.beneficiaries_group || []).map((g) => {
    let gender = String(g[gbKeys.gender] || "غير محدد").trim();
    if (gender.includes("ذكر") || gender.toLowerCase() === "male") gender = "ذكر";
    else if (gender.includes("أنثى") || gender.toLowerCase() === "female") gender = "أنثى";
    else if (!gender || gender === "null" || gender === "undefined") gender = "غير محدد";

    return {
      id: (g[gbKeys.id] as string) ?? String(Math.random()),
      missionId: (g[gbKeys.missionId] as string) ?? (raw[mKeys.id] as string),
      count: Number(g[gbKeys.count] || 0),
      serviceType: String(g[gbKeys.serviceType] || "غير محدد").trim(),
      gender,
      nationality: String(g[gbKeys.nationality] || "غير محدد").trim(),
      isRepeated: Boolean(g[gbKeys.isRepeated]),
      targetGroup: g[gbKeys.targetGroup] ? String(g[gbKeys.targetGroup]).trim() : null,
      createdAt: (g[gbKeys.createdAt] as string) || (raw[mKeys.createdAt] as string) || new Date().toISOString(),
    };
  });

  const dateRaw = raw[mKeys.date] || raw[mKeys.createdAt] || "";
  const dateFormatted = typeof dateRaw === "string" ? dateRaw.substring(0, 10) : "";

  const classification = String(raw[mKeys.classification] || "غير مصنف").trim();
  const activityType = String(raw[mKeys.activityType] || "عام").trim();
  const activityDetail = String(raw[mKeys.activityDetail] || "غير محدد").trim();
  const responseType = String(raw[mKeys.responseType] || raw[mKeys.missionNature] || "عام").trim();
  const governorate = String(raw[mKeys.governorate] || "غير محدد").trim();

  return {
    id: raw[mKeys.id] as string,
    code: (raw[mKeys.code] as string) || "بدون كود",
    name: (raw[mKeys.name] as string) || "مهمة غير مسماة",
    date: dateFormatted,
    status: (raw[mKeys.status] as string) || "planned",
    isCanceled: Boolean(raw[mKeys.isCanceled] || raw[mKeys.status] === "canceled"),
    governorate: governorate || "غير محدد",
    classification: classification || "غير مصنف",
    activityType: activityType || "عام",
    activityDetail: activityDetail || "غير محدد",
    responseType: responseType || "عام",
    projectCode: (raw[mKeys.projectCode] as string) || null,
    adminCode: (raw[mKeys.adminCode] as string) || null,
    teamId: (raw[mKeys.teamId] as string) || null,
    departmentId: (raw[mKeys.departmentId] as string) || null,
    region: (raw[mKeys.region] as string) || null,
    createdBy: (raw[mKeys.createdBy] as string) || null,
    createdAt: (raw[mKeys.createdAt] as string) || new Date().toISOString(),
    volunteers,
    beneficiariesIndividual,
    beneficiariesGroup,
  };
}

/**
 * Normalizes raw Supabase target row
 */
export function normalizeTarget(raw: RawSupabaseTargetRecord): NormalizedTarget {
  const tKeys = STATISTICS_FIELD_MAP.targets;
  return {
    id: raw[tKeys.id] as string,
    teamId: raw[tKeys.teamId] as string,
    targetMonth: (raw[tKeys.targetMonth] as string) || "",
    targetMissions: Number(raw[tKeys.targetMissions] || 0),
    targetUniqueVolunteers: Number(raw[tKeys.targetUniqueVolunteers] || 0),
    targetVolunteerParticipations: Number(raw[tKeys.targetVolunteerParticipations] || 0),
    targetBeneficiaries: Number(raw[tKeys.targetBeneficiaries] || 0),
    customTargets: (raw[tKeys.customTargets] as Record<string, number>) || {},
  };
}

/**
 * Normalizes raw team row
 */
export function normalizeTeam(raw: RawSupabaseTeamRecord): NormalizedTeam {
  const teamKeys = STATISTICS_FIELD_MAP.teams;
  return {
    id: raw[teamKeys.id],
    code: raw[teamKeys.code] || "",
    name: raw[teamKeys.name] || "",
    departmentId: raw[teamKeys.departmentId] || null,
    departmentName: raw.department?.name || null,
    departmentCode: raw.department?.code || null,
  };
}
