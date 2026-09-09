import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Loader2, GitPullRequest, Filter, Clock, CheckCheck } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";

// Field labels for display
const FIELD_LABELS: Record<string, string> = {
  mission_name: "اسم المهمة",
  activity_date: "تاريخ النشاط",
  activity_classification: "تصنيف النشاط",
  activity_type: "نوع النشاط",
  activity_details: "تفاصيل النشاط",
  execution_place: "مكان التنفيذ",
  governorate: "المحافظة",
  follow_up_responsible: "مسؤول المتابعة",
  follow_up_phone: "رقم تليفون المتابعة",
  type_name: "اسم النوع",
  classification: "التصنيف",
  classification_name: "اسم التصنيف",
  organizing_entity: "الجهة المنظمة",
  has_beneficiaries: "مهمة بها مستفيدين",
  is_open_mission: "مهمة مفتوحة",
  project_code: "كود المشروع",
  volunteers: "المتطوعون",
  non_volunteers: "المشاركون غير المتطوعين",
};

interface EditRequest {
  id: string;
  record_id: string;
  entity_type: "mission" | "beneficiary";
  team_id: string | null;
  requested_by: string;
  changes: Record<string, any>;
  status: "pending" | "approved" | "rejected";
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester_name?: string;
  team_name?: string;
  mission_code?: string;
}

