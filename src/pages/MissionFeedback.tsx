import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Star, Upload, FileText, X, CheckCircle2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";

const StarRating = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`w-7 h-7 cursor-pointer transition-colors ${s <= value ? "fill-warning text-warning" : "text-muted-foreground hover:text-warning/60"}`}
        onClick={() => onChange(s)}
      />
    ))}
  </div>
);

export default function MissionFeedback() {
  const { user, profile } = useAuth();

  const [pendingMissions, setPendingMissions] = useState<any[]>([]);
  const [closedMissions, setClosedMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);

  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [missionFeedbacks, setMissionFeedbacks] = useState<any[]>([]);

  const [serviceRating, setServiceRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [importanceRating, setImportanceRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    let missionsQuery = supabase.from("missions")
      .select(`*, mission_feedback(id, service_rating, communication_rating, importance_rating, notes, is_dismissed, created_at)`)
      .eq("has_beneficiaries", true)
      .order("created_at", { ascending: false })
      .limit(10000);

    if (profile?.team_id) {
      missionsQuery = missionsQuery.eq("team_id", profile.team_id);
    } else {
      missionsQuery = missionsQuery.eq("created_by", user.id);
    }

    const [{ data: missionsData }, { data: qData }] = await Promise.all([
      missionsQuery,
      supabase.from("feedback_custom_questions").select("*").eq("team_id", profile?.team_id || "")
    ]);

    if (qData) setCustomQuestions(qData);

    if (missionsData) {
      setPendingMissions(missionsData.filter(m => !m.feedback_closed));
      setClosedMissions(missionsData.filter(m => m.feedback_closed));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleOpenMission = (m: any) => {
    setSelectedMission(m);
    setMissionFeedbacks(m.mission_feedback || []);
    resetForm();
  };

  const resetForm = () => {
    setServiceRating(0);
    setCommunicationRating(0);
    setImportanceRating(0);
    setNotes("");
    setPhotos([]);
    setCustomAnswers({});
  };

  const handlePhotoUpload = async (files: File[], missionId: string) => {
    const urls: string[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${missionId}/${fileName}`;
      const { error } = await supabase.storage.from('feedback_photos').upload(filePath, f);
      if (error) {
        toast.error(`فشل رفع ${f.name}`);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('feedback_photos').getPublicUrl(filePath);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handleAddFeedback = async () => {
    if (!selectedMission) return;
    if (serviceRating === 0 || communicationRating === 0 || importanceRating === 0) {
      return toast.error("يرجى إكمال التقييمات الأساسية بالنجوم");
    }

    setSubmitting(true);
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      photoUrls = await handlePhotoUpload(photos, selectedMission.id);
    }

    const { data: newFeedback, error } = await supabase.from("mission_feedback").insert({
      mission_id: selectedMission.id,
      service_rating: serviceRating,
      communication_rating: communicationRating,
      importance_rating: importanceRating,
      notes,
      photos: photoUrls,
      custom_answers: customAnswers,
      is_dismissed: false,
      created_by: user?.id,
    }).select().single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إضافة تقييم جديد بنجاح!");
      setMissionFeedbacks(prev => [...prev, newFeedback]);
      resetForm();
    }
    setSubmitting(false);
  };

  const handleCloseFeedback = async () => {
    if (!selectedMission) return;
    setClosing(true);
    const { error } = await supabase.from("missions").update({ feedback_closed: true }).eq("id", selectedMission.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم إنهاء جلسة تقييم هذه المهمة");
      setSelectedMission(null);
      loadData();
    }
    setClosing(false);
  };

  const handleDismiss = async () => {
    if (!selectedMission) return;
    setSubmitting(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("mission_feedback").insert({ mission_id: selectedMission.id, is_dismissed: true, created_by: user?.id }),
      supabase.from("missions").update({ feedback_closed: true }).eq("id", selectedMission.id),
    ]);
    if (e1 || e2) toast.error("حدث خطأ");
    else { toast.success("تم تجاوز التقييم"); setSelectedMission(null); loadData(); }
    setSubmitting(false);
  };

  const renderMissionCard = (m: any, showCount = true) => (
    <Card key={m.id} className="p-4 card-elevated border-border flex flex-col justify-between gap-3">
      <div>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline">{m.mission_code}</Badge>
          <span className="text-xs text-muted-foreground">{m.activity_date}</span>
        </div>
        <h3 className="font-bold mb-1 truncate text-sm" title={m.mission_name}>{m.mission_name}</h3>
        <p className="text-xs text-muted-foreground">{m.governorate || "بدون محافظة"}</p>
        {showCount && (m.mission_feedback?.length > 0) && (
          <Badge className="mt-2 bg-success/10 text-success border-success/20">
            {m.mission_feedback.length} تقييم{m.mission_feedback.length > 1 ? "ات" : ""} مسجل{m.mission_feedback.length > 1 ? "ة" : ""}
          </Badge>
        )}
      </div>
      <Button className="w-full" size="sm" onClick={() => handleOpenMission(m)}>
        {m.feedback_closed ? "عرض التقييمات" : "إدخال / إضافة تقييم"}
      </Button>
    </Card>
  );

  return (
    <AppLayout title="تقييم وتوثيق المستفيدين">
      <div className="max-w-5xl space-y-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending" className="px-6">
              <FileText className="w-4 h-4 ml-2" /> في انتظار التقييم
              {pendingMissions.length > 0 && <Badge className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{pendingMissions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="closed" className="px-6">
              <CheckCircle2 className="w-4 h-4 ml-2" /> تم تقييمها
              {closedMissions.length > 0 && <Badge variant="secondary" className="mr-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{closedMissions.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : pendingMissions.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">لا توجد مهام تنتظر التقييم 🎉</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingMissions.map(m => renderMissionCard(m))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-6">
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : closedMissions.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">لا توجد مهام مكتملة التقييم بعد</Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {closedMissions.map(m => renderMissionCard(m))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedMission} onOpenChange={(o) => !o && setSelectedMission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">تقييم المهمة: {selectedMission?.mission_name}</DialogTitle>
          </DialogHeader>

          {/* Existing feedbacks summary */}
          {missionFeedbacks.filter(f => !f.is_dismissed).length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <h3 className="font-bold text-sm text-primary">التقييمات المسجلة ({missionFeedbacks.filter(f => !f.is_dismissed).length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {missionFeedbacks.filter(f => !f.is_dismissed).map((f, i) => (
                  <div key={f.id} className="flex items-center gap-4 text-sm bg-background rounded-lg p-2">
                    <span className="text-muted-foreground text-xs">#{i + 1}</span>
                    <div className="flex gap-3">
                      <span>خدمة: {'⭐'.repeat(f.service_rating || 0)}</span>
                      <span>تواصل: {'⭐'.repeat(f.communication_rating || 0)}</span>
                      <span>أهمية: {'⭐'.repeat(f.importance_rating || 0)}</span>
                    </div>
                    {f.notes && <span className="text-muted-foreground truncate max-w-[150px]">{f.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New feedback form – only if not closed */}
          {!selectedMission?.feedback_closed && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Plus className="w-4 h-4" />
                <span>إضافة تقييم جديد</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">تقييم الخدمة</Label>
                  <StarRating value={serviceRating} onChange={setServiceRating} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">تقييم التواصل</Label>
                  <StarRating value={communicationRating} onChange={setCommunicationRating} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">أهمية الخدمة</Label>
                  <StarRating value={importanceRating} onChange={setImportanceRating} />
                </div>
              </div>

              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات..." rows={2} />

              <div className="border border-dashed rounded-xl p-3">
                <Label className="flex items-center gap-2 cursor-pointer w-fit text-primary text-sm">
                  <Upload className="w-4 h-4" />
                  <span>إرفاق صور التوثيق</span>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
                </Label>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photos.map((p, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        {p.name.slice(0, 12)}...
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {customQuestions.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="font-bold text-sm text-primary">أسئلة إضافية</h4>
                  {customQuestions.map(q => (
                    <div key={q.id} className="space-y-1">
                      <Label className="text-xs">{q.question_text}</Label>
                      <Input value={customAnswers[q.question_key] || ""} onChange={e => setCustomAnswers({ ...customAnswers, [q.question_key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleAddFeedback} disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  إضافة تقييم
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            {!selectedMission?.feedback_closed ? (
              <>
                <Button variant="ghost" className="text-muted-foreground sm:mr-auto" onClick={handleDismiss} disabled={submitting || closing}>
                  تجاوز (إنهاء بدون تقييم)
                </Button>
                <Button variant="outline" onClick={() => setSelectedMission(null)}>إغلاق</Button>
                <Button onClick={handleCloseFeedback} disabled={closing || missionFeedbacks.filter(f => !f.is_dismissed).length === 0} className="bg-success hover:bg-success/90">
                  {closing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  إنهاء التقييم
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedMission(null)}>إغلاق</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
