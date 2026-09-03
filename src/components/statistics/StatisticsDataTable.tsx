import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DetailedMissionTableRow,
  DistributionItem,
} from "@/services/statistics/statisticsCalculator";
import { Eye, Search, Table as TableIcon, ChevronRight, ChevronLeft, FileSpreadsheet, MapPin, Award, Users } from "lucide-react";
import * as XLSX from "xlsx";

interface StatisticsDataTableProps {
  missions: DetailedMissionTableRow[];
  governoratesData: DistributionItem[];
  servicesData: DistributionItem[];
  genderData: DistributionItem[];
  nationalityData: DistributionItem[];
}

export function StatisticsDataTable({
  missions,
  governoratesData,
  servicesData,
  genderData,
  nationalityData,
}: StatisticsDataTableProps) {
  const [activeTab, setActiveTab] = useState("missions");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredMissions = useMemo(() => {
    if (!searchTerm.trim()) return missions;
    const q = searchTerm.trim().toLowerCase();
    return missions.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.governorate.toLowerCase().includes(q) ||
        m.classification.toLowerCase().includes(q) ||
        m.activityType.toLowerCase().includes(q)
    );
  }, [missions, searchTerm]);

  const totalPages = Math.ceil(filteredMissions.length / pageSize) || 1;
  const paginatedMissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMissions.slice(start, start + pageSize);
  }, [filteredMissions, currentPage]);

  const handleExportTable = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        missions.map((m) => ({
          "كود المهمة": m.code,
          "اسم المهمة": m.name,
          "التاريخ": m.date,
          "المحافظة": m.governorate,
          "التصنيف": m.classification,
          "نوع النشاط": m.activityType,
          "نوع الاستجابة": m.responseType,
          "الحالة": m.status,
          "المتطوعين": m.volunteersCount,
          "المستفيدين": m.beneficiariesCount,
          "الخدمات": m.servicesCount,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "المهام");
      XLSX.writeFile(wb, `ERC_Missions_Data_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  return (
    <Card className="p-5 md:p-6 card-elevated border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <TableIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-foreground">
              سجلات وجداول البيانات التفصيلية
            </h3>
            <p className="text-xs text-muted-foreground">
              استعراض وتدقيق السجلات التفصيلية للمهام والخدمات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTable}
            className="text-xs h-8 gap-1.5 font-bold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-success" />
            تصدير الجدول
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="missions" className="text-xs">
              المهام ({missions.length})
            </TabsTrigger>
            <TabsTrigger value="governorates" className="text-xs">
              المحافظات ({governoratesData.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="text-xs">
              الخدمات ({servicesData.length})
            </TabsTrigger>
            <TabsTrigger value="demographics" className="text-xs">
              الديموغرافيا
            </TabsTrigger>
          </TabsList>

          {activeTab === "missions" && (
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="بحث في الجدول..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs h-8 pr-8 bg-background"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Missions */}
        <TabsContent value="missions" className="mt-0 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[110px]">الكود</TableHead>
                  <TableHead>اسم المهمة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المحافظة</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">المتطوعين</TableHead>
                  <TableHead className="text-center">المستفيدين</TableHead>
                  <TableHead className="text-center">الخدمات</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                      لا توجد مهام مطابقة للبحث أو التصفية
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMissions.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell>
                        <code className="text-[11px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                          {m.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium text-xs max-w-[180px] truncate" title={m.name}>
                        {m.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {m.date || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {m.governorate}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={m.classification}>
                        {m.classification}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold">
                        {m.volunteersCount}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-emerald-600">
                        {m.beneficiariesCount}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-amber-600">
                        {m.servicesCount}
                      </TableCell>
                      <TableCell>
                        <Link to={`/missions/${m.id}`}>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>
                صفحة {currentPage} من {totalPages} (إجمالي {filteredMissions.length} مهمة)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-2"
                >
                  التالي
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Governorates Table */}
        <TabsContent value="governorates" className="mt-0">
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>المحافظة</TableHead>
                  <TableHead className="text-center">عدد المهام المنفذة</TableHead>
                  <TableHead className="text-center">النسبة المئوية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {governoratesData.map((gov) => (
                  <TableRow key={gov.name}>
                    <TableCell className="font-bold text-xs">{gov.name}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-xs">{gov.value}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">%{gov.percentage}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 3: Services Table */}
        <TabsContent value="services" className="mt-0">
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>نوع الخدمة</TableHead>
                  <TableHead className="text-center">إجمالي الخدمات المقدمة</TableHead>
                  <TableHead className="text-center">عدد المستفيدين من الخدمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesData.map((srv) => (
                  <TableRow key={srv.name}>
                    <TableCell className="font-bold text-xs">{srv.name}</TableCell>
                    <TableCell className="text-center font-mono font-bold text-xs text-primary">{srv.value}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{srv.secondaryValue || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 4: Demographics Table */}
        <TabsContent value="demographics" className="mt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="p-3 bg-muted/40 font-bold text-xs border-b">جدول النوع (الجنس)</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead className="text-center">العدد</TableHead>
                    <TableHead className="text-center">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {genderData.map((g) => (
                    <TableRow key={g.name}>
                      <TableCell className="font-bold text-xs">{g.name}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs">{g.value}</TableCell>
                      <TableCell className="text-center font-mono text-xs">%{g.percentage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="p-3 bg-muted/40 font-bold text-xs border-b">جدول الجنسيات</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الجنسية</TableHead>
                    <TableHead className="text-center">العدد</TableHead>
                    <TableHead className="text-center">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nationalityData.map((n) => (
                    <TableRow key={n.name}>
                      <TableCell className="font-bold text-xs">{n.name}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs">{n.value}</TableCell>
                      <TableCell className="text-center font-mono text-xs">%{n.percentage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
