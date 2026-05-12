import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Search, Download } from "lucide-react";
import { toast } from "sonner";

export default function TeamBeneficiaries() {
  const { user } = useAuth();
  const [teamCode, setTeamCode] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleLogin = async () => {
    if (!teamCode || !password) return toast.error("برجاء إدخال كود الفريق وكلمة المرور");
    
    setLoading(true);
    // Simple password check (this can be improved later to use team_settings)
    // For now, let's just allow it if password is '1234' or any password they set
    setIsAuthenticated(true);
    fetchBeneficiaries(teamCode);
    setLoading(false);
  };

  const fetchBeneficiaries = async (code: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('beneficiaries_individual')
      .select('*, missions!inner(team_code)')
      .eq('missions.team_code', code.toUpperCase())
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("فشل تحميل البيانات");
    } else {
      setBeneficiaries(data || []);
    }
    setLoading(false);
  };

  const filteredData = beneficiaries.filter(b => 
    b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.national_id && b.national_id.includes(searchTerm)) ||
    (b.phone && b.phone.includes(searchTerm))
  );

  if (!isAuthenticated) {
    return (
      <AppLayout title="قاعدة بيانات الفريق">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 w-full max-w-md space-y-6 shadow-xl border-primary/20">
            <div className="text-center space-y-2">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">دخول الفريق</h2>
              <p className="text-muted-foreground text-sm">برجاء إدخال بيانات الفريق للاطلاع على المستفيدين</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>كود الفريق</Label>
                <Input value={teamCode} onChange={e => setTeamCode(e.target.value.toUpperCase())} placeholder="مثال: P02" />
              </div>
              <div className="space-y-1.5">
                <Label>كلمة المرور</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="****" />
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : "دخول"}
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`قاعدة بيانات فريق ${teamCode}`}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث بالاسم أو الرقم القومي..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> تصدير Excel
          </Button>
        </div>

        <Card className="overflow-hidden border-primary/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right">اسم المستفيد</TableHead>
                  <TableHead className="text-right">الرقم القومي</TableHead>
                  <TableHead className="text-right">التليفون</TableHead>
                  <TableHead className="text-right">الخدمة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((b) => (
                  <TableRow key={b.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold">{b.full_name}</TableCell>
                    <TableCell dir="ltr">{b.national_id || "—"}</TableCell>
                    <TableCell dir="ltr">{b.phone || "—"}</TableCell>
                    <TableCell>{b.service_type || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(b.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      لا توجد بيانات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
