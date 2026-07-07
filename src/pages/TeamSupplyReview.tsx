import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function ApplicationCard({ app, updateManagementStatus }: { app: any, updateManagementStatus: (id: string, status: string, notes: string) => void }) {
  const data = app.applicant_data;
  const [localNotes, setLocalNotes] = useState(app.team_notes || "");
  
  return (
    <Card className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      <div className="col-span-12 md:col-span-4">
        <h3 className="font-bold text-lg">{data.full_name}</h3>
        <p className="text-sm">رقم العضوية: {data.membership_number || "غير مسجل"}</p>
        <p className="text-sm text-primary font-bold">تقييم الشباب: {app.youth_notes || "بدون ملاحظات"}</p>
      </div>

      <div className="col-span-12 md:col-span-5">
        <Input 
          placeholder="ملاحظات إدارة الفريق (سيراها المتقدم أو إدارة الشباب)..." 
          value={localNotes} 
          onChange={e => setLocalNotes(e.target.value)}
          onBlur={() => { if(localNotes !== app.team_notes) updateManagementStatus(app.id, app.management_status, localNotes); }}
        />
      </div>

      <div className="col-span-12 md:col-span-3 flex justify-end gap-2">
        <Button 
          variant={app.management_status === 'accepted' ? 'default' : 'outline'} 
          className={app.management_status === 'accepted' ? 'bg-green-600 text-white' : ''}
          onClick={() => updateManagementStatus(app.id, 'accepted', localNotes)}
        >
          <CheckCircle className="w-4 h-4 mr-1" /> قبول وضم
        </Button>
        <Button 
          variant={app.management_status === 'rejected' ? 'default' : 'outline'} 
          className={app.management_status === 'rejected' ? 'bg-red-600 text-white' : ''}
          onClick={() => updateManagementStatus(app.id, 'rejected', localNotes)}
        >
          <XCircle className="w-4 h-4 mr-1" /> رفض
        </Button>
      </div>
    </Card>
  );
}
export default function TeamSupplyReview() {
  const { request_id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [applications, setApplications] = useState<any[]>([]);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    
    // Load request details
    const { data: req } = await supabase
      .from('volunteer_supply_requests')
      .select('*, supply_request_forms(id)')
      .eq('id', request_id)
      .single();
      
    if (req) {
      setRequest(req);
      
      if (req.supply_request_forms?.[0]) {
        const formId = req.supply_request_forms[0].id;
        // Load applications sent by youth (youth_status = 'accepted')
        const { data: apps } = await supabase
          .from('supply_request_applications')
          .select('*')
          .eq('form_id', formId)
          .eq('youth_status', 'accepted')
          .order('created_at', { ascending: true });
          
        if (apps) setApplications(apps);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [request_id]);

  const updateManagementStatus = async (appId: string, status: string, notes: string) => {
    const { error } = await supabase
      .from('supply_request_applications')
      .update({ management_status: status, team_notes: notes })
      .eq('id', appId);
      
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم تحديث حالة القبول");
      setApplications(apps => apps.map(a => a.id === appId ? { ...a, management_status: status, team_notes: notes } : a));
    }
  };

  const finalizeAndClose = async () => {
    if (!profile?.team_id) return;
    setBusy(true);

    try {
      // Find all accepted applications that have a volunteer_id
      const acceptedApps = applications.filter(a => a.management_status === 'accepted' && a.volunteer_id);
      
      // Add them to volunteer_teams
      for (const app of acceptedApps) {
        // Check if already in team
        const { data: existing } = await supabase
          .from('volunteer_teams')
          .select('id')
          .eq('volunteer_id', app.volunteer_id)
          .eq('team_id', profile.team_id)
          .single();

        if (!existing) {
          await supabase.from('volunteer_teams').insert({
            volunteer_id: app.volunteer_id,
            team_id: profile.team_id,
            join_date: new Date().toISOString().split('T')[0],
            is_approved: true
          });
        }
      }

      // Close the request
      await supabase
        .from('volunteer_supply_requests')
        .update({ status: 'closed' })
        .eq('id', request.id);

      // Deactivate the form
      if (request.supply_request_forms?.[0]) {
        await supabase
          .from('supply_request_forms')
          .update({ is_active: false })
          .eq('id', request.supply_request_forms[0].id);
      }

      toast.success("تم الإغلاق وضم المتطوعين بنجاح!");
      navigate('/department-dashboard');
    } catch (err: any) {
      toast.error("حدث خطأ: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AppLayout><Card className="p-8">جاري التحميل...</Card></AppLayout>;
  if (!request) return <AppLayout><Card className="p-8">لم يتم العثور على الطلب</Card></AppLayout>;

  return (
    <AppLayout title="مراجعة مرشحي الإمداد (الفريق)">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">المرشحون لطلب: {request?.role_name}</h1>
            <p className="text-muted-foreground">مرسل من إدارة الشباب (العدد المطلوب: {request?.vol_count})</p>
          </div>
          <Button onClick={finalizeAndClose} disabled={busy} className="bg-primary text-white font-bold">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "إغلاق الطلب وضم المقبولين"}
          </Button>
        </div>

        <div className="space-y-4">
          {applications.map(app => (
            <ApplicationCard key={app.id} app={app} updateManagementStatus={updateManagementStatus} />
          ))}
          {applications.length === 0 && <p className="text-muted-foreground">لا يوجد مرشحين من إدارة الشباب حتى الآن</p>}
        </div>
      </div>
    </AppLayout>
  );
}
