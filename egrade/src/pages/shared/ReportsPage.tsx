import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useGradingScale } from "@/hooks/useGradingScale";
import { useToast } from "@/hooks/use-toast";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Loader2, Printer, FileText, Search, Save, Edit2, BarChart3, TrendingUp, Download, Trophy, BookOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CbcBadge, CbcLevel } from "@/components/Dashboards";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

type Student = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
  stream_id: string | null; passport_url: string | null; gender: string | null;
};
type Stream = { id: string; name: string; class_id: string; class_teacher_id: string | null };
type ClassRow = { id: string; name: string; level: string };
type Subject = { id: string; name: string };
type ScoreRow = {
  student_id: string; score: number | null; remarks: string | null;
  assessment: { subject_id: string; total_marks: number; title: string };
};
type ExamMarkRow = {
  student_id: string; score: number | null; out_of: number;
  exam: { name: string; term: string | null };
  subject_paper: { subject_id: string; paper_name: string };
};
type SchoolInfo = {
  school_name: string; moto: string | null; logo_url: string | null;
  email: string | null; phone: string | null; address: string | null;
};
type CompetencyRow = {
  id: string; student_id: string; competency: string; rating: string;
  term: string; academic_year: string;
};
type StrandAssessmentRow = {
  id: string; student_id: string; subject_id: string; strand: string;
  sub_strand: string; rating: string; comments: string | null;
  term: string | null; academic_year: string | null;
};

// getLevel is now derived from useGradingScale — see below

const LEVEL_LABELS: Record<CbcLevel, string> = {
  EE: "Exceeding Expectations", ME: "Meeting Expectations",
  AE: "Approaching Expectations", BE: "Below Expectations",
};

const LEVEL_COLORS: Record<CbcLevel, string> = {
  EE: "#16a34a", ME: "#2563eb", AE: "#d97706", BE: "#dc2626",
};

const CORE_COMPETENCIES = [
  "Communication & Collaboration",
  "Critical Thinking & Problem Solving",
  "Creativity & Imagination",
  "Citizenship",
  "Digital Literacy",
  "Learning to Learn",
  "Self-Efficacy",
];

const RATING_OPTIONS: CbcLevel[] = ["EE", "ME", "AE", "BE"];

/** Returns truthy passport URL or null */
function validPhoto(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  return url;
}

