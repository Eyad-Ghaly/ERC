import { KpiCard } from "./KpiCard";
import { CalculatedKpis, TargetSummary } from "@/services/statistics/statisticsCalculator";
import { Target, Users, UserCheck, HeartHandshake, Award, Clock, Activity, Users2 } from "lucide-react";

interface KpiCardsSectionProps {
  kpis: CalculatedKpis;
  targetSummary: TargetSummary;
}

export function KpiCardsSection({ kpis, targetSummary }: KpiCardsSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {/* 1. Total Missions */}
      <KpiCard
        title="المهام المنفذة"
        value={kpis.totalMissions}
        target={targetSummary.hasTargets ? targetSummary.missionsTarget : undefined}
        subtitle={`${kpis.completedMissions} مكتملة | ${kpis.plannedMissions} مخطط`}
        icon={Target}
        iconColorClass="text-primary"
        gradientClass="from-primary/15 to-transparent border-primary/20"
      />

      {/* 2. Unique Volunteers */}
      <KpiCard
        title="المتطوعون (المنفردون)"
        value={kpis.uniqueVolunteersCount}
        target={targetSummary.hasTargets ? targetSummary.uniqueVolsTarget : undefined}
        subtitle="متطوعون بدون تكرار في الفترة"
        icon={Users}
        iconColorClass="text-indigo-500"
        gradientClass="from-indigo-500/15 to-transparent border-indigo-500/20"
      />

      {/* 3. Volunteer Participations */}
      <KpiCard
        title="المشاركات التطوعية"
        value={kpis.totalVolunteersCount}
        target={targetSummary.hasTargets ? targetSummary.totalVolsTarget : undefined}
        subtitle={`معدل ${kpis.avgVolunteersPerMission} متطوع لكل مهمة`}
        icon={Activity}
        iconColorClass="text-sky-500"
        gradientClass="from-sky-500/15 to-transparent border-sky-500/20"
      />

      {/* 4. Total Beneficiaries */}
      <KpiCard
        title="المستفيدون (الفعليون)"
        value={kpis.totalActualBeneficiaries}
        target={targetSummary.hasTargets ? targetSummary.beneficiariesTarget : undefined}
        subtitle={`${kpis.individualBeneficiariesCount} أفراد + ${kpis.groupBeneficiariesCount} جماعي`}
        icon={HeartHandshake}
        iconColorClass="text-emerald-500"
        gradientClass="from-emerald-500/15 to-transparent border-emerald-500/20"
      />

      {/* 5. Total Services */}
      <KpiCard
        title="إجمالي الخدمات المقدمة"
        value={kpis.totalServicesCount}
        subtitle={`معدل ${kpis.avgBeneficiariesPerMission} مستفيد لكل مهمة`}
        icon={Award}
        iconColorClass="text-amber-500"
        gradientClass="from-amber-500/15 to-transparent border-amber-500/20"
      />

      {/* 6. Volunteer Hours */}
      <KpiCard
        title="ساعات التطوع"
        value={kpis.totalVolunteerHours}
        suffix="ساعة"
        subtitle={`${kpis.totalVolunteerPoints} نقطة تطوعية مسجلة`}
        icon={Clock}
        iconColorClass="text-violet-500"
        gradientClass="from-violet-500/15 to-transparent border-violet-500/20"
      />
    </div>
  );
}
