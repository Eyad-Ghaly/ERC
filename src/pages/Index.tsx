import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { ROLES } from "@/lib/constants";
import { FilePlus, Radio, Sparkles, ShieldCheck, Users2, BarChart3, Database, Settings } from "lucide-react";

const TILES = [
  { role: "department_entry", title: "لوحة معلومات فريقي", url: "/department-dashboard", icon: BarChart3, desc: "إحصائيات ومهام مسجلة" },
  { role: "operations_room", title: "غرفة العمليات", url: "/operations-room", icon: Radio, desc: "إدارة مهام اليوم" },
  { role: "joker", title: "الجوكر", url: "/joker", icon: Sparkles, desc: "مراجعة الاستمارات" },
  { role: "operations_supervisor", title: "مشرف العمليات", url: "/supervisor", icon: ShieldCheck, desc: "اعتماد المهام" },
  { role: "youth_room", title: "غرفة الشباب", url: "/youth", icon: Users2, desc: "رصد المتطوعين والساعات" },
  { role: "stakeholder", title: "Dashboard", url: "/dashboard", icon: BarChart3, desc: "مؤشرات الأداء" },
  { role: "data_manager", title: "إدارة البيانات", url: "/data-manager", icon: Database, desc: "رؤية مزدوجة وكاملة" },
  { role: "admin", title: "لوحة المدير", url: "/admin", icon: Settings, desc: "المستخدمون والقوائم" },
] as const;

const Index = () => {
  const { profile, roles, hasRole } = useAuth();

  const visibleTiles = TILES.filter((t) => hasRole("admin") || roles.includes(t.role as any));

  if (roles.length === 1 && roles[0] === "department_entry") {
    // If user is ONLY department_entry, direct them to their dashboard
    return <Navigate to="/department-dashboard" replace />;
  }

  return (
    <AppLayout title="الرئيسية">
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-2xl gradient-hero p-8 shadow-glow">
          <h2 className="text-3xl font-extrabold text-primary-foreground">أهلاً، {profile?.full_name ?? profile?.email}</h2>
          <p className="text-primary-foreground/90 mt-2">
            {roles.length > 0 ? roles.map((r) => ROLES[r]).join(" • ") : "في انتظار تعيين الصلاحيات من المدير"}
          </p>
        </div>

        {visibleTiles.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            لم يتم تعيين أي صلاحيات لحسابك بعد. يرجى التواصل مع المدير.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTiles.map((t) => (
              <Link key={t.url} to={t.url}>
                <Card className="p-6 card-elevated hover:shadow-glow transition-all hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                      <t.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Index;
