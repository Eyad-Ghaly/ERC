import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { REGIONS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar, Search, MapPin, Activity, Clock, Eye, Layers, Building2, TrendingUp, AlertCircle } from "lucide-react";

interface Mission {
  id: string;
  mission_code: string;
  mission_name: string;
  governorate: string | null;
  execution_place: string | null;
  activity_date: string;
  status: string;
  region: string | null;
  is_open_mission: boolean | null;
  is_canceled: boolean | null;
  team_id: string;
  department_id: string | null;
  activity_type: string | null;
}

export default function StakeholderDashboard() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [date, setDate] = useState(""); // فاضي = كل المهمات

  useEffect(() => {
    (async () => {
      setLoading(true);
      
      let q = supabase
        .from("missions")
        .select("id, mission_code, mission_name, governorate, execution_place, activity_date, status, region, is_open_mission, is_canceled, team_id, department_id, activity_type")
        .order("activity_date", { ascending: false })
        .limit(10000);
      if (selectedRegion !== "all") q = q.eq("region", selectedRegion as any);
      if (date) q = q.eq("activity_date", date);
      const { data, error } = await q;
      if (error) console.error("missions error:", error.message);
      
      setMissions((data ?? []) as Mission[]);
      setLoading(false);
    })();
  }, [selectedRegion, date]);


  const filtered = missions.filter((m) => {
    if (m.is_canceled === true || m.status === "canceled") return false;
    if (selectedStatus !== "all" && m.status !== selectedStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        m.mission_code.toLowerCase().includes(s) ||
        m.mission_name.toLowerCase().includes(s) ||
        (m.governorate?.toLowerCase().includes(s) ?? false) ||
        (m.execution_place?.toLowerCase().includes(s) ?? false) ||
        m.team_id.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const total = filtered.length;
  const byRegion = Object.fromEntries(
    Object.keys(REGIONS).map((r) => [r, filtered.filter((m) => m.region === r).length])
  );
  const uniqueTeams = new Set(filtered.map((m) => m.team_id)).size;
  const uniqueGovs = new Set(filtered.map((m) => m.governorate).filter(Boolean)).size;
  const uniqueStatuses = [...new Set(missions.map((m) => m.status).filter(s => s !== "canceled"))];

  return (
    <AppLayout title="مهام اليوم - أصحاب المصلحة">
      <div className="space-y-6 animate-fade-in">

        <div className="rounded-2xl gradient-hero p-8 shadow-glow">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-primary-foreground flex items-center gap-3">
                <Activity className="w-8 h-8" />
                المهام على الأرض
              </h2>
              <p className="text-primary-foreground/80 mt-1 text-lg">
                {date
                  ? format(new Date(date + "T00:00:00"), "EEEE d MMMM yyyy", { locale: ar })
                  : "كل المهمات"}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-xl p-3">
              <Calendar className="w-5 h-5 text-primary-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-auto h-9 bg-white/20 border-white/30 text-primary-foreground"
                placeholder="اختر تاريخ"
              />
              {date && (
                <button onClick={() => setDate("")} className="text-primary-foreground/70 hover:text-primary-foreground text-xs underline">
                  كل المهمات
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Layers} label="إجمالي المهام" value={total} color="text-primary" />
          <KPICard icon={Building2} label="الفرق المشاركة" value={uniqueTeams} color="text-info" />
          <KPICard icon={MapPin} label="المحافظات" value={uniqueGovs} color="text-warning" />
          <KPICard icon={TrendingUp} label="المهام المفتوحة" value={filtered.filter(m => m.status === "open_active").length} color="text-success" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(REGIONS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedRegion(selectedRegion === key ? "all" : key)}
              className={`p-4 rounded-xl border-2 text-right transition-all hover:shadow-md ${
                selectedRegion === key ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="text-2xl font-bold">{byRegion[key] ?? 0}</div>
              <div className="text-xs text-muted-foreground">مهمة</div>
            </button>
          ))}
        </div>

        <Card className="card-elevated p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pr-9"
                placeholder="ابحث بالاسم أو الكود أو المحافظة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <FilterButton active={selectedStatus === "all"} onClick={() => setSelectedStatus("all")} label="كل الحالات" />
              {uniqueStatuses.map((s) => (
                <FilterButton
                  key={s}
                  active={selectedStatus === s}
                  onClick={() => setSelectedStatus(selectedStatus === s ? "all" : s)}
                  label={STATUS_LABELS[s] ?? s}
                />
              ))}
            </div>
            {(selectedRegion !== "all" || selectedStatus !== "all" || search) && (
              <button onClick={() => { setSelectedRegion("all"); setSelectedStatus("all"); setSearch(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline">
                مسح الفلاتر
              </button>
            )}
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 animate-spin" />
              جاري تحميل المهام...
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">لا توجد مهام</p>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">يعرض <span className="font-bold text-foreground">{filtered.length}</span> مهمة</p>
            <div className="grid gap-3">
              {filtered.map((m) => <MissionRow key={m.id} mission={m} />)}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MissionRow({ mission: m }: { mission: Mission }) {
  const statusClass = STATUS_COLORS[m.status] ?? "bg-muted text-muted-foreground";
  return (
    <Card className={`card-elevated p-4 hover:shadow-glow transition-all ${m.status === "open_active" ? "border-primary/30" : ""}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{m.mission_code}</span>
            {m.status === "open_active" && <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">🟢 مفتوحة ونشطة</span>}
            <Badge className={`text-xs ${statusClass}`}>{STATUS_LABELS[m.status] ?? m.status}</Badge>
          </div>
          <h3 className="font-bold text-base">{m.mission_name}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {m.region && <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{REGIONS[m.region as keyof typeof REGIONS] ?? m.region}</span>}
            {(m.governorate || m.execution_place) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {[m.governorate, m.execution_place].filter(Boolean).join(" • ")}
              </span>
            )}
            <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{m.team_id}{m.department_id && ` / ${m.department_id}`}</span>
            {m.activity_type && <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{m.activity_type}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{m.activity_date}</span>
          <Link to={`/missions/${m.id}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
            <Eye className="w-4 h-4" />تفاصيل
          </Link>
        </div>
      </div>
    </Card>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="card-elevated p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
