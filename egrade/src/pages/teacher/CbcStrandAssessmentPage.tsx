import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Loader2, Save, Upload, ChevronRight, CheckCircle, Users, BookOpen, Target, HelpCircle, Lightbulb, ClipboardCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CbcBadge, CbcLevel } from "@/components/Dashboards";

type ClassData = { id: string; name: string; level: string };
type Stream = { id: string; name: string; class_id: string };
type Subject = { id: string; name: string; code: string | null };
type Allocation = { stream_id: string; subject_id: string };
type Student = { id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null; passport_url: string | null };
type CurriculumDesign = {
  id: string; subject_name: string; subject_id: string | null; strand: string; sub_strand: string;
  level: string; grade: string | null; term: string | null; specific_learning_outcomes: string | null;
  learning_experiences: string | null; assessment_methods: string | null;
  key_inquiry_questions: string | null; resources: string | null;
};
type StrandAssessment = {
  id: string; student_id: string; rating: string; comments: string | null;
  strand: string; sub_strand: string; curriculum_design_id: string | null;
};

const RATINGS: { value: string; label: string; color: string; description: string }[] = [
  { value: "EE", label: "Exceeding Expectations", color: "bg-green-500", description: "Learner surpasses the expected competency level" },
  { value: "ME", label: "Meeting Expectations", color: "bg-blue-500", description: "Learner has achieved the expected competency level" },
  { value: "AE", label: "Approaching Expectations", color: "bg-amber-500", description: "Learner is progressing towards the expected level" },
  { value: "BE", label: "Below Expectations", color: "bg-red-500", description: "Learner needs additional support to reach expected level" },
];

