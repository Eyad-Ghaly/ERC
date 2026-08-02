import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Edit2, Eye, Trash2, Target, Users, BarChart as BarChartIcon, ListTodo, UserCheck, Activity, Map, Database, FileUp, Loader2, Plus, X, Filter, HeartHandshake, Globe, Search } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddVolunteerDialog } from "@/components/AddVolunteerDialog";
import { SmartExcelUploader } from "@/components/SmartExcelUploader";

// Simple AES-GCM decryption using static key
const ENCRYPTION_KEY = "12345678901234567890123456789012"; // 32 bytes

async function getCryptoKey() {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptData(encryptedBase64: string): Promise<string> {
  if (!encryptedBase64) return "";
  try {
    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getCryptoKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (e) {
    return "********";
  }
}

export default function DepartmentDashboard() {
  const { user, profile, roles, hasRole } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const isManagementOrAdmin = hasRole("management") || hasRole("department_admin") || hasRole("admin");

  // Department teams state
  const [departmentTeams, setDepartmentTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  // Missions state
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Interactive Chart Filters
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("");
  const [selectedClassification, setSelectedClassification] = useState<string>("");
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<string>("");
  const [selectedResponseType, setSelectedResponseType] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");

  // Beneficiaries Search & Decryption state
  const [benSearchQuery, setBenSearchQuery] = useState("");
  const [decryptedBeneficiaries, setDecryptedBeneficiaries] = useState<any[]>([]);

  // Volunteers state
  const [teamVolunteers, setTeamVolunteers] = useState<any[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);

  // Targets state
  const [targets, setTargets] = useState<any[]>([]);
  const [customKpis, setCustomKpis] = useState<any[]>([]);

  // Supply requests state
  const [supplyRequests, setSupplyRequests] = useState<any[]>([]);

  const activeTeam = useMemo(() => {
    if (selectedTeamId && selectedTeamId !== "all") {
      return departmentTeams.find(t => t.id === selectedTeamId) || null;
    }
    return null;
  }, [selectedTeamId, departmentTeams]);

  const activeTeamId = activeTeam?.id || (selectedTeamId !== "all" ? selectedTeamId : profile?.team_id);
  const activeTeamCode = activeTeam?.code || profile?.team_code;

  const loadMissions = async (targetTeamId = selectedTeamId, currentDeptTeams = departmentTeams) => {
    if (!user) return;
    setLoading(true);
    let allMissions: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      let query = supabase
        .from("missions")
        .select("*, mission_volunteers(id, membership_number, full_name), beneficiaries_individual(*), beneficiaries_group(*)")
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (targetTeamId && targetTeamId !== "all") {
        query = query.eq("team_id", targetTeamId);
      } else if (targetTeamId === "all" && currentDeptTeams.length > 0) {
        const teamIds = currentDeptTeams.map((t: any) => t.id);
        query = query.in("team_id", teamIds);
      } else if (profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("حدث خطأ أثناء جلب المهام: " + error.message);
        console.error(error);
        break;
      }
      
      if (data && data.length > 0) {
        allMissions = [...allMissions, ...data];
        if (data.length < pageSize) hasMore = false;
        else page++;
      } else {
        hasMore = false;
      }
    }

    setMissions(allMissions);
    setLoading(false);
  };

  const loadVolunteers = async (targetTeamId = selectedTeamId, currentDeptTeams = departmentTeams) => {
    setLoadingVols(true);
    let query = supabase
      .from("volunteer_teams")
      .select(`
        id, is_approved, join_date, team_id, team_phone, team_national_id,
        volunteers_base ( id, full_name, membership_number, branch, phone_number )
      `);

    if (targetTeamId && targetTeamId !== "all") {
      query = query.eq("team_id", targetTeamId);
    } else if (targetTeamId === "all" && currentDeptTeams.length > 0) {
      const teamIds = currentDeptTeams.map((t: any) => t.id);
      query = query.in("team_id", teamIds);
    } else if (profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    } else {
      setTeamVolunteers([]);
      setLoadingVols(false);
      return;
    }

    const { data, error } = await query;

    if (!error && data) {
      setTeamVolunteers(data);
    }
    setLoadingVols(false);
  };

  const loadTargets = async (targetTeamId = selectedTeamId, currentDeptTeams = departmentTeams) => {
    let kpiQuery = supabase.from("team_kpi_targets").select("*");
    let customKpisQuery = supabase.from("team_custom_kpis").select("*");
    let supplyQuery = supabase.from("volunteer_supply_requests").select("*").order("created_at", { ascending: false });

    if (targetTeamId && targetTeamId !== "all") {
      kpiQuery = kpiQuery.eq("team_id", targetTeamId);
      customKpisQuery = customKpisQuery.eq("team_id", targetTeamId);
      supplyQuery = supplyQuery.eq("team_id", targetTeamId);
    } else if (targetTeamId === "all" && currentDeptTeams.length > 0) {
      const teamIds = currentDeptTeams.map((t: any) => t.id);
      kpiQuery = kpiQuery.in("team_id", teamIds);
      customKpisQuery = customKpisQuery.in("team_id", teamIds);
      supplyQuery = supplyQuery.in("team_id", teamIds);
    } else if (profile?.team_id) {
      kpiQuery = kpiQuery.eq("team_id", profile.team_id);
      customKpisQuery = customKpisQuery.eq("team_id", profile.team_id);
      supplyQuery = supplyQuery.eq("team_id", profile.team_id);
    } else {
      setTargets([]);
      setCustomKpis([]);
      setSupplyRequests([]);
      return;
    }

    const [{ data: kData }, { data: cData }, { data: sData }] = await Promise.all([
      kpiQuery, customKpisQuery, supplyQuery
    ]);

    if (kData) setTargets(kData);
    if (cData) setCustomKpis(cData);
    if (sData) setSupplyRequests(sData);
  };

  useEffect(() => {
    if (!user) return;
    const initData = async () => {
      let deptTeams: any[] = [];
      const isMgmt = roles.includes("management") || roles.includes("department_admin") || roles.includes("admin");
      if (isMgmt) {
        let query = supabase.from("teams").select("*, department:departments(code, name)").order("code");
        if (!roles.includes("admin") && profile?.department_id) {
          query = query.eq("department_id", profile.department_id);
        }
        const { data } = await query;
        if (data) {
          deptTeams = data;
          setDepartmentTeams(data);
        }
      }
      loadMissions(selectedTeamId, deptTeams);
      loadVolunteers(selectedTeamId, deptTeams);
      loadTargets(selectedTeamId, deptTeams);
    };
    initData();
  }, [user, profile, roles]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    loadMissions(teamId, departmentTeams);
    loadVolunteers(teamId, departmentTeams);
    loadTargets(teamId, departmentTeams);
  };

  const handleDeleteMission = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المهمة نهائياً؟")) return;
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف بنجاح"); loadMissions(); }
  };

  const approveSupplyRequest = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase
      .from('volunteer_supply_requests')
      .update({ status: 'pending_youth' })
      .eq('id', id)
      .select();
      
    if (error) {
      toast.error(error.message);
    } else if (!data || data.length === 0) {
      toast.error("عفواً، لا تملك صلاحية الموافقة على هذا الطلب (مشكلة في الصلاحيات).");
    } else {
      toast.success("تمت الموافقة، وتم تحويل الطلب لإدارة الشباب");
      const { data: supplyData } = await supabase
        .from("volunteer_supply_requests")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false });
      if (supplyData) setSupplyRequests(supplyData);
    }
    setBusy(false);
  };

  // 1. Base Active Missions (Filtered by Date and non-canceled status)
  const activeMissionsAll = useMemo(() => {
    return missions.filter(m => {
      if (m.is_canceled || m.status === "canceled") return false;
      if (startDate && m.activity_date < startDate) return false;
      if (endDate && m.activity_date > endDate) return false;
      return true;
    });
  }, [missions, startDate, endDate]);

  // 2. Active Missions Filtered by Chart Interactivity (for KPIs and History Table)
  const activeMissionsFiltered = useMemo(() => {
    return activeMissionsAll.filter(m => {
      if (selectedGovernorate && (m.governorate || "غير محدد") !== selectedGovernorate) return false;
      if (selectedClassification && (m.activity_classification || "غير مصنف") !== selectedClassification) return false;
      if (selectedActivityType && (m.activity_type || "عام") !== selectedActivityType) return false;
      if (selectedResponseType && (m.type_name || m.mission_nature || "عام") !== selectedResponseType) return false;
      if (selectedActivityDetail && (m.activity_details || "غير محدد") !== selectedActivityDetail) return false;
      if (selectedService) {
        const hasInd = (m.beneficiaries_individual || []).some((b: any) => (b.service_type || "غير محدد") === selectedService);
        const hasGrp = (m.beneficiaries_group || []).some((g: any) => (g.service_type || "غير محدد") === selectedService);
        if (!hasInd && !hasGrp) return false;
      }
      return true;
    });
  }, [activeMissionsAll, selectedGovernorate, selectedClassification, selectedActivityType, selectedResponseType, selectedActivityDetail, selectedService]);

  // 3. For History Table
  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      if (startDate && m.activity_date < startDate) return false;
      if (endDate && m.activity_date > endDate) return false;
      if (selectedGovernorate && (m.governorate || "غير محدد") !== selectedGovernorate) return false;
      if (selectedClassification && (m.activity_classification || "غير مصنف") !== selectedClassification) return false;
      if (selectedActivityType && (m.activity_type || "عام") !== selectedActivityType) return false;
      if (selectedResponseType && (m.type_name || m.mission_nature || "عام") !== selectedResponseType) return false;
      if (selectedActivityDetail && (m.activity_details || "غير محدد") !== selectedActivityDetail) return false;
      if (selectedService) {
        const hasInd = (m.beneficiaries_individual || []).some((b: any) => (b.service_type || "غير محدد") === selectedService);
        const hasGrp = (m.beneficiaries_group || []).some((g: any) => (g.service_type || "غير محدد") === selectedService);
        if (!hasInd && !hasGrp) return false;
      }
      return true;
    });
  }, [missions, startDate, endDate, selectedGovernorate, selectedClassification, selectedActivityType, selectedResponseType, selectedActivityDetail, selectedService]);

  const kpis = useMemo(() => {
    let vols = 0;
    let groupBens = 0;
    let indivServices = 0;
    let groupServices = 0;
    const uniqueVolunteersSet = new Set();
    const uniqueBeneficiariesSet = new Set();

    activeMissionsFiltered.forEach(m => {
      vols += (m.mission_volunteers || []).length;
      
      (m.mission_volunteers || []).forEach((v: any) => {
        if (v.membership_number) uniqueVolunteersSet.add(v.membership_number);
        else if (v.full_name) uniqueVolunteersSet.add(v.full_name);
        else uniqueVolunteersSet.add(v.id);
      });

      (m.beneficiaries_individual || []).forEach((b: any) => {
        if (selectedService && (b.service_type || "غير محدد") !== selectedService) return;
        indivServices += (b.service_quantity || 1);
        if (b.id_hash) {
          uniqueBeneficiariesSet.add(`hash::${b.id_hash}`);
        } else if (b.full_name && b.full_name.trim()) {
          uniqueBeneficiariesSet.add(`name::${b.full_name.trim().toLowerCase()}`);
        } else if (b.registry_id) {
          uniqueBeneficiariesSet.add(`reg::${b.registry_id}`);
        } else {
          uniqueBeneficiariesSet.add(`id::${b.id}`);
        }
      });

      (m.beneficiaries_group || []).forEach((g: any) => { 
        if (selectedService && (g.service_type || "غير محدد") !== selectedService) return;
        groupServices += (g.count || 0);
        if (!g.is_repeated) {
          groupBens += (g.count || 0); 
        }
      });
    });

    return {
      totalMissions: activeMissionsFiltered.length,
      totalVolunteers: vols,
      uniqueVolunteers: uniqueVolunteersSet.size,
      totalBeneficiaries: uniqueBeneficiariesSet.size + groupBens,
      totalServices: indivServices + groupServices
    };
  }, [activeMissionsFiltered, selectedService]);

  // Beneficiaries Decryption effect for search table
  useEffect(() => {
    const list: any[] = [];
    activeMissionsFiltered.forEach(m => {
      (m.beneficiaries_individual || []).forEach((b: any) => {
        list.push({
          ...b,
          mission_code: m.mission_code,
          mission_name: m.mission_name,
          date: m.activity_date
        });
      });
    });

    let isMounted = true;
    Promise.all(
      list.map(async (item) => ({
        ...item,
        decrypted_id: item.encrypted_id
          ? await decryptData(item.encrypted_id)
          : item.id_hash
          ? "مسجل بالهاش"
          : "غير مدخل",
      }))
    ).then((res) => {
      if (isMounted) setDecryptedBeneficiaries(res);
    });

    return () => {
      isMounted = false;
    };
  }, [activeMissionsFiltered]);

  const searchedBeneficiaries = useMemo(() => {
    if (!benSearchQuery.trim()) return decryptedBeneficiaries;
    const q = benSearchQuery.trim().toLowerCase();
    return decryptedBeneficiaries.filter((b) => {
      return (
        (b.full_name && b.full_name.toLowerCase().includes(q)) ||
        (b.decrypted_id && b.decrypted_id.includes(q)) ||
        (b.phone && b.phone.includes(q)) ||
        (b.mission_code && b.mission_code.toLowerCase().includes(q)) ||
        (b.service_type && b.service_type.toLowerCase().includes(q))
      );
    });
  }, [decryptedBeneficiaries, benSearchQuery]);

  // Gender Breakdown
  const genderData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMissionsFiltered.forEach(m => {
      (m.beneficiaries_individual || []).forEach((b: any) => {
        let g = b.gender || "غير محدد";
        if (g.trim().includes("ذكر") || g.toLowerCase() === "male") g = "ذكر";
        else if (g.trim().includes("أنثى") || g.toLowerCase() === "female") g = "أنثى";
        counts[g] = (counts[g] || 0) + (b.service_quantity || 1);
      });
      (m.beneficiaries_group || []).forEach((g: any) => {
        let gen = g.gender || "غير محدد";
        if (gen.trim().includes("ذكر") || gen.toLowerCase() === "male") gen = "ذكر";
        else if (gen.trim().includes("أنثى") || gen.toLowerCase() === "female") gen = "أنثى";
        counts[gen] = (counts[gen] || 0) + (g.count || 0);
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeMissionsFiltered]);

  // Nationality Breakdown
  const nationalityData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeMissionsFiltered.forEach(m => {
      (m.beneficiaries_individual || []).forEach((b: any) => {
        const nat = b.nationality || "غير محدد";
        counts[nat] = (counts[nat] || 0) + (b.service_quantity || 1);
      });
      (m.beneficiaries_group || []).forEach((g: any) => {
        const nat = g.nationality || "غير محدد";
        counts[nat] = (counts[nat] || 0) + (g.count || 0);
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeMissionsFiltered]);

  const aggregatedTargets = useMemo(() => {
    if (!targets.length) return null;
    
    let startMonth = "";
    let endMonth = "";
    
    if (startDate) startMonth = startDate.substring(0, 7);
    if (endDate) endMonth = endDate.substring(0, 7);
    
    if (!startDate && !endDate) {
      const today = new Date();
      startMonth = endMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    let tMissions = 0;
    let tUniqueVols = 0;
    let tTotalVols = 0;
    let tBens = 0;
    let tCustom: Record<string, number> = {};

    targets.forEach(t => {
      const m = t.target_month;
      if ((!startMonth || m >= startMonth) && (!endMonth || m <= endMonth)) {
        tMissions += t.target_missions || 0;
        tUniqueVols += t.target_unique_volunteers || 0;
        tTotalVols += t.target_volunteer_participations || 0;
        tBens += t.target_beneficiaries || 0;
        
        const ct = t.custom_targets as Record<string, number> || {};
        for (const k in ct) {
          tCustom[k] = (tCustom[k] || 0) + Number(ct[k] || 0);
        }
      }
    });

    return {
      missions: tMissions,
      uniqueVols: tUniqueVols,
      totalVols: tTotalVols,
      bens: tBens,
      custom: tCustom
    };
  }, [targets, startDate, endDate]);

  // Hierarchical Treemap Data: Classification -> Activity Type
  const treemapTreeData = useMemo(() => {
    const base = activeMissionsAll.filter(m => {
      if (selectedGovernorate && (m.governorate || "غير محدد") !== selectedGovernorate) return false;
      if (selectedResponseType && (m.type_name || m.mission_nature || "عام") !== selectedResponseType) return false;
      if (selectedActivityDetail && (m.activity_details || "غير محدد") !== selectedActivityDetail) return false;
      return true;
    });

    const map: Record<string, { total: number; types: Record<string, number> }> = {};
    base.forEach(m => {
      const cls = m.activity_classification || "غير مصنف";
      const actType = m.activity_type || "عام";
      if (!map[cls]) map[cls] = { total: 0, types: {} };
      map[cls].total += 1;
      map[cls].types[actType] = (map[cls].types[actType] || 0) + 1;
    });

    return Object.entries(map).map(([clsName, info]) => ({
      classification: clsName,
      total: info.total,
      types: Object.entries(info.types).map(([typeName, count]) => ({
        type: typeName,
        count
      })).sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.total - a.total);
  }, [activeMissionsAll, selectedGovernorate, selectedResponseType, selectedActivityDetail]);

  const governoratesData = useMemo(() => {
    const base = activeMissionsAll.filter(m => {
      if (selectedClassification && (m.activity_classification || "غير مصنف") !== selectedClassification) return false;
      if (selectedActivityType && (m.activity_type || "عام") !== selectedActivityType) return false;
      if (selectedResponseType && (m.type_name || m.mission_nature || "عام") !== selectedResponseType) return false;
      if (selectedActivityDetail && (m.activity_details || "غير محدد") !== selectedActivityDetail) return false;
      return true;
    });

    const counts: Record<string, number> = {};
    base.forEach(m => {
      const gov = m.governorate || "غير محدد";
      counts[gov] = (counts[gov] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeMissionsAll, selectedClassification, selectedActivityType, selectedResponseType, selectedActivityDetail]);

  // Response Type Data (نوع الاستجابة)
  const responseTypeData = useMemo(() => {
    const base = activeMissionsAll.filter(m => {
      if (selectedGovernorate && (m.governorate || "غير محدد") !== selectedGovernorate) return false;
      if (selectedClassification && (m.activity_classification || "غير مصنف") !== selectedClassification) return false;
      if (selectedActivityType && (m.activity_type || "عام") !== selectedActivityType) return false;
      if (selectedActivityDetail && (m.activity_details || "غير محدد") !== selectedActivityDetail) return false;
      return true;
    });

    const counts: Record<string, number> = {};
    base.forEach(m => {
      const resp = m.type_name || m.mission_nature || "عام";
      counts[resp] = (counts[resp] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeMissionsAll, selectedGovernorate, selectedClassification, selectedActivityType, selectedActivityDetail]);

  // Activity Details Data (تفاصيل النشاط)
  const activityDetailsData = useMemo(() => {
    const base = activeMissionsAll.filter(m => {
      if (selectedGovernorate && (m.governorate || "غير محدد") !== selectedGovernorate) return false;
      if (selectedClassification && (m.activity_classification || "غير مصنف") !== selectedClassification) return false;
      if (selectedActivityType && (m.activity_type || "عام") !== selectedActivityType) return false;
      if (selectedResponseType && (m.type_name || m.mission_nature || "عام") !== selectedResponseType) return false;
      return true;
    });

    const counts: Record<string, number> = {};
    base.forEach(m => {
      const detail = m.activity_details || "غير محدد";
      counts[detail] = (counts[detail] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [activeMissionsAll, selectedGovernorate, selectedClassification, selectedActivityType, selectedResponseType]);

  const servicesData = useMemo(() => {
    const base = activeMissionsAll.filter(m => {
      if (selectedGovernorate && (m.governorate || "غير محدد") !== selectedGovernorate) return false;
      if (selectedClassification && (m.activity_classification || "غير مصنف") !== selectedClassification) return false;
      if (selectedActivityType && (m.activity_type || "عام") !== selectedActivityType) return false;
      if (selectedResponseType && (m.type_name || m.mission_nature || "عام") !== selectedResponseType) return false;
      return true;
    });

    const counts: Record<string, number> = {};
    base.forEach(m => {
      (m.beneficiaries_individual || []).forEach((b: any) => {
         const service = b.service_type || "غير محدد";
         counts[service] = (counts[service] || 0) + (b.service_quantity || 1);
      });
      (m.beneficiaries_group || []).forEach((g: any) => {
         const service = g.service_type || "غير محدد";
         counts[service] = (counts[service] || 0) + (g.count || 0);
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activeMissionsAll, selectedGovernorate, selectedClassification, selectedActivityType, selectedResponseType]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'];

  const renderKpiValue = (actual: number, target: number | undefined, colorClass: string) => {
    if (!target) return <h3 className="text-2xl font-extrabold">{actual}</h3>;
    const percent = Math.min(100, Math.round((actual / target) * 100)) || 0;
    return (
      <div className="w-full mt-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-extrabold">{actual}</h3>
          <span className="text-sm text-muted-foreground font-medium">/ {target}</span>
        </div>
        <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
          <div className={`h-full ${colorClass} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  return (
    <AppLayout title={isManagementOrAdmin ? "لوحة معلومات الفرق والإدارة" : "لوحة معلومات فريقي"}>
      {isManagementOrAdmin && (
        <Card className="p-4 card-elevated border-primary/30 gradient-soft flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">تحديد الفريق المستهدف للإدارة</h2>
              <p className="text-xs text-muted-foreground">
                {profile?.department_code ? `كود الإدارة: ${profile.department_code}` : "استعراض وتعديل فرق الإدارة"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-[260px]">
            <Select value={selectedTeamId} onValueChange={handleTeamChange}>
              <SelectTrigger className="w-full font-bold bg-background shadow-sm">
                <SelectValue placeholder="اختر الفريق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold">✨ جميع الفرق التابعة للإدارة ({departmentTeams.length})</SelectItem>
                {departmentTeams.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    فريق {t.code} {t.name ? `- ${t.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      <Tabs defaultValue="missions" className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="missions" className="px-6"><ListTodo className="w-4 h-4 ml-2" /> مهام الفريق</TabsTrigger>
            <TabsTrigger value="volunteers" className="px-6"><UserCheck className="w-4 h-4 ml-2" /> متطوعو الفريق</TabsTrigger>
          </TabsList>
          {(activeTeamCode || profile?.team_code) && (
            <Badge variant="outline" className="hidden md:inline-flex">
              {selectedTeamId === "all" ? `عدد الفرق: ${departmentTeams.length}` : `كود الفريق المحدد: ${activeTeamCode}`}
            </Badge>
          )}
        </div>

        <TabsContent value="missions" className="space-y-6 mt-0">
          <Card className="p-4 border-primary/20 bg-card/50 flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]"><label className="text-sm font-bold text-muted-foreground">من تاريخ</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background" /></div>
            <div className="space-y-1.5 flex-1 min-w-[200px]"><label className="text-sm font-bold text-muted-foreground">إلى تاريخ</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background" /></div>
            <Button 
              variant="outline" 
              onClick={() => { 
                setStartDate(""); 
                setEndDate(""); 
                setSelectedGovernorate("");
                setSelectedClassification("");
                setSelectedActivityType("");
                setSelectedResponseType("");
                setSelectedActivityDetail("");
                setSelectedService("");
              }} 
              className="mb-0.5"
            >
              مسح الفلتر
            </Button>
          </Card>

          {(selectedGovernorate || selectedClassification || selectedActivityType || selectedResponseType || selectedActivityDetail || selectedService) && (
            <div className="flex flex-wrap items-center gap-2 bg-primary/10 p-3.5 rounded-xl border border-primary/30 animate-in fade-in duration-200">
              <span className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                تصفية تفاعلية من الرسم البياني:
              </span>
              {selectedGovernorate && (
                <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground py-1 px-3 text-xs font-bold">
                  المحافظة: {selectedGovernorate}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-200" onClick={() => setSelectedGovernorate("")} />
                </Badge>
              )}
              {selectedClassification && (
                <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground py-1 px-3 text-xs font-bold">
                  التصنيف: {selectedClassification}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-200" onClick={() => setSelectedClassification("")} />
                </Badge>
              )}
              {selectedActivityType && (
                <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground py-1 px-3 text-xs font-bold">
                  نوع النشاط: {selectedActivityType}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-200" onClick={() => setSelectedActivityType("")} />
                </Badge>
              )}
              {selectedResponseType && (
                <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground py-1 px-3 text-xs font-bold">
                  نوع الاستجابة: {selectedResponseType}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-200" onClick={() => setSelectedResponseType("")} />
                </Badge>
              )}
              {selectedActivityDetail && (
                <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground py-1 px-3 text-xs font-bold">
                  تفاصيل النشاط: {selectedActivityDetail}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-200" onClick={() => setSelectedActivityDetail("")} />
                </Badge>
              )}
              {selectedService && (
                <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground py-1 px-3 text-xs font-bold">
                  الخدمة: {selectedService}
                  <X className="w-3.5 h-3.5 cursor-pointer hover:text-amber-200" onClick={() => setSelectedService("")} />
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7 text-muted-foreground hover:text-destructive ms-auto font-bold"
                onClick={() => {
                  setSelectedGovernorate("");
                  setSelectedClassification("");
                  setSelectedActivityType("");
                  setSelectedResponseType("");
                  setSelectedActivityDetail("");
                  setSelectedService("");
                }}
              >
                إلغاء تصفية الرسم البياني
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 mt-1"><Target className="w-6 h-6 text-primary" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المهام المسجلة</p>{renderKpiValue(kpis.totalMissions, aggregatedTargets?.missions, "bg-primary")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 mt-1"><Users className="w-6 h-6 text-indigo-500" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المتطوعون (منفردون)</p>{renderKpiValue(kpis.uniqueVolunteers, aggregatedTargets?.uniqueVols, "bg-indigo-500")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-info/10 to-transparent border-info/20">
              <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center shrink-0 mt-1"><Activity className="w-6 h-6 text-info" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المشاركات التطوعية</p>{renderKpiValue(kpis.totalVolunteers, aggregatedTargets?.totalVols, "bg-info")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-success/10 to-transparent border-success/20">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center shrink-0 mt-1"><BarChartIcon className="w-6 h-6 text-success" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">المستفيدون (فعليون)</p>{renderKpiValue(kpis.totalBeneficiaries, aggregatedTargets?.bens, "bg-success")}</div>
            </Card>
            <Card className="p-5 card-elevated flex items-start gap-4 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-1"><HeartHandshake className="w-6 h-6 text-amber-500" /></div>
              <div className="flex-1 w-full"><p className="text-xs text-muted-foreground font-bold">إجمالي عدد الخدمات</p>{renderKpiValue(kpis.totalServices, undefined, "bg-amber-500")}</div>
            </Card>
          </div>

          {customKpis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {customKpis.map((kpi, idx) => (
                <Card key={kpi.id} className="p-4 card-elevated border-border flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">{kpi.kpi_label}</p>
                    <h3 className="text-2xl font-extrabold mt-1 text-primary">
                      {aggregatedTargets?.custom[kpi.kpi_key] || 0}
                    </h3>
                  </div>
                  <Target className="w-8 h-8 text-primary/20" />
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Treemap (الشكل الشجري): التصنيف ونوع النشاط */}
            <Card className="p-6 card-elevated border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-primary">الهيكل الشجري: تصنيف ونوع النشاط</h3>
                  <span className="text-xs text-muted-foreground font-normal">(اضغط للفلترة)</span>
                </div>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">شجري</Badge>
              </div>
              <div className="min-h-[250px] w-full space-y-3">
                {treemapTreeData.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {treemapTreeData.map((item, idx) => {
                      const isClsSelected = selectedClassification === item.classification;
                      const mainColor = COLORS[idx % COLORS.length];
                      return (
                        <div 
                          key={idx} 
                          className={`p-3.5 rounded-xl border transition-all ${isClsSelected ? 'bg-amber-500/10 border-amber-500 shadow-md' : 'bg-muted/30 border-border/60 hover:bg-muted/50'}`}
                        >
                          <div 
                            className="flex items-center justify-between cursor-pointer mb-2"
                            onClick={() => setSelectedClassification(prev => prev === item.classification ? "" : item.classification)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: isClsSelected ? '#f59e0b' : mainColor }} />
                              <span className={`font-bold text-sm ${isClsSelected ? 'text-amber-500' : ''}`}>{item.classification}</span>
                            </div>
                            <Badge variant="secondary" className="font-mono text-xs">{item.total} مهمة</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 ps-5 border-r-2 border-primary/20 ms-1.5 pt-1">
                            {item.types.map((t, tIdx) => {
                              const isTypeSelected = selectedActivityType === t.type && isClsSelected;
                              return (
                                <button
                                  key={tIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedClassification(item.classification);
                                    setSelectedActivityType(prev => prev === t.type ? "" : t.type);
                                  }}
                                  className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all ${isTypeSelected ? 'bg-amber-500 text-white font-bold shadow-sm' : 'bg-background border hover:border-primary/50 text-foreground'}`}
                                >
                                  <span>{t.type}</span>
                                  <span className="opacity-70 text-[10px] font-mono">({t.count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>

            {/* 2. توزيع المهام على المحافظات */}
            <Card className="p-6 card-elevated border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-primary">توزيع المهام على المحافظات</h3>
                  <span className="text-xs text-muted-foreground font-normal">(اضغط على المحافظة للفلترة)</span>
                </div>
                <Map className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="h-[280px] w-full">
                {governoratesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={governoratesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#888" />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        stroke="#888" 
                        tick={{ fill: '#888', fontSize: 12, cursor: 'pointer' }}
                        onClick={(tick) => {
                          if (tick && tick.value) {
                            setSelectedGovernorate(prev => prev === tick.value ? "" : tick.value);
                          }
                        }}
                      />
                      <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Bar 
                        dataKey="value" 
                        name="عدد المهام" 
                        radius={[0, 4, 4, 0]} 
                        barSize={20}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            setSelectedGovernorate(prev => prev === entry.name ? "" : entry.name);
                          }
                        }}
                      >
                        {governoratesData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={selectedGovernorate === entry.name ? '#f59e0b' : '#3b82f6'} 
                            className="cursor-pointer transition-all hover:opacity-80"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. نوع الاستجابة */}
            <Card className="p-6 card-elevated border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">نوع الاستجابة</h3>
                <span className="text-xs text-muted-foreground font-normal">(اضغط على القطاع للفلترة)</span>
              </div>
              <div className="h-[250px] w-full">
                {responseTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={responseTypeData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={75} 
                        paddingAngle={5} 
                        dataKey="value"
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            setSelectedResponseType(prev => prev === entry.name ? "" : entry.name);
                          }
                        }}
                      >
                        {responseTypeData.map((e, i) => (
                          <Cell 
                            key={i} 
                            fill={selectedResponseType === e.name ? '#f59e0b' : COLORS[(i + 3) % COLORS.length]} 
                            stroke={selectedResponseType === e.name ? '#fff' : 'none'}
                            strokeWidth={selectedResponseType === e.name ? 3 : 0}
                            className="cursor-pointer transition-all hover:opacity-80"
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>

            {/* 4. تفاصيل النشاط بشكل منفصل */}
            <Card className="p-6 card-elevated border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">تفاصيل النشاط (الأعلى تكراراً)</h3>
                <span className="text-xs text-muted-foreground font-normal">(اضغط على العمود للفلترة)</span>
              </div>
              <div className="h-[250px] w-full">
                {activityDetailsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityDetailsData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" angle={-35} textAnchor="end" height={45} tick={{ fill: '#888', fontSize: 11 }} />
                      <YAxis stroke="#888" />
                      <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Bar 
                        dataKey="value" 
                        name="عدد المهام" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            setSelectedActivityDetail(prev => prev === entry.name ? "" : entry.name);
                          }
                        }}
                      >
                        {activityDetailsData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={selectedActivityDetail === entry.name ? '#f59e0b' : COLORS[(index + 1) % COLORS.length]} 
                            className="cursor-pointer transition-all hover:opacity-80"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {/* 5. إحصائيات الخدمات */}
            <Card className="p-6 card-elevated border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary">إحصائيات الخدمات</h3>
                <span className="text-xs text-muted-foreground font-normal">(اضغط على العمود للفلترة)</span>
              </div>
              <div className="h-[300px] w-full">
                {servicesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={60} tick={{ fill: '#888', fontSize: 12 }} />
                      <YAxis stroke="#888" />
                      <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Bar 
                        dataKey="value" 
                        name="عدد الخدمات المستفاد منها" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={50}
                        onClick={(entry) => {
                          if (entry && entry.name) {
                            setSelectedService(prev => prev === entry.name ? "" : entry.name);
                          }
                        }}
                      >
                        {servicesData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={selectedService === entry.name ? '#f59e0b' : COLORS[index % COLORS.length]} 
                            className="cursor-pointer transition-all hover:opacity-80"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
              </div>
            </Card>
          </div>

          <Card className="p-4 border-dashed border-primary/40 bg-primary/5 flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 text-primary">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold">إدخال سريع من إكسيل</p>
                <p className="text-xs text-muted-foreground">يمكنك رفع ملف إكسيل لتعبئة البيانات تلقائياً</p>
              </div>
            </div>
            <div className="flex gap-2">
              <SmartExcelUploader 
                onSuccess={loadMissions} 
                trigger={
                  <Button
                    disabled={busy}
                    className="gradient-primary shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4 ms-2" />
                    تحميل البيانات الآن (رفع ذكي)
                  </Button>
                }
              />
            </div>
          </Card>

          {supplyRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">طلبات الإمداد الخاصة بالفريق</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplyRequests.map(req => (
                  <Card key={req.id} className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{req.role_name}</h3>
                        <Badge variant="outline">{req.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">العدد المطلوب: {req.vol_count} | تاريخ البداية: {req.start_date}</p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      {req.status === 'pending_management' && (
                        <Button onClick={() => approveSupplyRequest(req.id)} disabled={busy} className="bg-success text-white">
                          موافقة الإدارة
                        </Button>
                      )}
                      {req.status === 'sent_to_team' && (
                        <Button onClick={() => navigate(`/team-supply-review/${req.id}`)} disabled={busy} className="bg-primary text-white">
                          مراجعة وضم المرشحين
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Card className="p-4 card-elevated border-primary/20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">مهامي السابقة</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/team-beneficiaries")} className="bg-primary/5 border-primary/20"><Database className="w-4 h-4 ms-2" /> قاعدة بيانات المستفيدين</Button>
                <Button size="sm" onClick={() => navigate("/department-entry")}><Edit2 className="w-4 h-4 ms-2" /> مهمة جديدة</Button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <Table>
                <TableHeader><TableRow><TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>التاريخ</TableHead><TableHead>الحالة</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">جاري التحميل...</TableCell></TableRow>
                    : filteredMissions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">لا توجد مهام</TableCell></TableRow>
                      : filteredMissions.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell><code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{m.mission_code}</code></TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate" title={m.mission_name}>{m.mission_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{m.activity_date}</TableCell>
                          <TableCell><StatusBadge status={m.is_canceled ? "canceled" : m.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/missions/${m.id}`)}><Eye className="w-4 h-4 text-info" /></Button>
                              {m.status === 'planned' && (
                                <>
                                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => navigate(`/department-entry/${m.id}`)}><Edit2 className="w-4 h-4 text-warning" /></Button>
                                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleDeleteMission(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="volunteers" className="mt-0 space-y-6">
          <Card className="p-5 border-primary/20 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-primary">المتطوعون المنضمون للفرق</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTeamId === "all"
                    ? `عرض جميع المتطوعين في كافة فرق الإدارة (${departmentTeams.length} فريق)`
                    : `يظهر هنا المتطوعون المرتبطون بكود الفريق (${activeTeamCode || "غير محدد"})`}
                </p>
              </div>
              {activeTeamId && (
                <AddVolunteerDialog teamId={activeTeamId} teamCode={activeTeamCode || ""} onAdded={() => loadVolunteers(selectedTeamId)} />
              )}
            </div>

            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>رقم العضوية</TableHead>
                    <TableHead>التليفون</TableHead>
                    <TableHead>تاريخ الانضمام</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingVols ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري تحميل المتطوعين...</TableCell></TableRow>
                  ) : teamVolunteers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد متطوعين في فريقك حالياً</TableCell></TableRow>
                  ) : (
                    teamVolunteers.map((vt) => {
                      const v = vt.volunteers_base;
                      if (!v) return null;
                      return (
                        <TableRow key={vt.id} className={!vt.is_approved ? "opacity-60 bg-muted/20 grayscale" : ""}>
                          <TableCell className="font-bold">{v.full_name}</TableCell>
                          <TableCell>{v.branch || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-right">{v.membership_number || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-right">{vt.team_phone || v.phone_number || "—"}</TableCell>
                          <TableCell>{vt.join_date || "—"}</TableCell>
                          <TableCell>
                            {vt.is_approved ? (
                              <Badge variant="default" className="bg-success text-success-foreground hover:bg-success/90">معتمد</Badge>
                            ) : (
                              <Badge variant="secondary" className="border-warning text-warning bg-warning/10">قيد الاعتماد</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
