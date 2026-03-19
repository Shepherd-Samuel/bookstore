import { useNavigate } from "react-router-dom";
import {
  GraduationCap, CheckCircle2, ArrowRight, Shield, Zap, BarChart3,
  Users, DollarSign, BookOpen, FileText, Bell, ClipboardList, Globe,
  Camera, ChevronRight, Star, Award, Lock, Smartphone, Sun, Moon, Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import logoImg from "@/assets/logo.png";

const FEATURES = [
  {
    icon: BookOpen,
    title: "CBC-Aligned Assessment Engine",
    desc: "Create rubrics, input formative & summative assessments tagged to KICD Strands and Sub-strands. Generate EE/ME/AE/BE performance reports instantly.",
    color: "#004000",
  },
  {
    icon: Users,
    title: "NEMIS-Ready Enrollment",
    desc: "Capture UPI, Birth Certificate Number, guardian details & photos with real-time camera capture. Export NEMIS-format CSV for Ministry submission.",
    color: "#ff6600",
  },
  {
    icon: DollarSign,
    title: "M-Pesa Fee Management",
    desc: "Track M-Pesa references, generate PDF receipts, manage JSS & SSS fee structures, and monitor balances per student in real time.",
    color: "#2563eb",
  },
  {
    icon: Camera,
    title: "Real-Time Camera Passport Capture",
    desc: "Capture student and staff passport photos directly from any device camera — front or back. Class teachers can update student photos from their portal.",
    color: "#0891b2",
  },
  {
    icon: ClipboardList,
    title: "Class Teacher Portal",
    desc: "Dedicated portal for class teachers to view their entire class, print professional class lists, manage student passports, and track performance.",
    color: "#16a34a",
  },
  {
    icon: Bell,
    title: "Dynamic Notification System",
    desc: "Real-time notification bell with counts for pending transfers, exam approvals, and new notices. Role-based alerts keep every stakeholder informed.",
    color: "#dc2626",
  },
  {
    icon: FileText,
    title: "CBC Report Cards & Strand Assessment",
    desc: "Auto-generate termly reports with Core Competencies and Strand performance. Teachers assess per strand/sub-strand with evidence uploads.",
    color: "#7c3aed",
  },
  {
    icon: Globe,
    title: "Multi-Tenant School Portals",
    desc: "Each school gets a dedicated login portal (e.g. /s/school-name) with their branding, logo, and motto. Complete data isolation between schools.",
    color: "#4f46e5",
  },
];

const ROLES = [
  {
    icon: Award,
    role: "School Admin",
    color: "#004000",
    points: [
      "Register teachers, students & parents",
      "Create classes, streams & allocate class teachers",
      "Create exams for whole classes with multiple papers",
      "Print mark sheets & CBC report cards (PDF/CSV)",
      "Reset passwords & manage portal access",
    ],
  },
  {
    icon: GraduationCap,
    role: "Teacher",
    color: "#2563eb",
    points: [
      "Submit CBC assessments per strand/sub-strand",
      "Upload assignments & grade submissions",
      "Create MCQ & essay exams for their streams",
      "Teacher-student communication & group chats",
      "Manage learner portfolios as per MoE guidelines",
    ],
  },
  {
    icon: Smartphone,
    role: "Parent & Student",
    color: "#7c3aed",
    points: [
      "View child's CBC performance levels by strand",
      "Check fee balance & payment history",
      "Download & submit assignments",
      "Receive school announcements instantly",
      "Access personal CBC portfolio & progress",
    ],
  },
];

const STATS = [
  { value: "500+", label: "Schools Enrolled" },
  { value: "120K+", label: "Learners Managed" },
  { value: "99.9%", label: "System Uptime" },
  { value: "100%", label: "CBC Compliant" },
];

const TESTIMONIALS = [
  {
    name: "Mrs. Grace Njeru",
    role: "Principal, Nairobi JSS",
    text: "eGrade M|S transformed how we manage our CBC assessments. NEMIS exports that used to take days now take minutes.",
    stars: 5,
  },
  {
    name: "Mr. David Ochieng",
    role: "School Bursar, Mombasa Academy",
    text: "The M-Pesa integration and real-time fee tracking has eliminated manual errors completely. Parents love the instant receipts.",
    stars: 5,
  },
  {
    name: "Ms. Purity Wambua",
    role: "Class Teacher, Nakuru Primary",
    text: "Marking attendance and submitting strand-based assessments on one platform is a game-changer for our teachers.",
    stars: 5,
  },
];

// Plans removed from public landing page — visible only in school settings after demo access

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center">
              <img src={logoImg} alt="eGrade" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <span className="font-black text-foreground text-lg leading-none">eGrade M|S</span>
              <p className="text-[10px] text-muted-foreground leading-none">CBC Kenya Platform</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#roles" className="hover:text-foreground transition-colors">Who It's For</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
              title={`Theme: ${theme}`}
            >
              <ThemeIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/request-demo")}
              className="text-sm font-bold px-4 py-2 rounded-lg text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
            >
              Request Demo
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(24 100% 50%)" }} />
          <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: "hsl(120 100% 50%)" }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{ background: "hsl(24 100% 50% / 0.15)", color: "hsl(24 100% 65%)", border: "1px solid hsl(24 100% 50% / 0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              100% KICD & MoE Compliant · CBC Kenya 2026
            </div>

            <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              Kenya's Most Powerful<br />
              <span style={{ color: "hsl(24 100% 60%)" }}>CBC School Management</span><br />
              System
            </h1>

            <p className="mt-6 text-green-200 text-lg sm:text-xl max-w-2xl leading-relaxed">
              eGrade M|S is the complete digital platform built exclusively for Kenyan schools — from CBC assessments and NEMIS enrollment to M-Pesa fee management and real-time parent engagement.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/request-demo")}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: "hsl(24 100% 50%)", boxShadow: "0 8px 24px hsl(24 100% 50% / 0.5)" }}
              >
                Request Demo <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                style={{ color: "white", borderColor: "hsl(0 0% 100% / 0.3)", background: "hsl(0 0% 100% / 0.08)" }}
              >
                Explore Features <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-4">
              {["MoE Aligned", "KICD Curriculum", "NEMIS Ready", "CBC 2026", "Data Secure"].map((b) => (
                <div key={b} className="flex items-center gap-1.5 text-xs font-semibold text-green-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t max-w-7xl mx-auto" style={{ borderColor: "hsl(0 0% 100% / 0.1)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-xs font-medium text-green-300 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest mb-3">
              <Zap className="w-3.5 h-3.5" /> Key Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Everything a Kenyan School Needs</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Built specifically for Kenya's CBC curriculum — not a generic school system adapted for Kenya. Every feature follows MoE and KICD guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="stat-card group hover:border-primary/20 transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${f.color}15` }}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="roles" className="py-20" style={{ background: "hsl(var(--primary-subtle))" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-3">
              <Users className="w-3.5 h-3.5" /> Role-Based Portals
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">One Platform, Every Stakeholder</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Tailored dashboards and tools for every role — from SaaS administrators to students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROLES.map((r) => (
              <div key={r.role} className="bg-card rounded-2xl p-6 border border-border hover:border-primary/20 transition-all hover:shadow-elevated">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${r.color}18` }}>
                    <r.icon className="w-6 h-6" style={{ color: r.color }} />
                  </div>
                  <h3 className="text-lg font-black text-foreground">{r.role}</h3>
                </div>
                <ul className="space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: r.color }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI CURRICULUM FEATURE ── */}
      <section className="py-20 bg-background overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2" style={{ background: "var(--gradient-hero)" }}>
            <div className="p-10 lg:p-14 relative">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-10 right-10 w-40 h-40 rounded-full blur-3xl" style={{ background: "hsl(24 100% 50%)" }} />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-5"
                  style={{ background: "hsl(24 100% 50% / 0.2)", color: "hsl(24 100% 70%)", border: "1px solid hsl(24 100% 50% / 0.4)" }}>
                  <Zap className="w-3 h-3" /> AI-Powered Feature
                </div>
                <h2 className="text-3xl font-black text-white mb-4">Intelligent KICD Curriculum Upload</h2>
                <p className="text-green-200 leading-relaxed mb-6">
                  Upload your KICD curriculum designs as PDFs or paste content directly. Our AI analyzes the structure — strands, sub-strands, learning outcomes, inquiry questions — and feeds it accurately into the system, ready for teachers to use immediately.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Auto-detects strands & sub-strands",
                    "Extracts specific learning outcomes",
                    "Maps key inquiry questions",
                    "Links to national subject catalogue",
                    "Validates against MoE guidelines",
                  ].map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-sm text-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/request-demo")}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{ background: "hsl(24 100% 50%)" }}
                >
                  Request a Demo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-10 lg:p-14 flex items-center justify-center">
              {/* Decorative mock upload UI */}
              <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 shadow-elevated">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-subtle">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">Curriculum Upload</p>
                    <p className="text-xs text-muted-foreground">PDF or paste content</p>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-dashed border-border p-5 text-center mb-4">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold text-foreground">KICD_JSS1_Mathematics.pdf</p>
                  <p className="text-xs text-muted-foreground">4.2 MB · Term 1, 2026</p>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Strands detected", value: "8", color: "#004000" },
                    { label: "Sub-strands", value: "24", color: "#ff6600" },
                    { label: "Learning outcomes", value: "96", color: "#2563eb" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between p-2 rounded-lg" style={{ background: `${r.color}10` }}>
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-bold" style={{ color: r.color }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg p-2.5 text-xs font-semibold text-center text-primary-foreground bg-primary">
                  ✓ Successfully imported to curriculum
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-widest mb-3">
              <Star className="w-3.5 h-3.5" /> Testimonials
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Trusted by Kenyan Educators</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="stat-card">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{t.text}"</p>
                <div className="pt-4 border-t border-border">
                  <p className="font-bold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing section removed — available in school settings */}

      {/* ── SECURITY ── */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-subtle">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black text-foreground">Enterprise-Grade Security</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Every school's data is completely isolated using strict multi-tenant architecture. Student data is protected under Kenya's Data Protection Act and is never shared across schools.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {["Multi-tenant isolation", "Encrypted data at rest", "Role-based access", "Audit trails", "HTTPS everywhere", "Automated backups"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { icon: Globe, label: "Uptime SLA", value: "99.9% guaranteed", color: "#004000" },
                  { icon: Shield, label: "Data Protection", value: "Kenya Data Protection Act compliant", color: "#ff6600" },
                  { icon: BarChart3, label: "Compliance", value: "MoE & KICD guidelines", color: "#2563eb" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/20 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                      <s.icon className="w-5 h-5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: "hsl(24 100% 50%)" }} />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
            Ready to Transform Your School?
          </h2>
          <p className="text-green-200 text-lg mb-8 max-w-2xl mx-auto">
            Join 500+ Kenyan schools already using eGrade M|S. Request a demo to see it in action.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/request-demo")}
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-105"
              style={{ background: "hsl(24 100% 50%)", boxShadow: "0 8px 24px hsl(24 100% 50% / 0.5)" }}
            >
              Request Demo <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="mailto:sales@egrade.co.ke"
              className="flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold border transition-all hover:scale-105"
              style={{ color: "white", borderColor: "hsl(0 0% 100% / 0.3)", background: "hsl(0 0% 100% / 0.08)" }}
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-card py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                  <img src={logoImg} alt="eGrade" className="w-9 h-9 object-contain" />
                </div>
                <span className="font-black text-foreground text-lg">eGrade M|S</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Kenya's leading CBC-compliant school management system. Built by Elite Techs for Kenyan schools, following MoE and KICD guidelines.
              </p>
              <p className="text-xs text-muted-foreground mt-4">© 2026 Elite Techs. All rights reserved.</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Features", "Pricing", "CBC Assessments", "NEMIS Export", "Report Cards"].map((l) => (
                  <li key={l}><a href="#features" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["About Elite Techs", "Contact Us", "Privacy Policy", "Terms of Service", "Support"].map((l) => (
                  <li key={l}><a href="#" className="hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Built for Kenya's Competency-Based Curriculum (CBC) · Junior Secondary & Senior Secondary</span>
            <span>📍 Nairobi, Kenya · sales@egrade.co.ke</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
