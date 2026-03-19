import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen, ClipboardList, Calendar, Loader2, TrendingUp, Clock,
  CheckCircle, XCircle, AlertCircle, FileText, BarChart3, DollarSign,
} from "lucide-react";
import FeeStatement from "@/components/finance/FeeStatement";
import { CbcBadge, CbcLevel } from "@/components/Dashboards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentTransferReport from "@/components/student/StudentTransferReport";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type AssessmentScore = {
  id: string;
  score: number | null;
  remarks: string | null;
  graded_at: string | null;
  assessment: {
    title: string;
    type: string;
    total_marks: number;
    due_date: string | null;
    subject_id: string;
    instructions: string | null;
    status: string;
  };
};

type ExamMarkRow = {
  student_id: string; score: number | null; out_of: number;
  exam: { name: string; term: string | null };
  subject_paper: { subject_id: string; paper_name: string };
};

type AttendanceRecord = {
  id: string;
  date: string;
  status: string;
  notes: string | null;
};

type Subject = { id: string; name: string };

function getLevel(score: number, total: number): CbcLevel {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 80) return "EE";
  if (pct >= 60) return "ME";
  if (pct >= 40) return "AE";
  return "BE";
}

function getLevelFromPct(pct: number): CbcLevel {
  if (pct >= 80) return "EE";
  if (pct >= 60) return "ME";
  if (pct >= 40) return "AE";
  return "BE";
}

