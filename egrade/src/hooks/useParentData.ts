import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGradingScale } from "@/hooks/useGradingScale";

export interface ChildProfile {
  id: string;
  first_name: string;
  last_name: string;
  adm_no: string | null;
  stream_id: string | null;
  class_id: string | null;
  passport_url: string | null;
  gender: string | null;
}

export interface ExamResult {
  id: string;
  name: string;
  term: string | null;
  academic_year: string | null;
  total: number;
  outOf: number;
  percentage: number;
  grade: string;
  points: number;
  subjects: SubjectResult[];
}

export interface SubjectResult {
  name: string;
  score: number | null;
  outOf: number;
  percentage: number;
  grade: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  pct: number;
}

export interface SchoolInfo {
  school_name: string;
  moto: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export type CbcLevel = "EE" | "ME" | "AE" | "BE";

export const LEVEL_LABELS: Record<CbcLevel, string> = {
  EE: "Exceeding Expectations",
  ME: "Meeting Expectations",
  AE: "Approaching Expectations",
  BE: "Below Expectations",
};

export const CORE_COMPETENCIES = [
  "Communication & Collaboration",
  "Critical Thinking & Problem Solving",
  "Creativity & Imagination",
  "Citizenship",
  "Digital Literacy",
  "Learning to Learn",
  "Self-Efficacy",
];

export function useParentData() {
  const { profile, user } = useAuth();
  const schoolId = profile?.school_id;
  const { getGrade, getPoints, grades: gradingEntries } = useGradingScale(schoolId);

  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [parentFound, setParentFound] = useState(true);

  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [strandAssessments, setStrandAssessments] = useState<any[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [competencies, setCompetencies] = useState<any[]>([]);

  // Load children + school
  useEffect(() => {
    const uid = user?.id;
    if (!uid || !schoolId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: parentRecord } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", uid)
        .eq("school_id", schoolId)
        .maybeSingle();

      if (cancelled) return;
      if (!parentRecord?.id) {
        setParentFound(false);
        setLoading(false);
        return;
      }

      const [linksR, schoolR, streamsR, classesR, teachersR] = await Promise.all([
        supabase
          .from("student_parents")
          .select("student_profile_id, student:profiles!student_parents_student_profile_id_fkey(id, first_name, last_name, adm_no, stream_id, class_id, passport_url, gender)")
          .eq("parent_id", parentRecord.id),
        supabase.from("schools").select("school_name, moto, logo_url, email, phone, address").eq("id", schoolId).single(),
        supabase.from("streams").select("id, name, class_id, class_teacher_id").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("classes").select("id, name, level").eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true),
      ]);

      if (cancelled) return;

      const kids = (linksR.data || []).map((l: any) => l.student).filter(Boolean);
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].id);
      setSchool(schoolR.data as SchoolInfo | null);
      setStreams(streamsR.data || []);
      setClasses(classesR.data || []);

      const m: Record<string, string> = {};
      (teachersR.data || []).forEach((t: any) => {
        m[t.id] = `${t.first_name} ${t.last_name}`;
      });
      setTeachers(m);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, schoolId]);

  // Load child-specific data
  useEffect(() => {
    if (!selectedChildId || !schoolId) return;
    let cancelled = false;

    (async () => {
      setChildLoading(true);
      const [emR, exR, spR, suR, atR, saR, compR] = await Promise.all([
        supabase.from("exam_marks").select("id, exam_id, subject_paper_id, score, out_of").eq("school_id", schoolId).eq("student_id", selectedChildId),
        supabase.from("exams").select("id, name, term, academic_year").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("subject_papers").select("id, paper_name, subject_id, default_out_of").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("subjects").select("id, name").eq("is_active", true).order("name"),
        supabase.from("attendance").select("id, date, status, notes").eq("school_id", schoolId).eq("student_id", selectedChildId).order("date", { ascending: false }).limit(60),
        supabase.from("strand_assessments").select("id, strand, sub_strand, rating, term, academic_year, subject_id, comments").eq("school_id", schoolId).eq("student_id", selectedChildId).order("created_at", { ascending: false }),
        supabase.from("student_competencies").select("*").eq("school_id", schoolId).eq("student_id", selectedChildId),
      ]);

      if (cancelled) return;
      setExamMarks(emR.data || []);
      setExams(exR.data || []);
      setPapers(spR.data || []);
      setSubjects(suR.data || []);
      setAttendance(atR.data || []);
      setStrandAssessments(saR.data || []);
      setCompetencies(compR.data || []);
      setChildLoading(false);
    })();

    return () => { cancelled = true; };
  }, [selectedChildId, schoolId]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) || null,
    [children, selectedChildId]
  );

  const getLevel = useCallback(
    (pct: number): CbcLevel => {
      const grade = getGrade(pct);
      if (gradingEntries.length >= 4) {
        const idx = gradingEntries.findIndex(
          (g) => g.grade === grade || g.sub_grades.some((sg) => sg.sub_grade === grade)
        );
        if (idx === 0) return "EE";
        if (idx === 1) return "ME";
        if (idx === 2) return "AE";
        return "BE";
      }
      if (pct >= 80) return "EE";
      if (pct >= 60) return "ME";
      if (pct >= 40) return "AE";
      return "BE";
    },
    [getGrade, gradingEntries]
  );

  const examResults: ExamResult[] = useMemo(() => {
    return exams
      .filter((ex) => examMarks.some((m) => m.exam_id === ex.id))
      .map((ex) => {
        const marks = examMarks.filter((m) => m.exam_id === ex.id);
        const total = marks.reduce((s: number, m: any) => s + (m.score || 0), 0);
        const outOf = marks.reduce((s: number, m: any) => s + m.out_of, 0);
        const pct = outOf > 0 ? (total / outOf) * 100 : 0;
        return {
          id: ex.id,
          name: ex.name,
          term: ex.term,
          academic_year: ex.academic_year,
          total,
          outOf,
          percentage: Math.round(pct * 10) / 10,
          grade: getGrade(pct),
          points: getPoints(pct),
          subjects: marks.map((m: any) => {
            const paper = papers.find((p: any) => p.id === m.subject_paper_id);
            const subject = paper ? subjects.find((s: any) => s.id === paper.subject_id) : null;
            const spct = m.out_of > 0 ? ((m.score || 0) / m.out_of) * 100 : 0;
            return {
              name: subject ? `${subject.name} (${paper?.paper_name})` : "Unknown",
              score: m.score,
              outOf: m.out_of,
              percentage: Math.round(spct * 10) / 10,
              grade: getGrade(spct),
            };
          }),
        };
      });
  }, [exams, examMarks, papers, subjects, getGrade, getPoints]);

  const attendanceSummary: AttendanceSummary = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a: any) => a.status === "present").length;
    const absent = attendance.filter((a: any) => a.status === "absent").length;
    const late = attendance.filter((a: any) => a.status === "late").length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, pct };
  }, [attendance]);

  const ratingCounts = useMemo(() => {
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    strandAssessments.forEach((sa: any) => {
      if (sa.rating in counts) counts[sa.rating as keyof typeof counts]++;
    });
    return counts;
  }, [strandAssessments]);

  return {
    loading,
    childLoading,
    children,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    parentFound,
    schoolId,
    school,
    streams,
    classes,
    teachers,
    examResults,
    examMarks,
    exams,
    papers,
    subjects,
    attendance,
    attendanceSummary,
    strandAssessments,
    ratingCounts,
    competencies,
    gradingEntries,
    getGrade,
    getPoints,
    getLevel,
  };
}
