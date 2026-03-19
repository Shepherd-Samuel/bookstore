import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Plus, Loader2, Search, Trash2, Edit2, FileText, Save, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

type ExamType = { id: string; name: string; description: string; is_active: boolean };
type SubjectPaper = { id: string; subject_id: string; class_id: string | null; paper_name: string; default_out_of: number; is_active: boolean };
type Exam = { id: string; exam_type_id: string; name: string; term: string; academic_year: string; start_date: string | null; end_date: string | null; is_active: boolean; created_at: string };
type Subject = { id: string; name: string };
type ClassRow = { id: string; name: string; level: string };

export default function ExamsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("exams");
  const [loading, setLoading] = useState(true);

  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [papers, setPapers] = useState<SubjectPaper[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  // Dialogs
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showPaperDialog, setShowPaperDialog] = useState(false);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Forms
  const [typeForm, setTypeForm] = useState({ name: "", description: "" });
  const [paperForm, setPaperForm] = useState({ subject_id: "", class_id: "", paper_name: "", default_out_of: "100" });
  const [examForm, setExamForm] = useState({ exam_type_id: "", name: "", term: "Term 1", academic_year: "2026", start_date: "", end_date: "", is_active: false });

  const schoolId = profile?.school_id;
  const isAdmin = profile?.role === "school_admin";

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      const [typesRes, papersRes, examsRes, subjRes, classRes] = await Promise.all([
        supabase.from("exam_types").select("*").eq("school_id", schoolId).order("name"),
        supabase.from("subject_papers").select("*").eq("school_id", schoolId).order("paper_name"),
        supabase.from("exams").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("subjects").select("id, name").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
        supabase.from("classes").select("id, name, level").eq("is_active", true),
      ]);
      if (typesRes.data) setExamTypes(typesRes.data as ExamType[]);
      if (papersRes.data) setPapers(papersRes.data as SubjectPaper[]);
      if (examsRes.data) setExams(examsRes.data as Exam[]);
      if (subjRes.data) setSubjects(subjRes.data as Subject[]);
      if (classRes.data) setClasses(classRes.data);
      setLoading(false);
    };
    load();
  }, [schoolId]);

  const refresh = async () => {
    if (!schoolId) return;
    const [t, p, e] = await Promise.all([
      supabase.from("exam_types").select("*").eq("school_id", schoolId).order("name"),
      supabase.from("subject_papers").select("*").eq("school_id", schoolId).order("paper_name"),
      supabase.from("exams").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
    ]);
    if (t.data) setExamTypes(t.data as ExamType[]);
    if (p.data) setPapers(p.data as SubjectPaper[]);
    if (e.data) setExams(e.data as Exam[]);
  };

  // --- Exam Types CRUD ---
  const handleSaveType = async () => {
    if (!typeForm.name.trim() || !schoolId) return;
    setSaving(true);
    const { error } = await supabase.from("exam_types").insert({
      school_id: schoolId, name: sanitizeInput(typeForm.name, 100), description: sanitizeInput(typeForm.description, 500),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Exam Type Created" }); setShowTypeDialog(false); setTypeForm({ name: "", description: "" }); await refresh(); }
    setSaving(false);
  };

  const handleDeleteType = async (id: string) => {
    const { error } = await supabase.from("exam_types").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); await refresh(); }
  };

  // --- Subject Papers CRUD ---
  const handleSavePaper = async () => {
    if (!paperForm.subject_id || !paperForm.paper_name.trim() || !schoolId) return;
    setSaving(true);
    const { error } = await supabase.from("subject_papers").insert({
      school_id: schoolId,
      subject_id: paperForm.subject_id,
      class_id: paperForm.class_id || null,
      paper_name: sanitizeInput(paperForm.paper_name, 100),
      default_out_of: Math.min(Math.max(parseInt(paperForm.default_out_of) || 100, 1), 1000),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subject Paper Created" }); setShowPaperDialog(false); setPaperForm({ subject_id: "", class_id: "", paper_name: "", default_out_of: "100" }); await refresh(); }
    setSaving(false);
  };

  const handleDeletePaper = async (id: string) => {
    const { error } = await supabase.from("subject_papers").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); await refresh(); }
  };

  // --- Exams CRUD ---
  const handleSaveExam = async () => {
    if (!examForm.exam_type_id || !examForm.name.trim() || !schoolId) return;
    setSaving(true);
    const { error } = await supabase.from("exams").insert({
      school_id: schoolId,
      exam_type_id: examForm.exam_type_id,
      name: sanitizeInput(examForm.name, 200),
      term: examForm.term,
      academic_year: examForm.academic_year,
      start_date: examForm.start_date || null,
      end_date: examForm.end_date || null,
      is_active: examForm.is_active,
      created_by: profile?.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Exam Created" }); setShowExamDialog(false); setExamForm({ exam_type_id: "", name: "", term: "Term 1", academic_year: "2026", start_date: "", end_date: "", is_active: false }); await refresh(); }
    setSaving(false);
  };

  const toggleExamActive = async (exam: Exam) => {
    const { error } = await supabase.from("exams").update({ is_active: !exam.is_active, updated_at: new Date().toISOString() }).eq("id", exam.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else await refresh();
  };

  const handleDeleteExam = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); await refresh(); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading exams..." /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Exams Management</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure exam types, subject papers, and create exams</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="exams">Exams ({exams.length})</TabsTrigger>
          <TabsTrigger value="types">Exam Types ({examTypes.length})</TabsTrigger>
          <TabsTrigger value="papers">Subject Papers ({papers.length})</TabsTrigger>
        </TabsList>

        {/* === EXAMS TAB === */}
        <TabsContent value="exams" className="space-y-4">
          {isAdmin && (
            <Button onClick={() => setShowExamDialog(true)} className="font-bold gap-2">
              <Plus className="w-4 h-4" /> Create Exam
            </Button>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {exams.map(e => {
              const et = examTypes.find(t => t.id === e.exam_type_id);
              return (
                <div key={e.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{et?.name || "—"} · {e.term} {e.academic_year}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${e.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {e.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {(e.start_date || e.end_date) && (
                    <p className="text-xs text-muted-foreground">
                      {e.start_date && `From: ${e.start_date}`} {e.end_date && `To: ${e.end_date}`}
                    </p>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleExamActive(e)} className="gap-1.5 h-7 text-xs font-bold flex-1">
                        {e.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                        {e.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteExam(e.id)} className="h-7 text-xs text-destructive hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {exams.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2" />
                <p className="font-semibold">No exams created yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* === EXAM TYPES TAB === */}
        <TabsContent value="types" className="space-y-4">
          {isAdmin && (
            <Button onClick={() => setShowTypeDialog(true)} className="font-bold gap-2">
              <Plus className="w-4 h-4" /> Add Exam Type
            </Button>
          )}
          <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Description</th>
                {isAdmin && <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {examTypes.map(t => (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{t.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.description || "—"}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteType(t.id)} className="h-7 text-xs text-destructive hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {examTypes.length === 0 && <tr><td colSpan={3} className="py-12 text-center text-muted-foreground">No exam types yet</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* === SUBJECT PAPERS TAB === */}
        <TabsContent value="papers" className="space-y-4">
          {isAdmin && (
            <Button onClick={() => setShowPaperDialog(true)} className="font-bold gap-2">
              <Plus className="w-4 h-4" /> Add Subject Paper
            </Button>
          )}
          <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Subject</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Paper</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Class</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Out Of</th>
                {isAdmin && <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {papers.map(p => {
                  const subj = subjects.find(s => s.id === p.subject_id);
                  const cls = p.class_id ? classes.find(c => c.id === p.class_id) : null;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold text-foreground">{subj?.name || "—"}</td>
                      <td className="px-4 py-3 text-foreground">{p.paper_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{cls?.name || "All"}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{p.default_out_of}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleDeletePaper(p.id)} className="h-7 text-xs text-destructive hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {papers.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No subject papers yet</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Exam Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Add Exam Type</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Name *</Label>
              <Input value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mid Term, End Term" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input value={typeForm.description} onChange={e => setTypeForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveType} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subject Paper Dialog */}
      <Dialog open={showPaperDialog} onOpenChange={setShowPaperDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Add Subject Paper</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Subject *</Label>
              <Select value={paperForm.subject_id} onValueChange={v => setPaperForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Class (optional — leave blank for all classes)</Label>
              <Select value={paperForm.class_id} onValueChange={v => setPaperForm(p => ({ ...p, class_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Paper Name *</Label>
                <Input value={paperForm.paper_name} onChange={e => setPaperForm(p => ({ ...p, paper_name: e.target.value }))} placeholder="e.g. PP1, PP2" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Default Out Of</Label>
                <Input type="number" value={paperForm.default_out_of} onChange={e => setPaperForm(p => ({ ...p, default_out_of: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaperDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePaper} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exam Dialog */}
      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-black">Create Exam</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Exam Name *</Label>
              <Input value={examForm.name} onChange={e => setExamForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. JESMA Term 1 2026" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Exam Type *</Label>
              <Select value={examForm.exam_type_id} onValueChange={v => setExamForm(p => ({ ...p, exam_type_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{examTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Term</Label>
                <Select value={examForm.term} onValueChange={v => setExamForm(p => ({ ...p, term: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Academic Year</Label>
                <Input value={examForm.academic_year} onChange={e => setExamForm(p => ({ ...p, academic_year: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Start Date (optional)</Label>
                <Input type="date" value={examForm.start_date} onChange={e => setExamForm(p => ({ ...p, start_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">End Date (optional)</Label>
                <Input type="date" value={examForm.end_date} onChange={e => setExamForm(p => ({ ...p, end_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={examForm.is_active} onCheckedChange={v => setExamForm(p => ({ ...p, is_active: v }))} />
              <Label className="text-xs font-semibold">Activate immediately (teachers can enter marks)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveExam} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
