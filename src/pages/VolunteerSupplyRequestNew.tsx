import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function VolunteerSupplyRequestNew() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [requestingDepartmentId, setRequestingDepartmentId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [requiredCount, setRequiredCount] = useState("");
  const [requiredHours, setRequiredHours] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [skills, setSkills] = useState("");
  const [requiresTravel, setRequiresTravel] = useState("no");
  const [shiftPeriod, setShiftPeriod] = useState("");
  const [busy, setBusy] = useState(false);

  

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from('departments').select('id, name, code');
      if (data) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingDepartmentId || !roleTitle || !startDate || !requiredCount || !requiredHours) {
      toast.error("يرجى تعبئة الحقول الإلزامية");
      return;
    }

    setBusy(true);
    try {
      if (!profile?.team_id || !profile?.department_id) {
        toast.error("لم يتم العثور على الفريق أو الإدارة الخاصة بك");
        setBusy(false);
        return;
      }

      const { error } = await supabase
        .from('volunteer_supply_requests')
        .insert({
          team_id: profile.team_id,
          department_id: profile.department_id,
          requesting_department_id: requestingDepartmentId,
          role_title: roleTitle,
          required_count: parseInt(requiredCount),
          start_date: startDate,
          required_hours: requiredHours,
          responsibilities: responsibilities,
          qualifications,
          skills,
          requires_travel: requiresTravel === 'yes',
          shift_period: shiftPeriod,
          status: 'pending_management',
          created_by: user?.id,
        });

      if (error) throw error;
      
      toast.success("تم إرسال طلب الإمداد للإدارة بنجاح");
      navigate("/dashboard"); // or to a list of requests
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال الطلب: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">طلب إمداد جديد بالمتطوعين</h1>
        </div>

        <Card className="p-6 border-t-4 border-t-primary">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-primary">نموذج طلب إمداد بمتطوعين</h2>
              <p className="text-sm text-muted-foreground">الهلال الأحمر المصري - إدارة الشباب وتنمية التطوع</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الإدارة التابع لها الفريق *</Label>
                <Select value={requestingDepartmentId} onValueChange={setRequestingDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الإدارة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاريخ تقديم الطلب</Label>
                <Input value={new Date().toLocaleDateString('en-GB')} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>مسمى الدور / المهمة *</Label>
                <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="مثال: متطوع خدمات صحية / إغاثة ميدانية" />
              </div>
              <div className="space-y-2">
                <Label>العدد المطلوب *</Label>
                <Input type="number" min="1" value={requiredCount} onChange={(e) => setRequiredCount(e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البداية *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>الساعات المطلوبة *</Label>
                <Input value={requiredHours} onChange={(e) => setRequiredHours(e.target.value)} placeholder="يومياً / أسبوعياً (مثال: 6 ساعات يومياً)" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>قائمة المسؤوليات والواجبات</Label>
              <Textarea value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} placeholder="اكتب المهام التفصيلية للمتطوع هنا..." className="min-h-[100px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المؤهلات المطلوبة</Label>
                <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="مثال: مؤهل عالي / طالب جامعة" />
              </div>
              <div className="space-y-2">
                <Label>المهارات المطلوبة</Label>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="مثال: إسعافات أولية / عمل جماعي" />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-primary flex items-center gap-2">تفاصيل فترة العمل</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>هل يتطلب العمل سفراً أو مبيتاً؟</Label>
                  <Select value={requiresTravel} onValueChange={setRequiresTravel}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>فترة الشفت</Label>
                  <Select value={shiftPeriod} onValueChange={setShiftPeriod}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="صباحية">صباحية</SelectItem>
                      <SelectItem value="مسائية">مسائية</SelectItem>
                      <SelectItem value="مبيت">مبيت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90 text-white">
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 ml-2" /> إرسال الطلب للإدارة
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                إلغاء
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