export default function EditRequestsPage() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [originalData, setOriginalData] = useState<Record<string, any> | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("edit_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with profile names and team names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.requested_by).filter(Boolean))];
        const teamIds = [...new Set(data.map(r => r.team_id).filter(Boolean))];
        const missionIds = data.filter(r => r.entity_type === "mission").map(r => r.record_id);

        const [profilesRes, teamsRes, missionsRes] = await Promise.all([
          userIds.length > 0
            ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
            : { data: [] },
          teamIds.length > 0
            ? supabase.from("teams").select("id, name").in("id", teamIds)
            : { data: [] },
          missionIds.length > 0
            ? supabase.from("missions").select("id, mission_code").in("id", missionIds)
            : { data: [] },
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
        const teamMap = new Map((teamsRes.data || []).map(t => [t.id, t.name]));
        const missionMap = new Map((missionsRes.data || []).map(m => [m.id, m.mission_code]));

        const enriched = data.map(r => ({
          ...r,
          requester_name: profileMap.get(r.requested_by) || "غير معروف",
          team_name: r.team_id ? teamMap.get(r.team_id) || "غير معروف" : "—",
          mission_code: r.entity_type === "mission" ? missionMap.get(r.record_id) || "—" : "—",
        }));

        setRequests(enriched);
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      toast.error("فشل تحميل طلبات التعديل: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openRequestDetail = async (req: EditRequest) => {
    setSelectedRequest(req);
    setReviewNote(req.review_notes || "");
    setDialogOpen(true);
    setLoadingOriginal(true);

    try {
      if (req.entity_type === "mission") {
        const { data } = await supabase.from("missions").select("*").eq("id", req.record_id).single();
        setOriginalData(data || {});
      } else {
        const { data } = await supabase.from("beneficiaries").select("*").eq("id", req.record_id).single();
        setOriginalData(data || {});
      }
    } catch {
      setOriginalData({});
    } finally {
      setLoadingOriginal(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;
    setBusy(true);
    try {
      const changes = selectedRequest.changes || {};

      // Apply changes to the original record
      if (selectedRequest.entity_type === "mission") {
        // Separate volunteer data from mission data
        const { volunteers, non_volunteers, ...missionChanges } = changes;

        // Update mission fields
        if (Object.keys(missionChanges).length > 0) {
          const { error } = await supabase
            .from("missions")
            .update(missionChanges)
            .eq("id", selectedRequest.record_id);
          if (error) throw error;
        }

        // Update volunteers if changed
        if (volunteers) {
          await supabase.from("mission_volunteers").delete().eq("mission_id", selectedRequest.record_id);
          if (volunteers.length > 0) {
            const { error } = await supabase.from("mission_volunteers").insert(
              volunteers.map((v: any) => ({
                mission_id: selectedRequest.record_id,
                full_name: v.full_name,
                membership_number: v.membership_number || "",
                branch: v.branch || "",
              }))
            );
            if (error) throw error;
          }
        }

        // Update non-volunteers if changed
        if (non_volunteers) {
          await supabase.from("mission_non_volunteers").delete().eq("mission_id", selectedRequest.record_id);
          if (non_volunteers.length > 0) {
            const { error } = await supabase.from("mission_non_volunteers").insert(
              non_volunteers.map((v: any) => ({
                mission_id: selectedRequest.record_id,
                full_name: v.full_name,
                role: v.role || "",
              }))
            );
            if (error) throw error;
          }
        }
      } else {
        // Beneficiary changes
        const { error } = await supabase
          .from("beneficiaries")
          .update(changes)
          .eq("id", selectedRequest.record_id);
        if (error) throw error;
      }

      // Update edit request status
      const { error: updErr } = await supabase
        .from("edit_requests")
        .update({
          status: "approved",
          reviewer_id: profile?.id,
          review_notes: reviewNote || "تمت الموافقة",
        })
        .eq("id", selectedRequest.id);
      if (updErr) throw updErr;

      // Send review note to the team
      if (selectedRequest.team_id) {
        await supabase.from("review_notes").insert({
          team_id: selectedRequest.team_id,
          created_by: profile?.id,
          entity_type: selectedRequest.entity_type,
          record_id: selectedRequest.record_id,
          note_text: `✅ تمت الموافقة على طلب التعديل${selectedRequest.mission_code ? ` للمهمة ${selectedRequest.mission_code}` : ""}${reviewNote ? `. ملاحظة: ${reviewNote}` : ""}`,
          is_read: false,
        });
      }

      toast.success("تمت الموافقة على طلب التعديل وتطبيق التغييرات");
      setDialogOpen(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (e: any) {
      toast.error("فشل الموافقة: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;
    if (!reviewNote.trim()) {
      toast.error("يرجى كتابة سبب الرفض");
      return;
    }
    setBusy(true);
    try {
      const { error: updErr } = await supabase
        .from("edit_requests")
        .update({
          status: "rejected",
          reviewer_id: profile?.id,
          review_notes: reviewNote,
        })
        .eq("id", selectedRequest.id);
      if (updErr) throw updErr;

      // Send rejection note to the team
      if (selectedRequest.team_id) {
        await supabase.from("review_notes").insert({
          team_id: selectedRequest.team_id,
          created_by: profile?.id,
          entity_type: selectedRequest.entity_type,
          record_id: selectedRequest.record_id,
          note_text: `❌ تم رفض طلب التعديل${selectedRequest.mission_code ? ` للمهمة ${selectedRequest.mission_code}` : ""}. السبب: ${reviewNote}`,
          is_read: false,
        });
      }

      toast.success("تم رفض طلب التعديل");
      setDialogOpen(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (e: any) {
      toast.error("فشل الرفض: " + (e.message || ""));
    } finally {
      setBusy(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const statusMatch = activeTab === "pending" ? r.status === "pending" : r.status !== "pending";
    const typeMatch = filterType === "all" || r.entity_type === filterType;
    return statusMatch && typeMatch;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const renderChangesComparison = () => {
    if (!selectedRequest || !originalData) return null;
    const changes = selectedRequest.changes || {};

    return (
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {Object.entries(changes).map(([key, newVal]) => {
          // Skip volunteers/non_volunteers as they need special rendering
          if (key === "volunteers" || key === "non_volunteers") {
            return (
              <div key={key} className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="font-bold text-sm mb-2">{FIELD_LABELS[key] || key}</div>
                <div className="text-sm text-info">
                  {Array.isArray(newVal) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {(newVal as any[]).map((item, idx) => (
                        <li key={idx}>{item.full_name}{item.role ? ` (${item.role})` : ""}{item.membership_number ? ` - ${item.membership_number}` : ""}</li>
                      ))}
                    </ul>
                  ) : String(newVal)}
                </div>
              </div>
            );
          }

          const oldVal = originalData[key];
          const hasChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          if (!hasChanged) return null;

          return (
            <div key={key} className="p-3 rounded-lg border border-border bg-muted/30">
              <div className="font-bold text-sm mb-1">{FIELD_LABELS[key] || key}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">القيمة الحالية:</span>
                  <span className="text-destructive line-through">
                    {oldVal === null || oldVal === undefined ? "فارغ" : typeof oldVal === "boolean" ? (oldVal ? "نعم" : "لا") : String(oldVal)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">القيمة الجديدة:</span>
                  <span className="text-success font-medium">
                    {newVal === null || newVal === undefined ? "فارغ" : typeof newVal === "boolean" ? (newVal ? "نعم" : "لا") : String(newVal)}
                  </span>
                </div>
              </div>
            </div>
          );
        }).filter(Boolean)}

        {Object.entries(changes).every(([key, newVal]) => {
          if (key === "volunteers" || key === "non_volunteers") return false;
          return JSON.stringify(originalData[key]) === JSON.stringify(newVal);
        }) && (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد تغييرات في الحقول الأساسية</p>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="طلبات التعديل">
      <div className="space-y-6 max-w-6xl">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3 border-warning/30 bg-warning/5">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">معلقة</p>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-success/30 bg-success/5">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مقبولة</p>
              <p className="text-2xl font-bold text-success">{requests.filter(r => r.status === "approved").length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-destructive/30 bg-destructive/5">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مرفوضة</p>
              <p className="text-2xl font-bold text-destructive">{requests.filter(r => r.status === "rejected").length}</p>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                معلقة
                {pendingCount > 0 && <Badge variant="destructive" className="text-xs px-1.5 py-0">{pendingCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="processed" className="gap-2">
                <CheckCheck className="w-4 h-4" />
                معالجة
              </TabsTrigger>
            </TabsList>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 ms-2" />
                <SelectValue placeholder="فلتر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="mission">المهمات</SelectItem>
                <SelectItem value="beneficiary">المستفيدين</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="pending" className="mt-4">
            <Card className="p-4 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>كود السجل</TableHead>
                    <TableHead>الفريق</TableHead>
                    <TableHead>مقدم الطلب</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد طلبات معلقة</TableCell></TableRow>
                  ) : (
                    filteredRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <Badge variant="outline" className={req.entity_type === "mission" ? "border-primary text-primary" : "border-info text-info"}>
                            {req.entity_type === "mission" ? "مهمة" : "مستفيد"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {req.mission_code || req.record_id.slice(0, 8)}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">{req.team_name}</TableCell>
                        <TableCell className="text-sm font-medium">{req.requester_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openRequestDetail(req)} className="gap-1">
                            <Eye className="w-4 h-4" />
                            مراجعة
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="processed" className="mt-4">
            <Card className="p-4 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>كود السجل</TableHead>
                    <TableHead>الفريق</TableHead>
                    <TableHead>مقدم الطلب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ملاحظة المراجعة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد طلبات معالجة</TableCell></TableRow>
                  ) : (
                    filteredRequests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <Badge variant="outline" className={req.entity_type === "mission" ? "border-primary text-primary" : "border-info text-info"}>
                            {req.entity_type === "mission" ? "مهمة" : "مستفيد"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {req.mission_code || req.record_id.slice(0, 8)}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">{req.team_name}</TableCell>
                        <TableCell className="text-sm font-medium">{req.requester_name}</TableCell>
                        <TableCell>
                          {req.status === "approved" ? (
                            <Badge className="bg-success/15 text-success border-success/30">مقبول</Badge>
                          ) : (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30">مرفوض</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={req.review_notes || ""}>{req.review_notes || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openRequestDetail(req)} className="gap-1">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail / Review Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-primary" />
                تفاصيل طلب التعديل
                {selectedRequest && (
                  <Badge variant="outline" className="ms-2">
                    {selectedRequest.entity_type === "mission" ? "مهمة" : "مستفيد"}
                    {selectedRequest.mission_code ? ` — ${selectedRequest.mission_code}` : ""}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-3 text-sm p-3 bg-muted/30 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">مقدم الطلب:</span>{" "}
                    <span className="font-medium">{selectedRequest.requester_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الفريق:</span>{" "}
                    <span className="font-medium">{selectedRequest.team_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ الطلب:</span>{" "}
                    <span className="font-medium">
                      {new Date(selectedRequest.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحالة:</span>{" "}
                    {selectedRequest.status === "pending" ? (
                      <Badge className="bg-warning/15 text-warning border-warning/30">معلق</Badge>
                    ) : selectedRequest.status === "approved" ? (
                      <Badge className="bg-success/15 text-success border-success/30">مقبول</Badge>
                    ) : (
                      <Badge className="bg-destructive/15 text-destructive border-destructive/30">مرفوض</Badge>
                    )}
                  </div>
                </div>

                {/* Changes Comparison */}
                <div>
                  <h4 className="font-bold text-sm mb-2">التغييرات المطلوبة:</h4>
                  {loadingOriginal ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
                  ) : (
                    renderChangesComparison()
                  )}
                </div>

                {/* Review Actions (only for pending) */}
                {selectedRequest.status === "pending" && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">ملاحظة المراجعة (مطلوبة عند الرفض):</label>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="اكتب ملاحظتك هنا..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={busy}
                        className="gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض الطلب
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={busy}
                        className="gap-2 bg-success hover:bg-success/90 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        موافقة وتطبيق التعديل
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show existing review notes for processed requests */}
                {selectedRequest.status !== "pending" && selectedRequest.review_notes && (
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <span className="text-sm font-medium">ملاحظة المراجعة:</span>
                    <p className="text-sm mt-1">{selectedRequest.review_notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
