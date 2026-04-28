import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { VolunteerPicker, VolunteerData } from "./VolunteerPicker";

interface AddVolunteerDialogProps {
  teamCode: string;
  onAdded: () => void;
}

export function AddVolunteerDialog({ teamCode, onAdded }: AddVolunteerDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // New Volunteer state
  const [fullName, setFullName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [branch, setBranch] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  
  // Existing Volunteer state
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerData | null>(null);

  const handleAddExisting = async () => {
    if (!selectedVolunteer) return toast.error("الرجاء اختيار متطوع");
    
    setBusy(true);
    // Check if already in team
    const { data: existing } = await supabase
      .from("volunteer_teams")
      .select("id")
      .eq("volunteer_id", selectedVolunteer.id)
      .eq("team_code", teamCode)
      .single();

    if (existing) {
      setBusy(false);
      return toast.error("هذا المتطوع مضاف بالفعل إلى الفريق");
    }

    const { error } = await supabase.from("volunteer_teams").insert({
      volunteer_id: selectedVolunteer.id,
      team_code: teamCode,
      join_date: new Date().toISOString().split('T')[0],
      is_approved: false
    });

    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إرسال طلب إضافة المتطوع للفريق وهو قيد الاعتماد");
      setOpen(false);
      onAdded();
    }
  };

  const handleAddNew = async () => {
    if (!fullName.trim()) return toast.error("اسم المتطوع مطلوب");
    
    setBusy(true);
    // 1. Insert into base
    const { data: newVol, error: baseError } = await supabase
      .from("volunteers_base")
      .insert({
        full_name: fullName,
        membership_number: memberId || null,
        branch: branch || null,
        phone_number: phone || null,
        national_id: nationalId || null
      })
      .select()
      .single();

    if (baseError || !newVol) {
      setBusy(false);
      return toast.error(baseError?.message || "فشل إضافة المتطوع للقاعدة");
    }

    // 2. Insert into teams
    const { error: teamError } = await supabase.from("volunteer_teams").insert({
      volunteer_id: newVol.id,
      team_code: teamCode,
      join_date: new Date().toISOString().split('T')[0],
      is_approved: false
    });

    setBusy(false);
    if (teamError) {
      toast.error(teamError.message);
    } else {
      toast.success("تم تسجيل المتطوع وإرسال طلب الانضمام للاعتماد");
      setFullName(""); setMemberId(""); setBranch(""); setPhone(""); setNationalId("");
      setOpen(false);
      onAdded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 ms-2"/> إضافة متطوع للفريق</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>إضافة متطوع إلى فريق ({teamCode})</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="existing" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="existing"><Search className="w-4 h-4 ml-2"/> من قاعدة البيانات</TabsTrigger>
            <TabsTrigger value="new"><Plus className="w-4 h-4 ml-2"/> متطوع جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/30">
              <p className="text-sm text-muted-foreground mb-4">ابحث عن متطوع مسجل مسبقاً في قاعدة بيانات المتطوعين لضمه لفريقك.</p>
              <VolunteerPicker onSelect={setSelectedVolunteer} />
              <Button onClick={handleAddExisting} disabled={busy || !selectedVolunteer} className="w-full mt-6">إرسال طلب انضمام</Button>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5"><Label>الاسم بالكامل *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>الفرع</Label><Input value={branch} onChange={e => setBranch(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>رقم العضوية</Label><Input value={memberId} onChange={e => setMemberId(e.target.value)} dir="ltr"/></div>
              <div className="space-y-1.5"><Label>رقم التليفون</Label><Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr"/></div>
              <div className="space-y-1.5"><Label>الرقم القومي</Label><Input value={nationalId} onChange={e => setNationalId(e.target.value)} dir="ltr"/></div>
            </div>
            <Button onClick={handleAddNew} disabled={busy} className="w-full mt-4">تسجيل وإضافة للفريق</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