const LEVEL_COLORS: Record<CbcLevel, string> = {
  EE: "#16a34a", ME: "#2563eb", AE: "#d97706", BE: "#dc2626",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  present: <CheckCircle className="w-4 h-4 text-green-600" />,
  absent: <XCircle className="w-4 h-4 text-red-500" />,
  late: <AlertCircle className="w-4 h-4 text-amber-500" />,
};

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [examMarks, setExamMarks] = useState<ExamMarkRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id || !profile?.school_id) return;
    const load = async () => {
      setLoading(true);
      const [scoresRes, subjectsRes, attendanceRes, examRes] = await Promise.all([
        supabase
          .from("assessment_scores")
          .select("id, score, remarks, graded_at, assessment:assessments(title, type, total_marks, due_date, subject_id, instructions, status)")
          .eq("student_id", profile.id)
          .order("graded_at", { ascending: false }),
        supabase.from("subjects").select("id, name").or(`school_id.eq.${profile.school_id},is_national.eq.true`),
        supabase
          .from("attendance")
          .select("id, date, status, notes")
          .eq("student_id", profile.id)
          .order("date", { ascending: false })
          .limit(100),
        supabase
          .from("exam_marks")
          .select("student_id, score, out_of, exam:exams(name, term), subject_paper:subject_papers(subject_id, paper_name)")
          .eq("student_id", profile.id),
      ]);
      if (scoresRes.data) setScores(scoresRes.data as any);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (attendanceRes.data) setAttendance(attendanceRes.data);
      if (examRes.data) setExamMarks(examRes.data as any);
      setLoading(false);
    };
    load();
  }, [profile?.id, profile?.school_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <EGradeLoader message="Loading student portal..." />
      </div>
    );
  }

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "—";

  // ── Assessment analysis ──
  const bySubject = scores.reduce<Record<string, AssessmentScore[]>>((acc, s) => {
    const sid = s.assessment?.subject_id;
    if (sid) { (acc[sid] = acc[sid] || []).push(s); }
    return acc;
  }, {});

  const gradedScores = scores.filter(s => s.score !== null);
  const avgPct = gradedScores.length
    ? gradedScores.reduce((sum, s) => sum + ((s.score! / s.assessment.total_marks) * 100), 0) / gradedScores.length
    : 0;

  // ── Exam analysis ──
  const examBySubject: Record<string, { marks: number; total: number }> = {};
  examMarks.filter(m => m.score !== null).forEach(m => {
    const sid = (m.subject_paper as any)?.subject_id;
    if (!sid) return;
    if (!examBySubject[sid]) examBySubject[sid] = { marks: 0, total: 0 };
    examBySubject[sid].marks += m.score!;
    examBySubject[sid].total += m.out_of;
  });

  const examSubjectData = Object.entries(examBySubject).map(([sid, d]) => {
    const pct = d.total > 0 ? (d.marks / d.total) * 100 : 0;
    return { subjectId: sid, subjectName: getSubjectName(sid), marks: d.marks, total: d.total, pct, level: getLevelFromPct(pct) };
  });

  const examAvgPct = examSubjectData.length
    ? examSubjectData.reduce((s, r) => s + r.pct, 0) / examSubjectData.length : 0;

  // ── Exam trend (by exam name) ──
  const examTrend: Record<string, { total: number; outOf: number }> = {};
  examMarks.filter(m => m.score !== null).forEach(m => {
    const name = (m.exam as any)?.name || "Unknown";
    if (!examTrend[name]) examTrend[name] = { total: 0, outOf: 0 };
    examTrend[name].total += m.score!;
    examTrend[name].outOf += m.out_of;
  });
  const trendData = Object.entries(examTrend).map(([name, d]) => ({
    exam: name.length > 15 ? name.substring(0, 15) + "…" : name,
    percentage: d.outOf > 0 ? Math.round((d.total / d.outOf) * 100) : 0,
  }));

  // ── Assessment bar chart data ──
  const assessBarData = Object.entries(bySubject).map(([sid, items]) => {
    const graded = items.filter(i => i.score !== null);
    const avg = graded.length
      ? graded.reduce((s, i) => s + ((i.score! / i.assessment.total_marks) * 100), 0) / graded.length : 0;
    return {
      subject: getSubjectName(sid).length > 10 ? getSubjectName(sid).substring(0, 10) + "…" : getSubjectName(sid),
      percentage: Math.round(avg),
      level: getLevelFromPct(avg),
    };
  });

  // ── Exam bar chart data ──
  const examBarData = examSubjectData.map(r => ({
    subject: r.subjectName.length > 10 ? r.subjectName.substring(0, 10) + "…" : r.subjectName,
    percentage: Math.round(r.pct),
    level: r.level,
  }));

  const presentCount = attendance.filter(a => a.status === "present").length;
  const attendancePct = attendance.length ? (presentCount / attendance.length * 100) : 0;
  const pendingAssignments = scores.filter(s => s.score === null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">
          Welcome, {profile?.first_name}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {profile?.adm_no ? `Adm: ${profile.adm_no} · ` : ""}Student Portal · Term 1, 2026
        </p>
      </div>

      {/* Transfer status (shown if exists) */}
      <StudentTransferReport />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Assessments", value: scores.length, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
          { label: "Average", value: `${avgPct.toFixed(0)}%`, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
          { label: "Attendance", value: `${attendancePct.toFixed(0)}%`, icon: Calendar, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Exam Subjects", value: examSubjectData.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3 mb-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="portfolio" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="portfolio" className="text-xs">Portfolio</TabsTrigger>
          <TabsTrigger value="exams" className="text-xs">Exams</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs">Assessments</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs">Fees</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs">Pending</TabsTrigger>
        </TabsList>

        {/* CBC Portfolio with chart */}
        <TabsContent value="portfolio">
          <div className="space-y-4">
            <div className="stat-card">
              <h3 className="font-bold text-foreground mb-4">CBC Performance Portfolio</h3>
              {Object.keys(bySubject).length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No graded assessments yet.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(bySubject).map(([subjectId, items]) => {
                    const graded = items.filter(i => i.score !== null);
                    const avg = graded.length
                      ? graded.reduce((s, i) => s + ((i.score! / i.assessment.total_marks) * 100), 0) / graded.length : 0;
                    const level = getLevel(avg, 100);
                    return (
                      <div key={subjectId} className="rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-bold text-foreground">{getSubjectName(subjectId)}</p>
                          <CbcBadge level={level} />
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${avg}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{graded.length} graded</span>
                          <span>Avg: {avg.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assessment bar chart */}
            {assessBarData.length > 0 && (
              <div className="stat-card">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" /> Assessment Performance
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={assessBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                      {assessBarData.map((entry, i) => (
                        <Cell key={i} fill={LEVEL_COLORS[entry.level] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Exam Results */}
        <TabsContent value="exams">
          <div className="space-y-4">
            <div className="stat-card">
              <h3 className="font-bold text-foreground mb-4">Exam Results by Subject</h3>
              {examSubjectData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No exam marks available yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Subject", "Marks", "Percentage", "Level"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {examSubjectData.map(r => (
                          <tr key={r.subjectId} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground">{r.subjectName}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{r.marks}/{r.total}</td>
                            <td className="py-2.5 px-3 font-bold">{r.pct.toFixed(0)}%</td>
                            <td className="py-2.5 px-3"><CbcBadge level={r.level} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Overall */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase">Overall Exam Average</p>
                      <p className="text-2xl font-black text-foreground">{examAvgPct.toFixed(0)}%</p>
                    </div>
                    <CbcBadge level={getLevelFromPct(examAvgPct)} />
                  </div>
                </>
              )}
            </div>

            {/* Exam charts */}
            {(examBarData.length > 0 || trendData.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {examBarData.length > 0 && (
                  <div className="stat-card">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Subject Performance (%)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={examBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                          {examBarData.map((entry, i) => (
                            <Cell key={i} fill={LEVEL_COLORS[entry.level] || "#6b7280"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {trendData.length > 1 && (
                  <div className="stat-card">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Exam Performance Trend</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="exam" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="percentage" stroke="#004000" strokeWidth={2} dot={{ r: 4 }} name="Avg %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Assessments list */}
        <TabsContent value="assessments">
          <div className="stat-card">
            <h3 className="font-bold text-foreground mb-4">All Assessments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Assessment", "Subject", "Type", "Score", "Level", "Date"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-2 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scores.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No assessments found.</td></tr>
                  ) : scores.map(s => {
                    const level = s.score !== null ? getLevel(s.score, s.assessment.total_marks) : null;
                    return (
                      <tr key={s.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-2 font-semibold text-foreground">{s.assessment.title}</td>
                        <td className="py-2.5 px-2 text-muted-foreground">{getSubjectName(s.assessment.subject_id)}</td>
                        <td className="py-2.5 px-2 capitalize text-muted-foreground">{s.assessment.type}</td>
                        <td className="py-2.5 px-2 font-bold">
                          {s.score !== null ? `${s.score}/${s.assessment.total_marks}` : "—"}
                        </td>
                        <td className="py-2.5 px-2">{level ? <CbcBadge level={level} /> : "—"}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">
                          {s.graded_at ? new Date(s.graded_at).toLocaleDateString() : "Pending"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Fee Statement */}
        <TabsContent value="fees">
          <div className="stat-card">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Fee Statement
            </h3>
            {profile?.id && profile?.school_id && (
              <FeeStatement
                studentId={profile.id}
                schoolId={profile.school_id}
                studentName={`${profile.first_name} ${profile.last_name}`}
                admNo={profile.adm_no || null}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Attendance History</h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-600" /> {attendance.filter(a => a.status === "present").length} Present</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> {attendance.filter(a => a.status === "absent").length} Absent</span>
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> {attendance.filter(a => a.status === "late").length} Late</span>
              </div>
            </div>
            {attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Date", "Status", "Notes"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-2 px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendance.map(a => (
                      <tr key={a.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-2 font-semibold text-foreground">
                          {new Date(a.date).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            {STATUS_ICON[a.status]}
                            <span className="capitalize font-medium">{a.status}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground">{a.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pending Assignments */}
        <TabsContent value="assignments">
          <div className="stat-card">
            <h3 className="font-bold text-foreground mb-4">Pending Assignments</h3>
            {pendingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No pending assignments. All caught up! 🎉</p>
            ) : (
              <div className="space-y-3">
                {pendingAssignments.map(s => (
                  <div key={s.id} className="rounded-xl border border-border p-4 hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-foreground">{s.assessment.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getSubjectName(s.assessment.subject_id)} · {s.assessment.type}
                        </p>
                      </div>
                      {s.assessment.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          Due: {new Date(s.assessment.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {s.assessment.instructions && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-lg">{s.assessment.instructions}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">Total Marks: {s.assessment.total_marks}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
