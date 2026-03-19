import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Loader2, CheckCircle, XCircle, Eye, Clock, FileText, BookOpen,
  Users, Send, Filter, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Assessment = {
  id: string;
  title: string;
  type: string;
  total_marks: number;
  duration_minutes: number | null;
  instructions: string | null;
  approval_status: string;
  status: string;
  is_published: boolean;
  stream_id: string;
  subject_id: string;
  teacher_id: string;
  school_id: string;
  created_at: string;
  target_stream_ids: any;
  academic_year: string | null;
  term: string | null;
};

type Stream = { id: string; name: string; class_id: string };
type Subject = { id: string; name: string };
type Profile = { id: string; first_name: string; last_name: string };
type Question = { id: string; question_text: string; question_type: string; marks: number; order_index: number };
type McqOption = { id: string; question_id: string; option_text: string; is_correct: boolean };

export default function ExamApprovalPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id;

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);

  const [filterStatus, setFilterStatus] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Preview dialog
  const [previewExam, setPreviewExam] = useState<Assessment | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewOptions, setPreviewOptions] = useState<McqOption[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Publish dialog
  const [publishExam, setPublishExam] = useState<Assessment | null>(null);
  const [publishStreams, setPublishStreams] = useState<string[]>([]);

  // Rejection reason
  const [rejectExam, setRejectExam] = useState<Assessment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchAssessments = async () => {
    if (!schoolId) return;
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("school_id", schoolId)
      .in("type", ["quiz", "exam", "test"])
      .order("created_at", { ascending: false });
    if (data) setAssessments(data as Assessment[]);
  };

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [streamsRes, subjectsRes, teachersRes] = await Promise.all([
        supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("subjects").select("id, name").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true),
      ]);
      if (streamsRes.data) setStreams(streamsRes.data as Stream[]);
      if (subjectsRes.data) setSubjects(subjectsRes.data as Subject[]);
      if (teachersRes.data) setTeachers(teachersRes.data as Profile[]);
      await fetchAssessments();
      setLoading(false);
    };
    load();
  }, [schoolId]);

  const handlePreview = async (exam: Assessment) => {
    setPreviewExam(exam);
    setLoadingPreview(true);
    const [qRes, oRes] = await Promise.all([
      supabase.from("assessment_questions").select("*").eq("assessment_id", exam.id).order("order_index"),
      supabase.from("mcq_options").select("*"),
    ]);
    if (qRes.data) setPreviewQuestions(qRes.data as Question[]);
    // Filter options to only those belonging to this exam's questions
    const qIds = new Set((qRes.data || []).map(q => q.id));
    if (oRes.data) setPreviewOptions((oRes.data as McqOption[]).filter(o => qIds.has(o.question_id)));
    setLoadingPreview(false);
  };

  const handleApproval = async (examId: string, approved: boolean) => {
    const updates: any = {
      approval_status: approved ? "approved" : "rejected",
      approved_by: profile?.id,
      status: approved ? "Published" : "Rejected",
      is_published: approved,
    };
    await supabase.from("assessments").update(updates).eq("id", examId);
    toast({ title: approved ? "Exam Approved ✓" : "Exam Rejected" });
    setPreviewExam(null);
    setRejectExam(null);
    setRejectReason("");
    await fetchAssessments();
  };

  const handlePublishToStreams = async () => {
    if (!publishExam) return;
    await supabase.from("assessments").update({
      target_stream_ids: JSON.stringify(publishStreams),
    }).eq("id", publishExam.id);
    toast({ title: "Visibility Updated" });
    setPublishExam(null);
    await fetchAssessments();
  };

  const filtered = assessments.filter(a => {
    if (filterStatus !== "all" && a.approval_status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const subj = subjects.find(s => s.id === a.subject_id)?.name?.toLowerCase() || "";
      const teacher = teachers.find(t => t.id === a.teacher_id);
      const tName = teacher ? `${teacher.first_name} ${teacher.last_name}`.toLowerCase() : "";
      return a.title.toLowerCase().includes(q) || subj.includes(q) || tName.includes(q);
    }
    return true;
  });

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const counts = {
    all: assessments.length,
    pending: assessments.filter(a => a.approval_status === "pending").length,
    approved: assessments.filter(a => a.approval_status === "approved").length,
    rejected: assessments.filter(a => a.approval_status === "rejected").length,
    draft: assessments.filter(a => a.approval_status === "draft").length,
  };

  if (loading) return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading approvals..." /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Exam Approval</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Review, approve, or reject teacher-submitted digital exams · {counts.pending} pending
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 bg-muted/50 rounded-lg p-1">
          {(["pending", "approved", "rejected", "draft", "all"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors capitalize ${
                filterStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(sanitizeInput(e.target.value, 100))}
            placeholder="Search by title, subject, or teacher..."
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Exam cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(exam => {
          const subj = subjects.find(s => s.id === exam.subject_id);
          const stream = streams.find(s => s.id === exam.stream_id);
          const teacher = teachers.find(t => t.id === exam.teacher_id);
          const status = exam.approval_status || "draft";
          const targetStreams = (() => {
            try { return JSON.parse(typeof exam.target_stream_ids === "string" ? exam.target_stream_ids : JSON.stringify(exam.target_stream_ids || [])); }
            catch { return []; }
          })();

          return (
            <div key={exam.id} className="bg-card rounded-xl border border-border p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-sm leading-tight truncate">{exam.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{subj?.name} · {stream?.name}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${STATUS_COLORS[status]}`}>{status}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes || 40}m</span>
                <span>{exam.total_marks} marks</span>
                <span className="capitalize">{exam.type}</span>
              </div>

              {teacher && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {teacher.first_name} {teacher.last_name}
                </p>
              )}

              {targetStreams.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {targetStreams.map((sid: string) => {
                    const s = streams.find(st => st.id === sid);
                    return s ? <Badge key={sid} variant="secondary" className="text-[10px]">{s.name}</Badge> : null;
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => handlePreview(exam)} className="flex-1 gap-1 font-bold text-xs">
                  <Eye className="w-3 h-3" /> Preview
                </Button>
                {status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => handleApproval(exam.id, true)} className="flex-1 gap-1 font-bold text-xs bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectExam(exam)} className="flex-1 gap-1 font-bold text-xs">
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  </>
                )}
                {status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => {
                    setPublishExam(exam);
                    const existing = (() => {
                      try { return JSON.parse(typeof exam.target_stream_ids === "string" ? exam.target_stream_ids : JSON.stringify(exam.target_stream_ids || [])); }
                      catch { return []; }
                    })();
                    setPublishStreams(existing);
                  }} className="flex-1 gap-1 font-bold text-xs">
                    <Send className="w-3 h-3" /> Visibility
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-10 h-10" />
            <p className="font-semibold">No exams matching filter</p>
            <p className="text-xs">Adjust the filter or wait for teachers to submit exams.</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewExam} onOpenChange={() => setPreviewExam(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">{previewExam?.title}</DialogTitle>
          </DialogHeader>
          {loadingPreview ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Subject:</span> <span className="font-semibold">{subjects.find(s => s.id === previewExam?.subject_id)?.name}</span></div>
                <div><span className="text-muted-foreground text-xs">Stream:</span> <span className="font-semibold">{streams.find(s => s.id === previewExam?.stream_id)?.name}</span></div>
                <div><span className="text-muted-foreground text-xs">Duration:</span> <span className="font-semibold">{previewExam?.duration_minutes || 40} min</span></div>
                <div><span className="text-muted-foreground text-xs">Total Marks:</span> <span className="font-semibold">{previewExam?.total_marks}</span></div>
              </div>
              {previewExam?.instructions && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-1">Instructions:</p>
                  <p className="text-sm">{previewExam.instructions}</p>
                </div>
              )}
              <div className="space-y-3">
                <p className="font-bold text-sm">{previewQuestions.length} Questions</p>
                {previewQuestions.map((q, idx) => {
                  const opts = previewOptions.filter(o => o.question_id === q.id);
                  return (
                    <div key={q.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">Q{q.order_index}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.question_type === "MCQ" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}`}>{q.question_type}</span>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{q.marks} marks</span>
                      </div>
                      <p className="text-sm">{q.question_text}</p>
                      {opts.length > 0 && (
                        <div className="space-y-1 pl-3">
                          {opts.map((o, oi) => (
                            <div key={o.id} className={`flex items-center gap-2 text-xs p-1.5 rounded ${o.is_correct ? "bg-green-50 dark:bg-green-900/20 font-semibold" : ""}`}>
                              <span className="font-bold text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                              <span>{o.option_text}</span>
                              {o.is_correct && <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {previewExam?.approval_status === "pending" && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPreviewExam(null)}>Close</Button>
              <Button variant="destructive" onClick={() => { setRejectExam(previewExam); setPreviewExam(null); }} className="gap-1 font-bold">
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button onClick={() => handleApproval(previewExam.id, true)} className="gap-1 font-bold bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectExam} onOpenChange={() => setRejectExam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-black text-destructive">Reject Exam</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Rejecting: <span className="font-semibold text-foreground">{rejectExam?.title}</span></p>
          <div>
            <Label className="text-xs font-semibold">Reason (optional)</Label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Provide feedback for the teacher..."
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectExam(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectExam && handleApproval(rejectExam.id, false)} className="font-bold gap-1">
              <XCircle className="w-4 h-4" /> Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish to streams dialog */}
      <Dialog open={!!publishExam} onOpenChange={() => setPublishExam(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-black">Manage Exam Visibility</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Select streams that should access this exam:</p>
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
            <Button variant="outline" onClick={() => setPublishExam(null)}>Cancel</Button>
            <Button onClick={handlePublishToStreams} className="font-bold">Save Visibility</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
