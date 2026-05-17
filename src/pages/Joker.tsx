import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Row {
  id: string; mission_code: string; mission_name: string;
  governorate: string | null; activity_date: string; status: string; region: string | null;
}

export default function Joker({ titleOverride, embedded }: { titleOverride?: string, embedded?: boolean }) {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  const isYouthOnly = (hasRole("youth_room") || hasRole("branch_youth")) && !hasRole("admin") && !hasRole("joker") && !hasRole("operations_room") && !hasRole("operations_supervisor");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("missions")
        .select("id, mission_code, mission_name, governorate, activity_date, status, region")
        .order("activity_date", { ascending: false });
      if (isYouthOnly) {
        q = q.in("status", ["reviewed", "sent_to_youth", "sent_to_supervisor", "monitored", "open_active"]);
      }
      if (region !== "all") q = q.eq("region", region as any);
      if (date) q = q.eq("activity_date", date);
      const { data } = await q;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [region, date, isYouthOnly]);

  const filtered = rows.filter((r) => !search ||
    r.mission_code.toLowerCase().includes(search.toLowerCase()) ||
    r.mission_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.governorate ?? "").includes(search));

  // KPIs
  const total = filtered.length;
  const monitored = filtered.filter((r) => r.status === "monitored").length;
  const reviewed = filtered.filter((r) => r.status === "reviewed").length;
  const pending = filtered.filter((r) => !["monitored", "reviewed"].includes(r.status)).length;

  const content = (
    <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي</div><div className="text-2xl font-bold mt-1">{total}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">تم الرصد</div><div className="text-2xl font-bold mt-1 text-success">{monitored}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">تم المراجعة</div><div className="text-2xl font-bold mt-1 text-primary">{reviewed}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">قيد العمل</div><div className="text-2xl font-bold mt-1 text-warning">{pending}</div></Card>
        </div>

        <Card className="card-elevated p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pr-9" placeholder="بحث في كل الحقول" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue placeholder="الإقليم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقاليم</SelectItem>
                {Object.entries(REGIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>اسم المهمة</TableHead>
                  <TableHead>المحافظة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">جاري التحميل...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد بيانات</TableCell></TableRow>
                ) : filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><code className="text-xs">{r.mission_code}</code></TableCell>
                    <TableCell className="max-w-xs truncate">{r.mission_name}</TableCell>
                    <TableCell>{r.governorate ?? "—"}</TableCell>
                    <TableCell>{r.activity_date}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell><Link to={`/missions/${r.id}`}><Button size="sm" variant="outline"><Eye className="w-4 h-4" /></Button></Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
  );

  return embedded ? content : <AppLayout title={titleOverride || "الجوكر"}>{content}</AppLayout>;
}
