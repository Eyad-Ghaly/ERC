import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Hash, User, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VolunteerWithTeams {
  id: string;
  full_name: string;
  membership_number: string | null;
  branch: string | null;
  phone_number: string | null;
  national_id: string | null;
  volunteer_teams: { team_code: string; is_approved: boolean }[];
}

export default function VolunteersDatabase({ embedded }: { embedded?: boolean }) {
  const [volunteers, setVolunteers] = useState<VolunteerWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [branchFilter, setBranchFilter] = useState("");
  const [memberIdFilter, setMemberIdFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  useEffect(() => {
    const fetchVolunteers = async () => {
      setLoading(true);
      // Fetch volunteers and their associated teams
      const { data, error } = await supabase
        .from("volunteers_base")
        .select(`
          id, full_name, membership_number, branch, phone_number, national_id,
          volunteer_teams ( team_code, is_approved )
        `);

      if (!error && data) {
        setVolunteers(data as unknown as VolunteerWithTeams[]);
      }
      setLoading(false);
    };

    fetchVolunteers();
  }, []);

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      if (branchFilter && v.branch !== branchFilter) return false;
      if (memberIdFilter && !v.membership_number?.includes(memberIdFilter)) return false;
      if (nameFilter && !v.full_name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      return true;
    });
  }, [volunteers, branchFilter, memberIdFilter, nameFilter]);

  // Unique branches for the datalist (if we wanted a dropdown) but the user asked for inputs "3 زراير فلاتر الاول بالفرع والتاني برقم العضوية والتالت بالاسم عادي"
  const content = (
    <div className="space-y-6">
      <Card className="p-5 border-primary/20 bg-card/50 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالفرع..."
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="pr-9"
          />
        </div>
          <div className="relative flex-1">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم العضوية..."
              value={memberIdFilter}
              onChange={e => setMemberIdFilter(e.target.value)}
              className="pr-9"
            />
          </div>
          <div className="relative flex-1">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم..."
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              className="pr-9"
            />
          </div>
        </Card>

        <Card className="p-0 border-primary/20 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>رقم العضوية</TableHead>
                  <TableHead>رقم التليفون</TableHead>
                  <TableHead>الفرق المنضم إليها</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">جاري تحميل قاعدة البيانات...</TableCell></TableRow>
                ) : filteredVolunteers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">لا يوجد متطوعين يطابقون شروط البحث</TableCell></TableRow>
                ) : (
                  filteredVolunteers.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-bold">{v.full_name}</TableCell>
                      <TableCell>{v.branch || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{v.membership_number || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-right">{v.phone_number || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {v.volunteer_teams && v.volunteer_teams.length > 0 ? (
                            v.volunteer_teams.map((vt, i) => (
                              <Badge key={i} variant={vt.is_approved ? "default" : "secondary"} className="text-xs">
                                {vt.team_code}
                                {!vt.is_approved && " (قيد الاعتماد)"}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>إجمالي المتطوعين: <strong>{filteredVolunteers.length}</strong></span>
            <div className="flex items-center gap-1 text-primary">
              <Shield className="w-4 h-4" />
              <span>صلاحية الاطلاع فقط - إدارة الشباب</span>
            </div>
          </div>
        </Card>
      </div>
  );

  return embedded ? content : <AppLayout title="قاعدة بيانات المتطوعين">{content}</AppLayout>;
}
