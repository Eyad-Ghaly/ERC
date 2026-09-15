import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDropdownOptions } from "@/hooks/useDropdownOptions";
import { toast } from "sonner";
import { Loader2, Save, Send, Edit, RefreshCw, AlertCircle, Trash2, Filter } from "lucide-react";

interface MissionRow {
  id: string;
  mission_name: string;
  activity_date: string;
  governorate: string;
  activity_classification: string;
  activity_type: string;
  execution_place: string;
  follow_up_responsible: string;
  follow_up_phone: string;
  activity_details: string;
  project_code?: string;
  team_id?: string;
  status?: string;
  mission_code?: string;
  [key: string]: any;
}

const COLUMNS = [
  { key: "mission_name", label: "اسم المهمة", type: "text" },
  { key: "activity_date", label: "التاريخ", type: "date" },
  { key: "governorate", label: "المحافظة", type: "select", optionsKey: "governorate" },
  { key: "activity_classification", label: "تصنيف النشاط", type: "select", optionsKey: "activity_classification" },
  { key: "activity_type", label: "نوع النشاط", type: "select", optionsKey: "activity_type" },
  { key: "activity_details", label: "تفاصيل النشاط", type: "text" },
  { key: "execution_place", label: "مكان التنفيذ", type: "text" },
  { key: "follow_up_responsible", label: "مسؤول المتابعة", type: "text" },
  { key: "follow_up_phone", label: "تليفون المتابعة", type: "text" },
];

