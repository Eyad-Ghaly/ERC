import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Save, Loader2, Target } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function TeamTargets() {
  const { user, profile, hasRole } = useAuth();
  
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(profile?.team_id || undefined);
  const [targetMonth, setTargetMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const [targetMissions, setTargetMissions] = useState<number>(0);
  const [targetUniqueVolunteers, setTargetUniqueVolunteers] = useState<number>(0);
  const [targetVolunteerParticipations, setTargetVolunteerParticipations] = useState<number>(0);
  const [targetBeneficiaries, setTargetBeneficiaries] = useState<number>(0);
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [customKpis, setCustomKpis] = useState<any[]>([]);

  const isElevated = hasRole("admin") || hasRole("data_manager");

  useEffect(() => {
    if (isElevated) {
      supabase.from("teams")
        .select("id, code")
        .order("code")
        .then(({ data }) => {
          if (data) {
            setTeams(data);
          }
        });
    } else if (profile?.team_id) {
      setSelectedTeam(profile.team_id);
    }
  }, [isElevated, profile]);

  useEffect(() => {
    if (!selectedTeam || !targetMonth) return;

    const fetchTargets = async () => {
      setLoading(true);
      
      const { data: kpisData } = await supabase.from("team_custom_kpis").select("*").eq("team_id", selectedTeam);
      setCustomKpis(kpisData ?? []);

      const { data, error } = await supabase
        .from("team_kpi_targets")
        .select("*")
        .eq("team_id", selectedTeam)
        .eq("target_month", targetMonth)
        .maybeSingle();

      if (data) {
        setTargetMissions(data.target_missions ?? 0);
        setTargetUniqueVolunteers(data.target_unique_volunteers ?? 0);
        setTargetVolunteerParticipations(data.target_volunteer_participations ?? 0);
        setTargetBeneficiaries(data.target_beneficiaries ?? 0);
        setCustomTargets((data.custom_targets as Record<string, number>) || {});
      } else {
        setTargetMissions(0);
        setTargetUniqueVolunteers(0);
        setTargetVolunteerParticipations(0);
        setTargetBeneficiaries(0);
        setCustomTargets({});
      }
      setLoading(false);
    };

    fetchTargets();
  }, [selectedTeam, targetMonth]);

  const handleSave = async () => {
    if (!selectedTeam) {
      toast.error("يجب تحديد كود الفريق");
      return;
    }
    if (!targetMonth) {
      toast.error("يجب تحديد الشهر");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("team_kpi_targets").upsert({
      team_id: selectedTeam,
      target_month: targetMonth,
      target_missions: targetMissions,
      target_unique_volunteers: targetUniqueVolunteers,
      target_volunteer_participations: targetVolunteerParticipations,
      target_beneficiaries: targetBeneficiaries,
      custom_targets: customTargets,
      created_by: user?.id,
    }, {
      onConflict: "team_id, target_month"
    });

    if (error) {
      toast.error("حدث خطأ أثناء حفظ الأهداف: " + error.message);
    } else {
      toast.success("تم حفظ الأهداف بنجاح");
    }
    setSaving(false);
  };

  return (
    <AppLayout title="مستهدفات الفريق (KPIs)">
      <ErrorBoundary>
        <div className="max-w-4xl space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <Target className="w-6 h-6" />
              <h2 className="text-xl font-bold">تحديد مستهدفات الأداء الشهري</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {isElevated ? (
                <div className="space-y-2">
                  <Label>كود الفريق</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger dir="ltr" className="text-right">
                    <SelectValue placeholder="اختر الفريق..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id} dir="ltr" className="text-right">{t.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>كود الفريق (ثابت)</Label>
                <Input value={profile?.team_code || selectedTeam || ""} disabled className="bg-muted font-mono" dir="ltr" />
              </div>
            )}

            <div className="space-y-2">
              <Label>الشهر المستهدف</Label>
              <Input 
                type="month" 
                value={targetMonth} 
                onChange={(e) => setTargetMonth(e.target.value)} 
                dir="ltr"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center text-primary">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>المستهدف من المهام المسجلة</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={targetMissions} 
                    onChange={(e) => setTargetMissions(Number(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">عدد المهام المطلوب تنفيذها في هذا الشهر.</p>
                </div>

                <div className="space-y-2">
                  <Label>المستهدف من المتطوعين (منفردون)</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={targetUniqueVolunteers} 
                    onChange={(e) => setTargetUniqueVolunteers(Number(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">عدد المتطوعين الجدد/المشاركين (بدون تكرار).</p>
                </div>

                <div className="space-y-2">
                  <Label>المستهدف من المشاركات التطوعية</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={targetVolunteerParticipations} 
                    onChange={(e) => setTargetVolunteerParticipations(Number(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">إجمالي مرات مشاركة المتطوعين في كل المهام.</p>
                </div>

                <div className="space-y-2">
                  <Label>المستهدف من المستفيدين الفعليين</Label>
                  <Input 
                    type="number" 
                    min="0"
                    value={targetBeneficiaries} 
                    onChange={(e) => setTargetBeneficiaries(Number(e.target.value))} 
                  />
                  <p className="text-xs text-muted-foreground">العدد الإجمالي للأفراد والمجموعات المستهدفة.</p>
                </div>

                {customKpis.map(kpi => (
                  <div key={kpi.id} className="space-y-2">
                    <Label>{kpi.kpi_label}</Label>
                    <Input 
                      type="number" 
                      min="0"
                      value={customTargets[kpi.kpi_key] || 0} 
                      onChange={(e) => setCustomTargets({ ...customTargets, [kpi.kpi_key]: Number(e.target.value) })} 
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleSave} disabled={saving || !selectedTeam || !targetMonth}>
                  {saving ? <Loader2 className="w-4 h-4 ms-2 animate-spin" /> : <Save className="w-4 h-4 ms-2" />}
                  حفظ المستهدفات
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      </ErrorBoundary>
    </AppLayout>
  );
}
