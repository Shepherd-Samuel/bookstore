import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useToast } from "@/hooks/use-toast";
import EGradeLoader from "@/components/ui/EGradeLoader";
import { Loader2, Save, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Exam = { id: string; name: string; term: string; academic_year: string; is_active: boolean; exam_type_id: string };
type ExamType = { id: string; name: string };
type SubjectPaper = { id: string; subject_id: string; class_id: string | null; paper_name: string; default_out_of: number };
type Subject = { id: string; name: string };
type ClassItem = { id: string; name: string };
type Stream = { id: string; name: string; class_id: string };
type Student = { id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null };
type MarkRow = { id: string; exam_id: string; student_id: string; subject_paper_id: string; out_of: number; score: number | null };

export default function ExamMarksPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const scope = useTeacherScope(profile?.id, profile?.school_id, effectiveRole);
  const [loading, setLoading] = useState(true);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [papers, setPapers] = useState<SubjectPaper[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [outOfOverride, setOutOfOverride] = useState<Record<string, string>>({});
  const [singleOutOf, setSingleOutOf] = useState("100");

  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  const [existingMarks, setExistingMarks] = useState<MarkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoPaperId, setAutoPaperId] = useState<string | null>(null);

  const schoolId = profile?.school_id;
  const isAdmin = effectiveRole === "school_admin";

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [examsRes, typesRes, papersRes, subjRes, classesRes, streamsRes, studentsRes] = await Promise.all([
        supabase.from("exams").select("*").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("exam_types").select("*").eq("school_id", schoolId),
        supabase.from("subject_papers").select("*").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("subjects").select("id, name").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("classes").select("id, name").eq("is_active", true),
        supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id").eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
      ]);
      if (examsRes.data) setExams(examsRes.data as Exam[]);
      if (typesRes.data) setExamTypes(typesRes.data as ExamType[]);
      if (papersRes.data) setPapers(papersRes.data as SubjectPaper[]);
      if (subjRes.data) setSubjects(subjRes.data as Subject[]);
      if (classesRes.data) setClasses(classesRes.data as ClassItem[]);
      if (streamsRes.data) setStreams(streamsRes.data as Stream[]);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      setLoading(false);
    };
    load();
  }, [schoolId]);

  useEffect(() => { setSelectedStream(""); }, [selectedClass]);

  // ── Teacher-scoped filtering ──
  // Streams the teacher can access
  const teacherStreams = isAdmin
    ? streams
    : streams.filter(s => scope.hasStreamAccess(s.id));

  // Classes derived from accessible streams
  const teacherClassIds = [...new Set(teacherStreams.map(s => s.class_id))];
  const teacherClasses = isAdmin ? classes : classes.filter(c => teacherClassIds.includes(c.id));

  // Subjects filtered: teachers only see their allocated subjects (strict enforcement)
  const teacherSubjects = isAdmin
    ? subjects
    : (() => {
        // Get all subject IDs this teacher is allocated to across all streams
        const allAllocatedSubjectIds = [...new Set(scope.allocations.map(a => a.subject_id))];
        if (!selectedStream) {
          // Show only allocated subjects even before stream selection
          return allAllocatedSubjectIds.length > 0
            ? subjects.filter(s => allAllocatedSubjectIds.includes(s.id))
            : [];
        }
        const allowed = scope.getAllowedSubjects(selectedStream);
        // Even class teachers only enter marks for subjects they're allocated to
        return allowed.length > 0 ? subjects.filter(s => allowed.includes(s.id)) : [];
      })();

  const filteredStreams = teacherStreams.filter(s => s.class_id === selectedClass);

  // Determine papers for the selected subject + class
  const getRelevantPapers = (): SubjectPaper[] => {
    if (!selectedSubject || !selectedClass) return [];
    const classPapers = papers.filter(p => p.subject_id === selectedSubject && p.class_id === selectedClass);
    if (classPapers.length > 0) return classPapers;
    const globalPapers = papers.filter(p => p.subject_id === selectedSubject && !p.class_id);
    if (globalPapers.length > 0) return globalPapers;
    return [];
  };

  const relevantPapers = getRelevantPapers();
  const useSingleMarkMode = selectedSubject && selectedClass && relevantPapers.length === 0;

  // Load existing marks when exam + subject selected
  useEffect(() => {
    if (!selectedExam || !selectedSubject || !schoolId) return;
    setAutoPaperId(null);

    const loadMarks = async () => {
      if (relevantPapers.length > 0) {
        const paperIds = relevantPapers.map(p => p.id);
        const { data } = await supabase.from("exam_marks")
          .select("*").eq("exam_id", selectedExam).in("subject_paper_id", paperIds);
        if (data) {
          setExistingMarks(data as MarkRow[]);
          const m: Record<string, Record<string, string>> = {};
          data.forEach((row: any) => {
            if (!m[row.student_id]) m[row.student_id] = {};
            m[row.student_id][row.subject_paper_id] = row.score?.toString() || "";
          });
          setMarks(m);
          const oo: Record<string, string> = {};
          relevantPapers.forEach(p => {
            const ex = data.find((d: any) => d.subject_paper_id === p.id);
            oo[p.id] = ex ? ex.out_of.toString() : p.default_out_of.toString();
          });
          setOutOfOverride(oo);
        }
      } else if (useSingleMarkMode) {
        const { data: existingPaper } = await supabase.from("subject_papers")
          .select("*")
          .eq("school_id", schoolId)
          .eq("subject_id", selectedSubject)
          .eq("class_id", selectedClass)
          .eq("paper_name", "Single Paper")
          .maybeSingle();

        let paperId: string;
        if (existingPaper) {
          paperId = existingPaper.id;
          setSingleOutOf(existingPaper.default_out_of.toString());
        } else {
          const { data: newPaper, error } = await supabase.from("subject_papers").insert({
            school_id: schoolId,
            subject_id: selectedSubject,
            class_id: selectedClass,
            paper_name: "Single Paper",
            default_out_of: 100,
          }).select().single();
          if (error || !newPaper) {
            setExistingMarks([]);
            setMarks({});
            return;
          }
          paperId = newPaper.id;
          setSingleOutOf("100");
        }
        setAutoPaperId(paperId);

        const { data } = await supabase.from("exam_marks")
          .select("*").eq("exam_id", selectedExam).eq("subject_paper_id", paperId);
        if (data) {
          setExistingMarks(data as MarkRow[]);
          const m: Record<string, Record<string, string>> = {};
          data.forEach((row: any) => {
            if (!m[row.student_id]) m[row.student_id] = {};
            m[row.student_id][paperId] = row.score?.toString() || "";
          });
          setMarks(m);
          if (data.length > 0) setSingleOutOf(data[0].out_of.toString());
        }
      }
    };
    loadMarks();
  }, [selectedExam, selectedSubject, selectedClass, papers.length]);

  const filteredExams = exams.filter(e => e.term === selectedTerm);
  const streamStudents = students.filter(s => s.stream_id === selectedStream);

  const handleSaveMarks = async () => {
    if (!selectedExam || !schoolId || !profile?.id) return;
    setSaving(true);
    let count = 0;

    const papersToSave = useSingleMarkMode && autoPaperId
      ? [{ id: autoPaperId, default_out_of: parseFloat(singleOutOf) || 100 }]
      : relevantPapers;

    for (const student of streamStudents) {
      for (const paper of papersToSave) {
        const scoreStr = marks[student.id]?.[paper.id];
        if (!scoreStr && scoreStr !== "0") continue;
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score < 0) continue;
        const outOf = useSingleMarkMode
          ? Math.max(1, Math.min(parseFloat(singleOutOf) || 100, 999))
          : Math.max(1, Math.min(parseFloat(outOfOverride[paper.id] || paper.default_out_of.toString()), 999));
        // Clamp score to valid range
        const clampedScore = Math.min(Math.max(Math.round(score * 100) / 100, 0), outOf);

        const existing = existingMarks.find(m => m.student_id === student.id && m.subject_paper_id === paper.id);
        if (existing) {
          await supabase.from("exam_marks").update({
            score: clampedScore,
            out_of: outOf,
            graded_by: profile.id,
            graded_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          await supabase.from("exam_marks").insert({
            exam_id: selectedExam,
            student_id: student.id,
            subject_paper_id: paper.id,
            school_id: schoolId,
            score: clampedScore,
            out_of: outOf,
            graded_by: profile.id,
            graded_at: new Date().toISOString(),
          });
        }
        count++;
      }
    }

    if (useSingleMarkMode && autoPaperId) {
      await supabase.from("subject_papers").update({
        default_out_of: parseFloat(singleOutOf) || 100,
      }).eq("id", autoPaperId);
    }

    toast({ title: "Marks Saved", description: `${count} entries saved/updated.` });
    setSaving(false);
  };

  const canEnterMarks = selectedExam && selectedSubject && selectedStream &&
    (relevantPapers.length > 0 || (useSingleMarkMode && autoPaperId));

  if (loading || scope.loading) return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading marks..." /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Enter Exam Marks</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Select an active exam, subject, class &amp; stream to enter marks</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Term 1">Term 1</SelectItem>
            <SelectItem value="Term 2">Term 2</SelectItem>
            <SelectItem value="Term 3">Term 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
          <SelectContent>
            {filteredExams.map(e => {
              const et = examTypes.find(t => t.id === e.exam_type_id);
              return <SelectItem key={e.id} value={e.id}>{e.name} ({et?.name})</SelectItem>;
            })}
            {filteredExams.length === 0 && <SelectItem value="_" disabled>No active exams</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>{teacherClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedStream} onValueChange={setSelectedStream}>
          <SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
          <SelectContent>
            {filteredStreams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            {filteredStreams.length === 0 && <SelectItem value="_" disabled>{selectedClass ? "No streams" : "Select class first"}</SelectItem>}
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>{teacherSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {canEnterMarks ? (
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-3 rounded-lg">
            <span className="text-xs font-bold text-foreground">Out Of:</span>
            {useSingleMarkMode ? (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Score out of</Label>
                <Input type="number" className="h-7 w-20 text-xs" value={singleOutOf} onChange={e => setSingleOutOf(e.target.value)} />
                <span className="text-[10px] text-muted-foreground">(No papers defined — using single mark)</span>
              </div>
            ) : (
              relevantPapers.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{p.paper_name}</Label>
                  <Input type="number" className="h-7 w-20 text-xs"
                    value={outOfOverride[p.id] || p.default_out_of.toString()}
                    onChange={e => setOutOfOverride(prev => ({ ...prev, [p.id]: e.target.value }))} />
                </div>
              ))
            )}
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Student</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Adm No</th>
                  {useSingleMarkMode ? (
                    <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Score (/{singleOutOf})</th>
                  ) : (
                    relevantPapers.map(p => (
                      <th key={p.id} className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">
                        {p.paper_name} (/{outOfOverride[p.id] || p.default_out_of})
                      </th>
                    ))
                  )}
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {streamStudents.map(s => {
                  const papersList = useSingleMarkMode && autoPaperId ? [{ id: autoPaperId }] : relevantPapers;
                  const hasExisting = papersList.some(p => existingMarks.some(m => m.student_id === s.id && m.subject_paper_id === p.id));
                  return (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">{s.first_name} {s.last_name}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{s.adm_no || "—"}</td>
                      {papersList.map(p => (
                        <td key={p.id} className="py-2 px-3">
                          <Input type="number" className="h-7 w-20 text-xs" min={0}
                            max={useSingleMarkMode ? parseFloat(singleOutOf) : parseFloat(outOfOverride[p.id] || "100")}
                            value={marks[s.id]?.[p.id] || ""}
                            onChange={e => setMarks(prev => ({ ...prev, [s.id]: { ...prev[s.id], [p.id]: e.target.value } }))} />
                        </td>
                      ))}
                      <td className="py-2 px-3">
                        {hasExisting ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Saved</span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">New</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {streamStudents.length === 0 && (
                  <tr><td colSpan={useSingleMarkMode ? 4 : 3 + relevantPapers.length} className="py-12 text-center text-muted-foreground">No students in this stream</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Button onClick={handleSaveMarks} disabled={saving} className="font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Marks
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-center space-y-3 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto" />
          <p className="font-semibold">Select an exam, class, stream &amp; subject to begin entering marks</p>
          {!isAdmin && <p className="text-xs">You can only enter marks for classes and subjects assigned to you.</p>}
        </div>
      )}
    </div>
  );
}
