import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Star, Upload, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StarRating = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-6 h-6 cursor-pointer ${s <= value ? "fill-warning text-warning" : "text-muted-foreground"}`}
          onClick={() => onChange(s)}
        />
      ))}
    </div>
  );
};

export default function MissionFeedback() {
  const { user, profile } = useAuth();
  
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<any[]>([]);

  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  
  const [serviceRating, setServiceRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [importanceRating, setImportanceRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: missionsData }, { data: qData }] = await Promise.all([
      supabase.from("missions")
        .select(`
          *,
          mission_feedback (id, is_dismissed),
          beneficiaries_individual (id),
          beneficiaries_group (id)
        `)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("feedback_custom_questions").select("*").eq("team_code", profile?.team_code || "")
    ]);

    if (qData) setCustomQuestions(qData);

    if (missionsData) {
      const pending = missionsData.filter(m => {
        const hasBens = (m.beneficiaries_individual?.length > 0) || (m.beneficiaries_group?.length > 0);
        const hasFeedback = m.mission_feedback && m.mission_feedback.length > 0;
        return hasBens && !hasFeedback;
      });
      setMissions(pending);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpen = (m: any) => {
    setSelectedMission(m);
    setServiceRating(0);
    setCommunicationRating(0);
    setImportanceRating(0);
    setNotes("");
    setPhotos([]);
    setCustomAnswers({});
  };

  const handlePhotoUpload = async (files: File[]) => {
    const urls: string[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop();
      const fileName = `${Math.random()}.${ext}`;
      const filePath = `${selectedMission.id}/${fileName}`;
      const { error } = await supabase.storage.from('feedback_photos').upload(filePath, f);
      if (error) {
        toast.error(`فشل رفع ${f.name}: ${error.message}`);
      } else {
        const { data: { publicUrl } } = supabase.storage.from('feedback_photos').getPublicUrl(filePath);
        urls.push(publicUrl);
      }
    }
    return urls;
  };

  const handleSubmit = async (dismiss = false) => {
    if (!selectedMission) return;
    if (!dismiss && (serviceRating === 0 || communicationRating === 0 || importanceRating === 0)) {
      return toast.error("يرجى إكمال التقييمات الأساسية (النجوم) أو تجاوز التقييم");
    }

    setSubmitting(true);
    let photoUrls: string[] = [];
    
    if (!dismiss && photos.length > 0) {
      photoUrls = await handlePhotoUpload(photos);
    }

    const { error } = await supabase.from("mission_feedback").insert({
      mission_id: selectedMission.id,
      service_rating: dismiss ? null : serviceRating,
      communication_rating: dismiss ? null : communicationRating,
      importance_rating: dismiss ? null : importanceRating,
      notes: dismiss ? null : notes,
      photos: dismiss ? null : photoUrls,
      custom_answers: dismiss ? null : customAnswers,
      is_dismissed: dismiss,
      created_by: user?.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(dismiss ? "تم تجاوز التقييم" : "تم حفظ التقييم والتوثيق بنجاح!");
      setSelectedMission(null);
      loadData();
    }
    setSubmitting(false);
  };

  return (
    <AppLayout title="تقييم وتوثيق المستفيدين">
      <div className="max-w-4xl space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <FileText className="w-6 h-6" />
            <h2 className="text-xl font-bold">مهام في انتظار التقييم والتوثيق</h2>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center text-primary"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : missions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا توجد مهام حالياً تتطلب التقييم. رائع!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {missions.map(m => (
                <Card key={m.id} className="p-4 card-elevated border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{m.mission_code}</Badge>
                      <span className="text-xs text-muted-foreground">{m.activity_date}</span>
                    </div>
                    <h3 className="font-bold mb-1 truncate" title={m.mission_name}>{m.mission_name}</h3>
                    <p className="text-sm text-muted-foreground">{m.governorate || "بدون محافظة"}</p>
                  </div>
                  <Button className="mt-4 w-full" onClick={() => handleOpen(m)}>تقييم وتوثيق</Button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!selectedMission} onOpenChange={(o) => !o && setSelectedMission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تقييم المهمة: {selectedMission?.mission_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>تقييم الخدمة المقدمة</Label>
                <StarRating value={serviceRating} onChange={setServiceRating} />
              </div>
              <div className="space-y-2">
                <Label>تقييم تواصل الفريق</Label>
                <StarRating value={communicationRating} onChange={setCommunicationRating} />
              </div>
              <div className="space-y-2">
                <Label>تقييم أهمية الخدمة للمستفيد</Label>
                <StarRating value={importanceRating} onChange={setImportanceRating} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات عامة</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أضف أي ملاحظات أو مقترحات..." rows={3} />
            </div>

            <div className="space-y-2 border p-4 rounded-xl border-dashed">
              <Label className="flex items-center gap-2 cursor-pointer w-fit text-primary">
                <Upload className="w-5 h-5" />
                <span>إرفاق صور التوثيق</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                />
              </Label>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((p, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {p.name.slice(0, 15)}...
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {customQuestions.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-bold text-primary">أسئلة إضافية مخصصة للفريق</h3>
                {customQuestions.map(q => (
                  <div key={q.id} className="space-y-2">
                    <Label>{q.question_text}</Label>
                    <Input 
                      value={customAnswers[q.question_key] || ""} 
                      onChange={e => setCustomAnswers({ ...customAnswers, [q.question_key]: e.target.value })} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" className="sm:mr-auto" onClick={() => handleSubmit(true)} disabled={submitting}>
              تجاوز (عدم التقييم)
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedMission(null)} disabled={submitting}>إلغاء</Button>
              <Button onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                حفظ التوثيق
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
