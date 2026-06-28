import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Search, Download, Key, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// Utility: SHA-256 hash
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function TeamBeneficiaries() {
  const { profile } = useAuth();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [busy, setBusy] = useState(false);

  const teamId = profile?.team_id || "";

  useEffect(() => {
    if (teamId) {
      checkTeamStatus();
    }
  }, [teamId]);

  const checkTeamStatus = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_settings')
      .select('team_id')
      .eq('team_id', teamId)
      .maybeSingle();
    
    if (!data) {
      setIsFirstTime(true);
    } else {
      setIsFirstTime(false);
    }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (password.length < 4) return toast.error("كلمة المرور يجب أن تكون 4 أرقام أو حروف على الأقل");
    
    setBusy(true);
    const hash = await sha256(password);
    const { error } = await supabase.from('team_settings').upsert({
      team_id: teamId,
      pin_hash: hash
    });
    setBusy(false);

    if (error) {
      toast.error("فشل حفظ كلمة المرور: " + error.message);
    } else {
      toast.success("تم تعيين كلمة المرور بنجاح");
      setIsFirstTime(false);
      setIsAuthenticated(true);
      fetchBeneficiaries();
    }
  };

  const handleLogin = async () => {
    if (!password) return toast.error("برجاء إدخال كلمة المرور");
    
    setBusy(true);
    const hash = await sha256(password);
    const { data } = await supabase
      .from('team_settings')
      .select('pin_hash')
      .eq('team_id', teamId)
      .maybeSingle();
    
    setBusy(false);

    if (data && data.pin_hash === hash) {
      setIsAuthenticated(true);
      fetchBeneficiaries();
    } else {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  const fetchBeneficiaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('beneficiaries_individual')
      .select('*, missions!inner(team_id)')
      .eq('missions.team_id', teamId)
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

  if (loading && !isAuthenticated) {
    return (
      <AppLayout title="جاري التحميل...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin w-10 h-10 text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="قاعدة بيانات الفريق">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 w-full max-w-md space-y-6 shadow-xl border-primary/20 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {isFirstTime ? <Key className="w-8 h-8 text-primary" /> : <Lock className="w-8 h-8 text-primary" />}
              </div>
              <h2 className="text-2xl font-bold">{isFirstTime ? "إعداد الفريق لأول مرة" : "دخول الفريق"}</h2>
              <p className="text-muted-foreground text-sm">
                {isFirstTime 
                  ? `برجاء تعيين كلمة مرور لفريقك (${teamCode}) للبدء` 
                  : `برجاء إدخال كلمة مرور الفريق (${teamCode})`}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>كلمة المرور</Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="****"
                  className="text-center text-lg tracking-widest"
                  onKeyDown={(e) => e.key === 'Enter' && (isFirstTime ? handleSetPassword() : handleLogin())}
                />
              </div>
              {isFirstTime ? (
                <Button onClick={handleSetPassword} disabled={busy} className="w-full gap-2">
                  {busy ? <Loader2 className="animate-spin w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  حفظ وتفعيل الدخول
                </Button>
              ) : (
                <Button onClick={handleLogin} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : "دخول"}
                </Button>
              )}
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsAuthenticated(false); setPassword(""); }} className="text-xs">
              <Lock className="w-3 h-3 ml-1" /> قفل
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Download className="w-4 h-4" /> تصدير Excel
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/10 shadow-lg">
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
                  <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{b.full_name}</TableCell>
                    <TableCell dir="ltr">{b.national_id || "—"}</TableCell>
                    <TableCell dir="ltr">{b.phone || "—"}</TableCell>
                    <TableCell>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                        {b.service_type || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(b.created_at).toLocaleDateString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                      {loading ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : "لا توجد بيانات مسجلة لهذا الفريق حتى الآن"}
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
