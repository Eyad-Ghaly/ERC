import { supabase } from "@/integrations/supabase/client";
import {
  NormalizedMission,
  NormalizedTarget,
  NormalizedCustomKpi,
  NormalizedTeam,
  RawSupabaseMissionRecord,
  RawSupabaseTargetRecord,
  RawSupabaseTeamRecord,
  normalizeMission,
  normalizeTarget,
  normalizeTeam,
  STATISTICS_FIELD_MAP,
} from "./fieldMapping";

export interface FetchStatisticsOptions {
  userRole?: string;
  roles?: string[];
  userId?: string;
  departmentId?: string | null;
  teamId?: string | null;
  selectedTeamId?: string; // "all" or specific team ID
}

export interface StatisticsDataset {
  missions: NormalizedMission[];
  targets: NormalizedTarget[];
  customKpis: NormalizedCustomKpi[];
  teams: NormalizedTeam[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch all teams available to the user based on role and department
 */
export async function fetchStatisticsTeams(options: FetchStatisticsOptions): Promise<NormalizedTeam[]> {
  try {
    const query = supabase
      .from("teams")
      .select("*, department:departments(id, code, name)")
      .order("code");

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching statistics teams:", error);
      return [];
    }

    return ((data || []) as unknown as RawSupabaseTeamRecord[]).map(normalizeTeam);
  } catch (err) {
    console.error("Unexpected error fetching teams:", err);
    return [];
  }
}

/**
 * Fetch targets and custom KPIs
 */
export async function fetchStatisticsTargets(
  teamIds: string[]
): Promise<{ targets: NormalizedTarget[]; customKpis: NormalizedCustomKpi[] }> {
  try {
    if (!teamIds || teamIds.length === 0) {
      return { targets: [], customKpis: [] };
    }

    const [targetsRes, customKpisRes] = await Promise.all([
      supabase.from("team_kpi_targets").select("*").in("team_id", teamIds),
      supabase.from("team_custom_kpis").select("*").in("team_id", teamIds),
    ]);

    const targets = ((targetsRes.data || []) as unknown as RawSupabaseTargetRecord[]).map(normalizeTarget);
    const customKpis = ((customKpisRes.data || []) as unknown as Record<string, unknown>[]).map((k) => ({
      id: (k[STATISTICS_FIELD_MAP.customKpis.id] as string) || "",
      teamId: (k[STATISTICS_FIELD_MAP.customKpis.teamId] as string) || "",
      kpiKey: (k[STATISTICS_FIELD_MAP.customKpis.kpiKey] as string) || "",
      kpiLabel:
        (k[STATISTICS_FIELD_MAP.customKpis.kpiLabel] as string) ||
        (k[STATISTICS_FIELD_MAP.customKpis.kpiKey] as string) ||
        "",
      targetValue: k[STATISTICS_FIELD_MAP.customKpis.targetValue]
        ? Number(k[STATISTICS_FIELD_MAP.customKpis.targetValue])
        : undefined,
    }));

    return { targets, customKpis };
  } catch (err) {
    console.error("Unexpected error fetching targets:", err);
    return { targets: [], customKpis: [] };
  }
}

/**
 * Fetch missions with joined volunteers and beneficiaries
 */
export async function fetchStatisticsMissions(
  options: FetchStatisticsOptions,
  departmentTeams: NormalizedTeam[]
): Promise<NormalizedMission[]> {
  try {
    let allRawMissions: RawSupabaseMissionRecord[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    const isAdmin = options.roles?.includes("admin");
    const isManagement = options.roles?.includes("management") || options.roles?.includes("department_admin");
    const isDataManager = options.roles?.includes("data_manager");
    const targetTeamId = options.selectedTeamId || "all";

    while (hasMore) {
      let query = supabase
        .from("missions")
        .select(`
          *,
          mission_volunteers (
            id,
            mission_id,
            membership_number,
            full_name,
            hours,
            points,
            is_leader,
            added_in_ops,
            removed
          ),
          beneficiaries_individual (
            id,
            mission_id,
            full_name,
            encrypted_id,
            id_hash,
            registryId:registry_id,
            phone,
            service_type,
            service_quantity,
            gender,
            nationality,
            age,
            governorate,
            created_at
          ),
          beneficiaries_group (
            id,
            mission_id,
            count,
            service_type,
            gender,
            nationality,
            is_repeated,
            target_group,
            created_at
          )
        `)
        .order("activity_date", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (targetTeamId && targetTeamId !== "all") {
        query = query.eq("team_id", targetTeamId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching statistics missions page " + page + ":", error);
        break;
      }

      if (data && data.length > 0) {
        allRawMissions = allRawMissions.concat(data as unknown as RawSupabaseMissionRecord[]);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    return allRawMissions.map(normalizeMission);
  } catch (err) {
    console.error("Unexpected error fetching missions:", err);
    return [];
  }
}
