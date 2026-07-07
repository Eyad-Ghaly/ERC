import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function YouthSupplyReview() {
  const { form_id } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    
    // Load form and request details
    const { data: form } = await supabase
      .from('supply_request_forms')
      .select('*, volunteer_supply_requests(*, departments(name))')
      .eq('id', form_id)
      .single();
      
    if (form) setRequest(form.volunteer_supply_requests);

    // Load applications
    const { data: apps } = await supabase
      .from('supply_request_applications')
      .select('*')
      .eq('form_id', form_id)
      .order('created_at', { ascending: true });
      
    if (apps) setApplications(apps);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [form_id]);

  const updateYouthStatus = async (appId: string, status: string, notes: string) => {
    const { error } = await supabase
      .from('supply_request_applications')
      .update({ youth_status: status, youth_notes: notes })
      .eq('id', appId);
      
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم التحديث");
      setApplications(apps => apps.map(a => a.id === appId ? { ...a, youth_status: status, youth_notes: notes } : a));
    }
  };

  const sendToTeam = async () => {
    setBusy(true);
    // Move request status to sent_to_team
    const { error } = await supabase
      .from('volunteer_supply_requests')
      .update({ status: 'sent_to_team' })
      .eq('id', request.id);
      
    if (error) toast.error(error.message);
    else {
      toast.success("تم إرسال المقبولين إلى الإدارة الطالبة بنجاح");
      navigate('/youth-supply-requests');
    }
    setBusy(false);
  };

  if (loading) return <AppLayout><Card className="p-8">جاري التحميل...</Card></AppLayout>;

  return (
    <AppLayout title="مراجعة المتقدمين (الشباب)">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">فرز المتقدمين: {request?.role_name}</h1>
            <p className="text-muted-foreground">الإدارة: {request?.departments?.name}</p>
          </div>
          <Button onClick={sendToTeam} disabled={busy || applications.length === 0} className="bg-primary text-white font-bold">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "إنهاء الفرز وإرسال للفريق"}
          </Button>
        </div>

        <div className="space-y-4">
          {applications.map(app => {
            const data = app.applicant_data;
            const [localNotes, setLocalNotes] = useState(app.youth_notes || "");
            
            return (
              <Card key={app.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-4">
                  <h3 className="font-bold text-lg">{data.full_name}</h3>
                  <p className="text-sm">رقم العضوية: {data.membership_number || "غير مسجل"} {!data.is_found_in_db && "(غير متواجد بالقاعدة)"}</p>
                  <p className="text-sm">التليفون: {data.phone}</p>
                  <div className="flex gap-2 mt-2">
                    {data.cv_path && <a href={`${supabase.storage.from('volunteer_applications').getPublicUrl(data.cv_path).data.publicUrl}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">عرض الـ CV</a>}
                    {data.photo_path && <a href={`${supabase.storage.from('volunteer_applications').getPublicUrl(data.photo_path).data.publicUrl}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">عرض الصورة</a>}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-5">
                  <Input 
                    placeholder="ملاحظات إدارة الشباب..." 
                    value={localNotes} 
                    onChange={e => setLocalNotes(e.target.value)}
                    onBlur={() => { if(localNotes !== app.youth_notes) updateYouthStatus(app.id, app.youth_status, localNotes); }}
                  />
                </div>

                <div className="col-span-12 md:col-span-3 flex justify-end gap-2">
                  <Button 
                    variant={app.youth_status === 'accepted' ? 'default' : 'outline'} 
                    className={app.youth_status === 'accepted' ? 'bg-green-600 text-white' : ''}
                    onClick={() => updateYouthStatus(app.id, 'accepted', localNotes)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> مقبول للترشيح
                  </Button>
                  <Button 
                    variant={app.youth_status === 'rejected' ? 'default' : 'outline'} 
                    className={app.youth_status === 'rejected' ? 'bg-red-600 text-white' : ''}
                    onClick={() => updateYouthStatus(app.id, 'rejected', localNotes)}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> مستبعد
                  </Button>
                </div>
              </Card>
            );
          })}
          {applications.length === 0 && <p className="text-muted-foreground">لا يوجد متقدمين حتى الآن</p>}
        </div>
      </div>
    </AppLayout>
  );
}