export default function SmartMissionsGrid() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [originalMissions, setOriginalMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Column filters state
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Multi-cell selection and range state for Excel-like experience
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Refs to access latest state inside global event listeners
  const missionsRef = React.useRef(missions);
  const filteredRef = React.useRef<MissionRow[]>([]);
  const selectionRef = React.useRef(selectionRange);
  React.useEffect(() => { missionsRef.current = missions; }, [missions]);
  React.useEffect(() => { selectionRef.current = selectionRange; }, [selectionRange]);

  // Fetch options for selects
  const govOptions = useDropdownOptions("governorate").options;
  const classOptions = useDropdownOptions("activity_classification").options;
  const typeOptions = useDropdownOptions("activity_type").options;

  const optionsMap: Record<string, any[]> = {
    governorate: govOptions,
    activity_classification: classOptions,
    activity_type: typeOptions,
  };

  const loadMissions = async () => {
    if (!profile?.team_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("team_id", profile.team_id)
      .in("status", ["planned", "coded"])
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("حدث خطأ أثناء جلب المهام");
    } else if (data) {
      const formatted = data.map((d: any) => ({
        id: d.id,
        mission_name: d.mission_name || "",
        activity_date: d.activity_date || "",
        governorate: d.governorate || "",
        activity_classification: d.activity_classification || "",
        activity_type: d.activity_type || "",
        activity_details: d.activity_details || "",
        execution_place: d.execution_place || "",
        follow_up_responsible: d.follow_up_responsible || "",
        follow_up_phone: d.follow_up_phone || "",
        project_code: d.project_code || "",
        team_id: d.team_id || "",
        status: d.status || "planned",
        mission_code: d.mission_code || "",
      }));
      setMissions(formatted);
      setOriginalMissions(JSON.parse(JSON.stringify(formatted)));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMissions();
  }, [profile?.team_id]);

  const handleChange = (id: string, key: string, value: string) => {
    const updated = missions.map(m => m.id === id ? { ...m, [key]: value } : m);
    setMissions(updated);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;
    applyPaste(pasteData, startRowIndex, startColIndex);
  };

  // Filtered missions based on column filters
  const filteredMissions = missions.filter(row => {
    return COLUMNS.every(col => {
      const filterVal = filters[col.key];
      if (!filterVal) return true;
      const cellVal = String(row[col.key] || "").toLowerCase();
      return cellVal.includes(filterVal.toLowerCase());
    });
  });

  // Keep filteredRef in sync for global paste listener
  React.useEffect(() => { filteredRef.current = filteredMissions; });

  const applyPaste = (pasteData: string, startRowIndex: number, startColIndex: number) => {
    const range = selectionRef.current;
    const updatedMissions = [...missionsRef.current];
    const filtered = filteredRef.current;

    // If multi-row or multi-col selection, fill every selected cell with the first value
    if (range) {
      const minR = Math.min(range.startRow, range.endRow);
      const maxR = Math.max(range.startRow, range.endRow);
      const minC = Math.min(range.startCol, range.endCol);
      const maxC = Math.max(range.startCol, range.endCol);
      const isMultiCell = maxR > minR || maxC > minC;

      if (isMultiCell) {
        const firstValue = pasteData.split("\n")[0].split("\t")[0].trim();
        for (let r = minR; r <= maxR; r++) {
          const targetRow = filtered[r];
          if (!targetRow) continue;
          const idx = updatedMissions.findIndex(m => m.id === targetRow.id);
          if (idx === -1) continue;
          for (let c = minC; c <= maxC; c++) {
            const colKey = COLUMNS[c]?.key;
            if (colKey) updatedMissions[idx][colKey] = firstValue;
          }
        }
        setMissions(updatedMissions);
        toast.success(`تم لصق القيمة في ${(maxR - minR + 1) * (maxC - minC + 1)} خلية، لا تنس الحفظ!`);
        return;
      }
    }

    // Single-cell or normal paste: fill from anchor downwards (Excel-like)
    const rows = pasteData.split("\n").map(r => r.split("\t"));
    for (let r = 0; r < rows.length; r++) {
      const targetFilteredRowIndex = startRowIndex + r;
      if (targetFilteredRowIndex >= filtered.length) break;
      const targetRow = filtered[targetFilteredRowIndex];
      const actualRowIndex = updatedMissions.findIndex(m => m.id === targetRow.id);
      if (actualRowIndex === -1) continue;

      for (let c = 0; c < rows[r].length; c++) {
        const targetColIndex = startColIndex + c;
        if (targetColIndex >= COLUMNS.length) break;
        const colKey = COLUMNS[targetColIndex].key;
        const value = rows[r][c].trim();
        if (value) updatedMissions[actualRowIndex][colKey] = value;
      }
    }
    setMissions(updatedMissions);
    toast.success("تم لصق البيانات بنجاح، لا تنس الحفظ!");
  };

  // Global paste listener so Ctrl+V works on selection even if no input is focused
  React.useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      const range = selectionRef.current;
      if (!range) return;
      const minR = Math.min(range.startRow, range.endRow);
      const minC = Math.min(range.startCol, range.endCol);
      const isMultiCell =
        Math.max(range.startRow, range.endRow) > minR ||
        Math.max(range.startCol, range.endCol) > minC;
      if (!isMultiCell) return; // Let the input's own onPaste handle single-cell
      e.preventDefault();
      const pasteData = e.clipboardData?.getData("text") || "";
      if (!pasteData) return;
      applyPaste(pasteData, minR, minC);
    };
    document.addEventListener("paste", onGlobalPaste);
    return () => document.removeEventListener("paste", onGlobalPaste);
  }, []);

  const saveChanges = async () => {
    setSaving(true);
    let successCount = 0;
    
    // Find modified rows
    const modifiedRows = missions.filter((m, i) => JSON.stringify(m) !== JSON.stringify(originalMissions.find(om => om.id === m.id)));
    
    if (modifiedRows.length === 0) {
      toast("لا توجد تعديلات لحفظها");
      setSaving(false);
      return;
    }

    for (const row of modifiedRows) {
      if (row.status === "planned") {
        const { error } = await supabase
          .from("missions")
          .update({
            mission_name: row.mission_name,
            activity_date: row.activity_date,
            governorate: row.governorate,
            activity_classification: row.activity_classification,
            activity_type: row.activity_type,
            activity_details: row.activity_details,
            execution_place: row.execution_place,
            follow_up_responsible: row.follow_up_responsible,
            follow_up_phone: row.follow_up_phone,
          })
          .eq("id", row.id);

        if (!error) successCount++;
      } else {
        // Create edit request for coded missions
        const { error } = await supabase.from("edit_requests").insert({
          record_id: row.id,
          entity_type: "mission",
          team_id: profile?.team_id || null,
          requested_by: profile?.id,
          changes: {
            mission_name: row.mission_name,
            activity_date: row.activity_date,
            governorate: row.governorate,
            activity_classification: row.activity_classification,
            activity_type: row.activity_type,
            activity_details: row.activity_details,
            execution_place: row.execution_place,
            follow_up_responsible: row.follow_up_responsible,
            follow_up_phone: row.follow_up_phone,
          },
          status: "pending",
        });
        
        if (!error) successCount++;
      }
    }

    if (successCount === modifiedRows.length) {
      toast.success(`تم حفظ تعديلات ${successCount} مهام (تم رفع طلبات التعديل للمرسلة بنجاح)`);
      setOriginalMissions(JSON.parse(JSON.stringify(missions)));
    } else {
      toast.error("حدث خطأ أثناء حفظ بعض التعديلات");
    }
    setSaving(false);
  };

  const submitMission = async (row: MissionRow) => {
    if (!row.mission_name || !row.activity_date || !row.follow_up_responsible || !row.follow_up_phone) {
      toast.error("يرجى استكمال البيانات الأساسية قبل الإرسال (الاسم، التاريخ، مسؤول المتابعة ورقمه)");
      return;
    }
    if (row.follow_up_phone.length !== 11) {
      toast.error("رقم المتابعة يجب أن يكون 11 رقم");
      return;
    }

    setSubmittingId(row.id);
    try {
      // 1. Generate code
      const { data: generatedCode, error: codeErr } = await supabase.rpc("generate_mission_code", {
        _project_code: row.project_code || profile?.team_code || "", 
        _team_code: profile?.team_code || "",
      });
      if (codeErr) throw codeErr;

      // 2. Update status and code
      const { error: updErr } = await supabase
        .from("missions")
        .update({
          mission_code: generatedCode,
          status: "coded",
          submitted_at: new Date().toISOString(),
          mission_name: row.mission_name,
          activity_date: row.activity_date,
          governorate: row.governorate,
          activity_classification: row.activity_classification,
          activity_type: row.activity_type,
          activity_details: row.activity_details,
          execution_place: row.execution_place,
          follow_up_responsible: row.follow_up_responsible,
          follow_up_phone: row.follow_up_phone,
        })
        .eq("id", row.id);

      if (updErr) throw updErr;

      toast.success(`تم إرسال المهمة بنجاح، كود: ${generatedCode}`);
      // Remove from list since it's no longer planned
      setMissions(prev => prev.filter(m => m.id !== row.id));
      setOriginalMissions(prev => prev.filter(m => m.id !== row.id));

    } catch (e: any) {
      toast.error(e.message || "فشل إرسال المهمة");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDeleteMission = async (row: MissionRow) => {
    if (!confirm("هل أنت متأكد من رغبتك في مسح هذه المهمة؟")) return;

    if (row.status === "planned") {
      const { error } = await supabase.from("missions").delete().eq("id", row.id);
      if (error) {
        toast.error("حدث خطأ أثناء المسح");
      } else {
        toast.success("تم مسح المهمة بنجاح");
        setMissions(prev => prev.filter(m => m.id !== row.id));
        setOriginalMissions(prev => prev.filter(m => m.id !== row.id));
      }
    } else {
      const { error } = await supabase.from("edit_requests").insert({
        record_id: row.id,
        entity_type: "mission",
        team_id: profile?.team_id || null,
        requested_by: profile?.id,
        changes: { _request_deletion: true, reason: "طلب مسح المهمة من الشبكة الذكية" },
        status: "pending",
      });

      if (error) {
        toast.error("حدث خطأ أثناء رفع طلب المسح");
      } else {
        toast.success("تم رفع طلب مسح للمهمة (بانتظار موافقة الإدارة)");
      }
    }
  };

  return (
    <AppLayout title="الشبكة الذكية للمهام (مسودات ومرسلة)">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              تعديل المهام
            </h2>
            <p className="text-sm text-muted-foreground">
              يمكنك تعديل المسودات أو المهام المرسلة عبر النسخ واللصق من Excel، مع فلترة الأعمدة وحفظ التعديلات والإرسال.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadMissions} disabled={loading || saving} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button onClick={saveChanges} disabled={loading || saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ كافة التعديلات
            </Button>
          </div>
        </div>

        {missions.length === 0 && !loading ? (
          <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-bold">لا توجد مسودات مهام</p>
            <p className="text-sm mt-2">جميع المهام التي قمت بإدخالها تم إرسالها أو لم تقم بحفظ مسودات.</p>
          </Card>
        ) : (
          <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto" style={{ direction: 'rtl' }}>
              <Table className="min-w-max">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {COLUMNS.map(col => {
                      // Build unique values for this column from all missions
                      const uniqueVals = Array.from(
                        new Set(missions.map(m => String(m[col.key] || "")).filter(v => v))
                      ).sort();
                      return (
                        <TableHead key={col.key} className="font-bold text-right border-x border-border/50 px-2 min-w-[150px]">
                          <div className="flex flex-col gap-1.5 py-1">
                            <span>{col.label}</span>
                            <select
                              value={filters[col.key] || ""}
                              onChange={(e) => setFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                              className="h-7 text-xs bg-background border border-border/60 rounded px-1 w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                              style={{ direction: 'rtl' }}
                            >
                              <option value="">⬦ الكل ({missions.filter(m => !Object.entries(filters).filter(([k]) => k !== col.key).every(([k,v]) => !v || String(m[k]||'').includes(v))).length === 0 ? uniqueVals.length : uniqueVals.length})</option>
                              {uniqueVals.map(val => (
                                <option key={val} value={val}>{val || "(فارغ)"}</option>
                              ))}
                            </select>
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="font-bold text-center border-r border-border/50 bg-muted/90 w-[180px] align-middle">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMissions.map((row, rowIndex) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      {COLUMNS.map((col, colIndex) => {
                        const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                        const isInRange = selectionRange && 
                          rowIndex >= Math.min(selectionRange.startRow, selectionRange.endRow) &&
                          rowIndex <= Math.max(selectionRange.startRow, selectionRange.endRow) &&
                          colIndex >= Math.min(selectionRange.startCol, selectionRange.endCol) &&
                          colIndex <= Math.max(selectionRange.startCol, selectionRange.endCol);

                        return (
                          <TableCell 
                            key={col.key} 
                            className={`p-1 border-x border-border/50 ${isSelected ? 'ring-2 ring-primary bg-primary/5' : isInRange ? 'bg-primary/5' : ''}`}
                            onMouseDown={() => {
                              setSelectedCell({ row: rowIndex, col: colIndex });
                              setSelectionRange({ startRow: rowIndex, startCol: colIndex, endRow: rowIndex, endCol: colIndex });
                              setIsMouseDown(true);
                            }}
                            onMouseEnter={() => {
                              if (isMouseDown && selectedCell) {
                                setSelectionRange({
                                  startRow: selectedCell.row,
                                  startCol: selectedCell.col,
                                  endRow: rowIndex,
                                  endCol: colIndex
                                });
                              }
                            }}
                            onMouseUp={() => setIsMouseDown(false)}
                          >
                            {col.type === "select" ? (
                              <Input
                                value={row[col.key]}
                                onChange={(e) => handleChange(row.id, col.key, e.target.value)}
                                onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                                className="h-9 border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary rounded-none shadow-none text-sm w-full"
                                placeholder={col.label}
                                list={`datalist-${col.key}`}
                              />
                            ) : (
                              <Input
                                type={col.type === "date" ? "date" : "text"}
                                value={row[col.key]}
                                onChange={(e) => handleChange(row.id, col.key, e.target.value)}
                                onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                                className="h-9 border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-primary rounded-none shadow-none text-sm w-full"
                                placeholder={col.label}
                              />
                            )}
                            {col.type === "select" && (
                              <datalist id={`datalist-${col.key}`}>
                                {optionsMap[col.optionsKey!]?.map((opt: any) => (
                                  <option key={opt.id} value={opt.value} />
                                ))}
                              </datalist>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="p-1.5 border-r border-border/50 bg-card w-[200px] align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={() => navigate(`/department-entry/${row.id}`)}
                            title="تعديل تفاصيل المهمة (متطوعين وغيره)"
                            className="h-8 px-2 text-xs"
                          >
                            <Edit className="w-3.5 h-3.5 ml-1" />
                            دخول
                          </Button>
                          {row.status === "planned" ? (
                            <Button 
                              size="sm" 
                              onClick={() => submitMission(row)} 
                              disabled={submittingId === row.id}
                              className="h-8 gap-1 text-xs"
                            >
                              {submittingId === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              إرسال
                            </Button>
                          ) : (
                            <div className="px-2 py-1 bg-green-500/10 text-green-600 rounded text-xs font-bold text-center h-8 flex items-center min-w-[70px] justify-center" title="مهمة مرسلة - التعديل سيرفع طلب مراجعة">
                              {row.mission_code || "مرسلة"}
                            </div>
                          )}
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDeleteMission(row)}
                            title="مسح المهمة"
                            className="h-8 px-2 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loading && missions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length + 1} className="h-32 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
