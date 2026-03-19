import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import {
  Plus, Pencil, Trash2, Loader2, FileText, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type SubjectPaper = {
  id: string; paper_name: string; default_out_of: number; is_active: boolean;
  subject_id: string; class_id: string | null;
  subjects: { name: string } | null;
  classes: { name: string } | null;
};
type Subject = { id: string; name: string };
type ClassRow = { id: string; name: string };

export default function SubjectPapersPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [papers, setPapers] = useState<SubjectPaper[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SubjectPaper | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ paper_name: "", default_out_of: 100, subject_id: "", class_id: "" });

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [papersRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from("subject_papers")
        .select("*, subjects(name), classes(name)")
        .eq("school_id", schoolId).order("paper_name"),
      supabase.from("subjects").select("id, name")
        .or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true).order("name"),
      supabase.from("classes").select("id, name").eq("is_active", true).order("name"),
    ]);
    if (papersRes.data) setPapers(papersRes.data as any);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ paper_name: "", default_out_of: 100, subject_id: "", class_id: "" });
    setShowModal(true);
  };

  const openEdit = (p: SubjectPaper) => {
    setEditing(p);
    setForm({ paper_name: p.paper_name, default_out_of: p.default_out_of, subject_id: p.subject_id, class_id: p.class_id || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.paper_name || !form.subject_id || !schoolId) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      paper_name: sanitizeInput(form.paper_name, 100),
      default_out_of: Number(form.default_out_of),
      subject_id: form.subject_id,
      class_id: form.class_id || null,
      school_id: schoolId,
    };
    const { error } = editing
      ? await supabase.from("subject_papers").update(payload).eq("id", editing.id)
      : await supabase.from("subject_papers").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Paper Updated" : "Paper Created" });
      setShowModal(false);
      fetchData();
    }
    setSaving(false);
  };

  const deletePaper = async (id: string) => {
    if (!confirm("Delete this subject paper?")) return;
    await supabase.from("subject_papers").delete().eq("id", id);
    fetchData();
  };

  // Group papers by subject
  const grouped = subjects.reduce<Record<string, SubjectPaper[]>>((acc, s) => {
    const subjectPapers = papers.filter(p => p.subject_id === s.id);
    if (subjectPapers.length > 0) acc[s.name] = subjectPapers;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Subject Papers</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {papers.length} papers across {Object.keys(grouped).length} subjects · Paper policy for exams
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={openCreate} className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Add Paper
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-10 h-10" />
            <p className="font-semibold">No subject papers defined</p>
            <p className="text-xs">Add papers like "PP1", "PP2" to define exam structure.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Subject", "Paper", "Class", "Out Of", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {papers.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{(p.subjects as any)?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.paper_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(p.classes as any)?.name || "All Classes"}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p.default_out_of}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)} className="h-7 w-7 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePaper(p.id)} className="h-7 w-7 p-0 text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">{editing ? "Edit Paper" : "Add Subject Paper"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Subject *</Label>
              <Select value={form.subject_id} onValueChange={v => setForm(p => ({ ...p, subject_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Paper Name *</Label>
              <Input value={form.paper_name} onChange={e => setForm(p => ({ ...p, paper_name: e.target.value }))} placeholder="e.g. PP1, PP2, Composition" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Class (optional — leave blank for all classes)</Label>
              <Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v === "all" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Default Out Of</Label>
              <Input type="number" value={form.default_out_of} onChange={e => setForm(p => ({ ...p, default_out_of: Number(e.target.value) }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
