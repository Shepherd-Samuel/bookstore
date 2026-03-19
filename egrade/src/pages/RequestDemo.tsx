import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enforceRateLimit } from "@/lib/rateLimit";
import logoImg from "@/assets/logo.png";

export default function RequestDemo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ school_name: "", contact_name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_name || !form.contact_name || !form.email) {
      setError("School name, contact name, and email are required.");
      return;
    }
    try { enforceRateLimit("demo-request", 3, 120_000); } catch (err: any) { setError(err.message); return; }
    setLoading(true); setError(null);
    setSuccess("Demo request submitted! Our team will contact you within 24 hours with temporary access credentials.");
    toast({ title: "Demo Request Sent", description: "We'll get back to you within 24 hours." });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
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
        <div className="relative z-10 space-y-4">
          <h2 className="text-white text-4xl sm:text-5xl font-black leading-tight">
            Experience the<br />
            <span style={{ color: "hsl(24 100% 60%)" }}>Future of School</span><br />
            Management
          </h2>
          <p className="text-green-200 text-lg max-w-md leading-relaxed">
            Get a personalized demo of eGrade M|S and see how it can transform your school's CBC assessment, enrollment, and fee management.
          </p>
          <div className="space-y-2">
            {["Full CBC assessment engine walkthrough", "NEMIS enrollment demo", "M-Pesa fee management setup", "Personalized onboarding plan"].map((p) => (
              <div key={p} className="flex items-center gap-2 text-sm text-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-green-300 text-xs">Trusted by <strong className="text-white">500+</strong> Kenyan schools</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
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
            <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-primary hover:underline font-medium mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Homepage
            </button>
            <h2 className="text-3xl font-black text-foreground">Request Demo Access</h2>
            <p className="text-muted-foreground mt-1">Get temporary access to explore the full platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">School Name *</Label>
                <Input value={form.school_name} onChange={e => setForm(p => ({ ...p, school_name: e.target.value }))}
                  placeholder="Nairobi JSS" required className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Contact Name *</Label>
                <Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                  placeholder="John Kamau" required className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@school.ac.ke" required className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Phone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+254 700 000000" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Message (optional)</Label>
              <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Tell us about your school..." rows={3} />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ background: "hsl(var(--cbc-ee) / 0.1)", border: "1px solid hsl(var(--cbc-ee) / 0.3)", color: "hsl(var(--cbc-ee))" }}>
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Request Demo Access</>}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By submitting, you agree to eGrade's{" "}
            <button type="button" onClick={() => navigate("/terms")} className="text-primary font-semibold hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => navigate("/privacy")} className="text-primary font-semibold hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
