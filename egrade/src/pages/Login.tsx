import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, School, Loader2, AlertCircle, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enforceRateLimit, getRateLimitReset } from "@/lib/rateLimit";
import { sanitizeInput } from "@/lib/sanitize";
import logoImg from "@/assets/logo.png";

type AuthMode = "staff" | "student" | "parent";

// Password strength checker
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "hsl(var(--destructive))" };
  if (score <= 3) return { score, label: "Fair", color: "hsl(var(--cbc-ae))" };
  return { score, label: "Strong", color: "hsl(var(--cbc-ee))" };
}

export default function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigateTo = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [form, setForm] = useState({ email: "", password: "", adm_no: "", dob: "" });

  // Honeypot field for bot detection
  const [honeypot, setHoneypot] = useState("");

  // Track failed attempts for progressive lockout
  const failedAttemptsRef = useRef(0);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigateTo("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigateTo]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setTimeout(() => setLockoutSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockoutSeconds]);

  // Clear sensitive data on unmount
  useEffect(() => {
    return () => {
      setForm(f => ({ ...f, password: "", dob: "" }));
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  // Check if honeypot is filled (bot detected)
  const isBotDetected = () => {
    if (honeypot) {
      // Silently reject - don't tell bots they were detected
      setLoading(false);
      return true;
    }
    return false;
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) return;

    if (lockoutSeconds > 0) {
      setError(`Too many attempts. Please wait ${lockoutSeconds} seconds.`);
      return;
    }
    setLoading(true);
    setError(null);

    // Validate email format before sending
    const emailTrimmed = sanitizeInput(form.email.trim().toLowerCase(), 255);
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      // Progressive lockout: 5 attempts/min, then 3/min after 5 failures
      const maxAttempts = failedAttemptsRef.current >= 5 ? 3 : 5;
      const windowMs = failedAttemptsRef.current >= 5 ? 120_000 : 60_000;
      enforceRateLimit("staff-login", maxAttempts, windowMs);

      const { error } = await signIn(emailTrimmed, form.password);
      if (error) {
        failedAttemptsRef.current++;
        // Generic error message - don't reveal if email exists
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        failedAttemptsRef.current = 0;
        // Clear password from state immediately
        setForm(f => ({ ...f, password: "" }));
      }
    } catch (err: any) {
      setError(err.message);
      const secs = getRateLimitReset("staff-login");
      if (secs > 0) setLockoutSeconds(secs);
    }
    setLoading(false);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) return;

    setLoading(true);
    setError(null);

    if (!form.adm_no || !form.dob) {
      setError("Admission number and password are required.");
      setLoading(false);
      return;
    }

    // Validate admission number format
    const admCleaned = form.adm_no.trim();
    if (!/^[a-zA-Z0-9/\-_]+$/.test(admCleaned)) {
      setError("Invalid admission number format. Use only letters, numbers, /, -, _");
      setLoading(false);
      return;
    }

    try {
      enforceRateLimit("student-login", 5, 60_000);
    } catch (err: any) {
      setError(err.message);
      const secs = getRateLimitReset("student-login");
      if (secs > 0) setLockoutSeconds(secs);
      setLoading(false);
      return;
    }

    // Convert admission number to the generated login email
    const loginEmail = `${admCleaned.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@students.egrade.ke`;
    const { error } = await signIn(loginEmail, form.dob);
    if (error) {
      failedAttemptsRef.current++;
      // Generic error - don't reveal which field is wrong
      setError("Invalid admission number or password. Please check and try again.");
    } else {
      setForm(f => ({ ...f, dob: "" }));
    }
    setLoading(false);
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) return;

    if (lockoutSeconds > 0) {
      setError(`Too many attempts. Please wait ${lockoutSeconds} seconds.`);
      return;
    }
    setLoading(true);
    setError(null);

    const emailTrimmed = sanitizeInput(form.email.trim().toLowerCase(), 255);
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const maxAttempts = failedAttemptsRef.current >= 5 ? 3 : 5;
      const windowMs = failedAttemptsRef.current >= 5 ? 120_000 : 60_000;
      enforceRateLimit("parent-login", maxAttempts, windowMs);

      const { error } = await signIn(emailTrimmed, form.password);
      if (error) {
        failedAttemptsRef.current++;
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        failedAttemptsRef.current = 0;
        setForm(f => ({ ...f, password: "" }));
      }
    } catch (err: any) {
      setError(err.message);
      const secs = getRateLimitReset("parent-login");
      if (secs > 0) setLockoutSeconds(secs);
    }
    setLoading(false);
  };


  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-primary animate-pulse">
            <span className="text-primary-foreground font-black text-lg">e</span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const pwStrength = form.password ? getPasswordStrength(form.password) : null;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: "hsl(24 100% 50%)" }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            <img src={logoImg} alt="eGrade" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight">eGrade M|S</h1>
            <p className="text-green-200 text-xs font-medium">Kenya CBC School Management System</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">KICD Aligned</span>
              <div className="h-px flex-1" style={{ background: "hsl(24 100% 50% / 0.5)" }} />
            </div>
            <h2 className="text-white text-5xl font-black leading-tight">
              Transforming<br />
              <span style={{ color: "hsl(24 100% 60%)" }}>CBC Education</span><br />
              Management
            </h2>
            <p className="text-green-200 text-lg max-w-md leading-relaxed">
              A complete digital solution for Kenyan schools — CBC assessments, NEMIS-ready enrollment, M-Pesa fee tracking, and real-time parent engagement.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "CBC Performance Levels", desc: "EE · ME · AE · BE" },
              { label: "NEMIS Ready", desc: "UPI & Enrollment Export" },
              { label: "M-Pesa Integration", desc: "Fee Tracking & Receipts" },
              { label: "Multi-Tenant", desc: "School Isolation & Security" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl p-3 border" style={{ background: "hsl(0 0% 100% / 0.06)", borderColor: "hsl(0 0% 100% / 0.12)" }}>
                <p className="text-white text-sm font-semibold">{f.label}</p>
                <p className="text-green-300 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-300" />
            <p className="text-green-200 text-sm">
              <span className="text-white font-bold">256-bit SSL</span> encrypted · Role-based access
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center">
              <img src={logoImg} alt="eGrade" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">eGrade M|S</h1>
              <p className="text-muted-foreground text-xs">Kenya CBC School Management</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-foreground">
              {mode === "staff" ? "Staff Portal" : mode === "student" ? "Student Portal" : "Parent Portal"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === "staff"
                ? "Sign in with your school email and password"
                : mode === "student"
                ? "Sign in with your admission number and password"
                : "Sign in with the email provided by your school"}
            </p>
          </div>

          {/* Lockout Warning Banner */}
          {lockoutSeconds > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <span className="text-destructive font-black text-sm">{lockoutSeconds}</span>
              </div>
              <div>
                <p className="font-bold text-destructive text-sm">Account Temporarily Locked</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Too many failed attempts. Please wait {lockoutSeconds} seconds before trying again.
                </p>
              </div>
            </div>
          )}

          {/* Mode toggle - 3 tabs */}
          <div className="flex rounded-xl border border-border overflow-hidden p-1 bg-muted gap-1">
            {([
              { key: "staff" as AuthMode, label: "Staff / Admin", icon: School },
              { key: "student" as AuthMode, label: "Student", icon: GraduationCap },
              { key: "parent" as AuthMode, label: "Parent", icon: Users },
            ]).map((m) => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  mode === m.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Honeypot field - hidden from users, visible to bots */}
          <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
            <input
              type="text"
              name="website_url"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Staff Login Form */}
          {mode === "staff" && (
            <form onSubmit={handleStaffLogin} className="space-y-4" autoComplete="on">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@school.ac.ke"
                  required
                  className="h-11"
                  autoComplete="email"
                  maxLength={255}
                  disabled={lockoutSeconds > 0}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                   <button type="button" onClick={() => navigateTo("/forgot-password")} className="text-xs font-medium text-primary hover:underline">
                     Forgot password?
                   </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="h-11 pr-10"
                    minLength={6}
                    maxLength={128}
                    autoComplete="current-password"
                    disabled={lockoutSeconds > 0}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading || lockoutSeconds > 0}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  "Sign In to Portal"
                )}
              </Button>
            </form>
          )}

          {/* Student Login Form - completely separate */}
          {mode === "student" && (
            <form onSubmit={handleStudentLogin} className="space-y-4" autoComplete="off">
              <div className="rounded-xl border border-dashed border-accent/40 p-3 bg-accent/5">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p>Enter your <strong>Admission Number</strong> exactly as on your school ID and your <strong>password</strong>. Your initial password is your date of birth.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adm_no" className="text-sm font-semibold">Admission Number</Label>
                <Input
                  id="adm_no"
                  name="adm_no"
                  value={form.adm_no}
                  onChange={handleChange}
                  placeholder="e.g. JSS/001/2026"
                  required
                  className="h-11 font-mono"
                  maxLength={50}
                  autoComplete="off"
                  disabled={lockoutSeconds > 0}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Input
                    id="dob"
                    name="dob"
                    type={showPassword ? "text" : "password"}
                    value={form.dob}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="h-11 pr-10"
                    autoComplete="current-password"
                    maxLength={128}
                    disabled={lockoutSeconds > 0}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Your initial password is your date of birth (YYYY-MM-DD). It can be changed by your parent or school admin.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={loading || lockoutSeconds > 0}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  <><GraduationCap className="w-4 h-4" /> Student Sign In</>
                )}
              </Button>
            </form>
          )}

          {/* Parent Login Form */}
          {mode === "parent" && (
            <form onSubmit={handleParentLogin} className="space-y-4" autoComplete="on">
              <div className="rounded-xl border border-dashed border-primary/30 p-3 bg-primary/5">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p>Sign in with the <strong>email address</strong> provided by your child's school and the <strong>password</strong> shared with you or set after verification.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="parent-email" className="text-sm font-semibold">Email Address</Label>
                <Input
                  id="parent-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="parent@example.com"
                  required
                  className="h-11"
                  autoComplete="email"
                  maxLength={255}
                  disabled={lockoutSeconds > 0}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="parent-password" className="text-sm font-semibold">Password</Label>
                  <button type="button" onClick={() => navigateTo("/forgot-password")} className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="parent-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="h-11 pr-10"
                    minLength={6}
                    maxLength={128}
                    autoComplete="current-password"
                    disabled={lockoutSeconds > 0}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={loading || lockoutSeconds > 0}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  <><Users className="w-4 h-4" /> Parent Sign In</>
                )}
              </Button>
            </form>
          )}

          {/* Security indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Secured with SSL encryption · Role-based access control</span>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to eGrade's{" "}
            <button type="button" onClick={() => navigateTo("/terms")} className="text-primary font-semibold hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => navigateTo("/privacy")} className="text-primary font-semibold hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
