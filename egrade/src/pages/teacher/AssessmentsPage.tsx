import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput, sanitizeFormData } from "@/lib/sanitize";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Plus, Loader2, BookOpen, Search, Save, FileText, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CbcBadge, CbcLevel } from "@/components/Dashboards";

type Stream = { id: string; name: string; class_id: string };
type Subject = { id: string; name: string; code: string | null };
type Student = { id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null };
type CurriculumDesign = {
  id: string; subject_name: string; subject_id: string | null; strand: string; sub_strand: string;
  level: string; term: string | null; week_number: number | null;
  specific_learning_outcomes: string | null;
};
type Assessment = {
  id: string; title: string; type: string; status: string; total_marks: number;
  stream_id: string; subject_id: string; due_date: string | null; is_published: boolean;
  created_at: string; instructions: string | null;
};

function getLevel(pct: number): CbcLevel {
  if (pct >= 80) return "EE";
  if (pct >= 60) return "ME";
  if (pct >= 40) return "AE";
  return "BE";
}

export default function TeacherAssessmentsPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Create assessment linked to strand/sub-strand
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assessForm, setAssessForm] = useState({
    title: "", type: "formative", total_marks: "100", stream_id: "", subject_id: "",
    instructions: "", due_date: "", strand: "", sub_strand: "",
  });

  // Score entry
  const [showScoring, setShowScoring] = useState<Assessment | null>(null);
  const [scores, setScores] = useState<Record<string, { score: string; remarks: string }>>({});
  const [savingScores, setSavingScores] = useState(false);

  const schoolId = profile?.school_id;
  const teacherId = profile?.id;
  const isAdmin = effectiveRole === "school_admin";
  const scope = useTeacherScope(teacherId, schoolId, effectiveRole);

  useEffect(() => {
    if (!schoolId) return;
    const fetchData = async () => {
      setLoading(true);
      const teacherFilter = isAdmin ? {} : { teacher_id: teacherId };
      const [allocRes, subjectsRes, studentsRes, assessRes, currRes] = await Promise.all([
        isAdmin
          ? supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true)
          : supabase.from("subject_teacher_allocations").select("stream_id, subject_id, streams(id, name, class_id)").eq("teacher_id", teacherId!).eq("is_active", true),
        supabase.from("subjects").select("id, name, code").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id").eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
        isAdmin
          ? supabase.from("assessments").select("*").eq("school_id", schoolId).order("created_at", { ascending: false })
          : supabase.from("assessments").select("*").eq("teacher_id", teacherId!).order("created_at", { ascending: false }),
        supabase.from("curriculum_designs").select("id, subject_name, subject_id, strand, sub_strand, level, term, week_number, specific_learning_outcomes"),
      ]);

      if (isAdmin && allocRes.data) {
        setStreams(allocRes.data as Stream[]);
      } else if (allocRes.data) {
        const uniqueStreams = new Map<string, Stream>();
        (allocRes.data as any[]).forEach((a) => {
          if (a.streams) uniqueStreams.set(a.streams.id, a.streams);
        });
        setStreams(Array.from(uniqueStreams.values()));
      }
      if (subjectsRes.data) {
        // For teachers, filter subjects to only those they're allocated to teach
        if (!isAdmin && allocRes.data) {
          const allocatedSubjectIds = new Set((allocRes.data as any[]).map(a => a.subject_id));
          setSubjects((subjectsRes.data as Subject[]).filter(s => allocatedSubjectIds.has(s.id)));
        } else {
          setSubjects(subjectsRes.data as Subject[]);
        }
      }
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (assessRes.data) setAssessments(assessRes.data as Assessment[]);
      if (currRes.data) setCurriculum(currRes.data as CurriculumDesign[]);
      setLoading(false);
    };
    fetchData();
  }, [schoolId, teacherId]);

  // Get unique strands for selected subject
  const selectedSubjectCurr = curriculum.filter(c => {
    if (!assessForm.subject_id) return false;
    const subj = subjects.find(s => s.id === assessForm.subject_id);
    return subj && (c.subject_id === assessForm.subject_id || c.subject_name === subj.name);
  });
  const strands = [...new Set(selectedSubjectCurr.map(c => c.strand))].filter(Boolean);
  const subStrands = [...new Set(selectedSubjectCurr.filter(c => c.strand === assessForm.strand).map(c => c.sub_strand))].filter(Boolean);

  const handleCreateAssessment = async () => {
    if (!assessForm.title.trim() || !assessForm.stream_id || !assessForm.subject_id) {
      toast({ title: "Missing fields", description: "Title, stream, and subject are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const sanitized = sanitizeFormData(assessForm);
    const strandInfo = sanitized.strand ? ` [${sanitized.strand}${sanitized.sub_strand ? ` > ${sanitized.sub_strand}` : ""}]` : "";
    const { error } = await supabase.from("assessments").insert({
      title: sanitized.title,
      type: sanitized.type,
      total_marks: Math.min(Math.max(parseInt(sanitized.total_marks) || 100, 1), 1000),
      stream_id: sanitized.stream_id,
      subject_id: sanitized.subject_id,
      school_id: schoolId!,
      teacher_id: teacherId!,
      instructions: `${sanitized.instructions}${strandInfo}`,
      due_date: sanitized.due_date || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assessment Created" });
      setShowCreate(false);
      setAssessForm({ title: "", type: "formative", total_marks: "100", stream_id: "", subject_id: "", instructions: "", due_date: "", strand: "", sub_strand: "" });
      const { data } = isAdmin
        ? await supabase.from("assessments").select("*").eq("school_id", schoolId!).order("created_at", { ascending: false })
        : await supabase.from("assessments").select("*").eq("teacher_id", teacherId!).order("created_at", { ascending: false });
      if (data) setAssessments(data as Assessment[]);
    }
    setCreating(false);
  };

  const openScoring = async (assessment: Assessment) => {
    setShowScoring(assessment);
    const { data } = await supabase.from("assessment_scores")
      .select("student_id, score, remarks")
      .eq("assessment_id", assessment.id);
    const scoreMap: Record<string, { score: string; remarks: string }> = {};
    if (data) {
      data.forEach((s: any) => {
        scoreMap[s.student_id] = { score: s.score?.toString() || "", remarks: s.remarks || "" };
      });
    }
    const streamStudents = students.filter(s => s.stream_id === assessment.stream_id);
    streamStudents.forEach(s => {
      if (!scoreMap[s.id]) scoreMap[s.id] = { score: "", remarks: "" };
    });
    setScores(scoreMap);
  };

  const handleSaveScores = async () => {
    if (!showScoring) return;
    setSavingScores(true);
    const entries = Object.entries(scores).filter(([, v]) => v.score !== "");
    for (const [studentId, v] of entries) {
      const score = Math.min(Math.max(parseFloat(v.score), 0), showScoring.total_marks);
      const remarks = sanitizeInput(v.remarks, 500);
      const { data: existing } = await supabase.from("assessment_scores")
        .select("id").eq("assessment_id", showScoring.id).eq("student_id", studentId).maybeSingle();
      if (existing) {
        await supabase.from("assessment_scores").update({ score, remarks, graded_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabase.from("assessment_scores").insert({
          assessment_id: showScoring.id, student_id: studentId, score, remarks, graded_at: new Date().toISOString(),
        });
      }
    }
    toast({ title: "Scores Saved", description: `${entries.length} scores updated.` });
    setSavingScores(false);
    setShowScoring(null);
  };

  const filteredAssessments = assessments.filter(a => {
    if (selectedStream && selectedStream !== "all" && a.stream_id !== selectedStream) return false;
    if (selectedSubject && selectedSubject !== "all" && a.subject_id !== selectedSubject) return false;
    return true;
  });

  const streamStudents = showScoring ? students.filter(s => s.stream_id === showScoring.stream_id) : [];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading assessments..." /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">CBC Assessments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Strand & sub-strand based formative assessments · {assessments.length} total
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="font-bold gap-2">
          <Plus className="w-4 h-4" /> Create Assessment
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedStream} onValueChange={setSelectedStream}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Streams" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Streams</SelectItem>
            {streams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAssessments.map(a => {
          const subj = subjects.find(s => s.id === a.subject_id);
          const stream = streams.find(s => s.id === a.stream_id);
          // Extract strand info from instructions
          const strandMatch = a.instructions?.match(/\[(.+?)\]/);
          const strandInfo = strandMatch ? strandMatch[1] : null;
          return (
            <div key={a.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm leading-tight">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{subj?.name} · {stream?.name}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  a.status === "Published" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                }`}>{a.status}</span>
              </div>
              {strandInfo && (
                <p className="text-[10px] font-semibold text-primary bg-primary/5 px-2 py-1 rounded">{strandInfo}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Type: {a.type}</span>
                <span>Marks: {a.total_marks}</span>
              </div>
              {a.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(a.due_date).toLocaleDateString()}</p>}
              <Button size="sm" variant="outline" onClick={() => openScoring(a)} className="w-full gap-1.5 font-bold text-xs">
                <FileText className="w-3 h-3" /> Enter Marks
              </Button>
            </div>
          );
        })}
        {filteredAssessments.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <BookOpen className="w-10 h-10" />
            <p className="font-semibold">No assessments yet</p>
          </div>
        )}
      </div>

      {/* Create Assessment Dialog — strand-based */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black">Create CBC Assessment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input value={assessForm.title} onChange={e => setAssessForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Fractions Formative Assessment" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Stream *</Label>
                <Select value={assessForm.stream_id} onValueChange={v => setAssessForm(p => ({ ...p, stream_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{streams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Subject *</Label>
                <Select value={assessForm.subject_id} onValueChange={v => setAssessForm(p => ({ ...p, subject_id: v, strand: "", sub_strand: "" }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Strand & Sub-strand from curriculum */}
            {assessForm.subject_id && strands.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Strand (from curriculum)</Label>
                  <Select value={assessForm.strand} onValueChange={v => setAssessForm(p => ({ ...p, strand: v, sub_strand: "" }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select strand" /></SelectTrigger>
                    <SelectContent>{strands.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Sub-strand</Label>
                  <Select value={assessForm.sub_strand} onValueChange={v => setAssessForm(p => ({ ...p, sub_strand: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{subStrands.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Type</Label>
                <Select value={assessForm.type} onValueChange={v => setAssessForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formative">Formative</SelectItem>
                    <SelectItem value="summative">Summative</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Total Marks</Label>
                <Input type="number" value={assessForm.total_marks} onChange={e => setAssessForm(p => ({ ...p, total_marks: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input type="date" value={assessForm.due_date} onChange={e => setAssessForm(p => ({ ...p, due_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Learning Outcomes / Instructions</Label>
              <Textarea value={assessForm.instructions} onChange={e => setAssessForm(p => ({ ...p, instructions: e.target.value }))}
                placeholder="Specific learning outcomes being assessed..." rows={3} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateAssessment} disabled={creating} className="font-bold gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Entry Dialog */}
      <Dialog open={!!showScoring} onOpenChange={() => setShowScoring(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Enter Marks — {showScoring?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2">Student</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 w-24">Score / {showScoring?.total_marks}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2 w-16">Level</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground py-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {streamStudents.map(s => {
                  const scoreVal = parseFloat(scores[s.id]?.score || "0");
                  const pct = showScoring ? (scoreVal / showScoring.total_marks) * 100 : 0;
                  const level = getLevel(pct);
                  return (
                    <tr key={s.id}>
                      <td className="py-2">
                        <p className="font-semibold text-foreground">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-muted-foreground">{s.adm_no || "—"}</p>
                      </td>
                      <td className="py-2">
                        <Input type="number" className="h-8 w-20" min={0} max={showScoring?.total_marks}
                          value={scores[s.id]?.score || ""}
                          onChange={e => setScores(prev => ({ ...prev, [s.id]: { ...prev[s.id], score: e.target.value } }))} />
                      </td>
                      <td className="py-2">
                        {scores[s.id]?.score ? <CbcBadge level={level} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2">
                        <Input className="h-8" placeholder="Optional remarks"
                          value={scores[s.id]?.remarks || ""}
                          onChange={e => setScores(prev => ({ ...prev, [s.id]: { ...prev[s.id], remarks: e.target.value } }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoring(null)}>Cancel</Button>
            <Button onClick={handleSaveScores} disabled={savingScores} className="font-bold gap-2">
              {savingScores ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Scores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
