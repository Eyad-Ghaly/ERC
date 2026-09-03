import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Loader2 } from "lucide-react";
import { NormalizedMission } from "@/services/statistics/fieldMapping";
import { decryptData } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";

interface BeneficiariesRegistryExplorerProps {
  missions?: NormalizedMission[];
}

interface DecryptedBeneficiaryRow {
  id: string;
  missionCode: string;
  missionName: string;
  fullName: string;
  decryptedId: string;
  phone: string;
  nationality: string;
  gender: string;
  serviceType: string;
  quantity: number;
  date: string;
}

export function BeneficiariesRegistryExplorer({ missions = [] }: BeneficiariesRegistryExplorerProps) {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [beneficiaries, setBeneficiaries] = useState<DecryptedBeneficiaryRow[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function processBeneficiaries() {
      setLoading(true);
      const rows: DecryptedBeneficiaryRow[] = [];

      // 1. Process from passed missions if available
      if (missions && missions.length > 0) {
        for (const m of missions) {
          for (const b of m.beneficiariesIndividual || []) {
            let decId = "—";
            if (b.encryptedId) {
              decId = await decryptData(b.encryptedId);
            } else if (b.idHash) {
              decId = "مسجل بالهاش";
            }

            rows.push({
              id: b.id,
              missionCode: m.code,
              missionName: m.name,
              fullName: b.fullName || "غير محدد",
              decryptedId: decId,
              phone: b.phone || "—",
              nationality: b.nationality || "غير محدد",
              gender: b.gender || "غير محدد",
              serviceType: b.serviceType || "غير محدد",
              quantity: b.quantity || 1,
              date: m.date || (b.createdAt ? b.createdAt.substring(0, 10) : "—"),
            });
          }

          for (const g of m.beneficiariesGroup || []) {
            rows.push({
              id: g.id,
              missionCode: m.code,
              missionName: m.name,
              fullName: `نشاط جماعي (${g.targetGroup || "فئة عامة"})`,
              decryptedId: "تسجيل جماعي",
              phone: "—",
              nationality: g.nationality || "غير محدد",
              gender: g.gender || "غير محدد",
              serviceType: g.serviceType || "غير محدد",
              quantity: g.count || 1,
              date: m.date || (g.createdAt ? g.createdAt.substring(0, 10) : "—"),
            });
          }
        }
      }

      // 2. If no rows from missions, fallback to direct Supabase fetch for this team
      if (rows.length === 0 && user) {
        try {
          let directQuery = supabase
            .from("missions")
            .select("id, mission_code, mission_name, activity_date, beneficiaries_individual(*), beneficiaries_group(*)")
            .order("created_at", { ascending: false })
            .limit(1000);

          if (profile?.team_id) {
            directQuery = directQuery.eq("team_id", profile.team_id);
          } else {
            directQuery = directQuery.eq("created_by", user.id);
          }

          const { data: directData } = await directQuery;
          if (directData && directData.length > 0) {
            for (const dm of directData) {
              for (const b of dm.beneficiaries_individual || []) {
                let decId = "—";
                if (b.encrypted_id) {
                  decId = await decryptData(b.encrypted_id);
                } else if (b.id_hash) {
                  decId = "مسجل بالهاش";
                }

                rows.push({
                  id: b.id,
                  missionCode: dm.mission_code || "—",
                  missionName: dm.mission_name || "—",
                  fullName: b.full_name || "غير محدد",
                  decryptedId: decId,
                  phone: b.phone || "—",
                  nationality: b.nationality || "غير محدد",
                  gender: b.gender || "غير محدد",
                  serviceType: b.service_type || "غير محدد",
                  quantity: b.service_quantity || 1,
                  date: dm.activity_date || (b.created_at ? b.created_at.substring(0, 10) : "—"),
                });
              }

              for (const g of dm.beneficiaries_group || []) {
                rows.push({
                  id: g.id,
                  missionCode: dm.mission_code || "—",
                  missionName: dm.mission_name || "—",
                  fullName: `نشاط جماعي (${g.target_group || "فئة عامة"})`,
                  decryptedId: "تسجيل جماعي",
                  phone: "—",
                  nationality: g.nationality || "غير محدد",
                  gender: g.gender || "غير محدد",
                  serviceType: g.service_type || "غير محدد",
                  quantity: g.count || 1,
                  date: dm.activity_date || (g.created_at ? g.created_at.substring(0, 10) : "—"),
                });
              }
            }
          }
        } catch (e) {
          console.error("Direct beneficiaries fetch fallback error:", e);
        }
      }

      if (!isCancelled) {
        setBeneficiaries(rows);
        setLoading(false);
      }
    }

    processBeneficiaries();

    return () => {
      isCancelled = true;
    };
  }, [missions, user, profile]);

  const filteredBeneficiaries = useMemo(() => {
    if (!searchQuery.trim()) return beneficiaries;
    const q = searchQuery.trim().toLowerCase();
    return beneficiaries.filter(
      (b) =>
        b.fullName.toLowerCase().includes(q) ||
        b.decryptedId.includes(q) ||
        b.phone.includes(q) ||
        b.missionCode.toLowerCase().includes(q) ||
        b.serviceType.toLowerCase().includes(q) ||
        b.nationality.toLowerCase().includes(q)
    );
  }, [beneficiaries, searchQuery]);

  const exportToExcel = () => {
    const dataToExport = filteredBeneficiaries.map((b, idx) => ({
      "م": idx + 1,
      "كود المهمة": b.missionCode,
      "اسم المهمة": b.missionName,
      "اسم المستفيد": b.fullName,
      "الرقم القومي (مفكوك التشفير)": b.decryptedId,
      "رقم الهاتف": b.phone,
      "الجنسية": b.nationality,
      "النوع": b.gender,
      "نوع الخدمة": b.serviceType,
      "الكمية": b.quantity,
      "التاريخ": b.date,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws["!dir"] = { rtl: true };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المستفيدين الشامل");
    XLSX.writeFile(wb, `سجل_المستفيدين_الشامل_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <Card className="p-6 border-primary/20 space-y-4 shadow-sm card-elevated">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h3 className="font-bold text-base md:text-lg text-primary flex items-center gap-2">
            <Search className="w-5 h-5" />
            سجل المستفيدين الشامل والبحث الفوري (بالاسم أو الرقم القومي)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            البحث الفوري بالاسم، الرقم القومي (فك التشفير تلقائياً)، رقم الهاتف، الجنسية أو كود المهمة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم، الرقم القومي، الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>

          <Badge variant="outline" className="font-bold text-xs bg-primary/10 text-primary whitespace-nowrap h-9 px-3 flex items-center">
            عدد النتائج: {filteredBeneficiaries.length}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="gap-1.5 text-xs h-9"
            disabled={filteredBeneficiaries.length === 0}
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs">جاري فك تشفير وتجهيز سجل المستفيدين...</span>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">كود المهمة</TableHead>
                <TableHead className="font-bold">اسم المستفيد</TableHead>
                <TableHead className="font-bold">الرقم القومي (مفكوك التشفير)</TableHead>
                <TableHead className="font-bold">رقم الهاتف</TableHead>
                <TableHead className="font-bold">الجنسية</TableHead>
                <TableHead className="font-bold">النوع</TableHead>
                <TableHead className="font-bold">نوع الخدمة</TableHead>
                <TableHead className="font-bold text-center">الكمية</TableHead>
                <TableHead className="font-bold text-center">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                    لا يوجد مستفيدين مطابقين للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredBeneficiaries.slice(0, 100).map((b, idx) => (
                  <TableRow key={b.id || idx} className="hover:bg-muted/30 text-xs">
                    <TableCell className="font-mono font-bold text-primary">{b.missionCode}</TableCell>
                    <TableCell className="font-bold">{b.fullName}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{b.decryptedId}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{b.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {b.nationality}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[11px] ${
                          b.gender === "ذكر"
                            ? "bg-blue-500/10 text-blue-600"
                            : b.gender === "أنثى"
                            ? "bg-pink-500/10 text-pink-600"
                            : ""
                        }`}
                      >
                        {b.gender}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{b.serviceType}</TableCell>
                    <TableCell className="text-center font-bold">{b.quantity}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{b.date}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredBeneficiaries.length > 100 && (
        <p className="text-xs text-center text-muted-foreground">
          يتم عرض أول 100 نتيجة من أصل {filteredBeneficiaries.length} مستفيد (يمكنك تصدير الكل إلى Excel)
        </p>
      )}
    </Card>
  );
}