export default function ReportsPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const scope = useTeacherScope(profile?.id, profile?.school_id, effectiveRole);
  const isTeacher = effectiveRole === "teacher";
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [examMarks, setExamMarks] = useState<ExamMarkRow[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [competencies, setCompetencies] = useState<CompetencyRow[]>([]);
  const [strandAssessments, setStrandAssessments] = useState<StrandAssessmentRow[]>([]);

  const [selectedStream, setSelectedStream] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExam, setSelectedExam] = useState("all");
  const [search, setSearch] = useState("");
  const [editingCompetencies, setEditingCompetencies] = useState(false);
  const [compDraft, setCompDraft] = useState<Record<string, CbcLevel>>({});
  const [savingComp, setSavingComp] = useState(false);
  const [reportTab, setReportTab] = useState("assessments");

  const schoolId = profile?.school_id;
  const { getGrade, grades: gradingEntries } = useGradingScale(schoolId);

  // Map percentage to CBC level using admin grading scale
  const getLevel = (pct: number): CbcLevel => {
    const grade = getGrade(pct);
    // Map grade to CBC level: top grade → EE, second → ME, third → AE, rest → BE
    if (gradingEntries.length >= 4) {
      const idx = gradingEntries.findIndex(g => g.grade === grade || g.sub_grades.some(sg => sg.sub_grade === grade));
      if (idx === 0) return "EE";
      if (idx === 1) return "ME";
      if (idx === 2) return "AE";
      return "BE";
    }
    // Fallback
    if (pct >= 80) return "EE";
    if (pct >= 60) return "ME";
    if (pct >= 40) return "AE";
    return "BE";
  };
  const canEditCompetencies = effectiveRole === "teacher" || effectiveRole === "school_admin";

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [studentsRes, streamsRes, classesRes, subjectsRes, scoresRes, schoolRes, teachersRes, compRes, examMarksRes, strandRes] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id, passport_url, gender").eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
        supabase.from("streams").select("id, name, class_id, class_teacher_id").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("classes").select("id, name, level").eq("is_active", true),
        supabase.from("subjects").select("id, name").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("assessment_scores").select("student_id, score, remarks, assessment:assessments(subject_id, total_marks, title)"),
        supabase.from("schools").select("school_name, moto, logo_url, email, phone, address").eq("id", schoolId).single(),
        supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true),
        supabase.from("student_competencies").select("*").eq("school_id", schoolId),
        supabase.from("exam_marks").select("student_id, score, out_of, exam:exams(name, term), subject_paper:subject_papers(subject_id, paper_name)").eq("school_id", schoolId),
        supabase.from("strand_assessments").select("id, student_id, subject_id, strand, sub_strand, rating, comments, term, academic_year").eq("school_id", schoolId),
      ]);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (streamsRes.data) setStreams(streamsRes.data as Stream[]);
      if (classesRes.data) setClasses(classesRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (scoresRes.data) setScores(scoresRes.data as any);
      if (schoolRes.data) setSchool(schoolRes.data as SchoolInfo);
      if (teachersRes.data) {
        const m: Record<string, string> = {};
        teachersRes.data.forEach((t: any) => { m[t.id] = `${t.first_name} ${t.last_name}`; });
        setTeachers(m);
      }
      if (compRes.data) setCompetencies(compRes.data as CompetencyRow[]);
      if (examMarksRes.data) setExamMarks(examMarksRes.data as any);
      if (strandRes.data) setStrandAssessments(strandRes.data as StrandAssessmentRow[]);
      setLoading(false);
    };
    load();
  }, [schoolId]);

  useEffect(() => {
    if (!selectedStudent) return;
    const draft: Record<string, CbcLevel> = {};
    CORE_COMPETENCIES.forEach(c => {
      const existing = competencies.find(
        r => r.student_id === selectedStudent && r.competency === c && r.term === "Term 1" && r.academic_year === "2026"
      );
      draft[c] = (existing?.rating as CbcLevel) || "ME";
    });
    setCompDraft(draft);
    setEditingCompetencies(false);
  }, [selectedStudent, competencies]);

  // Scoping
  const scopedStudents = isTeacher && !scope.loading
    ? students.filter(s => s.stream_id && scope.hasStreamAccess(s.stream_id))
    : students;
  const scopedStreams = isTeacher && !scope.loading
    ? streams.filter(s => scope.hasStreamAccess(s.id))
    : streams;

  const filteredStudents = scopedStudents.filter(s => {
    if (selectedStream && s.stream_id !== selectedStream) return false;
    if (search) {
      const q = search.toLowerCase();
      return `${s.first_name} ${s.last_name} ${s.adm_no || ""}`.toLowerCase().includes(q);
    }
    return true;
  });

  // Distinct exam names for the filter
  const examNames = useMemo(() => {
    const names = new Set<string>();
    examMarks.forEach(m => {
      const n = (m.exam as any)?.name;
      if (n) names.add(n);
    });
    return Array.from(names).sort();
  }, [examMarks]);

  // Assessment report
  const getAssessmentReport = (student: Student) => {
    const studentScores = scores.filter(s => s.student_id === student.id && s.score !== null);
    const bySubject = studentScores.reduce<Record<string, { total: number; count: number; marks: number; remarks: string[] }>>((acc, s) => {
      const sid = s.assessment?.subject_id;
      if (!sid) return acc;
      if (!acc[sid]) acc[sid] = { total: 0, count: 0, marks: 0, remarks: [] };
      acc[sid].marks += s.score!;
      acc[sid].total += s.assessment.total_marks;
      acc[sid].count++;
      if (s.remarks) acc[sid].remarks.push(s.remarks);
      return acc;
    }, {});
    return Object.entries(bySubject).map(([subjectId, data]) => {
      const pct = data.total > 0 ? (data.marks / data.total) * 100 : 0;
      return {
        subjectId, subjectName: subjects.find(s => s.id === subjectId)?.name || "Unknown",
        marks: data.marks, total: data.total, count: data.count, pct,
        level: getLevel(pct), remarks: data.remarks.join("; "),
      };
    });
  };

  // Exam report — filtered by selected exam
  const getExamReport = (student: Student, examFilter: string) => {
    let studentMarks = examMarks.filter(m => m.student_id === student.id && m.score !== null);
    if (examFilter !== "all") {
      studentMarks = studentMarks.filter(m => (m.exam as any)?.name === examFilter);
    }
    const bySubject: Record<string, { marks: number; total: number }> = {};
    studentMarks.forEach(m => {
      const subjectId = (m.subject_paper as any)?.subject_id;
      if (!subjectId) return;
      if (!bySubject[subjectId]) bySubject[subjectId] = { marks: 0, total: 0 };
      bySubject[subjectId].marks += m.score!;
      bySubject[subjectId].total += m.out_of;
    });
    return Object.entries(bySubject).map(([subjectId, data]) => {
      const pct = data.total > 0 ? (data.marks / data.total) * 100 : 0;
      return {
        subjectId, subjectName: subjects.find(s => s.id === subjectId)?.name || "Unknown",
        marks: data.marks, total: data.total, pct, level: getLevel(pct),
      };
    });
  };

  // Strand assessments report
  const getStrandReport = (student: Student) => {
    const studentStrands = strandAssessments.filter(sa => sa.student_id === student.id);
    const bySubject: Record<string, { subjectName: string; strands: { strand: string; subStrand: string; rating: string; comments: string | null }[] }> = {};
    studentStrands.forEach(sa => {
      const subjectName = subjects.find(s => s.id === sa.subject_id)?.name || "Unknown";
      if (!bySubject[sa.subject_id]) bySubject[sa.subject_id] = { subjectName, strands: [] };
      bySubject[sa.subject_id].strands.push({
        strand: sa.strand, subStrand: sa.sub_strand, rating: sa.rating, comments: sa.comments,
      });
    });
    return Object.entries(bySubject).map(([subjectId, data]) => ({
      subjectId, subjectName: data.subjectName, strands: data.strands,
      overallRating: getMostCommonRating(data.strands.map(s => s.rating)),
    }));
  };

  function getMostCommonRating(ratings: string[]): string {
    const counts: Record<string, number> = {};
    ratings.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "ME";
  }

  // Performance trend
  const getPerformanceTrend = (student: Student) => {
    const studentMarks = examMarks.filter(m => m.student_id === student.id && m.score !== null);
    const byExam: Record<string, { total: number; outOf: number }> = {};
    studentMarks.forEach(m => {
      const examName = (m.exam as any)?.name || "Unknown";
      if (!byExam[examName]) byExam[examName] = { total: 0, outOf: 0 };
      byExam[examName].total += m.score!;
      byExam[examName].outOf += m.out_of;
    });
    return Object.entries(byExam).map(([name, data]) => ({
      exam: name,
      percentage: data.outOf > 0 ? Math.round((data.total / data.outOf) * 100) : 0,
    }));
  };

  // ── Ranking: compute student's position in stream & class ──
  const getStudentRanking = (student: Student, examFilter: string) => {
    const st = streams.find(s => s.id === student.stream_id);
    const classId = st?.class_id;

    // Get all students' overall % for this exam filter
    const calcOverallPct = (s: Student) => {
      const report = getExamReport(s, examFilter);
      if (report.length === 0) return null;
      return report.reduce((sum, r) => sum + r.pct, 0) / report.length;
    };

    // Stream ranking
    const streamStudents = students.filter(s => s.stream_id === student.stream_id);
    const streamScores = streamStudents
      .map(s => ({ id: s.id, pct: calcOverallPct(s) }))
      .filter(s => s.pct !== null)
      .sort((a, b) => b.pct! - a.pct!);
    const streamRank = streamScores.findIndex(s => s.id === student.id) + 1;
    const streamTotal = streamScores.length;

    // Class ranking (all streams in same class)
    const classStreams = streams.filter(s => s.class_id === classId);
    const classStudentIds = new Set(classStreams.map(s => s.id));
    const classStudents = students.filter(s => s.stream_id && classStudentIds.has(s.stream_id));
    const classScores = classStudents
      .map(s => ({ id: s.id, pct: calcOverallPct(s) }))
      .filter(s => s.pct !== null)
      .sort((a, b) => b.pct! - a.pct!);
    const classRank = classScores.findIndex(s => s.id === student.id) + 1;
    const classTotal = classScores.length;

    return {
      streamRank: streamRank || 0, streamTotal,
      classRank: classRank || 0, classTotal,
    };
  };

  const handleSaveCompetencies = async () => {
    if (!selectedStudent || !schoolId || !profile?.id) return;
    setSavingComp(true);
    for (const [competency, rating] of Object.entries(compDraft)) {
      const existing = competencies.find(
        r => r.student_id === selectedStudent && r.competency === competency && r.term === "Term 1" && r.academic_year === "2026"
      );
      if (existing) {
        await supabase.from("student_competencies").update({
          rating, rated_by: profile.id, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("student_competencies").insert({
          student_id: selectedStudent, school_id: schoolId, competency, rating,
          term: "Term 1", academic_year: "2026", rated_by: profile.id,
        });
      }
    }
    const { data } = await supabase.from("student_competencies").select("*").eq("school_id", schoolId);
    if (data) setCompetencies(data as CompetencyRow[]);
    setEditingCompetencies(false);
    setSavingComp(false);
    toast({ title: "Competencies Saved", description: "Ratings updated successfully." });
  };

  // ══════════════════════════════════════════════════════════════
  //  PRINT TEMPLATE — Professional MoE-style single-page A4
  // ══════════════════════════════════════════════════════════════
  const printStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4 portrait; margin: 10mm 8mm; }

    .report-card { max-width: 100%; }
    .page-break { page-break-after: always; break-after: page; }

    /* Header */
    .header { text-align: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 3px double #004000; position: relative; }
    .header-inner { display: flex; align-items: center; justify-content: center; gap: 14px; }
    .header img.logo { width: 56px; height: 56px; object-fit: contain; }
    .header h1 { font-size: 18px; color: #004000; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
    .header .motto { font-size: 9px; color: #555; font-style: italic; margin-top: 1px; }
    .header .contacts { font-size: 8px; color: #888; margin-top: 4px; }
    .report-title-bar { margin-top: 8px; background: linear-gradient(135deg, #004000, #006600); color: white; padding: 5px 16px; border-radius: 4px; display: inline-block; }
    .report-title-bar h2 { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
    .report-title-bar p { font-size: 8px; opacity: 0.85; margin-top: 1px; }

    /* Student Info */
    .student-block { display: flex; gap: 12px; margin: 10px 0; padding: 10px; background: #f8faf8; border: 1px solid #d1d5db; border-radius: 6px; align-items: flex-start; }
    .student-block .photo-frame { width: 70px; min-width: 70px; height: 85px; border: 2px solid #004000; border-radius: 6px; overflow: hidden; background: #e5e7eb; flex-shrink: 0; }
    .student-block .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
    .student-block .photo-frame .initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: #004000; background: #dcfce7; }
    .info-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 16px; font-size: 10px; flex: 1; }
    .info-fields .field { }
    .info-fields .label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; font-weight: 600; }
    .info-fields .value { font-weight: 700; color: #1a1a1a; margin-top: 0px; }

    /* Tables */
    .section-title { font-size: 10px; font-weight: 800; color: #004000; margin: 10px 0 4px; padding: 3px 8px; background: #f0fdf4; border-left: 3px solid #004000; border-radius: 0 4px 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9px; }
    thead th { background: #004000; color: white; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
    thead th:first-child { border-radius: 4px 0 0 0; }
    thead th:last-child { border-radius: 0 4px 0 0; }
    tbody td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tbody tr:hover { background: #f0fdf4; }

    /* Badges */
    .badge { display: inline-block; padding: 1px 10px; border-radius: 10px; font-weight: 700; font-size: 8px; }
    .badge-EE { background: #dcfce7; color: #166534; }
    .badge-ME { background: #dbeafe; color: #1e40af; }
    .badge-AE { background: #fef3c7; color: #92400e; }
    .badge-BE { background: #fee2e2; color: #991b1b; }

    /* Overall */
    .overall-strip { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-radius: 6px; margin: 6px 0; }
    .overall-strip .score { font-size: 22px; font-weight: 900; color: #004000; }
    .overall-strip .meta { font-size: 8px; color: #666; margin-left: auto; }

    /* Ranking */
    .ranking-strip { display: flex; gap: 16px; margin: 6px 0; }
    .rank-box { flex: 1; text-align: center; padding: 6px 10px; border-radius: 6px; border: 1px solid #d1d5db; background: #fafafa; }
    .rank-box .rank-label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; font-weight: 600; }
    .rank-box .rank-value { font-size: 16px; font-weight: 900; color: #004000; margin-top: 1px; }
    .rank-box .rank-total { font-size: 8px; color: #666; }

    /* Competencies */
    .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; margin-top: 4px; }
    .comp-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid #f3f4f6; font-size: 9px; }
    .comp-row:last-child { border-bottom: none; }

    /* Comments */
    .comments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
    .comment-box { }
    .comment-box .comment-label { font-size: 8px; font-weight: 700; color: #004000; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
    .comment-box .comment-content { font-size: 9px; padding: 6px 8px; background: #fafafa; border: 1px dashed #d1d5db; border-radius: 4px; min-height: 30px; line-height: 1.4; }

    /* Signatures */
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 14px; text-align: center; font-size: 8px; }
    .sig-line { border-top: 1px solid #1a1a1a; margin-top: 22px; padding-top: 3px; font-weight: 600; }

    /* Footer */
    .footer { margin-top: 8px; text-align: center; font-size: 7px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 5px; }
    .footer .levels { font-weight: 600; color: #666; }

    @media print { body { padding: 0; } .page-break { page-break-after: always; } }
  `;

  const buildHeaderHtml = (title: string, subtitle?: string) => `
    <div class="header">
      <div class="header-inner">
        ${validPhoto(school?.logo_url) ? `<img src="${school!.logo_url}" alt="" class="logo" />` : ""}
        <div>
          <h1>${school?.school_name || ""}</h1>
          ${school?.moto ? `<p class="motto">&ldquo;${school.moto}&rdquo;</p>` : ""}
        </div>
      </div>
      <p class="contacts">${[school?.email, school?.phone, school?.address].filter(Boolean).join("  •  ")}</p>
      <div class="report-title-bar">
        <h2>${title}</h2>
        <p>${subtitle || "Term 1 · Academic Year 2026"}</p>
      </div>
    </div>
  `;

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const studentStream = selectedStudentData ? streams.find(st => st.id === selectedStudentData.stream_id) : null;
  const studentClass = studentStream ? classes.find(c => c.id === studentStream.class_id) : null;
  const classTeacher = studentStream?.class_teacher_id ? teachers[studentStream.class_teacher_id] : "—";
  const studentPhoto = validPhoto(selectedStudentData?.passport_url);

  // ── Generic helpers that accept any student ──
  const buildStudentInfoHtmlFor = (student: Student) => {
    const photo = validPhoto(student.passport_url);
    const st = streams.find(s => s.id === student.stream_id);
    const cls = st ? classes.find(c => c.id === st.class_id) : null;
    const ct = st?.class_teacher_id ? teachers[st.class_teacher_id] : "—";
    const photoHtml = photo
      ? `<img src="${photo}" alt="" />`
      : `<div class="initials">${(student.first_name?.[0] || "")+(student.last_name?.[0] || "")}</div>`;
    return `
      <div class="student-block">
        <div class="photo-frame">${photoHtml}</div>
        <div class="info-fields">
          <div class="field"><div class="label">Full Name</div><div class="value">${student.first_name} ${student.last_name}</div></div>
          <div class="field"><div class="label">Adm No</div><div class="value">${student.adm_no || "—"}</div></div>
          <div class="field"><div class="label">Gender</div><div class="value" style="text-transform:capitalize;">${student.gender || "—"}</div></div>
          <div class="field"><div class="label">Class / Stream</div><div class="value">${cls?.name || "—"} — ${st?.name || "—"}</div></div>
          <div class="field"><div class="label">Class Teacher</div><div class="value">${ct}</div></div>
          <div class="field"><div class="label">Level</div><div class="value" style="text-transform:capitalize;">${cls?.level?.replace("_", " ") || "—"}</div></div>
        </div>
      </div>
    `;
  };

  const buildCompetenciesHtmlFor = (studentId: string) => {
    const comps = CORE_COMPETENCIES.map(c => {
      const existing = competencies.find(
        r => r.student_id === studentId && r.competency === c && r.term === "Term 1" && r.academic_year === "2026"
      );
      const rating = (existing?.rating as CbcLevel) || "ME";
      return `<div class="comp-row"><span>${c}</span><span class="badge badge-${rating}">${rating}</span></div>`;
    }).join("");
    return `
      <div class="section-title">Core Competencies (KICD Framework)</div>
      <div class="comp-grid">${comps}</div>
    `;
  };

  const buildStrandAssessmentsHtmlFor = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return "";
    const report = getStrandReport(student);
    if (report.length === 0) return "";
    const rows = report.flatMap(subj =>
      subj.strands.map((s, i) =>
        `<tr>
          ${i === 0 ? `<td rowspan="${subj.strands.length}" style="font-weight:600;vertical-align:top;">${subj.subjectName}</td>` : ""}
          <td>${s.strand}</td>
          <td style="font-size:8px;">${s.subStrand}</td>
          <td><span class="badge badge-${s.rating}">${s.rating}</span></td>
          <td style="font-size:8px;color:#666;">${s.comments || "—"}</td>
        </tr>`
      )
    ).join("");
    return `
      <div class="section-title">CBC Strand-Based Assessments (Formative)</div>
      <table><thead><tr><th>Subject</th><th>Strand</th><th>Sub-Strand</th><th>Rating</th><th>Comments</th></tr></thead><tbody>${rows}</tbody></table>
    `;
  };

  const buildCommentsHtml = (report: { pct: number }[]) => {
    const pct = report.length ? report.reduce((s, r) => s + r.pct, 0) / report.length : 0;
    const comment = pct >= 80 ? "Excellent performance. Keep up the outstanding work!"
      : pct >= 60 ? "Good performance. Continue striving for excellence."
      : pct >= 40 ? "Fair performance. More dedication and effort needed."
      : "Below average. Requires immediate attention and support.";
    return `
      <div class="comments-grid">
        <div class="comment-box"><div class="comment-label">Class Teacher's Remarks</div><div class="comment-content">${report.length > 0 ? comment : "—"}</div></div>
        <div class="comment-box"><div class="comment-label">Head Teacher's Remarks</div><div class="comment-content">Noted. Continue working diligently.</div></div>
      </div>
    `;
  };

  const buildSignaturesHtml = () => `
    <div class="signatures">
      <div><div class="sig-line">Class Teacher's Sign</div></div>
      <div><div class="sig-line">Head Teacher's Sign</div></div>
      <div><div class="sig-line">Parent/Guardian's Sign</div></div>
    </div>
  `;

  const buildFooterHtml = () => {
    const levelLabels = gradingEntries.length >= 4
      ? `${gradingEntries[0]?.grade} (Exceeding Expectations) ≥${gradingEntries[0]?.min_score}%&nbsp;&nbsp;|&nbsp;&nbsp;${gradingEntries[1]?.grade} (Meeting Expectations) ≥${gradingEntries[1]?.min_score}%&nbsp;&nbsp;|&nbsp;&nbsp;${gradingEntries[2]?.grade} (Approaching Expectations) ≥${gradingEntries[2]?.min_score}%&nbsp;&nbsp;|&nbsp;&nbsp;${gradingEntries[3]?.grade} (Below Expectations) &lt;${gradingEntries[2]?.min_score}%`
      : `EE (Exceeding Expectations) ≥80%&nbsp;&nbsp;|&nbsp;&nbsp;ME (Meeting Expectations) ≥60%&nbsp;&nbsp;|&nbsp;&nbsp;AE (Approaching Expectations) ≥40%&nbsp;&nbsp;|&nbsp;&nbsp;BE (Below Expectations) &lt;40%`;
    return `
      <div class="footer">
        <p class="levels">${levelLabels}</p>
        <p style="margin-top:2px;">Generated by eGrade M|S — Kenya's CBC School Management Platform</p>
      </div>
    `;
  };

  const openPrintWindow = (html: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report Card</title><style>${printStyles}</style></head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  const assessmentReport = selectedStudentData ? getAssessmentReport(selectedStudentData) : [];
  const examReport = selectedStudentData ? getExamReport(selectedStudentData, selectedExam) : [];
  const performanceTrend = selectedStudentData ? getPerformanceTrend(selectedStudentData) : [];

  // ── Build single-student report HTML ──
  const buildAssessmentPageHtml = (student: Student) => {
    const report = getAssessmentReport(student);
    const pct = report.length ? report.reduce((s, r) => s + r.pct, 0) / report.length : 0;
    const level = getLevel(pct);
    const tableRows = report.map(r =>
      `<tr><td style="font-weight:600;">${r.subjectName}</td><td>${r.marks}/${r.total}</td><td style="font-weight:700;">${r.pct.toFixed(0)}%</td><td><span class="badge badge-${r.level}">${r.level}</span></td><td style="font-size:8px;color:#666;">${r.remarks || "—"}</td></tr>`
    ).join("");
    return `
      <div class="report-card">
        ${buildHeaderHtml("CBC Assessment Progress Report")}
        ${buildStudentInfoHtmlFor(student)}
        <div class="section-title">Formative Assessment Performance by Subject</div>
        <table><thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Level</th><th>Teacher Remarks</th></tr></thead><tbody>${tableRows}</tbody></table>
        <div class="overall-strip"><div class="score">${pct.toFixed(0)}%</div><span class="badge badge-${level}">${level} — ${LEVEL_LABELS[level]}</span><span class="meta">${report.length} subject(s) assessed</span></div>
        ${buildStrandAssessmentsHtmlFor(student.id)}
        ${buildCompetenciesHtmlFor(student.id)}
        ${buildCommentsHtml(report)}
        ${buildSignaturesHtml()}
        ${buildFooterHtml()}
      </div>
    `;
  };

  const buildExamPageHtml = (student: Student, examFilter: string) => {
    const report = getExamReport(student, examFilter);
    const pct = report.length ? report.reduce((s, r) => s + r.pct, 0) / report.length : 0;
    const level = getLevel(pct);
    const examLabel = examFilter === "all" ? "All Exams" : examFilter;
    const ranking = getStudentRanking(student, examFilter);
    const tableRows = report.map(r =>
      `<tr><td style="font-weight:600;">${r.subjectName}</td><td>${r.marks}/${r.total}</td><td style="font-weight:700;">${r.pct.toFixed(0)}%</td><td><span class="badge badge-${r.level}">${r.level}</span></td></tr>`
    ).join("");
    const rankingHtml = ranking.streamTotal > 0 ? `
      <div class="ranking-strip">
        <div class="rank-box">
          <div class="rank-label">Stream Position</div>
          <div class="rank-value">${ranking.streamRank}</div>
          <div class="rank-total">out of ${ranking.streamTotal} students</div>
        </div>
        <div class="rank-box">
          <div class="rank-label">Class Position</div>
          <div class="rank-value">${ranking.classRank}</div>
          <div class="rank-total">out of ${ranking.classTotal} students</div>
        </div>
        <div class="rank-box">
          <div class="rank-label">Total Marks</div>
          <div class="rank-value">${report.reduce((s, r) => s + r.marks, 0)}</div>
          <div class="rank-total">out of ${report.reduce((s, r) => s + r.total, 0)}</div>
        </div>
      </div>
    ` : "";
    return `
      <div class="report-card">
        ${buildHeaderHtml("Summative Exam Results Report", `${examLabel} · Term 1 · Academic Year 2026`)}
        ${buildStudentInfoHtmlFor(student)}
        <div class="section-title">Exam Results by Subject — ${examLabel}</div>
        <table><thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Level</th></tr></thead><tbody>${tableRows}</tbody></table>
        <div class="overall-strip"><div class="score">${pct.toFixed(0)}%</div><span class="badge badge-${level}">${level} — ${LEVEL_LABELS[level]}</span><span class="meta">${report.length} subject(s)</span></div>
        ${rankingHtml}
        ${buildStrandAssessmentsHtmlFor(student.id)}
        ${buildCompetenciesHtmlFor(student.id)}
        ${buildCommentsHtml(report)}
        ${buildSignaturesHtml()}
        ${buildFooterHtml()}
      </div>
    `;
  };

  const handlePrintAssessment = () => {
    if (!selectedStudentData) return;
    openPrintWindow(buildAssessmentPageHtml(selectedStudentData));
  };

  const handlePrintExam = () => {
    if (!selectedStudentData) return;
    openPrintWindow(buildExamPageHtml(selectedStudentData, selectedExam));
  };

  // ── Full Report Card: combines exam + strand assessments + competencies ──
  const buildFullReportHtml = (student: Student, examFilter: string) => {
    const eReport = getExamReport(student, examFilter);
    const aReport = getAssessmentReport(student);
    const ePct = eReport.length ? eReport.reduce((s, r) => s + r.pct, 0) / eReport.length : 0;
    const aPct = aReport.length ? aReport.reduce((s, r) => s + r.pct, 0) / aReport.length : 0;
    const eLevel = getLevel(ePct);
    const aLevel = getLevel(aPct);
    const examLabel = examFilter === "all" ? "All Exams" : examFilter;
    const ranking = getStudentRanking(student, examFilter);

    const examRows = eReport.map(r =>
      `<tr><td style="font-weight:600;">${r.subjectName}</td><td>${r.marks}/${r.total}</td><td style="font-weight:700;">${r.pct.toFixed(0)}%</td><td><span class="badge badge-${r.level}">${r.level}</span></td></tr>`
    ).join("");
    const assessRows = aReport.map(r =>
      `<tr><td style="font-weight:600;">${r.subjectName}</td><td>${r.marks}/${r.total}</td><td style="font-weight:700;">${r.pct.toFixed(0)}%</td><td><span class="badge badge-${r.level}">${r.level}</span></td></tr>`
    ).join("");
    const rankingHtml = ranking.streamTotal > 0 ? `
      <div class="ranking-strip">
        <div class="rank-box"><div class="rank-label">Stream Position</div><div class="rank-value">${ranking.streamRank}</div><div class="rank-total">out of ${ranking.streamTotal}</div></div>
        <div class="rank-box"><div class="rank-label">Class Position</div><div class="rank-value">${ranking.classRank}</div><div class="rank-total">out of ${ranking.classTotal}</div></div>
        <div class="rank-box"><div class="rank-label">Total Marks</div><div class="rank-value">${eReport.reduce((s, r) => s + r.marks, 0)}</div><div class="rank-total">out of ${eReport.reduce((s, r) => s + r.total, 0)}</div></div>
      </div>` : "";

    return `
      <div class="report-card">
        ${buildHeaderHtml("Comprehensive Learner Progress Report", `${examLabel} · Term 1 · Academic Year 2026`)}
        ${buildStudentInfoHtmlFor(student)}
        ${eReport.length > 0 ? `
          <div class="section-title">Summative Exam Results — ${examLabel}</div>
          <table><thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Level</th></tr></thead><tbody>${examRows}</tbody></table>
          <div class="overall-strip"><div class="score">${ePct.toFixed(0)}%</div><span class="badge badge-${eLevel}">${eLevel} — ${LEVEL_LABELS[eLevel]}</span><span class="meta">${eReport.length} subject(s)</span></div>
          ${rankingHtml}
        ` : ""}
        ${aReport.length > 0 ? `
          <div class="section-title">Formative Assessment Results</div>
          <table><thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Level</th></tr></thead><tbody>${assessRows}</tbody></table>
          <div class="overall-strip"><div class="score">${aPct.toFixed(0)}%</div><span class="badge badge-${aLevel}">${aLevel} — ${LEVEL_LABELS[aLevel]}</span><span class="meta">${aReport.length} subject(s)</span></div>
        ` : ""}
        ${buildStrandAssessmentsHtmlFor(student.id)}
        ${buildCompetenciesHtmlFor(student.id)}
        ${buildCommentsHtml(eReport.length > 0 ? eReport : aReport)}
        ${buildSignaturesHtml()}
        ${buildFooterHtml()}
      </div>
    `;
  };

  const handlePrintFullReport = () => {
    if (!selectedStudentData) return;
    openPrintWindow(buildFullReportHtml(selectedStudentData, selectedExam));
  };

  // ── Bulk print: all filtered students with page breaks ──
  const handleBulkPrintAssessment = () => {
    const pages = filteredStudents.map((s, i) =>
      `${buildAssessmentPageHtml(s)}${i < filteredStudents.length - 1 ? '<div class="page-break"></div>' : ''}`
    ).join("");
    openPrintWindow(pages);
  };

  const handleBulkPrintExam = () => {
    const pages = filteredStudents.map((s, i) =>
      `${buildExamPageHtml(s, selectedExam)}${i < filteredStudents.length - 1 ? '<div class="page-break"></div>' : ''}`
    ).join("");
    openPrintWindow(pages);
  };

  const handleBulkPrintFull = () => {
    const pages = filteredStudents.map((s, i) =>
      `${buildFullReportHtml(s, selectedExam)}${i < filteredStudents.length - 1 ? '<div class="page-break"></div>' : ''}`
    ).join("");
    openPrintWindow(pages);
  };

  const activeReport = reportTab === "assessments" ? assessmentReport : examReport;
  const overallPct = activeReport.length ? activeReport.reduce((s, r) => s + r.pct, 0) / activeReport.length : 0;
  const overallLevel = getLevel(overallPct);

  const barChartData = activeReport.map(r => ({
    subject: r.subjectName.length > 10 ? r.subjectName.substring(0, 10) + "…" : r.subjectName,
    percentage: Math.round(r.pct),
    level: r.level,
  }));

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading reports..." /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">CBC Progress Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Term 1 · Academic Year 2026</p>
        </div>
        {selectedStudent && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrintFullReport} className="font-bold gap-2 text-xs">
              <Printer className="w-4 h-4" /> Full Report Card
            </Button>
            <Button onClick={handlePrintAssessment} variant="outline" className="font-bold gap-2 text-xs">
              <Printer className="w-4 h-4" /> Assessment Only
            </Button>
            <Button onClick={handlePrintExam} variant="outline" className="font-bold gap-2 text-xs">
              <Printer className="w-4 h-4" /> Exam Only
            </Button>
            <Button onClick={() => {
              if (!selectedStudentData) return;
              const html = buildFullReportHtml(selectedStudentData, selectedExam);
              const win = window.open("", "_blank");
              if (!win) return;
              const name = `${selectedStudentData.first_name}_${selectedStudentData.last_name}_Report`;
              win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>${printStyles}</style></head><body>${html}<script>setTimeout(()=>{document.title="${name}";window.print();},600)<\/script></body></html>`);
              win.document.close();
            }} variant="outline" className="font-bold gap-2 text-xs">
              <Download className="w-4 h-4" /> Save as PDF
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedStream} onValueChange={v => { setSelectedStream(v === "all" ? "" : v); setSelectedStudent(""); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by Stream" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            {scopedStreams.map(s => {
              const cls = classes.find(c => c.id === s.class_id);
              return <SelectItem key={s.id} value={s.id}>{cls?.name} — {s.name}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="pl-9" />
        </div>
      </div>

      {!selectedStudent ? (
        <>
        {filteredStudents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBulkPrintFull} className="font-bold gap-2 text-xs">
              <Printer className="w-4 h-4" /> Print All Full Reports ({filteredStudents.length})
            </Button>
            <Button onClick={handleBulkPrintAssessment} variant="outline" className="font-bold gap-2 text-xs">
              <Printer className="w-4 h-4" /> Assessment Reports ({filteredStudents.length})
            </Button>
            <Button onClick={handleBulkPrintExam} variant="outline" className="font-bold gap-2 text-xs">
              <Printer className="w-4 h-4" /> Exam Reports ({filteredStudents.length})
            </Button>
          </div>
        )}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["", "Student", "Adm No", "Stream", "Assessments", "Exams", "Action"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No students found</td></tr>
                ) : filteredStudents.map(s => {
                  const aRep = getAssessmentReport(s);
                  const eRep = getExamReport(s, "all");
                  const st = streams.find(st => st.id === s.stream_id);
                  const cls = st ? classes.find(c => c.id === st.class_id) : null;
                  const photo = validPhoto(s.passport_url);
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        {photo ? (
                          <img src={photo} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {s.first_name[0]}{s.last_name[0]}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.adm_no || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{cls?.name} — {st?.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{aRep.length} subj</td>
                      <td className="px-4 py-3 text-muted-foreground">{eRep.length} subj</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => setSelectedStudent(s.id)} className="gap-1.5 h-7 text-xs font-bold">
                          <FileText className="w-3 h-3" /> View Report
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={() => setSelectedStudent("")} className="text-xs font-bold">
            ← Back to List
          </Button>

          <div className="bg-card rounded-xl border-2 border-primary/20 p-6 space-y-6 shadow-sm">
            {/* School Header */}
            <div className="text-center border-b-2 border-primary/20 pb-5">
              <div className="flex items-center justify-center gap-4 mb-2">
                {validPhoto(school?.logo_url) && <img src={school!.logo_url!} alt="" className="w-16 h-16 object-contain" />}
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">{school?.school_name}</h2>
                  {school?.moto && <p className="text-xs italic text-muted-foreground">&ldquo;{school.moto}&rdquo;</p>}
                </div>
                {studentPhoto ? (
                  <img src={studentPhoto} alt="" className="w-16 h-20 object-cover rounded-lg border-2 border-primary/30 ml-auto" />
                ) : (
                  <div className="w-16 h-20 rounded-lg border-2 border-primary/30 ml-auto bg-muted flex items-center justify-center text-lg font-black text-muted-foreground">
                    {selectedStudentData?.first_name?.[0]}{selectedStudentData?.last_name?.[0]}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground mt-1">
                {school?.email && <span>✉ {school.email}</span>}
                {school?.phone && <span>☎ {school.phone}</span>}
                {school?.address && <span>📍 {school.address}</span>}
              </div>
              <div className="mt-3 inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20">
                <p className="text-sm font-bold text-primary tracking-wide">LEARNER PROGRESS REPORT</p>
                <p className="text-[10px] text-muted-foreground">Term 1 · Academic Year 2026</p>
              </div>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-xl border border-border">
              <div><span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Name</span><p className="font-bold text-foreground">{selectedStudentData?.first_name} {selectedStudentData?.last_name}</p></div>
              <div><span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Adm No</span><p className="font-bold text-foreground font-mono">{selectedStudentData?.adm_no || "—"}</p></div>
              <div><span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Class / Stream</span><p className="font-bold text-foreground">{studentClass?.name} — {studentStream?.name}</p></div>
              <div><span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Class Teacher</span><p className="font-bold text-foreground">{classTeacher}</p></div>
              <div><span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Gender</span><p className="font-bold text-foreground capitalize">{selectedStudentData?.gender || "—"}</p></div>
              <div><span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Level</span><p className="font-bold text-foreground capitalize">{studentClass?.level?.replace("_", " ") || "—"}</p></div>
            </div>

            {/* Tab switch */}
            <Tabs value={reportTab} onValueChange={setReportTab}>
              <TabsList className="w-full h-auto flex-wrap">
                <TabsTrigger value="assessments" className="gap-1.5 text-xs font-bold">
                  <BarChart3 className="w-3.5 h-3.5" /> Assessments
                </TabsTrigger>
                <TabsTrigger value="exams" className="gap-1.5 text-xs font-bold">
                  <FileText className="w-3.5 h-3.5" /> Exam Results
                </TabsTrigger>
                <TabsTrigger value="strands" className="gap-1.5 text-xs font-bold">
                  <BookOpen className="w-3.5 h-3.5" /> Strand Assessment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assessments" className="space-y-4 mt-4">
                <h3 className="font-bold text-foreground">Assessment Performance by Subject</h3>
                {assessmentReport.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No assessment data available yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Subject", "Marks", "Percentage", "Level", "Remarks"].map(h => (
                            <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {assessmentReport.map(r => (
                          <tr key={r.subjectId} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground">{r.subjectName}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{r.marks}/{r.total}</td>
                            <td className="py-2.5 px-3 font-bold">{r.pct.toFixed(0)}%</td>
                            <td className="py-2.5 px-3"><CbcBadge level={r.level} /></td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground">{r.remarks || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="exams" className="space-y-4 mt-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-bold text-foreground">Exam Results by Subject</h3>
                  {examNames.length > 0 && (
                    <Select value={selectedExam} onValueChange={setSelectedExam}>
                      <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Exams (Combined)</SelectItem>
                        {examNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {examReport.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No exam marks available{selectedExam !== "all" ? ` for "${selectedExam}"` : ""} yet.</p>
                ) : (
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
                        {examReport.map(r => (
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
                )}
              </TabsContent>

              <TabsContent value="strands" className="space-y-4 mt-4">
                <h3 className="font-bold text-foreground">CBC Strand-Based Assessments</h3>
                {(() => {
                  const strandReport = selectedStudentData ? getStrandReport(selectedStudentData) : [];
                  return strandReport.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No strand assessment data available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {strandReport.map(subj => (
                        <div key={subj.subjectId} className="bg-muted/20 rounded-xl border border-border p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-foreground text-sm">{subj.subjectName}</h4>
                            <CbcBadge level={subj.overallRating as CbcLevel} />
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  {["Strand", "Sub-Strand", "Rating", "Comments"].map(h => (
                                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {subj.strands.map((s, i) => (
                                  <tr key={i} className="hover:bg-muted/30">
                                    <td className="py-2 px-3 text-xs font-medium text-foreground">{s.strand}</td>
                                    <td className="py-2 px-3 text-xs text-muted-foreground">{s.subStrand}</td>
                                    <td className="py-2 px-3"><CbcBadge level={s.rating as CbcLevel} /></td>
                                    <td className="py-2 px-3 text-xs text-muted-foreground">{s.comments || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>

            {/* Overall Summary */}
            {activeReport.length > 0 && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Overall {reportTab === "assessments" ? "Assessment" : "Exam"} Average</p>
                  <p className="text-2xl font-black text-foreground">{overallPct.toFixed(0)}%</p>
                </div>
                <CbcBadge level={overallLevel} />
                <p className="text-xs text-muted-foreground ml-auto">{LEVEL_LABELS[overallLevel]}</p>
              </div>
            )}

            {/* Ranking — Exams only */}
            {reportTab === "exams" && examReport.length > 0 && selectedStudentData && (() => {
              const ranking = getStudentRanking(selectedStudentData, selectedExam);
              return ranking.streamTotal > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 rounded-xl bg-muted/30 border border-border">
                    <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Stream Position</p>
                    <p className="text-2xl font-black text-foreground">{ranking.streamRank}<span className="text-sm font-normal text-muted-foreground">/{ranking.streamTotal}</span></p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30 border border-border">
                    <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Class Position</p>
                    <p className="text-2xl font-black text-foreground">{ranking.classRank}<span className="text-sm font-normal text-muted-foreground">/{ranking.classTotal}</span></p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/30 border border-border">
                    <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Total Marks</p>
                    <p className="text-2xl font-black text-foreground">{examReport.reduce((s, r) => s + r.marks, 0)}<span className="text-sm font-normal text-muted-foreground">/{examReport.reduce((s, r) => s + r.total, 0)}</span></p>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Performance Charts */}
            {activeReport.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Performance Analysis
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-muted/20 rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Subject Performance (%)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={barChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                        <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                          {barChartData.map((entry, i) => (
                            <Cell key={i} fill={LEVEL_COLORS[entry.level as CbcLevel] || "#6b7280"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-muted/20 rounded-xl border border-border p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Exam Performance Trend</p>
                    {performanceTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={performanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="exam" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Legend />
                          <Line type="monotone" dataKey="percentage" stroke="#004000" strokeWidth={2} dot={{ r: 4 }} name="Avg %" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-10">No exam trend data available yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Core competencies */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-foreground">Core Competencies</h3>
                {canEditCompetencies && !editingCompetencies && (
                  <Button size="sm" variant="outline" onClick={() => setEditingCompetencies(true)} className="gap-1.5 h-7 text-xs font-bold">
                    <Edit2 className="w-3 h-3" /> Edit Ratings
                  </Button>
                )}
                {editingCompetencies && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingCompetencies(false)} className="h-7 text-xs">Cancel</Button>
                    <Button size="sm" onClick={handleSaveCompetencies} disabled={savingComp} className="gap-1.5 h-7 text-xs font-bold">
                      {savingComp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {CORE_COMPETENCIES.map(c => (
                  <div key={c} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm text-foreground">{c}</span>
                    {editingCompetencies ? (
                      <Select value={compDraft[c] || "ME"} onValueChange={(v) => setCompDraft(prev => ({ ...prev, [c]: v as CbcLevel }))}>
                        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RATING_OPTIONS.map(r => (
                            <SelectItem key={r} value={r}>{r} — {LEVEL_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <CbcBadge level={compDraft[c] || "ME"} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">As defined by KICD CBC Framework</p>
            </div>

            {/* Comments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1">Class Teacher's Comment</h4>
                <div className="p-3 rounded-lg border border-dashed border-border min-h-[60px] text-xs text-muted-foreground">
                  {activeReport.length > 0
                    ? overallPct >= 80 ? "Excellent performance. Keep up the good work!"
                      : overallPct >= 60 ? "Good performance. Room for improvement in some areas."
                      : overallPct >= 40 ? "Fair performance. More effort needed across subjects."
                      : "Below average. Requires close attention and support."
                    : "No data available yet."}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1">Principal's Comment</h4>
                <div className="p-3 rounded-lg border border-dashed border-border min-h-[60px] text-xs text-muted-foreground">
                  Noted. Continue working hard.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
