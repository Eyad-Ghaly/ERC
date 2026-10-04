import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

export default function UpdatePassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);

    if (error) {
      toast.error(error.message || "فشل تحديث كلمة المرور");
    } else {
      toast.success("تم تحديث كلمة المرور بنجاح");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow">
            <KeyRound className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-extrabold">تحديث كلمة المرور</h1>
          <p className="text-muted-foreground">أدخل كلمة المرور الجديدة لحسابك</p>
        </div>

        <Card className="card-elevated p-6">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pass">كلمة المرور الجديدة</Label>
              <Input 
                id="new-pass" 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                dir="ltr" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">تأكيد كلمة المرور</Label>
              <Input 
                id="confirm-pass" 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                dir="ltr" 
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              تحديث كلمة المرور
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
