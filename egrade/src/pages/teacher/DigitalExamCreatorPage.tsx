import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput, sanitizeFormData } from "@/lib/sanitize";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Loader2, Plus, Trash2, Send, CheckCircle, XCircle, Eye, Clock,
  FileText, BookOpen, GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Stream = { id: string; name: string; class_id: string };
type Subject = { id: string; name: string };
type Question = {
  id?: string;
  question_text: string;
  question_type: "MCQ" | "Essay";
  marks: number;
  order_index: number;
  options: { id?: string; option_text: string; is_correct: boolean }[];
};

type ExamData = {
  id?: string;
  title: string;
  subject_id: string;
  stream_id: string;
  type: string;
  total_marks: number;
  duration_minutes: number;
  instructions: string;
  approval_status: string;
  target_stream_ids: string[];
  questions: Question[];
};

export default function DigitalExamCreatorPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id;
  const teacherId = profile?.id;
  const isAdmin = effectiveRole === "school_admin";

  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingExams, setExistingExams] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Exam form
  const [exam, setExam] = useState<ExamData>({
    title: "", subject_id: "", stream_id: "", type: "quiz",
    total_marks: 100, duration_minutes: 40, instructions: "",
    approval_status: "draft", target_stream_ids: [], questions: [],
  });

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [streamsRes, subjectsRes, examsRes] = await Promise.all([
        isAdmin
          ? supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true)
          : supabase.from("subject_teacher_allocations").select("stream_id, subject_id, streams(id, name, class_id)").eq("teacher_id", teacherId!).eq("is_active", true),
        supabase.from("subjects").select("id, name").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("assessments").select("*")
          .eq("school_id", schoolId)
          .in("type", ["quiz", "exam", "test"])
          .order("created_at", { ascending: false }),
      ]);

      if (isAdmin && streamsRes.data) {
        setStreams(streamsRes.data as Stream[]);
      } else if (streamsRes.data) {
        const unique = new Map<string, Stream>();
        (streamsRes.data as any[]).forEach(a => { if (a.streams) unique.set(a.streams.id, a.streams); });
        setStreams(Array.from(unique.values()));
        if (subjectsRes.data) {
          const allocIds = new Set((streamsRes.data as any[]).map(a => a.subject_id));
          setSubjects((subjectsRes.data as Subject[]).filter(s => allocIds.has(s.id)));
        }
      }
      if (isAdmin && subjectsRes.data) setSubjects(subjectsRes.data as Subject[]);
      if (examsRes.data) setExistingExams(examsRes.data);
      setLoading(false);
    };
    load();
  }, [schoolId, teacherId]);

  const addQuestion = (type: "MCQ" | "Essay") => {
    setExam(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_text: "",
          question_type: type,
          marks: 5,
          order_index: prev.questions.length + 1,
          options: type === "MCQ" ? [
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
          ] : [],
        },
      ],
    }));
  };

  const updateQuestion = (idx: number, updates: Partial<Question>) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === idx ? { ...q, ...updates } : q),
    }));
  };

  const removeQuestion = (idx: number) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order_index: i + 1 })),
    }));
  };

  const updateOption = (qIdx: number, oIdx: number, updates: Partial<{ option_text: string; is_correct: boolean }>) => {
    setExam(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          options: q.options.map((o, j) => {
            if (j !== oIdx) return updates.is_correct !== undefined ? { ...o, is_correct: false } : o;
            return { ...o, ...updates };
          }),
        };
      }),
    }));
  };

  const handleSaveExam = async (submitForApproval: boolean = false) => {
    if (!exam.title.trim() || !exam.stream_id || !exam.subject_id) {
      toast({ title: "Missing fields", description: "Title, stream, and subject are required.", variant: "destructive" });
      return;
    }
    if (exam.questions.length === 0) {
      toast({ title: "No questions", description: "Add at least one question.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    const approvalStatus = submitForApproval ? "pending" : "draft";

    const { data: assessmentData, error: assessmentError } = await supabase.from("assessments").insert({
      title: sanitizeInput(exam.title, 200),
      type: exam.type,
      total_marks: totalMarks,
      stream_id: exam.stream_id,
      subject_id: exam.subject_id,
      school_id: schoolId!,
      teacher_id: teacherId!,
      instructions: sanitizeInput(exam.instructions, 2000),
      duration_minutes: Math.min(Math.max(exam.duration_minutes, 5), 300),
      approval_status: approvalStatus,
      target_stream_ids: JSON.stringify(exam.target_stream_ids),
      status: approvalStatus === "pending" ? "Pending Approval" : "Draft",
    }).select("id").single();

    if (assessmentError || !assessmentData) {
      toast({ title: "Error", description: assessmentError?.message || "Failed to create exam", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Insert questions
    for (const q of exam.questions) {
      const { data: qData } = await supabase.from("assessment_questions").insert({
        assessment_id: assessmentData.id,
        question_text: sanitizeInput(q.question_text, 2000),
        question_type: q.question_type,
        marks: q.marks,
        order_index: q.order_index,
      }).select("id").single();

      if (qData && q.question_type === "MCQ" && q.options.length > 0) {
        await supabase.from("mcq_options").insert(
          q.options.map(o => ({
            question_id: qData.id,
            option_text: sanitizeInput(o.option_text, 500),
            is_correct: o.is_correct,
          }))
        );
      }
    }

    toast({ title: submitForApproval ? "Submitted for Approval" : "Draft Saved", description: `${exam.questions.length} questions saved.` });
    setSaving(false);
    setShowCreate(false);
    setExam({ title: "", subject_id: "", stream_id: "", type: "quiz", total_marks: 100, duration_minutes: 40, instructions: "", approval_status: "draft", target_stream_ids: [], questions: [] });

    // Refresh
    const { data } = await supabase.from("assessments").select("*").eq("school_id", schoolId!).in("type", ["quiz", "exam", "test"]).order("created_at", { ascending: false });
    if (data) setExistingExams(data);
  };

  // Admin approve/reject
  const handleApproval = async (examId: string, approved: boolean) => {
    const newStatus = approved ? "approved" : "rejected";
    await supabase.from("assessments").update({
      approval_status: newStatus,
      approved_by: teacherId,
      status: approved ? "Published" : "Rejected",
      is_published: approved,
    }).eq("id", examId);
    toast({ title: approved ? "Exam Approved" : "Exam Rejected" });
    const { data } = await supabase.from("assessments").select("*").eq("school_id", schoolId!).in("type", ["quiz", "exam", "test"]).order("created_at", { ascending: false });
    if (data) setExistingExams(data);
  };

  // Admin: publish to additional streams
  const [showPublish, setShowPublish] = useState<string | null>(null);
  const [publishStreams, setPublishStreams] = useState<string[]>([]);

  const handlePublishToStreams = async () => {
    if (!showPublish) return;
    await supabase.from("assessments").update({
      target_stream_ids: JSON.stringify(publishStreams),
    }).eq("id", showPublish);
    toast({ title: "Publishing updated" });
    setShowPublish(null);
    const { data } = await supabase.from("assessments").select("*").eq("school_id", schoolId!).in("type", ["quiz", "exam", "test"]).order("created_at", { ascending: false });
    if (data) setExistingExams(data);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading exam creator..." /></div>;

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Digital Exams</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create MCQ & essay exams · {isAdmin ? "Approve & publish" : "Submit for approval"} · {existingExams.length} total
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); setActiveTab("create"); }} className="font-bold gap-2">
          <Plus className="w-4 h-4" /> Create Exam
        </Button>
      </div>

      {/* Existing exams list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {existingExams.map(e => {
          const subj = subjects.find(s => s.id === e.subject_id);
          const stream = streams.find(s => s.id === e.stream_id);
          const status = e.approval_status || "draft";
          return (
            <div key={e.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm leading-tight">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{subj?.name} · {stream?.name}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[status]}`}>{status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.duration_minutes || 40} min</span>
                <span>{e.total_marks} marks</span>
                <span className="capitalize">{e.type}</span>
              </div>
              {/* Admin actions */}
              {isAdmin && status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApproval(e.id, true)} className="flex-1 gap-1 font-bold text-xs bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-3 h-3" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleApproval(e.id, false)} className="flex-1 gap-1 font-bold text-xs">
                    <XCircle className="w-3 h-3" /> Reject
                  </Button>
                </div>
              )}
              {isAdmin && status === "approved" && (
                <Button size="sm" variant="outline" onClick={() => { setShowPublish(e.id); setPublishStreams([]); }} className="w-full gap-1 font-bold text-xs">
                  <Eye className="w-3 h-3" /> Manage Visibility
                </Button>
              )}
            </div>
          );
        })}
        {existingExams.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-10 h-10" />
            <p className="font-semibold">No digital exams yet</p>
            <p className="text-xs">Create your first exam to get started</p>
          </div>
        )}
      </div>

      {/* Create Exam Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black">Create Digital Exam</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            {/* Exam metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Exam Title *</Label>
                <Input value={exam.title} onChange={e => setExam(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Grade 7 Math Mid-Term Quiz" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Stream *</Label>
                <Select value={exam.stream_id} onValueChange={v => setExam(p => ({ ...p, stream_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{streams.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Subject *</Label>
                <Select value={exam.subject_id} onValueChange={v => setExam(p => ({ ...p, subject_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Type</Label>
                <Select value={exam.type} onValueChange={v => setExam(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Duration (minutes)</Label>
                <Input type="number" value={exam.duration_minutes} onChange={e => setExam(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 40 }))} className="mt-1" min={5} max={300} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Instructions</Label>
                <Textarea value={exam.instructions} onChange={e => setExam(p => ({ ...p, instructions: e.target.value }))} placeholder="Instructions for students..." rows={2} className="mt-1" />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Questions ({exam.questions.length})</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addQuestion("MCQ")} className="gap-1 text-xs font-bold">
                    <Plus className="w-3 h-3" /> MCQ
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addQuestion("Essay")} className="gap-1 text-xs font-bold">
                    <Plus className="w-3 h-3" /> Essay
                  </Button>
                </div>
              </div>

              {exam.questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">Q{q.order_index}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.question_type === "MCQ" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{q.question_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">Marks:</Label>
                        <Input type="number" className="w-16 h-7 text-xs" value={q.marks} min={1}
                          onChange={e => updateQuestion(qIdx, { marks: parseInt(e.target.value) || 1 })} />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeQuestion(qIdx)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={q.question_text}
                    onChange={e => updateQuestion(qIdx, { question_text: e.target.value })}
                    placeholder="Enter question text..."
                    rows={2}
                    className="text-sm"
                  />

                  {q.question_type === "MCQ" && (
                    <div className="space-y-2 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <Checkbox
                            checked={opt.is_correct}
                            onCheckedChange={() => updateOption(qIdx, oIdx, { is_correct: true })}
                          />
                          <Input
                            value={opt.option_text}
                            onChange={e => updateOption(qIdx, oIdx, { option_text: e.target.value })}
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            className="h-8 text-xs flex-1"
                          />
                          {opt.is_correct && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground">Check the correct answer</p>
                    </div>
                  )}
                </div>
              ))}

              {exam.questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No questions added yet</p>
                  <p className="text-xs">Click "MCQ" or "Essay" above to add questions</p>
                </div>
              )}
            </div>

            {exam.questions.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3 text-xs">
                <p className="font-bold text-foreground">Total: {exam.questions.reduce((s, q) => s + q.marks, 0)} marks · {exam.questions.length} questions</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSaveExam(false)} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Save Draft
            </Button>
            <Button onClick={() => handleSaveExam(true)} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish to streams dialog (admin) */}
      <Dialog open={!!showPublish} onOpenChange={() => setShowPublish(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-black">Manage Exam Visibility</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Select additional streams that should access this exam:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {streams.map(s => (
              <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={publishStreams.includes(s.id)}
                  onCheckedChange={checked => {
                    setPublishStreams(prev =>
                      checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                    );
                  }}
                />
                <span className="text-sm font-medium">{s.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublish(null)}>Cancel</Button>
            <Button onClick={handlePublishToStreams} className="font-bold">Save Visibility</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
