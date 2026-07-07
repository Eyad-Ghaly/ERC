import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Link as LinkIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

export default function YouthSupplyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Form Builder State
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [allowCv, setAllowCv] = useState(true);
  const [allowPhoto, setAllowPhoto] = useState(true);
  const [customFields, setCustomFields] = useState<any[]>([]);

  const openFormBuilder = (req: any) => {
    setSelectedReq(req);
    setAllowCv(true);
    setAllowPhoto(true);
    setCustomFields([]);
    setIsFormBuilderOpen(true);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Math.random().toString(), label: "", type: "text", required: false }]);
  };

  const updateCustomField = (id: string, key: string, value: any) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const loadData = async () => {
    setLoading(true);
    const { data: reqs, error: reqErr } = await supabase
      .from('volunteer_supply_requests')
      .select('*, teams(name), departments(name)')
      .in('status', ['pending_youth', 'form_created', 'sent_to_team', 'closed'])
      .order('created_at', { ascending: false });
      
    if (reqErr) {
      toast.error("خطأ في جلب الطلبات: " + reqErr.message);
      console.error(reqErr);
    }
    
    if (reqs) setRequests(reqs);

    const { data: frm, error: frmErr } = await supabase
      .from('supply_request_forms')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (frmErr) {
      console.error(frmErr);
      toast.error("خطأ في جلب النماذج: " + frmErr.message);
    }
    
    if (frm) {
      // Fetch applications separately to avoid PostgREST relationship ambiguity
      const formIds = frm.map((f: any) => f.id);
      if (formIds.length > 0) {
        const { data: apps } = await supabase
          .from('supply_request_applications')
          .select('id, form_id, youth_status')
          .in('form_id', formIds);
          
        const formsWithApps = frm.map((f: any) => ({
          ...f,
          supply_request_applications: apps?.filter((a: any) => a.form_id === f.id) || []
        }));
        setForms(formsWithApps);
      } else {
        setForms(frm);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitFormBuilder = async () => {
    if (!selectedReq) return;
    setBusy(true);
    
    // Clean up custom fields before saving
    const cleanedFields = customFields.filter(f => f.label.trim() !== "").map(({ id, ...rest }) => rest);
    
    const { error: insertErr } = await supabase.from('supply_request_forms').insert({
      request_id: selectedReq.id,
      form_schema: { allow_cv: allowCv, allow_photo: allowPhoto, custom_fields: cleanedFields },
      created_by: user?.id
    });

    if (insertErr) {
      toast.error("خطأ في إنشاء الفورم: " + insertErr.message);
    } else {
      const { error: updateErr } = await supabase
        .from('volunteer_supply_requests')
        .update({ status: 'form_created' })
        .eq('id', selectedReq.id);
        
      if (updateErr) {
        toast.error("خطأ في تحديث حالة الطلب: " + updateErr.message);
      } else {
        toast.success("تم إنشاء رابط التقديم بنجاح");
        setIsFormBuilderOpen(false);
        await loadData();
      }
    }
    setBusy(false);
  };

  if (loading) return <AppLayout><Card className="p-8">جاري التحميل...</Card></AppLayout>;

  return (
    <AppLayout title="إدارة طلبات الإمداد (الشباب)">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">إدارة طلبات الإمداد بالمتطوعين</h1>

        <div className="space-y-4">
          <h2 className="text-xl font-bold border-b pb-2">الطلبات الواردة من الإدارات</h2>
          {requests.filter(r => r.status === 'pending_youth').length === 0 && (
            <p className="text-muted-foreground">لا توجد طلبات جديدة</p>
          )}
          {requests.filter(r => r.status === 'pending_youth').map(req => (
            <Card key={req.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-lg">{req.role_name}</h3>
                <p className="text-sm text-muted-foreground">الإدارة: {req.departments?.name || req.department_code} | العدد المطلوب: {req.vol_count}</p>
                <p className="text-sm">تاريخ البداية: {req.start_date}</p>
              </div>
              <Button onClick={() => openFormBuilder(req)} disabled={busy} className="bg-primary text-white">
                <Plus className="w-4 h-4 ml-2" /> إنشاء فورم التقديم
              </Button>
            </Card>
          ))}
        </div>

        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-bold border-b pb-2">النماذج النشطة (قيد التقديم)</h2>
          {forms.map(form => {
            const req = requests.find(r => r.id === form.request_id);
            if (!req) return null;
            const link = `${window.location.origin}/#/apply/${form.public_link_uuid}`;
            const applicantsCount = form.supply_request_applications?.length || 0;

            return (
              <Card key={form.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-primary">فورم تقديم: {req.role_name}</h3>
                    <p className="text-sm text-muted-foreground">الإدارة: {req.departments?.name || req.department_code}</p>
                  </div>
                  <div className="bg-muted px-3 py-1 rounded text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4" /> {applicantsCount} متقدم
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast.success("تم نسخ الرابط");
                  }}>
                    <LinkIcon className="w-4 h-4 ml-2" /> نسخ رابط التقديم
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.open(`/#/youth-supply-review/${form.id}`, '_blank')}>
                    فرز ومراجعة المتقدمين
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={isFormBuilderOpen} onOpenChange={setIsFormBuilderOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تصميم فورم التقديم لـ {selectedReq?.role_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex gap-4 border-b pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={allowCv} onChange={(e) => setAllowCv(e.target.checked)} className="w-4 h-4" />
                <span>السماح برفع السيرة الذاتية (CV)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={allowPhoto} onChange={(e) => setAllowPhoto(e.target.checked)} className="w-4 h-4" />
                <span>السماح برفع صورة شخصية</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">الأسئلة الإضافية المخصصة</h3>
                <Button variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة سؤال
                </Button>
              </div>

              {customFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لم يتم إضافة أي أسئلة مخصصة. الفورم سيحتوي على البيانات الأساسية فقط.</p>
              )}

              {customFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start bg-muted/50 p-3 rounded-lg border">
                  <div className="flex-1 space-y-3">
                    <input 
                      type="text" 
                      placeholder="نص السؤال (مثال: هل تمتلك رخصة قيادة؟)" 
                      className="w-full p-2 border rounded text-sm"
                      value={field.label}
                      onChange={(e) => updateCustomField(field.id, 'label', e.target.value)}
                    />
                    <div className="flex gap-4">
                      <select 
                        className="p-2 border rounded text-sm bg-white"
                        value={field.type}
                        onChange={(e) => updateCustomField(field.id, 'type', e.target.value)}
                      >
                        <option value="text">نص قصير</option>
                        <option value="number">رقم</option>
                        <option value="textarea">نص طويل</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={field.required} 
                          onChange={(e) => updateCustomField(field.id, 'required', e.target.checked)} 
                        />
                        إجباري
                      </label>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => removeCustomField(field.id)}>حذف</Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t gap-3">
              <Button variant="outline" onClick={() => setIsFormBuilderOpen(false)}>إلغاء</Button>
              <Button onClick={submitFormBuilder} disabled={busy || customFields.some(f => !f.label.trim())}>
                {busy && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ وإنشاء الرابط
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
