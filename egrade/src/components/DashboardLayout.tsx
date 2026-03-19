import { ReactNode, useMemo, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  DollarSign, Bell, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, School, AlertTriangle, Menu, X,
  Package, Wrench, Bug, Upload, GraduationCap, Layers, FileText, PenTool,
  UserCog, Boxes, Shield, Sun, Moon, Sparkles, Monitor, CheckCircle2,
  Link2, ArrowRightLeft, User, LifeBuoy, MessageSquare, CalendarDays,
} from "lucide-react";
import { useTheme } from "next-themes";
import logoImg from "@/assets/logo.png";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: string[];
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "dashboard", section: "main" },
  // SaaS Admin
  { icon: School, label: "Schools", path: "schools", roles: ["saas_admin"], section: "management" },
  { icon: Package, label: "Plans", path: "plans", roles: ["saas_admin"], section: "management" },
  { icon: Upload, label: "Curriculum Upload", path: "curriculum-upload", roles: ["saas_admin"], section: "academic" },
  { icon: Layers, label: "CBC Classes", path: "classes-management", roles: ["saas_admin"], section: "academic" },
  { icon: BookOpen, label: "CBC Subjects", path: "subjects-management", roles: ["saas_admin"], section: "academic" },
  { icon: Bug, label: "Error Logs", path: "error-logs", roles: ["saas_admin"], section: "system" },
  { icon: Wrench, label: "Maintenance", path: "maintenance", roles: ["saas_admin"], section: "system" },
  { icon: MessageSquare, label: "Support Tickets", path: "support-tickets", roles: ["saas_admin"], section: "system" },
  // School Admin
  { icon: Users, label: "Members", path: "members", roles: ["school_admin"], section: "people" },
  { icon: Boxes, label: "Classes & Streams", path: "classes", roles: ["school_admin"], section: "people" },
  { icon: UserCog, label: "Teacher Allocation", path: "allocation", roles: ["school_admin"], section: "people" },
  { icon: Users, label: "Class Teachers", path: "class-teachers", roles: ["school_admin"], section: "people" },
  { icon: GraduationCap, label: "Student Enrollment", path: "students", roles: ["school_admin"], section: "people" },
  { icon: Link2, label: "Parent Linking", path: "parent-linking", roles: ["school_admin"], section: "people" },
  { icon: ArrowRightLeft, label: "Student Transfers", path: "transfers", roles: ["school_admin"], section: "people" },
  // Teacher — My Class
  { icon: Users, label: "My Class", path: "my-class", roles: ["teacher"], section: "academic" },
  // School Admin & Teacher
  { icon: ClipboardList, label: "Attendance", path: "attendance", roles: ["school_admin", "teacher"], section: "academic" },
  { icon: BookOpen, label: "CBC Assessments", path: "assessments", roles: ["school_admin", "teacher"], section: "academic" },
  { icon: Sparkles, label: "Strand Assessment", path: "cbc-strand-assessment", roles: ["school_admin", "teacher"], section: "academic" },
  { icon: Monitor, label: "Digital Exams", path: "digital-exams", roles: ["school_admin", "teacher"], section: "academic" },
  { icon: CheckCircle2, label: "Exam Approval", path: "exam-approval", roles: ["school_admin"], section: "academic" },
  { icon: BarChart3, label: "Exam Analysis", path: "exam-analysis", roles: ["school_admin"], section: "academic" },
  { icon: FileText, label: "Exams", path: "exams", roles: ["school_admin", "teacher"], section: "academic" },
  { icon: PenTool, label: "Enter Marks", path: "exam-marks", roles: ["school_admin", "teacher"], section: "academic" },
  { icon: FileText, label: "Subject Papers", path: "subject-papers", roles: ["school_admin"], section: "academic" },
  { icon: BarChart3, label: "Grading System", path: "grading", roles: ["school_admin"], section: "academic" },
  { icon: Monitor, label: "My Exams", path: "student-exams", roles: ["student"], section: "academic" },
  // Parent
  { icon: BookOpen, label: "Child Portal", path: "portal", roles: ["parent"], section: "academic" },
  { icon: ClipboardList, label: "Attendance", path: "attendance", roles: ["parent"], section: "academic" },
  { icon: DollarSign, label: "Finance", path: "finance", roles: ["school_admin", "parent"], section: "admin" },
  { icon: AlertTriangle, label: "Discipline", path: "discipline", roles: ["school_admin", "teacher"], section: "admin" },
  { icon: CalendarDays, label: "Timetable", path: "timetable", section: "academic" },
  { icon: Bell, label: "Noticeboard", path: "noticeboard", section: "communication" },
  { icon: BarChart3, label: "Reports", path: "reports", roles: ["school_admin", "saas_admin", "teacher"], section: "communication" },
  { icon: Settings, label: "Settings", path: "settings", roles: ["school_admin", "saas_admin"], section: "system" },
  { icon: Shield, label: "My Profile", path: "profile", section: "system" },
  { icon: LifeBuoy, label: "Support", path: "support", section: "system" },
];

