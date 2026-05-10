import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, MapPin, Hash, User, Shield, Plus, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface VolunteerBase {
  id: string;
  full_name: string;
  membership_number: string | null;
  branch: string | null;
  phone_number: string | null;
  national_id: string | null;
  created_at: string;
}

export default function BranchYouthDashboard() {
  const [volunteers, setVolunteers] = useState<VolunteerBase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [branchFilter, setBranchFilter] = useState("");
  const [memberIdFilter, setMemberIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  // New Volunteer Form
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [branch, setBranch] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("volunteers_base")
      .select("id, full_name, membership_number, branch, phone_number, national_id, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVolunteers(data as VolunteerBase[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      if (branchFilter && !v.branch?.includes(branchFilter)) return false;
      if (memberIdFilter && !v.membership_number?.includes(memberIdFilter)) return false;
      if (nameFilter && !v.full_name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      return true;
    });
  }, [volunteers, branchFilter, memberIdFilter, nameFilter]);

  const handleAddNew = async () => {
    if (!fullName.trim()) return toast.error("اسم المتطوع مطلوب");

    setBusy(true);
    const { error } = await supabase
      .from("volunteers_base")
      .insert({
        full_name: fullName,
        membership_number: memberId || null,
        branch: branch || null,
        phone_number: phone || null,
        national_id: nationalId || null
      });

    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم تسجيل المتطوع في القاعدة الأساسية بنجاح");
      setFullName(""); setMemberId(""); setBranch(""); setPhone(""); setNationalId("");
      setOpen(false);
      load();
    }
  };

  return (
    <AppLayout title="لوحة مسؤول الشباب بالفرع">
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-card/50 p-4 border border-primary/20 rounded-lg">
          <div>
            <h2 className="font-bold text-primary">تسجيل متطوعي الفروع</h2>
            <p className="text-sm text-muted-foreground">أضف المتطوعين الجدد إلى قاعدة البيانات الأساسية للمنظومة.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 ms-2" /> تسجيل متطوع جديد</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader><DialogTitle>تسجيل متطوع جديد في القاعدة</DialogTitle></DialogHeader>
              <div className="grid gap-4 mt-4">
                <div className="space-y-1.5"><Label>الاسم بالكامل *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>الفرع</Label><Input value={branch} onChange={e => setBranch(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>رقم العضوية</Label><Input value={memberId} onChange={e => setMemberId(e.target.value)} dir="ltr" /></div>
                <div className="space-y-1.5"><Label>رقم التليفون</Label><Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" /></div>
                <div className="space-y-1.5"><Label>الرقم القومي</Label><Input value={nationalId} onChange={e => setNationalId(e.target.value)} dir="ltr" /></div>
                <Button onClick={handleAddNew} disabled={busy} className="w-full mt-2"><Save className="w-4 h-4 ms-2" /> حفظ المتطوع</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-5 border-primary/20 bg-card/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالفرع..." value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="pr-9" />
          </div>
          <div className="relative flex-1">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث برقم العضوية..." value={memberIdFilter} onChange={e => setMemberIdFilter(e.target.value)} className="pr-9" />
          </div>
          <div className="relative flex-1">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="pr-9" />
          </div>
        </Card>

        <Card className="p-0 border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>رقم العضوية</TableHead>
                  <TableHead>رقم التليفون</TableHead>
                  <TableHead>تاريخ الإضافة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : filteredVolunteers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">لا يوجد متطوعين يطابقون شروط البحث</TableCell></TableRow>
                ) : (
                  filteredVolunteers.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold">{v.full_name}</TableCell>
                      <TableCell>{v.branch || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{v.membership_number || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{v.phone_number || "—"}</TableCell>
                      <TableCell>{new Date(v.created_at).toLocaleDateString("ar-EG")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>إجمالي المتطوعين: <strong>{filteredVolunteers.length}</strong></span>
            <div className="flex items-center gap-1 text-primary">
              <Shield className="w-4 h-4" />
              <span>تسجيل مباشر إلى القاعدة الأساسية</span>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
