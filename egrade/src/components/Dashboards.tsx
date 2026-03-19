import { useState, useEffect } from "react";
import TeacherTransferReview from "@/components/teacher/TeacherTransferReview";
import EGradeLoader from "@/components/ui/EGradeLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, TrendingDown, Users, DollarSign, GraduationCap, BookOpen,
  UserCheck, Bell, AlertTriangle, ArrowRight, Calendar, ClipboardList, Loader2,
} from "lucide-react";

/* ========= CBC Performance Badge ========= */
export type CbcLevel = "EE" | "ME" | "AE" | "BE";

const CBC_LEVEL_CLASSES: Record<CbcLevel, string> = {
  EE: "cbc-badge-ee",
  ME: "cbc-badge-me",
  AE: "cbc-badge-ae",
  BE: "cbc-badge-be",
};

const CBC_LEVEL_LABELS: Record<CbcLevel, string> = {
  EE: "Exceeding Expectations",
  ME: "Meeting Expectations",
  AE: "Approaching Expectations",
  BE: "Below Expectations",
};

export function CbcBadge({ level }: { level: CbcLevel }) {
  return (
    <span className={CBC_LEVEL_CLASSES[level]} title={CBC_LEVEL_LABELS[level]}>
      {level}
    </span>
  );
}

/* ========= Admin Dashboard (Real Metrics) ========= */
export function AdminDashboard() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, teachers: 0, feesCollected: 0, feeBalance: 0, attendanceToday: 0, totalToday: 0 });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [studentsRes, teachersRes, paymentsRes, categoriesRes, noticesRes, attendanceRes, classesRes] = await Promise.all([
        supabase.from("profiles").select("id, gender, class_id", { count: "exact" }).eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact" }).eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true),
        supabase.from("fee_payments").select("id, amount_paid, payment_method, payment_reference, payment_date, student:profiles!fee_payments_student_id_fkey(first_name, last_name, adm_no), fee_category:fee_categories(name)").eq("school_id", schoolId).order("payment_date", { ascending: false }).limit(5),
        supabase.from("fee_categories").select("amount, level").eq("school_id", schoolId),
        supabase.from("noticeboard").select("id, title, created_at, target_role").eq("school_id", schoolId).eq("is_active", true).order("created_at", { ascending: false }).limit(5),
        supabase.from("attendance").select("id, status").eq("school_id", schoolId).eq("date", new Date().toISOString().split("T")[0]),
        supabase.from("classes").select("id, level").eq("school_id", schoolId),
      ]);

      const studentCount = studentsRes.count || 0;
      const studentList = studentsRes.data || [];
      const teacherCount = teachersRes.count || 0;
      const cats = (categoriesRes.data || []) as { amount: number; level: string }[];
      const classLevelMap: Record<string, string> = {};
      (classesRes.data || []).forEach((c: any) => { classLevelMap[c.id] = c.level; });

      // Calculate expected fees per student based on their class level
      let expectedFees = 0;
      studentList.forEach((s: any) => {
        const level = s.class_id ? classLevelMap[s.class_id] || "primary" : "primary";
        expectedFees += cats.filter(c => c.level === "all" || c.level === level).reduce((sum, c) => sum + c.amount, 0);
      });

      // Get all payments total
      const { data: allPayments } = await supabase.from("fee_payments").select("amount_paid").eq("school_id", schoolId);
      const allPaid = (allPayments || []).reduce((s: number, p: any) => s + (p.amount_paid || 0), 0);

      const attendanceData = attendanceRes.data || [];
      const presentToday = attendanceData.filter((a: any) => a.status === "present").length;

      setStats({
        students: studentCount,
        teachers: teacherCount,
        feesCollected: allPaid,
        feeBalance: Math.max(0, expectedFees - allPaid),
        attendanceToday: presentToday,
        totalToday: attendanceData.length,
      });
      setRecentPayments(paymentsRes.data || []);
      setNotices(noticesRes.data || []);
      setLoading(false);
    };
    load();
  }, [schoolId]);

  const attendancePct = stats.totalToday > 0 ? ((stats.attendanceToday / stats.totalToday) * 100).toFixed(1) : "—";

  const formatKES = (n: number) => {
    if (n >= 1000000) return `KES ${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `KES ${(n / 1000).toFixed(0)}K`;
    return `KES ${n}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading dashboard..." /></div>;
  }

  const statCards = [
    { label: "Total Students", value: stats.students.toLocaleString(), icon: Users, color: "#004000" },
    { label: "Fees Collected", value: formatKES(stats.feesCollected), sub: `Balance: ${formatKES(stats.feeBalance)}`, icon: DollarSign, color: "#ff6600" },
    { label: "Teachers", value: stats.teachers.toString(), icon: GraduationCap, color: "#2563eb" },
    { label: "Attendance Today", value: `${attendancePct}%`, sub: `${stats.attendanceToday} / ${stats.totalToday} marked`, icon: UserCheck, color: "#16a34a" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">School Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Term 1, 2026 · Real-time metrics</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:border-primary/30 transition-colors text-foreground">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground mt-3">{s.value}</p>
            <p className="text-sm font-semibold text-foreground/80">{s.label}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="stat-card">
          <h3 className="font-bold text-foreground mb-4">Recent Fee Payments</h3>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Student", "Amount", "Method", "Date"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5">
                        <p className="font-semibold text-foreground">{p.student?.first_name} {p.student?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.student?.adm_no}</p>
                      </td>
                      <td className="py-2.5 font-bold text-foreground">KES {p.amount_paid?.toLocaleString()}</td>
                      <td className="py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          p.payment_method === "M-Pesa" ? "bg-green-100 text-green-700" :
                          p.payment_method === "Bank Transfer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>{p.payment_method}</span>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString("en-KE") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Noticeboard */}
        <div className="stat-card">
          <h3 className="font-bold text-foreground mb-4">Recent Notices</h3>
          {notices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No notices posted yet.</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-KE")} · {n.target_role === "ALL" ? "Everyone" : n.target_role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="stat-card">
        <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: UserCheck, label: "Mark Attendance", color: "#004000" },
            { icon: BookOpen, label: "Input Assessment", color: "#ff6600" },
            { icon: Users, label: "Enroll Student", color: "#2563eb" },
            { icon: DollarSign, label: "Record Payment", color: "#16a34a" },
            { icon: AlertTriangle, label: "Discipline Report", color: "#dc2626" },
            { icon: Bell, label: "Post Notice", color: "#7c3aed" },
          ].map(a => (
            <button key={a.label} className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-primary/20 hover:shadow-card transition-all text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}15` }}>
                <a.icon className="w-4 h-4" style={{ color: a.color }} />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========= Teacher Dashboard (Real Metrics) ========= */
export function TeacherDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    if (!profile?.id || !profile?.school_id) return;
    const load = async () => {
      setLoading(true);
      const [allocRes, assessRes] = await Promise.all([
        supabase.from("subject_teacher_allocations")
          .select("id, stream:streams(id, name, class_teacher_id, classes(name)), subject:subjects(name)")
          .eq("teacher_id", profile.id).eq("is_active", true),
        supabase.from("assessments").select("id, title, type, status, total_marks, due_date, stream_id, subject_id")
          .eq("teacher_id", profile.id).order("created_at", { ascending: false }).limit(5),
      ]);

      const allocs = allocRes.data || [];
      setAllocations(allocs);
      setAssessments(assessRes.data || []);

      // Count unique students in allocated streams
      const streamIds = [...new Set(allocs.map((a: any) => a.stream?.id).filter(Boolean))];
      if (streamIds.length > 0) {
        const { count } = await supabase.from("profiles").select("id", { count: "exact" })
          .eq("school_id", profile.school_id).eq("role", "student").eq("is_active", true)
          .in("stream_id", streamIds);
        setStudentCount(count || 0);
      }
      setLoading(false);
    };
    load();
  }, [profile?.id, profile?.school_id]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading dashboard..." /></div>;
  }

  // Check which streams have this teacher as class teacher
  const classTeacherStreams = allocations.filter((a: any) => a.stream?.class_teacher_id === profile?.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Welcome, {profile?.first_name}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Teacher Portal · Term 1, 2026</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "My Streams", value: allocations.length, icon: BookOpen, color: "#004000" },
          { label: "My Students", value: studentCount, icon: Users, color: "#2563eb" },
          { label: "Assessments", value: assessments.length, icon: ClipboardList, color: "#ff6600" },
          { label: "Class Teacher", value: classTeacherStreams.length, icon: UserCheck, color: "#16a34a" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="stat-card">
          <h3 className="font-bold text-foreground mb-4">My Allocations</h3>
          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No subject allocations yet.</p>
          ) : (
            <div className="space-y-3">
              {allocations.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs bg-primary text-primary-foreground">
                      {a.stream?.name?.slice(0, 3)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{a.stream?.classes?.name} — {a.stream?.name}</p>
                      <p className="text-xs text-muted-foreground">{a.subject?.name}</p>
                    </div>
                  </div>
                  {a.stream?.class_teacher_id === profile?.id && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Class Teacher</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="stat-card">
          <h3 className="font-bold text-foreground mb-4">Recent Assessments</h3>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No assessments created yet.</p>
          ) : (
            <div className="space-y-3">
              {assessments.map((a: any) => (
                <div key={a.id} className="p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground leading-tight">{a.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${a.status === "Published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.type} · {a.total_marks} marks
                    {a.due_date && ` · Due: ${new Date(a.due_date).toLocaleDateString()}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfer reviews for class teachers */}
      <TeacherTransferReview />
    </div>
  );
}