export default function CbcStrandAssessmentPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id;
  const teacherId = profile?.id;
  const isAdmin = effectiveRole === "school_admin";
  const scope = useTeacherScope(teacherId, schoolId, effectiveRole);

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumDesign[]>([]);
  const [existingAssessments, setExistingAssessments] = useState<StrandAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selection state
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStrand, setSelectedStrand] = useState("");
  const [selectedSubStrand, setSelectedSubStrand] = useState("");

  // Ratings state: { [studentId]: { rating, comments } }
  const [ratings, setRatings] = useState<Record<string, { rating: string; comments: string }>>({});

  // Evidence uploads
  const [uploadingEvidence, setUploadingEvidence] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    const fetchData = async () => {
      setLoading(true);
      const [allocRes, subjectsRes, studentsRes, currRes, classesRes] = await Promise.all([
        isAdmin
          ? supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true)
          : supabase.from("subject_teacher_allocations").select("stream_id, subject_id, streams(id, name, class_id)").eq("teacher_id", teacherId!).eq("is_active", true),
        supabase.from("subjects").select("id, name, code").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id, passport_url").eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
        supabase.from("curriculum_designs").select("id, subject_name, subject_id, strand, sub_strand, level, grade, term, specific_learning_outcomes, learning_experiences, assessment_methods, key_inquiry_questions, resources"),
        supabase.from("classes").select("id, name, level").eq("is_active", true),
      ]);

      if (isAdmin && allocRes.data) {
        setStreams(allocRes.data as Stream[]);
        setAllocations([]);
      } else if (allocRes.data) {
        const uniqueStreams = new Map<string, Stream>();
        const allocs: Allocation[] = [];
        (allocRes.data as any[]).forEach((a) => {
          if (a.streams) uniqueStreams.set(a.streams.id, a.streams);
          allocs.push({ stream_id: a.stream_id, subject_id: a.subject_id });
        });
        setStreams(Array.from(uniqueStreams.values()));
        setAllocations(allocs);
      }
      if (subjectsRes.data) setAllSubjects(subjectsRes.data as Subject[]);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (currRes.data) setCurriculum(currRes.data as CurriculumDesign[]);
      if (classesRes.data) setClasses(classesRes.data as ClassData[]);
      setLoading(false);
    };
    fetchData();
  }, [schoolId, teacherId]);

  // Build class→stream mapping for the Grade + Stream selector
  const classesWithStreams = useMemo(() => {
    const classIds = [...new Set(streams.map(s => s.class_id))];
    return classIds
      .map(cid => {
        const cls = classes.find(c => c.id === cid);
        const classStreams = streams.filter(s => s.class_id === cid);
        return cls ? { ...cls, streams: classStreams } : null;
      })
      .filter(Boolean) as (ClassData & { streams: Stream[] })[];
  }, [classes, streams]);

  // Filter streams by selected class
  const filteredStreams = useMemo(() => {
    if (!selectedClass) return [];
    return streams.filter(s => s.class_id === selectedClass);
  }, [selectedClass, streams]);

  // Filter subjects based on selected stream
  const subjects = useMemo(() => {
    if (isAdmin) return allSubjects;
    if (!selectedStream) return allSubjects.filter(s => allocations.some(a => a.subject_id === s.id));
    return allSubjects.filter(s => allocations.some(a => a.stream_id === selectedStream && a.subject_id === s.id));
  }, [isAdmin, selectedStream, allSubjects, allocations]);

  // Filter curriculum by selected subject and class level
  const subjectCurriculum = useMemo(() => {
    if (!selectedSubject) return [];
    const subj = subjects.find(s => s.id === selectedSubject);
    const cls = classes.find(c => c.id === selectedClass);
    return curriculum.filter(c => {
      // Match by subject_id, subject name, or subject code
      const matchesSubject = subj && (
        c.subject_id === selectedSubject ||
        c.subject_name === subj.name ||
        (subj.code && c.subject_name === subj.code)
      );
      // Match by grade name (e.g. "Grade 1") or fall back to level (e.g. "primary")
      const matchesGrade = cls
        ? (c.grade === cls.name || (!c.grade && c.level === cls.level))
        : true;
      return matchesSubject && matchesGrade;
    });
  }, [selectedSubject, selectedClass, subjects, classes, curriculum]);

  const strands = useMemo(() => [...new Set(subjectCurriculum.map(c => c.strand))].filter(Boolean), [subjectCurriculum]);
  const subStrands = useMemo(() => [...new Set(subjectCurriculum.filter(c => c.strand === selectedStrand).map(c => c.sub_strand))].filter(Boolean), [subjectCurriculum, selectedStrand]);

  // Get students for selected stream
  const streamStudents = useMemo(() =>
    students.filter(s => s.stream_id === selectedStream).sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [students, selectedStream]
  );

  // Get ALL curriculum entries for the selected strand + sub-strand (may have multiple weeks/lessons)
  const selectedCurrEntries = useMemo(() =>
    subjectCurriculum.filter(c => c.strand === selectedStrand && c.sub_strand === selectedSubStrand),
    [subjectCurriculum, selectedStrand, selectedSubStrand]
  );

  // Aggregate competencies from all entries
  const competencies = useMemo(() => {
    if (selectedCurrEntries.length === 0) return null;
    const outcomes = new Set<string>();
    const experiences = new Set<string>();
    const assessmentMethods = new Set<string>();
    const inquiryQuestions = new Set<string>();
    const resources = new Set<string>();

    selectedCurrEntries.forEach(entry => {
      if (entry.specific_learning_outcomes) {
        entry.specific_learning_outcomes.split(/[;\n]/).forEach(s => { const t = s.trim(); if (t) outcomes.add(t); });
      }
      if (entry.learning_experiences) {
        entry.learning_experiences.split(/[;\n]/).forEach(s => { const t = s.trim(); if (t) experiences.add(t); });
      }
      if (entry.assessment_methods) {
        entry.assessment_methods.split(/[;\n]/).forEach(s => { const t = s.trim(); if (t) assessmentMethods.add(t); });
      }
      if (entry.key_inquiry_questions) {
        entry.key_inquiry_questions.split(/[;\n]/).forEach(s => { const t = s.trim(); if (t) inquiryQuestions.add(t); });
      }
      if (entry.resources) {
        entry.resources.split(/[;\n]/).forEach(s => { const t = s.trim(); if (t) resources.add(t); });
      }
    });

    return {
      outcomes: [...outcomes],
      experiences: [...experiences],
      assessmentMethods: [...assessmentMethods],
      inquiryQuestions: [...inquiryQuestions],
      resources: [...resources],
    };
  }, [selectedCurrEntries]);

  // Load existing assessments when sub-strand is selected
  useEffect(() => {
    if (!selectedStream || !selectedSubject || !selectedSubStrand || !schoolId) return;
    const load = async () => {
      const { data } = await supabase
        .from("strand_assessments")
        .select("id, student_id, rating, comments, strand, sub_strand, curriculum_design_id")
        .eq("school_id", schoolId)
        .eq("stream_id", selectedStream)
        .eq("subject_id", selectedSubject)
        .eq("sub_strand", selectedSubStrand);
      if (data) {
        setExistingAssessments(data as StrandAssessment[]);
        const ratingsMap: Record<string, { rating: string; comments: string }> = {};
        data.forEach((a: any) => {
          ratingsMap[a.student_id] = { rating: a.rating, comments: a.comments || "" };
        });
        streamStudents.forEach(s => {
          if (!ratingsMap[s.id]) ratingsMap[s.id] = { rating: "", comments: "" };
        });
        setRatings(ratingsMap);
      }
    };
    load();
  }, [selectedStream, selectedSubject, selectedSubStrand, schoolId]);

  const handleSaveAll = async () => {
    if (!schoolId || !teacherId || !selectedStream || !selectedSubject || !selectedSubStrand) return;
    setSaving(true);
    let saved = 0;
    for (const [studentId, data] of Object.entries(ratings)) {
      if (!data.rating) continue;
      const existing = existingAssessments.find(a => a.student_id === studentId);
      const payload = {
        school_id: schoolId,
        student_id: studentId,
        teacher_id: teacherId,
        subject_id: selectedSubject,
        stream_id: selectedStream,
        strand: selectedStrand,
        sub_strand: selectedSubStrand,
        curriculum_design_id: selectedCurrEntries[0]?.id || null,
        rating: data.rating,
        comments: sanitizeInput(data.comments, 1000),
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        await supabase.from("strand_assessments").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("strand_assessments").insert(payload);
      }
      saved++;
    }
    toast({ title: "Saved", description: `${saved} student ratings saved.` });
    setSaving(false);
  };

  const handleEvidenceUpload = async (studentId: string, file: File) => {
    if (!schoolId) return;
    setUploadingEvidence(studentId);
    const existing = existingAssessments.find(a => a.student_id === studentId);
    if (!existing) {
      toast({ title: "Save rating first", description: "Please save the student's rating before uploading evidence.", variant: "destructive" });
      setUploadingEvidence(null);
      return;
    }
    const filePath = `${schoolId}/${existing.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("assessment-evidence").upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingEvidence(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("assessment-evidence").getPublicUrl(filePath);
    await supabase.from("strand_assessment_evidence").insert({
      strand_assessment_id: existing.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
    });
    toast({ title: "Evidence uploaded", description: file.name });
    setUploadingEvidence(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading CBC assessments..." /></div>;
  }

  const isReady = selectedStream && selectedSubject && selectedStrand && selectedSubStrand;
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || "";
  const selectedStreamName = streams.find(s => s.id === selectedStream)?.name || "";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">CBC Strand Assessment</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Rate learners per curriculum sub-strand using EE / ME / AE / BE competency levels
        </p>
      </div>

      {/* Step 1: Select Grade, Stream, Subject */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step 1: Select Grade, Stream & Subject</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-semibold">Grade</Label>
            <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedStream(""); setSelectedSubject(""); setSelectedStrand(""); setSelectedSubStrand(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {classesWithStreams.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Stream</Label>
            <Select value={selectedStream} onValueChange={v => { setSelectedStream(v); setSelectedSubject(""); setSelectedStrand(""); setSelectedSubStrand(""); }} disabled={!selectedClass}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={selectedClass ? "Select stream" : "Select grade first"} /></SelectTrigger>
              <SelectContent>
                {filteredStreams.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Subject</Label>
            <Select value={selectedSubject} onValueChange={v => { setSelectedSubject(v); setSelectedStrand(""); setSelectedSubStrand(""); }} disabled={!selectedStream}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={selectedStream ? "Select subject" : "Select stream first"} /></SelectTrigger>
              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {selectedClass && selectedStream && (
          <p className="text-xs text-muted-foreground">
            Assessing: <span className="font-bold text-foreground">{selectedClassName} — {selectedStreamName}</span>
          </p>
        )}
      </div>

      {/* Step 2: Select Strand & Sub-strand */}
      {selectedSubject && strands.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step 2: Select Strand & Sub-Strand</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Strand</Label>
              <Select value={selectedStrand} onValueChange={v => { setSelectedStrand(v); setSelectedSubStrand(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select strand" /></SelectTrigger>
                <SelectContent>{strands.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Sub-Strand</Label>
              <Select value={selectedSubStrand} onValueChange={setSelectedSubStrand} disabled={!selectedStrand}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={selectedStrand ? "Select sub-strand" : "Select strand first"} /></SelectTrigger>
                <SelectContent>{subStrands.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Competencies Panel */}
          {competencies && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Strand Competencies & Learning Indicators</p>
              </div>

              {competencies.outcomes.length > 0 && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Specific Learning Outcomes</p>
                  </div>
                  <ul className="space-y-1">
                    {competencies.outcomes.map((o, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {competencies.experiences.length > 0 && (
                <div className="bg-accent/50 border border-accent rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-accent-foreground" />
                    <p className="text-[10px] font-bold text-accent-foreground uppercase tracking-wider">Learning Experiences</p>
                  </div>
                  <ul className="space-y-1">
                    {competencies.experiences.map((e, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-accent-foreground mt-0.5">•</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {competencies.assessmentMethods.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assessment Methods</p>
                    </div>
                    <ul className="space-y-1">
                      {competencies.assessmentMethods.map((m, i) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="text-muted-foreground mt-0.5">•</span>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {competencies.inquiryQuestions.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Key Inquiry Questions</p>
                    </div>
                    <ul className="space-y-1">
                      {competencies.inquiryQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                          <span className="text-muted-foreground mt-0.5">•</span>{q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedSubject && strands.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-bold">No curriculum uploaded for this subject{selectedClassName ? ` (${selectedClassName})` : ""}.</p>
          <p className="text-xs mt-1">Ask your administrator to upload the KICD curriculum design for this subject and grade.</p>
        </div>
      )}

      {/* Step 3: Rate Students */}
      {isReady && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step 3: Rate Learners</p>
              <p className="text-sm text-foreground font-semibold mt-1">
                {selectedClassName} — {selectedStreamName} <ChevronRight className="inline w-3 h-3" /> {selectedStrand} <ChevronRight className="inline w-3 h-3" /> {selectedSubStrand}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground"><Users className="inline w-3 h-3" /> {streamStudents.length} learners</span>
              <Button onClick={handleSaveAll} disabled={saving} className="font-bold gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save All
              </Button>
            </div>
          </div>

          {/* Rating Legend */}
          <div className="flex flex-wrap gap-2">
            {RATINGS.map(opt => (
              <div key={opt.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                <span className="font-semibold">{opt.value}</span>
                <span className="hidden sm:inline">— {opt.description}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {streamStudents.map((student, idx) => {
              const r = ratings[student.id] || { rating: "", comments: "" };
              const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();
              return (
                <div key={student.id} className="border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-muted-foreground w-6">{idx + 1}</div>
                    {student.passport_url ? (
                      <img src={student.passport_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm">{student.first_name} {student.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{student.adm_no || "—"}</p>
                    </div>
                    {r.rating && <CbcBadge level={r.rating as CbcLevel} />}
                  </div>

                  {/* Rating buttons */}
                  <div className="flex flex-wrap gap-2">
                    {RATINGS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRatings(prev => ({ ...prev, [student.id]: { ...prev[student.id], rating: opt.value } }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          r.rating === opt.value
                            ? `${opt.color} text-white border-transparent shadow-sm`
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {opt.value} <span className="hidden sm:inline ml-1 font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Comments + Evidence */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Comment on learner's competency achievement..."
                      className="flex-1 h-8 text-xs"
                      value={r.comments}
                      onChange={e => setRatings(prev => ({ ...prev, [student.id]: { ...prev[student.id], comments: e.target.value } }))}
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleEvidenceUpload(student.id, file);
                          e.target.value = "";
                        }}
                      />
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs pointer-events-none" asChild>
                        <span>
                          {uploadingEvidence === student.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          Evidence
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              );
            })}
            {streamStudents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold text-sm">No learners enrolled in this stream</p>
              </div>
            )}
          </div>

          {streamStudents.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveAll} disabled={saving} size="lg" className="font-bold gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save All Ratings
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
