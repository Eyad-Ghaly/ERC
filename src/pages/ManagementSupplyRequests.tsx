import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ManagementSupplyRequests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('volunteer_supply_requests')
      .select('*, teams(name, code), departments(name, code)')
      .order('created_at', { ascending: false });
      
    if (profile?.department_id) {
      query = query.eq('department_id', profile.department_id);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("خطأ في جلب الطلبات: " + error.message);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [profile?.department_id]);

  const approveRequest = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase
      .from('volunteer_supply_requests')
      .update({ status: 'pending_youth' })
      .eq('id', id)
      .select();

    if (error) {
      toast.error(error.message);
    } else if (!data || data.length === 0) {
      toast.error("عفواً، لا تملك صلاحية الموافقة على هذا الطلب.");
    } else {
      toast.success("تمت الموافقة، وتم تحويل الطلب لإدارة الشباب");
      fetchRequests();
    }
    setBusyId(null);
  };

  return (
    <AppLayout title="إدارة طلبات الإمداد (للإدارة)">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة طلبات الإمداد الواردة من الفرق</h1>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">طلبات بانتظار موافقتك</h2>
              {requests.filter(r => r.status === 'pending_management').length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات جديدة بانتظار الموافقة</Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.filter(r => r.status === 'pending_management').map(req => (
                    <Card key={req.id} className="p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{req.role_name}</h3>
                          <Badge variant="outline">{req.status}</Badge>
                        </div>
                        <p className="text-sm">الفريق: {req.teams?.name || req.team_id}</p>
                        <p className="text-sm">العدد المطلوب: {req.vol_count} | ساعات العمل: {req.hours_needed}</p>
                        <p className="text-sm text-muted-foreground mt-2">{req.duties}</p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => approveRequest(req.id)} disabled={busyId === req.id} className="bg-success text-white">
                          {busyId === req.id ? <Loader2 className="w-4 h-4 animate-spin ms-2" /> : null}
                          موافقة وتحويل لإدارة الشباب
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-bold border-b pb-2">الطلبات السابقة (تم تحويلها)</h2>
              {requests.filter(r => r.status !== 'pending_management').length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات سابقة</Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.filter(r => r.status !== 'pending_management').map(req => (
                    <Card key={req.id} className="p-4 opacity-75">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{req.role_name}</h3>
                          <Badge variant="outline">{req.status}</Badge>
                        </div>
                        <p className="text-sm">الفريق: {req.teams?.name || req.team_id}</p>
                        <p className="text-sm">العدد المطلوب: {req.vol_count} | ساعات العمل: {req.hours_needed}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
