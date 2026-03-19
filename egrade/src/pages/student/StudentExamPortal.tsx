import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Loader2, Clock, CheckCircle, AlertTriangle, FileText, Play, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type ExamInfo = {
  id: string; title: string; type: string; total_marks: number;
  duration_minutes: number | null; instructions: string | null;
  subject_id: string; stream_id: string; target_stream_ids: any;
};

type QuestionData = {
  id: string; question_text: string; question_type: string;
  marks: number; order_index: number;
  options: { id: string; option_text: string }[];
};

type SessionData = {
  id: string; started_at: string; submitted_at: string | null;
  auto_submitted: boolean;
};

export default function StudentExamPortal() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [availableExams, setAvailableExams] = useState<ExamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Active exam state
  const [activeExam, setActiveExam] = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [answers, setAnswers] = useState<Record<string, { text: string; optionId: string }>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [completedExams, setCompletedExams] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!profile?.id || !profile?.school_id || !profile?.stream_id) return;
    const load = async () => {
      setLoading(true);

      // Get published exams for student's stream
      const { data: exams } = await supabase
        .from("assessments")
        .select("id, title, type, total_marks, duration_minutes, instructions, subject_id, stream_id, target_stream_ids")
        .eq("school_id", profile.school_id)
        .eq("approval_status", "approved")
        .eq("is_published", true)
        .in("type", ["quiz", "exam", "test"]);

      if (exams) {
        // Filter to exams visible to this student's stream
        const visible = exams.filter((e: any) => {
          if (e.stream_id === profile.stream_id) return true;
          try {
            const targets = typeof e.target_stream_ids === "string" ? JSON.parse(e.target_stream_ids) : (e.target_stream_ids || []);
            return Array.isArray(targets) && targets.includes(profile.stream_id);
          } catch { return false; }
        });
        setAvailableExams(visible as ExamInfo[]);
      }

      // Get completed sessions
      const { data: sessions } = await supabase
        .from("student_exam_sessions")
        .select("assessment_id")
        .eq("student_id", profile.id)
        .not("submitted_at", "is", null);
      if (sessions) {
        setCompletedExams(new Set(sessions.map((s: any) => s.assessment_id)));
      }

      setLoading(false);
    };
    load();
  }, [profile?.id, profile?.school_id, profile?.stream_id]);

  const startExam = async (exam: ExamInfo) => {
    if (!profile?.id) return;

    // Check if session already exists
    const { data: existingSession } = await supabase
      .from("student_exam_sessions")
      .select("*")
      .eq("assessment_id", exam.id)
      .eq("student_id", profile.id)
      .maybeSingle();

    if (existingSession?.submitted_at) {
      toast({ title: "Already completed", description: "You have already submitted this exam.", variant: "destructive" });
      return;
    }

    // Load questions
    const { data: qData } = await supabase
      .from("assessment_questions")
      .select("id, question_text, question_type, marks, order_index")
      .eq("assessment_id", exam.id)
      .order("order_index");

    if (!qData || qData.length === 0) {
      toast({ title: "No questions", description: "This exam has no questions yet.", variant: "destructive" });
      return;
    }

    // Load MCQ options via secure RPC (hides is_correct)
    let optionsMap: Record<string, { id: string; option_text: string }[]> = {};
    const { data: optData } = await supabase.rpc("get_mcq_options_for_student", { p_assessment_id: exam.id });
    if (optData) {
      (optData as any[]).forEach((o: any) => {
        if (!optionsMap[o.question_id]) optionsMap[o.question_id] = [];
        optionsMap[o.question_id].push({ id: o.id, option_text: o.option_text });
      });
    }

    const questionsWithOptions: QuestionData[] = qData.map(q => ({
      ...q,
      options: optionsMap[q.id] || [],
    }));

    // Create or resume session
    let sessionData: SessionData;
    if (existingSession) {
      sessionData = existingSession as SessionData;
    } else {
      const { data: newSession, error } = await supabase
        .from("student_exam_sessions")
        .insert({ assessment_id: exam.id, student_id: profile.id })
        .select("*")
        .single();
      if (error || !newSession) {
        toast({ title: "Error", description: "Could not start exam session.", variant: "destructive" });
        return;
      }
      sessionData = newSession as SessionData;
    }

    // Load existing answers
    const { data: existingAnswers } = await supabase
      .from("student_exam_answers")
      .select("question_id, answer_text, selected_option_id")
      .eq("assessment_id", exam.id)
      .eq("student_id", profile.id);

    const answersMap: Record<string, { text: string; optionId: string }> = {};
    if (existingAnswers) {
      existingAnswers.forEach((a: any) => {
        answersMap[a.question_id] = { text: a.answer_text || "", optionId: a.selected_option_id || "" };
      });
    }

    // Calculate time remaining
    const duration = exam.duration_minutes || 40;
    const startTime = new Date(sessionData.started_at).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max((duration * 60) - elapsed, 0);

    if (remaining === 0) {
      await autoSubmit(exam.id, sessionData.id, profile.id);
      return;
    }

    setActiveExam(exam);
    setQuestions(questionsWithOptions);
    setSession(sessionData);
    setAnswers(answersMap);
    setTimeLeft(remaining);
  };

  // Timer
  useEffect(() => {
    if (!activeExam || !session || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeExam, session]);

  const autoSubmit = async (assessmentId: string, sessionId: string, studentId: string) => {
    await supabase.from("student_exam_sessions").update({
      submitted_at: new Date().toISOString(),
      auto_submitted: true,
    }).eq("id", sessionId);
    toast({ title: "Time's up!", description: "Your exam was auto-submitted." });
    setCompletedExams(prev => new Set([...prev, assessmentId]));
    setActiveExam(null);
  };

  const saveAnswer = async (questionId: string, text: string, optionId: string) => {
    if (!activeExam || !profile?.id) return;
    setAnswers(prev => ({ ...prev, [questionId]: { text, optionId } }));

    const { data: existing } = await supabase
      .from("student_exam_answers")
      .select("id")
      .eq("assessment_id", activeExam.id)
      .eq("question_id", questionId)
      .eq("student_id", profile.id)
      .maybeSingle();

    const payload: any = {
      assessment_id: activeExam.id,
      question_id: questionId,
      student_id: profile.id,
      answer_text: text,
      selected_option_id: optionId || null,
    };

    if (existing) {
      await supabase.from("student_exam_answers").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("student_exam_answers").insert(payload);
    }
  };

  const handleSubmitExam = async (isAuto: boolean = false) => {
    if (!activeExam || !session || !profile?.id) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    // Grade via secure server-side function
    const { data: gradeResult } = await supabase.rpc("grade_mcq_exam", {
      p_session_id: session.id,
      p_assessment_id: activeExam.id,
      p_is_auto: isAuto,
    });

    const totalScore = (gradeResult as any)?.score ?? 0;

    toast({ title: isAuto ? "Time's up!" : "Exam Submitted", description: `MCQ score: ${totalScore}. Essay questions will be graded by your teacher.` });
    setCompletedExams(prev => new Set([...prev, activeExam.id]));
    setActiveExam(null);
    setSession(null);
    setSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading exam portal..." /></div>;

  // Active exam view
  if (activeExam && session) {
    const isLowTime = timeLeft < 120;
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Sticky timer header */}
        <div className="sticky top-0 z-10 bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-black text-foreground text-lg">{activeExam.title}</h2>
            <p className="text-xs text-muted-foreground">{activeExam.total_marks} marks · {questions.length} questions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono font-black text-lg ${isLowTime ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse" : "bg-muted text-foreground"}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
            <Button onClick={() => handleSubmitExam(false)} disabled={submitting} className="font-bold gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit
            </Button>
          </div>
        </div>

        {activeExam.instructions && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase mb-1">Instructions</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">{activeExam.instructions}</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const answer = answers[q.id] || { text: "", optionId: "" };
            return (
              <div key={q.id} className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary">{idx + 1}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.question_type === "MCQ" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{q.question_type}</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{q.marks} marks</span>
                </div>
                <p className="text-sm font-medium text-foreground">{q.question_text}</p>

                {q.question_type === "MCQ" ? (
                  <RadioGroup
                    value={answer.optionId}
                    onValueChange={v => saveAnswer(q.id, "", v)}
                    className="space-y-2"
                  >
                    {q.options.map((opt, oIdx) => (
                      <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${answer.optionId === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                        <span className="text-sm">{String.fromCharCode(65 + oIdx)}. {opt.option_text}</span>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <Textarea
                    value={answer.text}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))}
                    onBlur={() => saveAnswer(q.id, answer.text, "")}
                    placeholder="Type your answer here..."
                    rows={4}
                    className="text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => handleSubmitExam(false)} disabled={submitting} size="lg" className="font-bold gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit Exam
          </Button>
        </div>
      </div>
    );
  }

  // Exam list view
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">My Exams</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {availableExams.length} exam{availableExams.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {availableExams.map(exam => {
          const isCompleted = completedExams.has(exam.id);
          return (
            <div key={exam.id} className={`bg-card rounded-xl border p-5 space-y-3 ${isCompleted ? "border-green-200 dark:border-green-800" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isCompleted ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"}`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{exam.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{exam.type}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes || 40} min</span>
                <span>{exam.total_marks} marks</span>
              </div>
              {isCompleted ? (
                <div className="text-center py-2">
                  <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">✓ Completed</span>
                </div>
              ) : (
                <Button onClick={() => startExam(exam)} className="w-full font-bold gap-2">
                  <Play className="w-4 h-4" /> Start Exam
                </Button>
              )}
            </div>
          );
        })}
        {availableExams.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-10 h-10" />
            <p className="font-semibold">No exams available</p>
            <p className="text-xs">Your teacher hasn't published any exams yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