const SECTION_LABELS: Record<string, Record<string, string>> = {
  saas_admin: { main: "Overview", management: "Platform", academic: "Curriculum", system: "System", communication: "Insights" },
  school_admin: { main: "Overview", people: "People", academic: "Academic", admin: "Administration", communication: "Communication", system: "System" },
  teacher: { main: "Overview", academic: "My Classes", admin: "School", communication: "Communication", system: "Account" },
  parent: { main: "Overview", academic: "My Children", admin: "School", communication: "Communication", system: "Account" },
  student: { main: "Overview", academic: "Learning", communication: "Communication", system: "Account" },
};

const ROLE_CONFIG: Record<string, {
  accent: string;
  accentHex: string;
  label: string;
  tagline: string;
}> = {
  saas_admin: { accent: "24 100% 50%", accentHex: "#f97316", label: "Platform Admin", tagline: "System Control" },
  school_admin: { accent: "152 70% 42%", accentHex: "#22c55e", label: "School Admin", tagline: "School Management" },
  teacher: { accent: "210 100% 52%", accentHex: "#3b82f6", label: "Teacher", tagline: "Teaching Portal" },
  parent: { accent: "270 70% 55%", accentHex: "#8b5cf6", label: "Parent", tagline: "Parent Portal" },
  student: { accent: "38 95% 50%", accentHex: "#eab308", label: "Student", tagline: "Student Portal" },
};

