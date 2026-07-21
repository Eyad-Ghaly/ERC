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

  // States for new items
  const [newGoal, setNewGoal] = useState({ code: "", title: "" });
  const [newObj, setNewObj] = useState({ goal_id: "", code: "", title: "" });
  const [newInd, setNewInd] = useState({ 
    objective_id: "", code: "", title: "", unit: "فرد", target_type: "beneficiaries", 
    target_value: 0, start_date: "", end_date: "", source_of_fund: "", team_id: "" 
  });
  
  const [editInd, setEditInd] = useState<any>(null);
  
  const isDeptAdmin = hasRole('department_admin') || hasRole('admin') || true;

  const loadData = async () => {
    if (!profile?.department_id) return;
    setLoading(true);

    const [goalsRes, progressRes, teamsRes] = await Promise.all([
      supabase.from('department_goals')
        .select('*, department_objectives(*, department_indicators(*))')
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

  const nextGoalCode = `G${goals.length + 1}`;
  
  const currentGoalForObj = goals.find(g => g.id === newObj.goal_id);
  const nextObjCode = currentGoalForObj ? `${currentGoalForObj.code}O${(currentGoalForObj.department_objectives?.length || 0) + 1}` : '';

  let currentObjForInd = null;
  for (const g of goals) {
    const obj = g.department_objectives?.find((o: any) => o.id === newInd.objective_id);
    if (obj) { currentObjForInd = obj; break; }
  }
  const nextIndCode = currentObjForInd ? `${currentObjForInd.code}I${(currentObjForInd.department_indicators?.length || 0) + 1}` : '';

  const addGoal = async () => {
    if (!newGoal.title) return toast.error("أدخل اسم الهدف");
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
    loadData();
    toast.success("تم الإضافة");
  };

  const addObjective = async () => {
    if (!newObj.goal_id || !newObj.title) return toast.error("أدخل اسم الهدف الفرعي");
    const { error } = await supabase.from('department_objectives').insert({
      ...newObj,
      code: nextObjCode
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewObj({ goal_id: "", code: "", title: "" });
    loadData();
    toast.success("تم الإضافة");
  };

  const addIndicator = async () => {
    if (!newInd.objective_id || !newInd.title || !newInd.target_value) return toast.error("أكمل بيانات المؤشر");
    if (newInd.target_type === 'service_type' && !newInd.team_id) return toast.error("يجب تحديد الفريق لحساب بنوع الخدمة");

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
      team_id: newInd.target_type === 'service_type' ? newInd.team_id : null
    };

    const { error } = await supabase.from('department_indicators').insert(insertData);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (newInd.target_type === 'service_type' && newInd.team_id) {
      await supabase.from('dropdown_options').insert({
        field_key: 'service_type',
        value: newInd.title,
        label: newInd.title,
        team_id: newInd.team_id,
        active: true
      });
    }

    setNewInd({ objective_id: "", code: "", title: "", unit: "فرد", target_type: "beneficiaries", target_value: 0, start_date: "", end_date: "", source_of_fund: "", team_id: "" });
    loadData();
    toast.success("تم الإضافة");
  };

  const updateIndicatorNotes = async () => {
    const { error } = await supabase.from('department_indicators').update({
      notes: editInd.notes
    }).eq('id', editInd.id);
    if (error) { toast.error(error.message); return; }
    setEditInd(null);
    loadData();
    toast.success("تم التحديث");
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

                                  {newInd.target_type === 'service_type' && (
                                    <div className="space-y-2">
                                      <Label>تخصيص للفريق *</Label>
                                      <Select value={newInd.team_id} onValueChange={v => setNewInd({...newInd, team_id: v})}>
                                        <SelectTrigger><SelectValue placeholder="اختر الفريق..." /></SelectTrigger>
                                        <SelectContent>
                                          {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  <div className="space-y-2"><Label>وحدة القياس</Label><Input value={newInd.unit} onChange={e => setNewInd({...newInd, unit: e.target.value})} placeholder="فرد، جلسة، حملة..." /></div>
                                  
                                  <div className="space-y-2"><Label>العدد المستهدف (Target)</Label><Input type="number" min="1" value={newInd.target_value} onChange={e => setNewInd({...newInd, target_value: parseInt(e.target.value) || 0})} /></div>
                                  <div className="space-y-2"><Label>جهة التمويل</Label><Input value={newInd.source_of_fund} onChange={e => setNewInd({...newInd, source_of_fund: e.target.value})} /></div>
                                  
                                  <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" value={newInd.start_date} onChange={e => setNewInd({...newInd, start_date: e.target.value})} /></div>
                                  <div className="space-y-2"><Label>تاريخ النهاية</Label><Input type="date" value={newInd.end_date} onChange={e => setNewInd({...newInd, end_date: e.target.value})} /></div>
                                  
                                  <Button onClick={addIndicator} className="col-span-2 mt-2">حفظ المؤشر</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteItem('department_objectives', obj.id)}>
                              <Trash2 className="w-3 h-3" />
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
                                        <Dialog open={!!editInd && editInd.id === ind.id} onOpenChange={(open) => !open && setEditInd(null)}>
                                          <DialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/10" onClick={() => setEditInd({...ind})}>
                                              <Edit className="w-3 h-3" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="text-right">
                                            <DialogHeader><DialogTitle>إضافة/تعديل ملاحظات</DialogTitle></DialogHeader>
                                            <div className="space-y-4 pt-4">
                                              <Textarea 
                                                value={editInd?.notes || ''} 
                                                onChange={e => setEditInd({...editInd, notes: e.target.value})} 
                                                placeholder="أضف ملاحظات للمؤشر..."
                                                className="min-h-[150px] resize-none"
                                              />
                                              <Button onClick={updateIndicatorNotes} className="w-full">حفظ الملاحظات</Button>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => deleteItem('department_indicators', ind.id)}>
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
