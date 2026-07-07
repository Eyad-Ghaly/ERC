import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Upload } from "lucide-react";

export default function PublicSupplyForm() {
  const { public_link_uuid } = useParams();
  const [form, setForm] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [membershipNumber, setMembershipNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [isFoundInDB, setIsFoundInDB] = useState(false);
  const [volunteerId, setVolunteerId] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadForm = async () => {
      const { data: frm, error } = await supabase
        .from('supply_request_forms')
        .select('*, volunteer_supply_requests(*, departments(name))')
        .eq('public_link_uuid', public_link_uuid)
        .eq('is_active', true)
        .single();
      
      if (frm) {
        setForm(frm);
        setRequest(frm.volunteer_supply_requests);
      }
      setLoading(false);
    };
    if (public_link_uuid) loadForm();
  }, [public_link_uuid]);

  const checkMembership = async () => {
    if (!membershipNumber) return;
    setBusy(true);
    const { data } = await supabase
      .from('volunteers_base')
      .select('id, full_name, phone_number, national_id')
      .eq('membership_number', membershipNumber)
      .single();
    
    if (data) {
      setFullName(data.full_name || "");
      setPhone(data.phone_number || "");
      setNationalId(data.national_id || "");
      setIsFoundInDB(true);
      setVolunteerId(data.id);
      toast.success("تم سحب البيانات من قاعدة البيانات!");
    } else {
      setIsFoundInDB(false);
      setVolunteerId(null);
      toast.info("رقم العضوية غير مسجل. يرجى إكمال بياناتك يدوياً.");
    }
    setBusy(false);
  };

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('volunteer_applications')
      .upload(fileName, file);
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      toast.error("يرجى إكمال البيانات الأساسية");
      return;
    }
    
    setBusy(true);
    try {
      let cvPath = null;
      let photoPath = null;

      if (cvFile) cvPath = await uploadFile(cvFile, 'cvs');
      if (photoFile) photoPath = await uploadFile(photoFile, 'photos');

      const { error } = await supabase.from('supply_request_applications').insert({
        form_id: form.id,
        volunteer_id: volunteerId,
        applicant_data: {
          full_name: fullName,
          phone: phone,
          national_id: nationalId,
          membership_number: membershipNumber,
          is_found_in_db: isFoundInDB,
          cv_path: cvPath,
          photo_path: photoPath,
          custom_responses: customResponses
        }
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-8 text-center mt-20">جاري التحميل...</div>;
  if (!form) return <div className="p-8 text-center text-red-500 font-bold mt-20">الرابط غير صالح أو انتهت صلاحيته</div>;
  if (success) return (
    <div className="max-w-xl mx-auto p-8 text-center mt-20 space-y-4">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl">✓</div>
      <h2 className="text-2xl font-bold text-green-700">تم تسجيل طلبك بنجاح!</h2>
      <p className="text-muted-foreground">سيتم مراجعة طلبك والتواصل معك قريباً في حالة القبول.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <Card className="max-w-2xl w-full p-6 space-y-6 shadow-xl border-t-4 border-t-primary">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary">استمارة ترشح لمهمة تطوعية</h1>
          <h2 className="text-lg font-semibold">{request.role_name}</h2>
          <p className="text-sm text-muted-foreground">مطلوب بواسطة: {request.departments?.name || request.department_code}</p>
        </div>

        <div className="bg-primary/5 p-4 rounded text-sm space-y-2 border border-primary/20">
          <p><strong>تفاصيل المهمة:</strong> {request.duties}</p>
          <p><strong>الساعات المطلوبة:</strong> {request.hours_needed}</p>
          <p><strong>المهارات المطلوبة:</strong> {request.skills}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>رقم العضوية</Label>
            <div className="flex gap-2">
              <Input value={membershipNumber} onChange={(e) => setMembershipNumber(e.target.value)} placeholder="أدخل رقم عضويتك" />
              <Button type="button" onClick={checkMembership} disabled={busy || !membershipNumber} variant="secondary">استعلام</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الرباعي *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isFoundInDB} required />
            </div>
            <div className="space-y-2">
              <Label>رقم التليفون (واتساب) *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isFoundInDB} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الرقم القومي</Label>
            <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} disabled={isFoundInDB} />
          </div>

          {form.form_schema?.allow_cv && (
            <div className="space-y-2 border-t pt-4">
              <Label>السيرة الذاتية (CV)</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={(e) => setCvFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx" className="cursor-pointer" />
              </div>
            </div>
          )}

          {form.form_schema?.allow_photo && (
            <div className="space-y-2">
              <Label>صورة شخصية / كارنيه التطوع</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} accept="image/*" className="cursor-pointer" />
              </div>
            </div>
          )}

          {form.form_schema?.custom_fields?.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-bold text-lg">أسئلة إضافية</h3>
              {form.form_schema.custom_fields.map((field: any) => (
                <div key={field.id} className="space-y-2">
                  <Label>{field.label} {field.required && '*'}</Label>
                  {field.type === 'textarea' ? (
                    <textarea 
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={customResponses[field.id] || ''}
                      onChange={(e) => setCustomResponses({...customResponses, [field.id]: e.target.value})}
                      required={field.required}
                    />
                  ) : (
                    <Input 
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={customResponses[field.id] || ''}
                      onChange={(e) => setCustomResponses({...customResponses, [field.id]: e.target.value})}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full mt-4 bg-primary text-white font-bold h-12">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال طلب الترشح"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
