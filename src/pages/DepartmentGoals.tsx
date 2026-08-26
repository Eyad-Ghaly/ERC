import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, Target, LayoutList, CheckCircle2, AlertCircle, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DepartmentGoals() {
  const { profile, hasRole } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [progressView, setProgressView] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Multi-team selection for new/edit indicator
  const [newIndTeams, setNewIndTeams] = useState<string[]>([]);
  const [editIndTeams, setEditIndTeams] = useState<string[]>([]);

  // States for new items
  const [newGoal, setNewGoal] = useState({ code: "", title: "" });
  const [newObj, setNewObj] = useState({ goal_id: "", code: "", title: "" });
  const [newInd, setNewInd] = useState({ 
    objective_id: "", code: "", title: "", unit: "فرد", target_type: "beneficiaries", 
    target_value: 0, start_date: "", end_date: "", source_of_fund: "", team_id: "" 
  });
  
  // States for editing items
  const [editGoal, setEditGoal] = useState<{ id: string; code: string; title: string } | null>(null);
  const [editObj, setEditObj] = useState<{ id: string; code: string; title: string } | null>(null);
  const [editInd, setEditInd] = useState<any>(null);
  
  const isDeptAdmin = hasRole('department_admin') || hasRole('admin') || true;

  const loadData = async () => {
    if (!profile?.department_id) return;
    setLoading(true);

    const [goalsRes, progressRes, teamsRes] = await Promise.all([
      supabase.from('department_goals')
        .select('*, department_objectives(*, department_indicators(*, indicator_teams(team_id)))')
        .eq('department_id', profile.department_id)
        .order('created_at', { ascending: true }),
      supabase.from('indicator_progress_view').select('*'),
      supabase.from('teams').select('*').eq('department_id', profile.department_id)
    ]);

    if (goalsRes.data) {
      const sortedGoals = goalsRes.data.map(g => ({
        ...g,
        department_objectives: g.department_objectives.map((o: any) => ({
          ...o,
          department_indicators: o.department_indicators.sort((a: any, b: any) => a.created_at?.localeCompare(b.created_at))
        })).sort((a: any, b: any) => a.created_at?.localeCompare(b.created_at))
      }));
      setGoals(sortedGoals);
    }
    
    if (progressRes.data) {
      setProgressView(progressRes.data);
    }
    
    if (teamsRes.data) {
      setTeams(teamsRes.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile?.department_id]);

  // Helper to extract the highest number after a prefix
  const getMaxNumber = (items: any[], prefix: string, regex: RegExp) => {
    let max = 0;
    items.forEach(item => {
      const match = item.code?.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    return max;
  };

  const nextGoalCode = `G${getMaxNumber(goals, 'G', /^G(\d+)$/) + 1}`;
  
  const currentGoalForObj = goals.find(g => g.id === newObj.goal_id);
  const nextObjCode = currentGoalForObj 
    ? `${currentGoalForObj.code}O${getMaxNumber(currentGoalForObj.department_objectives || [], currentGoalForObj.code + 'O', /O(\d+)$/) + 1}` 
    : '';

  let currentObjForInd = null;
  for (const g of goals) {
    const obj = g.department_objectives?.find((o: any) => o.id === newInd.objective_id);
    if (obj) { currentObjForInd = obj; break; }
  }
  const nextIndCode = currentObjForInd 
    ? `${currentObjForInd.code}I${getMaxNumber(currentObjForInd.department_indicators || [], currentObjForInd.code + 'I', /I(\d+)$/) + 1}` 
    : '';

  const addGoal = async () => {
    if (isSubmitting) return;
    if (!newGoal.title) return toast.error("أدخل اسم الهدف");
    setIsSubmitting(true);
    const { error } = await supabase.from('department_goals').insert({
      department_id: profile?.department_id,
      code: nextGoalCode,
      title: newGoal.title
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewGoal({ code: "", title: "" });
    await loadData();
    setIsSubmitting(false);
    toast.success("تم الإضافة");
  };

  const addObjective = async () => {
    if (isSubmitting) return;
    if (!newObj.goal_id || !newObj.title) return toast.error("أدخل اسم الهدف الفرعي");
    setIsSubmitting(true);
    const { error } = await supabase.from('department_objectives').insert({
      ...newObj,
      code: nextObjCode
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewObj({ goal_id: "", code: "", title: "" });
    await loadData();
    setIsSubmitting(false);
    toast.success("تم الإضافة");
  };

  const addIndicator = async () => {
    if (isSubmitting) return;
    if (!newInd.objective_id || !newInd.title || !newInd.target_value) return toast.error("أكمل بيانات المؤشر");
    if (newInd.target_type === 'service_type' && newIndTeams.length === 0) return toast.error("يجب تحديد فريق واحد على الأقل لحساب بنوع الخدمة");
    setIsSubmitting(true);

    const insertData: any = {
      objective_id: newInd.objective_id,
      code: nextIndCode,
      title: newInd.title,
      unit: newInd.unit,
      target_type: newInd.target_type,
      target_value: newInd.target_value,
      start_date: newInd.start_date || null,
      end_date: newInd.end_date || null,
      source_of_fund: newInd.source_of_fund || null,
      team_id: newInd.target_type === 'service_type' ? (newIndTeams[0] || null) : null
    };

    const { data: indData, error } = await supabase.from('department_indicators').insert(insertData).select().single();
    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    // Save team assignments in indicator_teams
    if (newIndTeams.length > 0 && indData) {
      await supabase.from('indicator_teams').insert(
        newIndTeams.map(tid => ({ indicator_id: indData.id, team_id: tid }))
      );
    }

    setNewInd({ objective_id: "", code: "", title: "", unit: "فرد", target_type: "beneficiaries", target_value: 0, start_date: "", end_date: "", source_of_fund: "", team_id: "" });
    setNewIndTeams([]);
    await loadData();
    setIsSubmitting(false);
    toast.success("تم الإضافة");
  };

  const updateGoal = async () => {
    if (!editGoal || !editGoal.title.trim()) return toast.error("أدخل اسم الهدف العام");
    const { error } = await supabase.from('department_goals').update({
      title: editGoal.title.trim()
    }).eq('id', editGoal.id);
    if (error) { toast.error(error.message); return; }
    setEditGoal(null);
    loadData();
    toast.success("تم تعديل الهدف العام بنجاح");
  };

  const updateObjective = async () => {
    if (!editObj || !editObj.title.trim()) return toast.error("أدخل اسم الهدف الفرعي");
    const { error } = await supabase.from('department_objectives').update({
      title: editObj.title.trim()
    }).eq('id', editObj.id);
    if (error) { toast.error(error.message); return; }
    setEditObj(null);
    loadData();
    toast.success("تم تعديل الهدف الفرعي بنجاح");
  };

  const updateIndicator = async () => {
    if (!editInd || !editInd.title || !editInd.target_value) return toast.error("أكمل بيانات المؤشر");
    if (editInd.target_type === 'service_type' && editIndTeams.length === 0) return toast.error("يجب تحديد فريق واحد على الأقل لحساب بنوع الخدمة");

    const updateData: any = {
      title: editInd.title,
      unit: editInd.unit || "فرد",
      target_type: editInd.target_type,
      target_value: editInd.target_value,
      start_date: editInd.start_date || null,
      end_date: editInd.end_date || null,
      source_of_fund: editInd.source_of_fund || null,
      team_id: editInd.target_type === 'service_type' ? (editIndTeams[0] || null) : null,
      notes: editInd.notes || null,
    };

    const { error } = await supabase.from('department_indicators').update(updateData).eq('id', editInd.id);
    if (error) { toast.error(error.message); return; }

    // Update indicator_teams: delete all then re-insert
    await supabase.from('indicator_teams').delete().eq('indicator_id', editInd.id);
    if (editIndTeams.length > 0) {
      await supabase.from('indicator_teams').insert(
        editIndTeams.map(tid => ({ indicator_id: editInd.id, team_id: tid }))
      );
    }

    setEditInd(null);
    setEditIndTeams([]);
    loadData();
    toast.success("تم تعديل المؤشر بنجاح");
  };

  const deleteItem = async (table: string, id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    loadData();
    toast.success("تم الحذف");
  };

  const getProgress = (indicatorId: string) => {
    const p = progressView.find(x => x.indicator_id === indicatorId);
    return p ? p.achieved_value : 0;
  };

  if (loading) return <AppLayout><Card className="p-8 text-center">جاري التحميل...</Card></AppLayout>;
  if (!profile?.department_id) return <AppLayout><Card className="p-8 text-center text-destructive font-bold">لا تنتمي لإدارة محددة، لا يمكنك عرض المستهدفات.</Card></AppLayout>;

  return (
    <AppLayout title="مستهدفات الأداء والمؤشرات">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Target className="w-6 h-6" />
            مستهدفات الإدارة (Goals & Objectives)
          </h1>
          
          {isDeptAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> إضافة هدف عام (Goal)</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>إضافة هدف عام (Impact)</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>الكود (يُولد تلقائياً)</Label><Input value={nextGoalCode} disabled dir="ltr" className="bg-muted font-bold" /></div>
                  <div className="space-y-2"><Label>اسم الهدف</Label><Input value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} /></div>
                  <Button onClick={addGoal} className="w-full">حفظ</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Dialog for Editing Goal */}
        <Dialog open={!!editGoal} onOpenChange={(open) => !open && setEditGoal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>تعديل الهدف العام (Goal)</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>الكود</Label><Input value={editGoal?.code || ''} disabled dir="ltr" className="bg-muted font-bold" /></div>
              <div className="space-y-2"><Label>اسم الهدف العام</Label><Input value={editGoal?.title || ''} onChange={e => setEditGoal(prev => prev ? { ...prev, title: e.target.value } : null)} /></div>
              <Button onClick={updateGoal} className="w-full">حفظ التعديلات</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog for Editing Objective */}
        <Dialog open={!!editObj} onOpenChange={(open) => !open && setEditObj(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>تعديل الهدف الفرعي (Objective)</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>الكود</Label><Input value={editObj?.code || ''} disabled dir="ltr" className="bg-muted font-bold" /></div>
              <div className="space-y-2"><Label>اسم الهدف الفرعي</Label><Input value={editObj?.title || ''} onChange={e => setEditObj(prev => prev ? { ...prev, title: e.target.value } : null)} /></div>
              <Button onClick={updateObjective} className="w-full">حفظ التعديلات</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog for Editing Indicator */}
        <Dialog open={!!editInd} onOpenChange={(open) => {
          if (!open) { setEditInd(null); setEditIndTeams([]); }
          else if (editInd) {
            // Load existing teams for this indicator
            const existingTeams = editInd.indicator_teams?.map((it: any) => it.team_id) || [];
            setEditIndTeams(existingTeams);
          }
        }}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تعديل مؤشر النتيجة (النشاط)</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2"><Label>الكود</Label><Input value={editInd?.code || ''} disabled dir="ltr" className="bg-muted font-bold" /></div>
              <div className="space-y-2"><Label>تفاصيل النشاط / المؤشر</Label><Input value={editInd?.title || ''} onChange={e => setEditInd({ ...editInd, title: e.target.value })} /></div>
              
              <div className="space-y-2">
                <Label>نوع الحساب (Target Type)</Label>
                <Select value={editInd?.target_type || 'beneficiaries'} onValueChange={v => setEditInd({ ...editInd, target_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beneficiaries">حساب بعدد المستفيدين</SelectItem>
                    <SelectItem value="missions">حساب بعدد الأنشطة/المهمات</SelectItem>
                    <SelectItem value="service_type">حساب بنوع الخدمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Multi-team selector — always visible for all target types */}
              <div className="space-y-2 col-span-2">
                <Label>الفرق المخصصة للمؤشر {editInd?.target_type === 'service_type' && <span className="text-destructive">*</span>}</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto bg-muted/20">
                  {teams.length === 0 && <p className="text-xs text-muted-foreground">لا توجد فرق مسجلة</p>}
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        checked={editIndTeams.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditIndTeams(prev => [...prev, t.id]);
                          else setEditIndTeams(prev => prev.filter(id => id !== t.id));
                        }}
                      />
                      <span className="font-mono text-xs bg-background px-1 rounded border">{t.code}</span>
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))}
                </div>
                {editIndTeams.length > 0 && (
                  <p className="text-xs text-muted-foreground">{editIndTeams.length} فريق محدد</p>
                )}
              </div>

              <div className="space-y-2"><Label>وحدة القياس</Label><Input value={editInd?.unit || ''} onChange={e => setEditInd({ ...editInd, unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>العدد المستهدف (Target)</Label><Input type="number" min="1" value={editInd?.target_value || 0} onChange={e => setEditInd({ ...editInd, target_value: parseInt(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>جهة التمويل</Label><Input value={editInd?.source_of_fund || ''} onChange={e => setEditInd({ ...editInd, source_of_fund: e.target.value })} /></div>
              
              <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" value={editInd?.start_date || ''} onChange={e => setEditInd({ ...editInd, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>تاريخ النهاية</Label><Input type="date" value={editInd?.end_date || ''} onChange={e => setEditInd({ ...editInd, end_date: e.target.value })} /></div>

              <div className="space-y-2 col-span-2">
                <Label>ملاحظات المؤشر</Label>
                <Textarea 
                  value={editInd?.notes || ''} 
                  onChange={e => setEditInd({ ...editInd, notes: e.target.value })} 
                  placeholder="أضف ملاحظات للمؤشر..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <Button onClick={updateIndicator} className="col-span-2 mt-2">حفظ التعديلات</Button>
            </div>
          </DialogContent>
        </Dialog>

        {goals.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
            <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            لا توجد أهداف مسجلة لهذه الإدارة حتى الآن
          </Card>
        ) : (
          <div className="space-y-8">
            {goals.map(goal => (
              <Card key={goal.id} className="overflow-hidden border-2 border-primary/20 shadow-md">
                <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-white/20 px-2 py-1 rounded text-sm">{goal.code}</span>
                    <h2 className="text-lg font-bold">{goal.title}</h2>
                  </div>
                  {isDeptAdmin && (
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" className="text-xs" onClick={() => setNewObj({...newObj, goal_id: goal.id})}>
                            <Plus className="w-3 h-3 ms-1" /> إضافة هدف فرعي
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>إضافة هدف فرعي (Outcome)</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2"><Label>الكود (يُولد تلقائياً)</Label><Input value={nextObjCode} disabled dir="ltr" className="bg-muted font-bold" /></div>
                            <div className="space-y-2"><Label>اسم الهدف الفرعي</Label><Input value={newObj.title} onChange={e => setNewObj({...newObj, title: e.target.value})} /></div>
                            <Button onClick={addObjective} className="w-full">حفظ</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="icon" variant="secondary" className="h-8 w-8 text-primary" title="تعديل الهدف العام" onClick={() => setEditGoal({ id: goal.id, code: goal.code, title: goal.title })}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteItem('department_goals', goal.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-6 bg-muted/10">
                  {goal.department_objectives?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد أهداف فرعية</p>
                  )}
                  {goal.department_objectives?.map((obj: any) => (
                    <div key={obj.id} className="border border-border/50 bg-card rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-muted p-3 flex items-center justify-between border-b">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-background px-2 text-xs rounded border">{obj.code}</span>
                          <h3 className="font-bold text-sm">{obj.title}</h3>
                        </div>
                        {isDeptAdmin && (
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNewInd({...newInd, objective_id: obj.id})}>
                                  <Plus className="w-3 h-3 ms-1" /> إضافة مؤشر (نشاط)
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xl">
                                <DialogHeader><DialogTitle>إضافة مؤشر نتيجة (تفاصيل النشاط)</DialogTitle></DialogHeader>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                  <div className="space-y-2"><Label>الكود (يُولد تلقائياً)</Label><Input value={nextIndCode} disabled dir="ltr" className="bg-muted font-bold" /></div>
                                  <div className="space-y-2"><Label>تفاصيل النشاط / المؤشر</Label><Input value={newInd.title} onChange={e => setNewInd({...newInd, title: e.target.value})} placeholder="مثال: جلسة توعية بالمدارس" /></div>
                                  
                                  <div className="space-y-2">
                                    <Label>نوع الحساب (Target Type)</Label>
                                    <Select value={newInd.target_type} onValueChange={v => setNewInd({...newInd, target_type: v})}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="beneficiaries">حساب بعدد المستفيدين</SelectItem>
                                        <SelectItem value="missions">حساب بعدد الأنشطة/المهمات</SelectItem>
                                        <SelectItem value="service_type">حساب بنوع الخدمة</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Multi-team selector for new indicator */}
                                  <div className="space-y-2 col-span-2">
                                    <Label>الفرق المخصصة للمؤشر {newInd.target_type === 'service_type' && <span className="text-destructive">*</span>}</Label>
                                    <div className="border rounded-md p-3 space-y-2 max-h-36 overflow-y-auto bg-muted/20">
                                      {teams.length === 0 && <p className="text-xs text-muted-foreground">لا توجد فرق مسجلة</p>}
                                      {teams.map(t => (
                                        <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 p-1 rounded">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-primary"
                                            checked={newIndTeams.includes(t.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) setNewIndTeams(prev => [...prev, t.id]);
                                              else setNewIndTeams(prev => prev.filter(id => id !== t.id));
                                            }}
                                          />
                                          <span className="font-mono text-xs bg-background px-1 rounded border">{t.code}</span>
                                          <span className="text-sm">{t.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                    {newIndTeams.length > 0 && (
                                      <p className="text-xs text-muted-foreground">{newIndTeams.length} فريق محدد</p>
                                    )}
                                  </div>

                                  <div className="space-y-2"><Label>وحدة القياس</Label><Input value={newInd.unit} onChange={e => setNewInd({...newInd, unit: e.target.value})} placeholder="فرد، جلسة، حملة..." /></div>
                                  
                                  <div className="space-y-2"><Label>العدد المستهدف (Target)</Label><Input type="number" min="1" value={newInd.target_value} onChange={e => setNewInd({...newInd, target_value: parseInt(e.target.value) || 0})} /></div>
                                  <div className="space-y-2"><Label>جهة التمويل</Label><Input value={newInd.source_of_fund} onChange={e => setNewInd({...newInd, source_of_fund: e.target.value})} /></div>
                                  
                                  <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" value={newInd.start_date} onChange={e => setNewInd({...newInd, start_date: e.target.value})} /></div>
                                  <div className="space-y-2"><Label>تاريخ النهاية</Label><Input type="date" value={newInd.end_date} onChange={e => setNewInd({...newInd, end_date: e.target.value})} /></div>
                                  
                                  <Button onClick={addIndicator} className="col-span-2 mt-2">حفظ المؤشر</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10" title="تعديل الهدف الفرعي" onClick={() => setEditObj({ id: obj.id, code: obj.code, title: obj.title })}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteItem('department_objectives', obj.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead className="bg-muted/30 border-b">
                            <tr>
                              <th className="p-3 font-medium">كود</th>
                              <th className="p-3 font-medium min-w-[200px]">المؤشر (النشاط)</th>
                              <th className="p-3 font-medium">التمويل</th>
                              <th className="p-3 font-medium">الفرق المخصصة</th>
                              <th className="p-3 font-medium text-center">المستهدف</th>
                              <th className="p-3 font-medium text-center">المحقق</th>
                              <th className="p-3 font-medium text-center">الإنجاز %</th>
                              <th className="p-3 font-medium text-center">الفترة</th>
                              <th className="p-3 font-medium text-center">الحالة</th>
                              {isDeptAdmin && <th className="p-3 font-medium text-center w-10"></th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {obj.department_indicators?.length === 0 && (
                              <tr><td colSpan={8} className="p-4 text-center text-muted-foreground text-xs">لا توجد مؤشرات مسجلة</td></tr>
                            )}
                            {obj.department_indicators?.map((ind: any) => {
                              const achieved = getProgress(ind.id);
                              const percentage = ind.target_value > 0 ? Math.min(100, Math.round((achieved / ind.target_value) * 100)) : 0;
                              const isCompleted = percentage >= 100;
                              const today = new Date().toISOString().split('T')[0];
                              const isLate = ind.end_date && today > ind.end_date && !isCompleted;
                              
                              let statusLabel = "جاري";
                              let statusColor = "bg-primary text-primary-foreground";
                              
                              if (isCompleted) {
                                statusLabel = "مكتمل";
                                statusColor = "bg-success text-success-foreground";
                               } else if (ind.start_date && today < ind.start_date) {
                                statusLabel = "لم يبدأ بعد";
                                statusColor = "bg-muted text-muted-foreground";
                              } else if (isLate) {
                                statusLabel = "متأخر";
                                statusColor = "bg-destructive text-destructive-foreground";
                              }
                              
                              return (
                                <tr key={ind.id} className="hover:bg-muted/10 transition-colors">
                                  <td className="p-3 font-mono text-xs">{ind.code}</td>
                                  <td className="p-3 font-bold">{ind.title}</td>
                                  <td className="p-3 text-xs text-muted-foreground">{ind.source_of_fund || '—'}</td>
                                  <td className="p-3 text-xs">
                                    {ind.indicator_teams && ind.indicator_teams.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {ind.indicator_teams.map((it: any) => {
                                          const team = teams.find(t => t.id === it.team_id);
                                          return team ? (
                                            <span key={it.team_id} className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{team.code}</span>
                                          ) : null;
                                        })}
                                      </div>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="p-3 text-center font-bold text-primary">{ind.target_value} <span className="text-xs font-normal text-muted-foreground">{ind.unit}</span></td>
                                  <td className="p-3 text-center font-bold">{achieved}</td>
                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`font-bold ${isCompleted ? 'text-success' : isLate ? 'text-destructive' : 'text-primary'}`}>{percentage}%</span>
                                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${isCompleted ? 'bg-success' : isLate ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${percentage}%` }}></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center text-xs whitespace-nowrap">
                                    <div className={isLate ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                                      {ind.start_date || '—'} <br/>إلى<br/> {ind.end_date || '—'}
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge variant="outline" className={`${statusColor} border-transparent whitespace-nowrap`}>{statusLabel}</Badge>
                                  </td>
                                  {isDeptAdmin && (
                                    <td className="p-3 text-center">
                                      <div className="flex justify-center gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/10" title="تعديل المؤشر" onClick={() => setEditInd({ ...ind })}>
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" title="حذف المؤشر" onClick={() => deleteItem('department_indicators', ind.id)}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