/* ========= Parent Dashboard (Real Metrics) ========= */
export function ParentDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [feeData, setFeeData] = useState({ paid: 0, total: 0 });

  useEffect(() => {
    const authUserId = profile?.id;
    const schoolId = profile?.school_id;
    if (!authUserId || !schoolId) return;
    const load = async () => {
      setLoading(true);
      
      // Resolve parent record ID from auth user ID
      const { data: parentRecord, error: parentErr } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", authUserId)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (parentErr) console.error("[ParentDash] Parent lookup error:", parentErr.message);

      const parentId = parentRecord?.id;
      
      if (!parentId) {
        console.warn("[ParentDash] No parent record found for user_id:", authUserId, "school_id:", schoolId);
        setLoading(false);
        return;
      }

      // Get linked children via student_parents
      const { data: links, error: linksErr } = await supabase.from("student_parents")
        .select("student_profile_id, student:profiles!student_parents_student_profile_id_fkey(id, first_name, last_name, adm_no, stream_id, class_id)")
        .eq("parent_id", parentId);

      if (linksErr) console.error("[ParentDash] Student links error:", linksErr.message);
      console.log("[ParentDash] Links found:", links?.length, JSON.stringify(links));

      const kids = (links || []).map((l: any) => l.student).filter(Boolean);
      setChildren(kids);

      if (kids.length > 0) {
        const kidIds = kids.map((k: any) => k.id);
        const { data: payments } = await supabase.from("fee_payments").select("amount_paid").eq("school_id", schoolId).in("student_id", kidIds);
        const paid = (payments || []).reduce((s: number, p: any) => s + (p.amount_paid || 0), 0);

        const { data: cats } = await supabase.from("fee_categories").select("amount").eq("school_id", schoolId);
        const totalCat = (cats || []).reduce((s: number, c: any) => s + (c.amount || 0), 0);

        setFeeData({ paid, total: totalCat * kids.length });
      }
      setLoading(false);
    };
    load();
  }, [profile?.id, profile?.school_id]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading dashboard..." /></div>;
  }

  const balance = Math.max(0, feeData.total - feeData.paid);
  const paidPct = feeData.total > 0 ? (feeData.paid / feeData.total) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, #004000, #006600)" }}>
        <h2 className="text-xl font-black">Parent Portal</h2>
        <p className="text-green-200 text-sm">{children.length} child(ren) enrolled</p>
      </div>

      {/* Fee Summary */}
      <div className="stat-card">
        <h3 className="font-bold text-foreground mb-3">Fee Account</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Fee</p>
            <p className="text-lg font-black text-foreground">{feeData.total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">KES</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-primary/5">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-black text-primary">{feeData.paid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">KES</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-accent/5">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-black text-accent">{balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">KES</p>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      {/* Children */}
      {children.map((child: any) => (
        <div key={child.id} className="stat-card">
          <p className="font-bold text-foreground">{child.first_name} {child.last_name}</p>
          <p className="text-xs text-muted-foreground">Adm: {child.adm_no || "—"}</p>
        </div>
      ))}

      {children.length === 0 && (
        <div className="stat-card text-center py-8">
          <p className="text-muted-foreground text-sm">No children linked to your account yet.</p>
        </div>
      )}
    </div>
  );
}
