import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, TrendingUp, TrendingDown, Users, BookOpen, Filter,
  Loader2, Award, Target, AlertTriangle, Download, FileSpreadsheet,
  Calendar, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import CompareTab from "@/components/exam-analysis/CompareTab";
import { useGradingScale } from "@/hooks/useGradingScale";

type Exam = { id: string; name: string; term: string | null; academic_year: string | null; is_active: boolean; created_at: string };
type ClassItem = { id: string; name: string; level: string };
type Stream = { id: string; name: string; class_id: string; class_teacher_id: string | null };
type Allocation = { id: string; teacher_id: string; subject_id: string; stream_id: string };
type Subject = { id: string; name: string };
type SubjectPaper = { id: string; paper_name: string; subject_id: string; class_id: string | null; default_out_of: number };
type ExamMark = {
  id: string; exam_id: string; student_id: string; subject_paper_id: string;
  score: number | null; out_of: number; school_id: string; graded_by: string | null;
};
type Profile = { id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null; class_id: string | null };

const GRADE_COLORS = ["hsl(142, 71%, 45%)", "hsl(200, 80%, 50%)", "hsl(45, 93%, 47%)", "hsl(16, 90%, 50%)", "hsl(0, 72%, 51%)"];
const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(200, 80%, 50%)", "hsl(45, 93%, 47%)", "hsl(16, 90%, 50%)", "hsl(0, 72%, 51%)"];
const TREND_COLORS = ["hsl(var(--primary))", "hsl(142, 71%, 45%)", "hsl(200, 80%, 50%)", "hsl(45, 93%, 47%)", "hsl(16, 90%, 50%)", "hsl(280, 65%, 60%)", "hsl(330, 70%, 55%)"];

function downloadCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => {
      const val = String(r[h] ?? "");
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function ExamAnalysisPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id;
  const { getGrade, getPoints, getGradeDistribution, gradeNames } = useGradingScale(schoolId);

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<SubjectPaper[]>([]);
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  // Trend data — marks for ALL exams in the selected class
  const [allClassMarks, setAllClassMarks] = useState<ExamMark[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // Filters
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStream, setSelectedStream] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Load base data
  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoading(true);
      const [exR, clR, stR, suR, spR, prR, trR, alR] = await Promise.all([
        supabase.from("exams").select("id, name, term, academic_year, is_active, created_at").eq("school_id", schoolId).order("created_at", { ascending: true }),
        supabase.from("classes").select("id, name, level").eq("is_active", true).order("name"),
        supabase.from("streams").select("id, name, class_id, class_teacher_id").eq("school_id", schoolId).eq("is_active", true).order("name"),
        supabase.from("subjects").select("id, name").eq("is_active", true).order("name"),
        supabase.from("subject_papers").select("id, paper_name, subject_id, class_id, default_out_of").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id, class_id").eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).in("role", ["teacher", "school_admin"]).eq("is_active", true),
        supabase.from("subject_teacher_allocations").select("id, teacher_id, subject_id, stream_id").eq("school_id", schoolId).eq("is_active", true),
      ]);
      setExams(exR.data || []);
      setClasses(clR.data || []);
      setStreams(stR.data || []);
      setSubjects(suR.data || []);
      setPapers(spR.data || []);
      setStudents(prR.data || []);
      setTeachers(trR.data || []);
      setAllocations(alR.data || []);
      setLoading(false);
    })();
  }, [schoolId]);

  // Load marks for selected exam
  useEffect(() => {
    if (!selectedExam || !schoolId) { setMarks([]); return; }
    (async () => {
      setAnalysisLoading(true);
      const { data } = await supabase.from("exam_marks")
        .select("id, exam_id, student_id, subject_paper_id, score, out_of, school_id, graded_by")
        .eq("school_id", schoolId).eq("exam_id", selectedExam);
      setMarks(data || []);
      setAnalysisLoading(false);
    })();
  }, [selectedExam, schoolId]);

  // Load ALL marks for the selected class (for trends)
  useEffect(() => {
    if (!selectedClass || !schoolId) { setAllClassMarks([]); return; }
    (async () => {
      setTrendLoading(true);
      // Get student IDs in this class
      const classStudentIds = students.filter(s => s.class_id === selectedClass).map(s => s.id);
      if (!classStudentIds.length) { setAllClassMarks([]); setTrendLoading(false); return; }

      // Fetch marks in batches of 50 student IDs
      const allMarks: ExamMark[] = [];
      for (let i = 0; i < classStudentIds.length; i += 50) {
        const batch = classStudentIds.slice(i, i + 50);
        const { data } = await supabase.from("exam_marks")
          .select("id, exam_id, student_id, subject_paper_id, score, out_of, school_id, graded_by")
          .eq("school_id", schoolId)
          .in("student_id", batch);
        if (data) allMarks.push(...data);
      }
      setAllClassMarks(allMarks);
      setTrendLoading(false);
    })();
  }, [selectedClass, schoolId, students]);

  // Derived filter options
  const terms = useMemo(() => [...new Set(exams.map(e => e.term).filter(Boolean))], [exams]);
  const filteredExams = useMemo(() =>
    selectedTerm === "all" ? exams : exams.filter(e => e.term === selectedTerm),
  [exams, selectedTerm]);

  const filteredStreams = useMemo(() =>
    selectedClass ? streams.filter(s => s.class_id === selectedClass) : streams,
  [streams, selectedClass]);

  const filteredStudents = useMemo(() => {
    let s = students;
    if (selectedClass) s = s.filter(st => st.class_id === selectedClass);
    if (selectedStream !== "all") s = s.filter(st => st.stream_id === selectedStream);
    return s;
  }, [students, selectedClass, selectedStream]);

  const studentIds = useMemo(() => new Set(filteredStudents.map(s => s.id)), [filteredStudents]);

  const filteredMarks = useMemo(() => {
    let m = marks.filter(mk => studentIds.has(mk.student_id));
    if (selectedSubject !== "all") {
      const subjectPaperIds = new Set(papers.filter(p => p.subject_id === selectedSubject).map(p => p.id));
      m = m.filter(mk => subjectPaperIds.has(mk.subject_paper_id));
    }
    return m;
  }, [marks, studentIds, selectedSubject, papers]);

  // ── Analytics ──

  const overallStats = useMemo(() => {
    const scored = filteredMarks.filter(m => m.score !== null);
    if (!scored.length) return null;
    const percentages = scored.map(m => ((m.score || 0) / m.out_of) * 100);
    const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const totalStudents = new Set(scored.map(m => m.student_id)).size;
    const passCount = percentages.filter(p => p >= 40).length;
    const passRate = (passCount / percentages.length) * 100;
    return { mean, highest, lowest, totalStudents, totalEntries: scored.length, passRate };
  }, [filteredMarks]);

  const subjectAnalysis = useMemo(() => {
    const scored = filteredMarks.filter(m => m.score !== null);
    const byPaper: Record<string, { scores: number[] }> = {};
    scored.forEach(m => {
      if (!byPaper[m.subject_paper_id]) byPaper[m.subject_paper_id] = { scores: [] };
      byPaper[m.subject_paper_id].scores.push(((m.score || 0) / m.out_of) * 100);
    });
    return Object.entries(byPaper).map(([paperId, data]) => {
      const paper = papers.find(p => p.id === paperId);
      const subject = paper ? subjects.find(s => s.id === paper.subject_id) : null;
      const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      return {
        name: subject ? `${subject.name}${paper ? ` (${paper.paper_name})` : ""}` : paperId.slice(0, 8),
        subjectName: subject?.name || "Unknown",
        avg: Math.round(avg * 10) / 10,
        highest: Math.round(Math.max(...data.scores) * 10) / 10,
        lowest: Math.round(Math.min(...data.scores) * 10) / 10,
        count: data.scores.length,
      };
    }).sort((a, b) => b.avg - a.avg);
  }, [filteredMarks, papers, subjects]);

  const gradeDistribution = useMemo(() => {
    const scored = filteredMarks.filter(m => m.score !== null);
    const percentages = scored.map(m => ((m.score || 0) / m.out_of) * 100);
    return getGradeDistribution(percentages);
  }, [filteredMarks, getGradeDistribution]);

  const streamComparison = useMemo(() => {
    if (selectedStream !== "all") return [];
    const scored = filteredMarks.filter(m => m.score !== null);
    const byStream: Record<string, number[]> = {};
    scored.forEach(m => {
      const student = students.find(s => s.id === m.student_id);
      if (!student?.stream_id) return;
      if (!byStream[student.stream_id]) byStream[student.stream_id] = [];
      byStream[student.stream_id].push(((m.score || 0) / m.out_of) * 100);
    });
    return Object.entries(byStream).map(([streamId, scores]) => {
      const stream = streams.find(s => s.id === streamId);
      return {
        name: stream?.name || "Unknown",
        average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        students: new Set(scored.filter(m => students.find(s => s.id === m.student_id)?.stream_id === streamId).map(m => m.student_id)).size,
      };
    }).sort((a, b) => b.average - a.average);
  }, [filteredMarks, students, streams, selectedStream]);

  const studentRanking = useMemo(() => {
    const scored = filteredMarks.filter(m => m.score !== null);
    const byStudent: Record<string, { total: number; outOf: number }> = {};
    scored.forEach(m => {
      if (!byStudent[m.student_id]) byStudent[m.student_id] = { total: 0, outOf: 0 };
      byStudent[m.student_id].total += (m.score || 0);
      byStudent[m.student_id].outOf += m.out_of;
    });
    return Object.entries(byStudent).map(([sid, data]) => {
      const student = students.find(s => s.id === sid);
      const stream = student?.stream_id ? streams.find(st => st.id === student.stream_id) : null;
      const pct = (data.total / data.outOf) * 100;
      return {
        id: sid,
        name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
        admNo: student?.adm_no || "—",
        stream: stream?.name || "—",
        total: data.total,
        outOf: data.outOf,
        percentage: Math.round(pct * 10) / 10,
        grade: getGrade(pct),
        points: getPoints(pct),
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [filteredMarks, students, streams, getGrade, getPoints]);

  const teacherPerformance = useMemo(() => {
    const scored = filteredMarks.filter(m => m.score !== null);
    if (!scored.length) return [];

    // Build teacher -> subject_paper_ids mapping from allocations
    const teacherPaperMap: Record<string, Set<string>> = {};
    const teacherRoles: Record<string, Set<string>> = {};

    // 1. Subject teacher allocations
    allocations.forEach(alloc => {
      if (!teacherPaperMap[alloc.teacher_id]) teacherPaperMap[alloc.teacher_id] = new Set();
      if (!teacherRoles[alloc.teacher_id]) teacherRoles[alloc.teacher_id] = new Set();
      // Find papers for this subject
      papers.filter(p => p.subject_id === alloc.subject_id).forEach(p => {
        teacherPaperMap[alloc.teacher_id].add(p.id);
      });
      const subName = subjects.find(s => s.id === alloc.subject_id)?.name;
      if (subName) teacherRoles[alloc.teacher_id].add(subName);
    });

    // 2. Class teachers — they get visibility into ALL papers for their stream's students
    streams.forEach(stream => {
      if (!stream.class_teacher_id) return;
      const tid = stream.class_teacher_id;
      if (!teacherPaperMap[tid]) teacherPaperMap[tid] = new Set();
      if (!teacherRoles[tid]) teacherRoles[tid] = new Set();
      teacherRoles[tid].add(`Class Teacher – ${stream.name}`);
      // Add all papers for students in this stream
      const streamStudentIds = new Set(students.filter(s => s.stream_id === stream.id).map(s => s.id));
      scored.filter(m => streamStudentIds.has(m.student_id)).forEach(m => {
        teacherPaperMap[tid].add(m.subject_paper_id);
      });
    });

    // 3. Also include graded_by teachers not captured above
    scored.forEach(m => {
      if (!m.graded_by) return;
      if (!teacherPaperMap[m.graded_by]) teacherPaperMap[m.graded_by] = new Set();
      if (!teacherRoles[m.graded_by]) teacherRoles[m.graded_by] = new Set();
      teacherPaperMap[m.graded_by].add(m.subject_paper_id);
    });

    // Calculate averages per teacher based on their allocated papers
    return Object.entries(teacherPaperMap).map(([tid, paperIds]) => {
      const teacherMarks = scored.filter(m => paperIds.has(m.subject_paper_id));
      if (!teacherMarks.length) return null;
      const pcts = teacherMarks.map(m => ((m.score || 0) / m.out_of) * 100);
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      const teacher = teachers.find(t => t.id === tid);
      return {
        name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "Unknown",
        average: Math.round(avg * 10) / 10,
        entries: teacherMarks.length,
        role: teacherRoles[tid] ? [...teacherRoles[tid]].join(", ") : "—",
      };
    }).filter(Boolean).sort((a, b) => b!.average - a!.average) as { name: string; average: number; entries: number; role: string }[];
  }, [filteredMarks, teachers, allocations, papers, subjects, streams, students]);

  // ── Term-over-term trends ──
  const trendData = useMemo(() => {
    if (!selectedClass || !allClassMarks.length) return { overall: [], bySubject: [], byStream: [], examNames: [] as string[] };

    const classStudentIds = new Set(students.filter(s => s.class_id === selectedClass).map(s => s.id));
    const relevantMarks = allClassMarks.filter(m => m.score !== null && classStudentIds.has(m.student_id));

    // Group by exam
    const byExam: Record<string, ExamMark[]> = {};
    relevantMarks.forEach(m => {
      if (!byExam[m.exam_id]) byExam[m.exam_id] = [];
      byExam[m.exam_id].push(m);
    });

    // Sort exams chronologically
    const examOrder = exams
      .filter(e => byExam[e.id])
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Overall trend
    const overall = examOrder.map(exam => {
      const examMarks = byExam[exam.id];
      const pcts = examMarks.map(m => ((m.score || 0) / m.out_of) * 100);
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      const passRate = (pcts.filter(p => p >= 40).length / pcts.length) * 100;
      return {
        exam: `${exam.name}`,
        label: `${exam.term || ""} ${exam.academic_year || ""}`.trim(),
        average: Math.round(avg * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        students: new Set(examMarks.map(m => m.student_id)).size,
      };
    });

    // By subject trend
    const allSubjectIds = new Set<string>();
    relevantMarks.forEach(m => {
      const paper = papers.find(p => p.id === m.subject_paper_id);
      if (paper) allSubjectIds.add(paper.subject_id);
    });

    const bySubject = examOrder.map(exam => {
      const examMarks = byExam[exam.id];
      const row: Record<string, string | number> = { exam: exam.name };
      allSubjectIds.forEach(subId => {
        const subPaperIds = new Set(papers.filter(p => p.subject_id === subId).map(p => p.id));
        const subMarks = examMarks.filter(m => subPaperIds.has(m.subject_paper_id));
        if (subMarks.length) {
          const avg = subMarks.reduce((a, m) => a + ((m.score || 0) / m.out_of) * 100, 0) / subMarks.length;
          const subName = subjects.find(s => s.id === subId)?.name || "Unknown";
          row[subName] = Math.round(avg * 10) / 10;
        }
      });
      return row;
    });

    // By stream trend
    const allStreamIds = new Set<string>();
    relevantMarks.forEach(m => {
      const st = students.find(s => s.id === m.student_id);
      if (st?.stream_id) allStreamIds.add(st.stream_id);
    });

    const byStream = examOrder.map(exam => {
      const examMarks = byExam[exam.id];
      const row: Record<string, string | number> = { exam: exam.name };
      allStreamIds.forEach(streamId => {
        const streamStudentIds = new Set(students.filter(s => s.stream_id === streamId).map(s => s.id));
        const streamMarks = examMarks.filter(m => streamStudentIds.has(m.student_id));
        if (streamMarks.length) {
          const avg = streamMarks.reduce((a, m) => a + ((m.score || 0) / m.out_of) * 100, 0) / streamMarks.length;
          const streamName = streams.find(s => s.id === streamId)?.name || "Unknown";
          row[streamName] = Math.round(avg * 10) / 10;
        }
      });
      return row;
    });

    const subjectNames = [...allSubjectIds].map(id => subjects.find(s => s.id === id)?.name || "Unknown");
    const streamNames = [...allStreamIds].map(id => streams.find(s => s.id === id)?.name || "Unknown");

    return { overall, bySubject, byStream, subjectNames, streamNames, examNames: examOrder.map(e => e.name) };
  }, [allClassMarks, selectedClass, students, exams, papers, subjects, streams]);

  // ── Export handlers ──
  const handleExportCSV = useCallback((type: "ranking" | "subjects" | "grades" | "teachers" | "trends") => {
    const examName = exams.find(e => e.id === selectedExam)?.name || "exam";
    const className = classes.find(c => c.id === selectedClass)?.name || "class";

    switch (type) {
      case "ranking":
        downloadCSV(studentRanking.map((s, i) => ({
          Rank: i + 1, Name: s.name, "Adm No": s.admNo, Stream: s.stream,
          Total: s.total, "Out Of": s.outOf, "Percentage": s.percentage, Grade: s.grade, Points: s.points,
        })), `${examName}_${className}_ranking`);
        break;
      case "subjects":
        downloadCSV(subjectAnalysis.map(s => ({
          Subject: s.name, "Average %": s.avg, "Highest %": s.highest, "Lowest %": s.lowest, Entries: s.count,
        })), `${examName}_${className}_subjects`);
        break;
      case "grades":
        downloadCSV(gradeDistribution.map(g => ({
          Grade: g.grade, Count: g.count, "Percentage": `${g.percentage}%`,
        })), `${examName}_${className}_grades`);
        break;
      case "teachers":
        downloadCSV(teacherPerformance.map(t => ({
          Teacher: t.name, "Role / Subjects": t.role, "Average %": t.average, "Entries": t.entries,
        })), `${examName}_${className}_teachers`);
        break;
      case "trends":
        if (trendData.overall.length) {
          downloadCSV(trendData.overall.map(t => ({
            Exam: t.exam, Term: t.label, "Average %": t.average, "Pass Rate %": t.passRate, Students: t.students,
          })), `${className}_trend_analysis`);
        }
        break;
    }
    toast({ title: "Exported", description: `${type} data downloaded as CSV` });
  }, [selectedExam, selectedClass, exams, classes, studentRanking, subjectAnalysis, gradeDistribution, teacherPerformance, trendData, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedExamData = exams.find(e => e.id === selectedExam);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Exam Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            In-depth performance analysis across classes, streams, subjects, and teachers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Term</label>
            <Select value={selectedTerm} onValueChange={v => { setSelectedTerm(v); setSelectedExam(""); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map(t => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Exam *</label>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select exam" /></SelectTrigger>
              <SelectContent>
                {filteredExams.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.academic_year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Class *</label>
            <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedStream("all"); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Stream <span className="text-muted-foreground/60">(optional)</span></label>
            <Select value={selectedStream} onValueChange={setSelectedStream}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                {filteredStreams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Subject <span className="text-muted-foreground/60">(optional)</span></label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Require exam + class */}
      {(!selectedExam || !selectedClass) && (
        <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-bold text-foreground">Select an Exam and Class to begin analysis</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Choose the exam and class from the filters above. You can optionally narrow down by stream or subject.
          </p>
        </div>
      )}

      {selectedExam && selectedClass && (
        <>
          {analysisLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredMarks.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="font-bold text-foreground">No marks data found</p>
              <p className="text-sm text-muted-foreground">No marks have been entered for this exam with the selected filters.</p>
            </div>
          ) : (
            <>
              {/* Exam badge + export */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedExamData && (
                    <>
                      <Badge variant="outline" className="text-xs font-bold">{selectedExamData.name}</Badge>
                      <Badge variant="secondary" className="text-xs">{selectedExamData.term} {selectedExamData.academic_year}</Badge>
                      <Badge variant="secondary" className="text-xs">{filteredStudents.length} students</Badge>
                      <Badge variant="secondary" className="text-xs">{filteredMarks.length} entries</Badge>
                    </>
                  )}
                </div>
              </div>

              {/* Summary cards */}
              {overallStats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <StatCard icon={Target} label="Mean Score" value={`${overallStats.mean.toFixed(1)}%`} color="text-primary" />
                  <StatCard icon={TrendingUp} label="Highest" value={`${overallStats.highest.toFixed(1)}%`} color="text-green-600" />
                  <StatCard icon={TrendingDown} label="Lowest" value={`${overallStats.lowest.toFixed(1)}%`} color="text-destructive" />
                  <StatCard icon={Users} label="Students" value={String(overallStats.totalStudents)} color="text-blue-600" />
                  <StatCard icon={BookOpen} label="Entries" value={String(overallStats.totalEntries)} color="text-amber-600" />
                  <StatCard icon={Award} label="Pass Rate" value={`${overallStats.passRate.toFixed(1)}%`} color="text-green-600" />
                </div>
              )}

              {/* Tabbed analysis */}
              <Tabs defaultValue="subjects" className="space-y-4">
                <TabsList className="h-auto flex-wrap">
                  <TabsTrigger value="subjects" className="text-xs gap-1"><BookOpen className="w-3 h-3" /> Subjects</TabsTrigger>
                  <TabsTrigger value="grades" className="text-xs gap-1"><Award className="w-3 h-3" /> Grades</TabsTrigger>
                  <TabsTrigger value="streams" className="text-xs gap-1"><Users className="w-3 h-3" /> Streams</TabsTrigger>
                  <TabsTrigger value="ranking" className="text-xs gap-1"><TrendingUp className="w-3 h-3" /> Ranking</TabsTrigger>
                  <TabsTrigger value="teachers" className="text-xs gap-1"><Target className="w-3 h-3" /> Teachers</TabsTrigger>
                  <TabsTrigger value="trends" className="text-xs gap-1"><Calendar className="w-3 h-3" /> Trends</TabsTrigger>
                  <TabsTrigger value="compare" className="text-xs gap-1"><ArrowLeftRight className="w-3 h-3" /> Compare</TabsTrigger>
                </TabsList>

                {/* ── Subjects Tab ── */}
                <TabsContent value="subjects" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleExportCSV("subjects")}>
                      <FileSpreadsheet className="w-3 h-3" /> Export CSV
                    </Button>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <h3 className="text-sm font-bold text-foreground mb-4">Subject Performance (Average %)</h3>
                    {subjectAnalysis.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(250, subjectAnalysis.length * 40)}>
                        <BarChart data={subjectAnalysis} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Average" />
                          <Bar dataKey="highest" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} name="Highest" />
                          <Bar dataKey="lowest" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} name="Lowest" />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-sm text-muted-foreground text-center py-8">No subject data available</p>}
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="border-b border-border">
                          {["Subject / Paper", "Avg %", "Highest", "Lowest", "Entries"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {subjectAnalysis.map(s => (
                          <tr key={s.name} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-semibold text-foreground text-xs">{s.name}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs font-bold ${s.avg >= 60 ? "text-green-600" : s.avg >= 40 ? "text-amber-600" : "text-destructive"}`}>{s.avg}%</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-green-600 font-medium">{s.highest}%</td>
                            <td className="px-4 py-2.5 text-xs text-destructive font-medium">{s.lowest}%</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* ── Grades Tab ── */}
                <TabsContent value="grades" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleExportCSV("grades")}>
                      <FileSpreadsheet className="w-3 h-3" /> Export CSV
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card rounded-xl border border-border p-4">
                      <h3 className="text-sm font-bold text-foreground mb-4">Grade Distribution</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={gradeDistribution.filter(g => g.count > 0)} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ grade, percentage }) => `${grade}: ${percentage}%`}>
                            {gradeDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4">
                      <h3 className="text-sm font-bold text-foreground mb-4">Grade Breakdown</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={gradeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                            {gradeDistribution.map((_, i) => <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[350px]">
                      <thead>
                        <tr className="border-b border-border">
                          {["Grade", "Range", "Count", "Percentage"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {gradeDistribution.map((g, i) => (
                          <tr key={g.grade} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5">
                              <span className="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: GRADE_COLORS[i] }}>{g.grade}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {g.grade === "A" ? "80-100%" : g.grade === "B" ? "60-79%" : g.grade === "C" ? "40-59%" : g.grade === "D" ? "20-39%" : "0-19%"}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-bold text-foreground">{g.count}</td>
                            <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{g.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* ── Streams Tab ── */}
                <TabsContent value="streams" className="space-y-4">
                  {streamComparison.length > 0 ? (
                    <>
                      <div className="bg-card rounded-xl border border-border p-4">
                        <h3 className="text-sm font-bold text-foreground mb-4">Stream Comparison (Average %)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={streamComparison}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="average" fill="hsl(var(--primary))" name="Average %" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {streamComparison.map((s, i) => (
                          <div key={s.name} className="bg-card rounded-xl border border-border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-sm">{s.name}</span>
                              <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">#{i + 1}</Badge>
                            </div>
                            <p className="text-2xl font-black text-primary">{s.average}%</p>
                            <p className="text-xs text-muted-foreground">{s.students} students</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-card rounded-xl border border-border p-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        {selectedStream !== "all" ? "Select 'All Streams' to see stream comparison." : "No stream data available."}
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Ranking Tab ── */}
                <TabsContent value="ranking" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleExportCSV("ranking")}>
                      <FileSpreadsheet className="w-3 h-3" /> Export CSV
                    </Button>
                  </div>
                  <div className="bg-card rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border">
                          {["#", "Student", "Adm No", "Stream", "Total", "Out Of", "%", "Grade", "Points"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {studentRanking.slice(0, 50).map((s, i) => (
                          <tr key={s.id} className={`hover:bg-muted/30 ${i < 3 ? "bg-primary/5" : ""}`}>
                            <td className="px-3 py-2.5 text-xs font-bold text-foreground">
                              {i < 3 ? (
                                <span className="inline-flex w-6 h-6 items-center justify-center rounded-full text-white text-[10px] font-black" style={{ background: i === 0 ? "hsl(45, 93%, 47%)" : i === 1 ? "hsl(0, 0%, 65%)" : "hsl(25, 60%, 45%)" }}>
                                  {i + 1}
                                </span>
                              ) : i + 1}
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-foreground text-xs">{s.name}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.admNo}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.stream}</td>
                            <td className="px-3 py-2.5 text-xs font-bold text-foreground">{s.total}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.outOf}</td>
                            <td className="px-3 py-2.5">
                              <span className={`text-xs font-bold ${s.percentage >= 60 ? "text-green-600" : s.percentage >= 40 ? "text-amber-600" : "text-destructive"}`}>{s.percentage}%</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                s.percentage >= 80 ? "bg-green-100 text-green-700" : s.percentage >= 60 ? "bg-blue-100 text-blue-700" :
                                s.percentage >= 40 ? "bg-amber-100 text-amber-700" : s.percentage >= 20 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                              }`}>{s.grade}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-bold text-foreground">{s.points}</td>
                          </tr>
                        ))}
                        {studentRanking.length === 0 && (
                          <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No ranking data</td></tr>
                        )}
                      </tbody>
                    </table>
                    {studentRanking.length > 50 && (
                      <div className="px-4 py-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">Showing top 50 of {studentRanking.length} students</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Teachers Tab ── */}
                <TabsContent value="teachers" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleExportCSV("teachers")}>
                      <FileSpreadsheet className="w-3 h-3" /> Export CSV
                    </Button>
                  </div>
                  {teacherPerformance.length > 0 ? (
                    <>
                      <div className="bg-card rounded-xl border border-border p-4">
                        <h3 className="text-sm font-bold text-foreground mb-4">Teacher Performance (Subject & Class Teacher Analysis)</h3>
                        <ResponsiveContainer width="100%" height={Math.max(200, teacherPerformance.length * 45)}>
                          <BarChart data={teacherPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="average" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Average %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-card rounded-xl border border-border overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead>
                            <tr className="border-b border-border">
                              {["Teacher", "Role / Subjects", "Avg %", "Entries"].map(h => (
                                <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {teacherPerformance.map(t => (
                              <tr key={t.name} className="hover:bg-muted/30">
                                <td className="px-4 py-2.5 font-semibold text-foreground text-xs">{t.name}</td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate" title={t.role}>{t.role}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-xs font-bold ${t.average >= 60 ? "text-green-600" : t.average >= 40 ? "text-amber-600" : "text-destructive"}`}>{t.average}%</span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.entries}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="bg-card rounded-xl border border-border p-12 text-center">
                      <p className="text-sm text-muted-foreground">No teacher grading data available for this exam.</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Trends Tab ── */}
                <TabsContent value="trends" className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Performance trends across all exams for <span className="font-bold text-foreground">{classes.find(c => c.id === selectedClass)?.name || "selected class"}</span>
                    </p>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => handleExportCSV("trends")}>
                      <FileSpreadsheet className="w-3 h-3" /> Export CSV
                    </Button>
                  </div>

                  {trendLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : trendData.overall.length < 2 ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
                      <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                      <p className="font-bold text-foreground">Not enough data for trends</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        At least 2 exams with marks are needed to show trends. Currently {trendData.overall.length} exam(s) have data.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Overall trend - Mean & Pass Rate */}
                      <div className="bg-card rounded-xl border border-border p-4">
                        <h3 className="text-sm font-bold text-foreground mb-4">Overall Performance Trend</h3>
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={trendData.overall} margin={{ left: 0, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="exam" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Legend />
                            <Line type="monotone" dataKey="average" name="Mean %" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Overall trend table */}
                      <div className="bg-card rounded-xl border border-border overflow-x-auto">
                        <table className="w-full text-sm min-w-[450px]">
                          <thead>
                            <tr className="border-b border-border">
                              {["Exam", "Term / Year", "Mean %", "Pass Rate %", "Students"].map(h => (
                                <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {trendData.overall.map((t, i) => {
                              const prev = i > 0 ? trendData.overall[i - 1] : null;
                              const diff = prev ? t.average - prev.average : 0;
                              return (
                                <tr key={t.exam} className="hover:bg-muted/30">
                                  <td className="px-4 py-2.5 font-semibold text-foreground text-xs">{t.exam}</td>
                                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.label}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-xs font-bold text-foreground">{t.average}%</span>
                                    {prev && (
                                      <span className={`ml-1.5 text-[10px] font-bold ${diff >= 0 ? "text-green-600" : "text-destructive"}`}>
                                        {diff >= 0 ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">{t.passRate}%</td>
                                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.students}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Subject-wise trend */}
                      {trendData.bySubject.length >= 2 && (trendData as any).subjectNames?.length > 0 && (
                        <div className="bg-card rounded-xl border border-border p-4">
                          <h3 className="text-sm font-bold text-foreground mb-4">Subject-wise Trend (Average %)</h3>
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={trendData.bySubject} margin={{ left: 0, right: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="exam" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Legend />
                              {((trendData as any).subjectNames as string[]).map((name, i) => (
                                <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Stream-wise trend */}
                      {trendData.byStream.length >= 2 && (trendData as any).streamNames?.length > 1 && (
                        <div className="bg-card rounded-xl border border-border p-4">
                          <h3 className="text-sm font-bold text-foreground mb-4">Stream-wise Trend (Average %)</h3>
                          <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={trendData.byStream} margin={{ left: 0, right: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="exam" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Legend />
                              {((trendData as any).streamNames as string[]).map((name, i) => (
                                <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ── Compare Tab ── */}
                <TabsContent value="compare">
                  <CompareTab
                    schoolId={schoolId!}
                    exams={exams}
                    classes={classes}
                    streams={streams}
                    subjects={subjects}
                    papers={papers}
                    students={students}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg sm:text-xl font-black text-foreground">{value}</p>
    </div>
  );
}
