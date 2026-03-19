import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { enforceRateLimit, getRateLimitReset } from "@/lib/rateLimit";
import { sanitizeInput } from "@/lib/sanitize";
import logoImg from "@/assets/logo.png";

export default function SaasAdminLogin() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [form, setForm] = useState({ email: "", password: "" });

  // Redirect if already logged in as saas_admin
  useEffect(() => {
    if (!authLoading && user) {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "saas_admin")
        .maybeSingle()
        .then(({ data }) => {
          if (data) navigate("/saas-admin", { replace: true });
        });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setTimeout(() => setLockoutSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockoutSeconds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) { setError(`Too many attempts. Wait ${lockoutSeconds}s.`); return; }
    setLoading(true);
    setError(null);
    try {
      enforceRateLimit("saas-admin-login", 5, 60_000);
      const { error: signInError } = await signIn(sanitizeInput(form.email, 255), form.password);
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      // Verify the user has saas_admin role
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setError("Authentication failed.");
        setLoading(false);
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .eq("role", "saas_admin")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        setError("Access denied. This portal is for platform administrators only.");
        setLoading(false);
        return;
      }
      navigate("/saas-admin", { replace: true });
    } catch (err: any) {
      setError(err.message);
      const secs = getRateLimitReset("saas-admin-login");
      if (secs > 0) setLockoutSeconds(secs);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-xl mx-auto overflow-hidden bg-white flex items-center justify-center border border-border">
            <img src={logoImg} alt="eGrade" className="w-14 h-14 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Platform Admin</h1>
            <p className="text-muted-foreground text-sm mt-0.5">eGrade M|S · Super Admin Portal</p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/50">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            This is a <strong className="text-foreground">restricted portal</strong> for platform administrators only.
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold">Admin Email</Label>
            <Input id="email" name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="admin@egrade.ke" required className="h-11" />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? "text" : "password"}
                value={form.password} onChange={handleChange}
                placeholder="••••••••" required className="h-11 pr-10" minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {lockoutSeconds > 0 && (
            <div className="text-center text-xs font-semibold text-destructive">
              🔒 Locked out — retry in {lockoutSeconds}s
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={loading || lockoutSeconds > 0}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : <><Shield className="w-4 h-4" /> Admin Sign In</>}
          </Button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground">
          Not a platform admin?{" "}
          <button type="button" onClick={() => navigate("/")} className="text-primary font-semibold hover:underline">
            Go to Homepage
          </button>
        </p>
      </div>
    </div>
  );
}