interface DashboardLayoutProps {
  children: ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function DashboardLayout({ children, activePage, onNavigate }: DashboardLayoutProps) {
  const { profile, effectiveRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [notifCount, setNotifCount] = useState(0);

  const role = effectiveRole;
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student;

  // Fetch school info
  useEffect(() => {
    if (!profile?.school_id) return;
    supabase.from("schools").select("logo_url, school_name, slug").eq("id", profile.school_id).single()
      .then(({ data }) => {
        if (data?.logo_url) setSchoolLogo(data.logo_url);
        if (data?.school_name) setSchoolName(data.school_name);
        if (data?.slug) setSchoolSlug(data.slug);
      });
  }, [profile?.school_id]);

  // Dynamic notification count
  useEffect(() => {
    if (!profile?.school_id || role === "saas_admin") return;

    const fetchNotifications = async () => {
      let count = 0;

      // Count active unread notices (posted in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: noticeCount } = await supabase
        .from("noticeboard")
        .select("*", { count: "exact", head: true })
        .eq("school_id", profile.school_id)
        .eq("is_active", true)
        .gte("created_at", sevenDaysAgo.toISOString())
        .or(`target_role.eq.ALL,target_role.eq.${role}`);
      count += noticeCount || 0;

      // For school admins: count pending transfers
      if (role === "school_admin") {
        const { count: transferCount } = await supabase
          .from("student_transfers")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .in("status", ["pending", "teacher_reviewed"]);
        count += transferCount || 0;

        // Pending exam approvals
        const { count: examCount } = await supabase
          .from("assessments")
          .select("*", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("approval_status", "pending");
        count += examCount || 0;
      }

      // For teachers: pending transfers assigned to them
      if (role === "teacher") {
        const { count: tCount } = await supabase
          .from("student_transfers")
          .select("*", { count: "exact", head: true })
          .eq("class_teacher_id", profile.id)
          .eq("status", "pending");
        count += tCount || 0;
      }

      setNotifCount(count);
    };

    fetchNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [profile?.school_id, profile?.id, role]);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role)),
    [role]
  );

  const groupedItems = useMemo(() => {
    const groups: { section: string; label: string; items: NavItem[] }[] = [];
    const labels = SECTION_LABELS[role] || SECTION_LABELS.student;
    const seen = new Set<string>();
    visibleItems.forEach(item => {
      const section = item.section || "main";
      if (!seen.has(section)) {
        seen.add(section);
        groups.push({ section, label: labels[section] || "", items: [] });
      }
      groups.find(g => g.section === section)!.items.push(item);
    });
    return groups;
  }, [visibleItems, role]);

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : "User";
  const userInitial = (profile?.first_name?.[0] ?? "U").toUpperCase();
  const userPhoto = profile?.passport_url;
  const displayLogo = schoolLogo || logoImg;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
          "lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[4.5rem]" : "lg:w-[15.5rem]",
          "w-[16rem]"
        )}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center px-4 py-4 border-b border-border shrink-0 relative">
          <button className="lg:hidden absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4" />
          </button>
          {collapsed ? (
            <img src={displayLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <>
              <img src={displayLogo} alt="Logo" className="w-12 h-12 rounded-xl object-contain shadow-sm border border-border" />
              <p className="mt-2 text-sm font-bold text-foreground leading-tight truncate text-center max-w-full">
                {schoolName || "eGrade M|S"}
              </p>
              {schoolSlug && role !== "saas_admin" ? (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/s/${schoolSlug}`;
                    navigator.clipboard.writeText(url);
                    import("@/hooks/use-toast").then(({ toast }) =>
                      toast({ title: "Portal URL Copied!", description: url })
                    );
                  }}
                  className="text-[10px] font-medium text-primary leading-tight mt-0.5 truncate hover:underline cursor-pointer block max-w-full text-center"
                  title={`Click to copy: ${window.location.origin}/s/${schoolSlug}`}
                >
                  /s/{schoolSlug}
                </button>
              ) : (
                <p className="text-[10px] font-medium text-muted-foreground leading-tight mt-0.5 text-center">{config.tagline}</p>
              )}
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-hover" style={{ scrollbarWidth: 'none' }} onMouseEnter={e => (e.currentTarget.style.scrollbarWidth = 'thin')} onMouseLeave={e => (e.currentTarget.style.scrollbarWidth = 'none')}>
          {groupedItems.map((group) => (
            <div key={group.section}>
              {group.label && !collapsed && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              {collapsed && group.label && <div className="my-2 mx-2 h-px bg-border" />}
              {group.items.map((item) => {
                const isActive = activePage === item.path;
                return (
                  <button
                    key={item.path + item.label}
                    onClick={() => { onNavigate(item.path); setMobileOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
                      collapsed ? "justify-center p-2.5 mx-auto" : "px-3 py-2",
                      isActive
                        ? "bg-foreground text-background font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && !collapsed && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: config.accentHex }}
                      />
                    )}
                    <item.icon className="shrink-0 w-[18px] h-[18px]" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border shrink-0">
          {!collapsed && (
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[9px] text-muted-foreground/50 text-center uppercase tracking-widest font-medium">Powered by</p>
              <p className="text-[11px] font-bold text-muted-foreground text-center">eGrade M|S</p>
            </div>
          )}
          <div className="p-2">
            <div className={cn(
              "flex items-center rounded-lg",
              collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors"
            )}>
              {/* User avatar in sidebar */}
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border-2 border-border shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: config.accentHex }}
                >
                  {userInitial}
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-none">{userName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{config.label}</p>
                  </div>
                  <button onClick={signOut} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Sign out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {collapsed && (
              <button onClick={signOut} className="w-full flex justify-center mt-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-[3.25rem] w-6 h-6 rounded-full border border-border bg-card items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="shrink-0 flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-foreground truncate">
              {NAV_ITEMS.find(n => n.path === activePage)?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {/* User avatar in header */}
            {userPhoto ? (
              <img
                src={userPhoto}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-border hidden sm:block cursor-pointer"
                onClick={() => onNavigate("profile")}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full hidden sm:flex items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                style={{ background: config.accentHex }}
                onClick={() => onNavigate("profile")}
              >
                {userInitial}
              </div>
            )}
            <span className="hidden sm:inline-block text-xs font-semibold text-foreground truncate max-w-[100px]">
              {profile?.first_name || "User"}
            </span>
            <span
              className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-1 rounded-full text-white uppercase tracking-wide"
              style={{ background: config.accentHex }}
            >
              {config.label}
            </span>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <button
              className="relative p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              onClick={() => onNavigate("noticeboard")}
              title={notifCount > 0 ? `${notifCount} notifications` : "No new notifications"}
            >
              <Bell className="w-[18px] h-[18px]" />
              {notifCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
                  style={{ background: config.accentHex }}
                >
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
