import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye } from "lucide-react";

interface Mission {
  id: string; mission_code: string; mission_name: string; status: string;
  activity_date: string; governorate: string | null;
  supervisor: string | null; monitor_name: string | null;
}

export default function DataManager() {
  const [missions, setMissions] = useState<Mission[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("missions")
        .select("id, mission_code, mission_name, status, is_canceled, activity_date, governorate, supervisor, monitor_name")
        .order("activity_date", { ascending: false }).limit(10000);
      setMissions((data ?? []) as Mission[]);
    })();
  }, []);

  const opsRows = missions;
  const youthRows = missions;

  return (
    <AppLayout title="مسؤول إدارة وتحليل البيانات">
      <Tabs defaultValue="ops" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ops">جدول غرفة العمليات</TabsTrigger>
          <TabsTrigger value="youth">جدول غرفة الشباب</TabsTrigger>
        </TabsList>

        <TabsContent value="ops">
          <Card className="card-elevated p-4 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
                <TableHead>التاريخ</TableHead><TableHead>المحافظة</TableHead>
                <TableHead>المشرف</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {opsRows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><code className="text-xs">{m.mission_code}</code></TableCell>
                    <TableCell className="max-w-xs truncate">{m.mission_name}</TableCell>
                    <TableCell>{m.activity_date}</TableCell>
                    <TableCell>{m.governorate ?? "—"}</TableCell>
                    <TableCell>{m.supervisor ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={m.is_canceled ? "canceled" : m.status} /></TableCell>
                    <TableCell><Link to={`/missions/${m.id}`}><Button size="sm" variant="outline"><Eye className="w-4 h-4" /></Button></Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="youth">
          <Card className="card-elevated p-4 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead>
                <TableHead>التاريخ</TableHead><TableHead>الراصد</TableHead><TableHead>الحالة</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {youthRows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><code className="text-xs">{m.mission_code}</code></TableCell>
                    <TableCell className="max-w-xs truncate">{m.mission_name}</TableCell>
                    <TableCell>{m.activity_date}</TableCell>
                    <TableCell>{m.monitor_name ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={m.is_canceled ? "canceled" : m.status} /></TableCell>
                    <TableCell><Link to={`/missions/${m.id}`}><Button size="sm" variant="outline"><Eye className="w-4 h-4" /></Button></Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
