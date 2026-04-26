import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

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
}

export default function OperationsRoom() {
  const [region, setRegion] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      let q = supabase
        .from("missions")
        .select("id, mission_code, mission_name, governorate, execution_place, activity_date, status, region, is_open_mission")
        .or(`activity_date.eq.${today},and(is_open_mission.eq.true,status.eq.open_active)`)
        .order("created_at", { ascending: false });
      if (region !== "all") q = q.eq("region", region as any);
      const { data } = await q;
      setMissions((data ?? []) as Mission[]);
      setLoading(false);
    })();
  }, [region]);

  const filtered = missions.filter((m) =>
    !search || m.mission_code.toLowerCase().includes(search.toLowerCase()) || m.mission_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="غرفة العمليات المركزية">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          مهام اليوم: <strong className="text-foreground">{format(new Date(), "yyyy-MM-dd")}</strong>
        </div>

        <Tabs value={region} onValueChange={setRegion}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="all">الكل</TabsTrigger>
            {Object.entries(REGIONS).map(([k, v]) => (
              <TabsTrigger key={k} value={k}>{v}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث بالكود أو الاسم..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">جاري التحميل...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">لا توجد مهام مجدولة لليوم في هذه المنطقة.</Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((m) => (
              <Card key={m.id} className="card-elevated p-4 hover:shadow-glow transition-all">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <code className="text-xs font-mono bg-primary-soft text-primary px-2 py-0.5 rounded">{m.mission_code}</code>
                      <StatusBadge status={m.status} />
                    </div>
                    <h3 className="font-bold truncate">{m.mission_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {m.governorate ?? "—"} • {m.execution_place ?? "—"}
                    </p>
                  </div>
                  <Link to={`/missions/${m.id}`}>
                    <Button size="sm"><Eye className="w-4 h-4 ms-2" />فتح</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
