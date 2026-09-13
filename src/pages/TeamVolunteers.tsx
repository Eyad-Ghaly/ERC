import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Loader2, Users } from "lucide-react";
import { AddVolunteerDialog } from "@/components/AddVolunteerDialog";
import { SmartVolunteersUploader } from "@/components/SmartVolunteersUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function TeamVolunteers() {
  const { user, profile, roles, hasRole } = useAuth();
  const [departmentTeams, setDepartmentTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [teamVolunteers, setTeamVolunteers] = useState<any[]>([]);
  const [loadingVols, setLoadingVols] = useState(true);

  const isManagementOrAdmin = hasRole("management") || hasRole("department_admin") || hasRole("admin") || hasRole("stakeholder");

  const activeTeam = useMemo(() => {
    if (selectedTeamId && selectedTeamId !== "all") {
      return departmentTeams.find(t => t.id === selectedTeamId) || null;
    }
    return null;
  }, [selectedTeamId, departmentTeams]);

  const activeTeamId = activeTeam?.id || (selectedTeamId !== "all" ? selectedTeamId : profile?.team_id);
  const activeTeamCode = activeTeam?.code || profile?.team_code;

  const loadVolunteers = async (targetTeamId = selectedTeamId, currentDeptTeams = departmentTeams) => {
    setLoadingVols(true);

    const effectiveTeamId = (!isManagementOrAdmin && profile?.team_id)
      ? profile.team_id
      : targetTeamId;

    let query = supabase
      .from("volunteer_teams")
      .select(`
        id, is_approved, join_date, team_id,
        volunteers_base ( id, full_name, membership_number, branch, phone_number ),
        team:teams ( id, code, name )
      `);

    if (effectiveTeamId && effectiveTeamId !== "all") {
      query = query.eq("team_id", effectiveTeamId);
    } else if (effectiveTeamId === "all" && currentDeptTeams.length > 0) {
      const teamIds = currentDeptTeams.map((t: any) => t.id);
      query = query.in("team_id", teamIds);
    } else if (profile?.team_id) {
      query = query.eq("team_id", profile.team_id);
    }

    const { data: vtData } = await query;
    let finalVols: any[] = vtData || [];

    if (finalVols.length === 0 && effectiveTeamId && effectiveTeamId !== "all") {
      const { data: fallbackVtData } = await supabase
        .from("volunteer_teams")
        .select(`
          id, is_approved, join_date, team_id,
          volunteers_base ( id, full_name, membership_number, branch, phone_number ),
          team:teams ( id, code, name )
        `)
        .eq("team_id", effectiveTeamId);

      if (fallbackVtData && fallbackVtData.length > 0) {
        finalVols = fallbackVtData;
      }
    } else if (finalVols.length === 0 && effectiveTeamId === "all" && currentDeptTeams.length > 0) {
      const teamIds = currentDeptTeams.map((t: any) => t.id);
      const { data: fallbackVtData } = await supabase
        .from("volunteer_teams")
        .select(`
          id, is_approved, join_date, team_id,
          volunteers_base ( id, full_name, membership_number, branch, phone_number ),
          team:teams ( id, code, name )
        `)
        .in("team_id", teamIds);
      if (fallbackVtData && fallbackVtData.length > 0) {
        finalVols = fallbackVtData;
      }
    }

    setTeamVolunteers(finalVols);
    setLoadingVols(false);
  };

  useEffect(() => {
    if (!user) return;
    const initData = async () => {
      let deptTeams: any[] = [];
      let query = supabase.from("teams").select("*, department:departments(code, name)").order("code");
      if (!roles.includes("admin") && !roles.includes("stakeholder") && profile?.department_id) {
        query = query.eq("department_id", profile.department_id);
      }
      const { data } = await query;
      if (data && data.length > 0) {
        deptTeams = data;
        setDepartmentTeams(data);
      }
      loadVolunteers(selectedTeamId, deptTeams);
    };
    initData();
  }, [user, profile, roles]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    loadVolunteers(teamId, departmentTeams);
  };

  return (
    <AppLayout title="متطوعو الفريق">
      {isManagementOrAdmin && (
        <Card className="p-4 card-elevated border-primary/30 gradient-soft flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">تحديد الفريق المستهدف للإدارة</h2>
              <p className="text-xs text-muted-foreground">
                {profile?.department_code ? `كود الإدارة: ${profile.department_code}` : "استعراض متطوعي الإدارة"}
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

      <Card className="p-5 border-primary/20 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-primary">المتطوعون المنضمون للفرق</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTeamId === "all"
                ? `عرض جميع المتطوعين في كافة فرق الإدارة (${departmentTeams.length} فريق)`
                : `عرض قائمة المتطوعين المرتبطين بكود الفريق (${activeTeamCode || "غير محدد"})`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SmartVolunteersUploader
              teamId={activeTeamId || undefined}
              teamCode={activeTeamCode || ""}
              onSuccess={() => loadVolunteers(selectedTeamId)}
            />
            {activeTeamId && (
              <AddVolunteerDialog teamId={activeTeamId} teamCode={activeTeamCode || ""} onAdded={() => loadVolunteers(selectedTeamId)} />
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto w-full">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-foreground">الاسم</TableHead>
                  {selectedTeamId === "all" && <TableHead className="font-bold text-foreground">الفريق</TableHead>}
                  <TableHead className="font-bold text-foreground">الفرع</TableHead>
                  <TableHead className="font-bold text-foreground">رقم العضوية</TableHead>
                  <TableHead className="font-bold text-foreground">التليفون</TableHead>
                  <TableHead className="font-bold text-foreground">تاريخ الانضمام</TableHead>
                  <TableHead className="font-bold text-foreground">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingVols ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : teamVolunteers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا يوجد متطوعين منضمين للفريق المختار</TableCell></TableRow>
                ) : (
                  teamVolunteers.map(vol => (
                    <TableRow key={vol.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap">{(vol.volunteers_base as any)?.full_name}</TableCell>
                      {selectedTeamId === "all" && <TableCell className="whitespace-nowrap"><Badge variant="outline">{(vol.team as any)?.code}</Badge></TableCell>}
                      <TableCell className="whitespace-nowrap">{(vol.volunteers_base as any)?.branch || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{(vol.volunteers_base as any)?.membership_number || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{(vol.volunteers_base as any)?.phone_number || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{vol.join_date || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {vol.is_approved ? (
                          <StatusBadge status="approved" text="معتمد" />
                        ) : (
                          <Badge variant="outline" className="border-warning text-warning bg-warning/10">قيد الاعتماد</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
