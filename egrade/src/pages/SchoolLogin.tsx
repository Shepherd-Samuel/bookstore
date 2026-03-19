import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, School, Loader2, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enforceRateLimit, getRateLimitReset } from "@/lib/rateLimit";
import { sanitizeInput } from "@/lib/sanitize";
import logoImg from "@/assets/logo.png";

type AuthMode = "staff" | "student";

export default function SchoolLogin() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [school, setSchool] = useState<{ id: string; school_name: string; logo_url: string | null; moto: string | null } | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState<AuthMode>("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [form, setForm] = useState({ email: "", password: "", adm_no: "", dob: "" });

  // Honeypot for bot detection
  const [honeypot, setHoneypot] = useState("");
  const failedAttemptsRef = useRef(0);

  // Redirect if already logged in — validate they belong to this school
  useEffect(() => {
    if (!authLoading && user && profile && school) {
      if (profile.school_id === school.id) {
        navigate("/dashboard", { replace: true });
      } else {
        // User is logged in but doesn't belong to this school
        toast({
          title: "Wrong School Portal",
          description: `You are signed into a different school. Please sign out first or use your school's portal.`,
          variant: "destructive",
        });
      }
    }
  }, [user, profile, authLoading, school, navigate, toast]);

  // Validate and sanitize slug before fetching
  useEffect(() => {
    if (!schoolSlug) return;

    // Validate slug format — only allow alphanumeric, hyphens, max 100 chars
    const slugCleaned = schoolSlug.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/.test(slugCleaned) && slugCleaned.length > 1) {
      setNotFound(true);
      setSchoolLoading(false);
      return;
    }

    const fetchSchool = async () => {
      const { data, error } = await supabase
        .from("schools_public")
        .select("id, school_name, logo_url, moto")
        .eq("slug", slugCleaned)
        .eq("is_active", true)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setSchool(data);
      }
      setSchoolLoading(false);
    };
    fetchSchool();
  }, [schoolSlug]);

  // Lockout countdown
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setTimeout(() => setLockoutSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockoutSeconds]);

  // Clear sensitive data on unmount
  useEffect(() => {
    return () => setForm(f => ({ ...f, password: "", dob: "" }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const isBotDetected = () => {
    if (honeypot) {
      setLoading(false);
      return true;
    }
    return false;
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) return;
    if (lockoutSeconds > 0) { setError(`Too many attempts. Wait ${lockoutSeconds}s.`); return; }
    setLoading(true); setError(null);

    const emailTrimmed = sanitizeInput(form.email.trim().toLowerCase(), 255);
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const maxAttempts = failedAttemptsRef.current >= 5 ? 3 : 5;
      const windowMs = failedAttemptsRef.current >= 5 ? 120_000 : 60_000;
      enforceRateLimit(`staff-login-${schoolSlug}`, maxAttempts, windowMs);

      const { error: signInError } = await signIn(emailTrimmed, form.password);
      if (signInError) {
        failedAttemptsRef.current++;
        setError("Invalid email or password. Please check your credentials and try again.");
      } else {
        failedAttemptsRef.current = 0;
        setForm(f => ({ ...f, password: "" }));
        // After successful login, the useEffect above will handle redirect + school validation
      }
    } catch (err: any) {
      setError(err.message);
      const secs = getRateLimitReset(`staff-login-${schoolSlug}`);
      if (secs > 0) setLockoutSeconds(secs);
    }
    setLoading(false);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotDetected()) return;
    setLoading(true); setError(null);

    if (!form.adm_no || !form.dob) {
      setError("Admission number and date of birth are required.");
      setLoading(false);
      return;
    }

    const admCleaned = form.adm_no.trim();
    if (!/^[a-zA-Z0-9/\-_]+$/.test(admCleaned)) {
      setError("Invalid admission number format.");
      setLoading(false);
      return;
    }

    const dobDate = new Date(form.dob);
    if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
      setError("Please enter a valid date of birth.");
      setLoading(false);
      return;
    }

    try {
      enforceRateLimit(`student-login-${schoolSlug}`, 5, 60_000);
    } catch (err: any) {
      setError(err.message);
      const secs = getRateLimitReset(`student-login-${schoolSlug}`);
      if (secs > 0) setLockoutSeconds(secs);
      setLoading(false);
      return;
    }

    const loginEmail = `${admCleaned.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@students.egrade.ke`;
    const { error: signInError } = await signIn(loginEmail, form.dob);
    if (signInError) {
      failedAttemptsRef.current++;
      setError("Invalid admission number or date of birth. Please check and try again.");
    } else {
      setForm(f => ({ ...f, dob: "" }));
    }
    setLoading(false);
  };

  if (schoolLoading || authLoading) {
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

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-destructive/10">
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">School Not Found</h1>
          <p className="text-muted-foreground text-sm">
            The school portal "<strong>{schoolSlug}</strong>" does not exist or has been suspended. Please check the URL and try again.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>Back to Homepage</Button>
        </div>
      </div>
    );
  }

  const displayLogo = school?.logo_url || logoImg;

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - School Branding */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: "hsl(24 100% 50%)" }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            <img src={displayLogo} alt={school?.school_name} className="w-14 h-14 object-contain" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight">{school?.school_name}</h1>
            {school?.moto && <p className="text-green-200 text-xs font-medium italic">"{school.moto}"</p>}
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-white text-4xl sm:text-5xl font-black leading-tight">
            Welcome to<br />
            <span style={{ color: "hsl(24 100% 60%)" }}>Your School Portal</span>
          </h2>
          <p className="text-green-200 text-lg max-w-md leading-relaxed">
            Access your CBC assessments, attendance records, fee statements, and more — all in one secure platform.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { label: "CBC Assessments", desc: "EE · ME · AE · BE Levels" },
              { label: "Fee Management", desc: "M-Pesa & Receipts" },
              { label: "Report Cards", desc: "Termly CBC Reports" },
              { label: "Real-time Updates", desc: "Notices & Alerts" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl p-3 border" style={{ background: "hsl(0 0% 100% / 0.06)", borderColor: "hsl(0 0% 100% / 0.12)" }}>
                <p className="text-white text-sm font-semibold">{f.label}</p>
                <p className="text-green-300 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-300" />
          <p className="text-green-300 text-xs">Powered by <strong className="text-white">eGrade M|S</strong> · Encrypted & Secure</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-border">
              <img src={displayLogo} alt={school?.school_name} className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground">{school?.school_name}</h1>
              <p className="text-muted-foreground text-xs">School Portal</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-foreground">
              {mode === "staff" ? "Staff Sign In" : "Student Sign In"}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === "staff"
                ? "Sign in with your school email and password"
                : "Sign in with your admission number and date of birth"}
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
                  Too many failed attempts. Please wait {lockoutSeconds} seconds.
                </p>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden p-1 bg-muted gap-1">
            {([
              { key: "staff" as AuthMode, label: "Staff / Admin", icon: School },
              { key: "student" as AuthMode, label: "Student", icon: GraduationCap },
            ]).map((m) => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  mode === m.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Honeypot - hidden from users */}
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

          {/* Staff Login */}
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
                  placeholder="name@school.ac.ke"
                  required
                  className="h-11"
                  maxLength={255}
                  autoComplete="email"
                  disabled={lockoutSeconds > 0}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <button type="button" onClick={() => navigate("/forgot-password")} className="text-xs font-medium text-primary hover:underline">
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
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
              </Button>
            </form>
          )}

          {/* Student Login */}
          {mode === "student" && (
            <form onSubmit={handleStudentLogin} className="space-y-4" autoComplete="off">
              <div className="rounded-xl border border-dashed border-accent/40 p-3 bg-accent/5">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p>Enter your <strong>Admission Number</strong> and <strong>Date of Birth</strong> as your password.</p>
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
                <Label htmlFor="dob" className="text-sm font-semibold">Date of Birth (Password)</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={handleChange}
                  required
                  className="h-11"
                  autoComplete="off"
                  disabled={lockoutSeconds > 0}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={loading || lockoutSeconds > 0}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : <><GraduationCap className="w-4 h-4" /> Student Sign In</>}
              </Button>
            </form>
          )}

          {/* Security indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Secured with SSL encryption · School-isolated data</span>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to eGrade's{" "}
            <button type="button" onClick={() => navigate("/terms")} className="text-primary font-semibold hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => navigate("/privacy")} className="text-primary font-semibold hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
