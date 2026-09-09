import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCheck, Bell, MessageSquare, Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReviewNote {
  id: string;
  team_id: string;
  created_by: string | null;
  entity_type: "mission" | "beneficiary" | "general" | null;
  record_id: string | null;
  note_text: string;
  is_read: boolean;
  created_at: string;
  // Joined
  creator_name?: string;
}

export default function ReviewNotesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = async () => {
    if (!profile?.team_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("review_notes")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Enrich with creator names
        const creatorIds = [...new Set(data.map(n => n.created_by).filter(Boolean))];
        const { data: profiles } = creatorIds.length > 0
          ? await supabase.from("profiles").select("user_id, full_name").in("user_id", creatorIds)
          : { data: [] };

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

        setNotes(data.map(n => ({
          ...n,
          creator_name: n.created_by ? profileMap.get(n.created_by) || "الإدارة" : "النظام",
        })));
      } else {
        setNotes([]);
      }
    } catch (e: any) {
      toast.error("فشل تحميل الملاحظات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [profile?.team_id]);

  const markAsRead = async (noteId: string) => {
    const { error } = await supabase
      .from("review_notes")
      .update({ is_read: true })
      .eq("id", noteId);

    if (!error) {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.team_id) return;
    const unreadIds = notes.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("review_notes")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotes(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("تم تحديد الكل كمقروء");
    }
  };

  const unreadCount = notes.filter(n => !n.is_read).length;

  const getEntityBadge = (type: string | null) => {
    switch (type) {
      case "mission": return <Badge variant="outline" className="border-primary text-primary text-xs">مهمة</Badge>;
      case "beneficiary": return <Badge variant="outline" className="border-info text-info text-xs">مستفيد</Badge>;
      default: return <Badge variant="outline" className="text-xs">عام</Badge>;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return new Date(dateStr).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <AppLayout title="ملاحظات المراجعة">
      <div className="space-y-6 max-w-4xl">

        {/* Header Stats */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold">ملاحظات وتنبيهات الإدارة</h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `لديك ${unreadCount} ملاحظة جديدة` : "لا توجد ملاحظات جديدة"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="w-4 h-4" />
              تحديد الكل كمقروء
            </Button>
          )}
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">لا توجد ملاحظات بعد</p>
            <p className="text-sm text-muted-foreground/70 mt-1">ستظهر هنا أي ملاحظات أو ردود من الإدارة على طلبات التعديل</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card
                key={note.id}
                className={`p-4 transition-all ${
                  !note.is_read
                    ? "border-warning/50 bg-warning/5 shadow-sm shadow-warning/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {!note.is_read && (
                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
                      )}
                      {getEntityBadge(note.entity_type)}
                      <span className="text-xs text-muted-foreground">
                        {note.creator_name} • {getTimeAgo(note.created_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note_text}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.record_id && note.entity_type === "mission" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => navigate(`/missions/${note.record_id}`)}
                        title="عرض المهمة"
                      >
                        <Eye className="w-4 h-4 text-info" />
                      </Button>
                    )}
                    {!note.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8"
                        onClick={() => markAsRead(note.id)}
                      >
                        <CheckCheck className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
