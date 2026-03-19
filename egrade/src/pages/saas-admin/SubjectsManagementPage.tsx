import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Loader2, BookOpen, Search, RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type SubjectRow = {
  id: string; name: string; code: string | null; category: string | null;
  level: string | null; is_active: boolean; is_national: boolean;
};

const LEVELS = [
  { value: "all", label: "All Levels" },
  { value: "primary", label: "Primary (Grade 1-6)" },
  { value: "junior_secondary", label: "Junior Secondary (Grade 7-9)" },
  { value: "senior_secondary", label: "Senior Secondary (Grade 10-12)" },
];

const CATEGORIES = [
  "Core", "Languages", "Sciences", "Humanities", "Technical & Engineering",
  "Creative Arts", "Health & Physical", "Religious Education", "Optional",
];

export default function SubjectsManagementPage() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [form, setForm] = useState({
    name: "", code: "", category: "Core", level: "junior_secondary", is_active: true,
  });

  const fetchSubjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subjects")
      .select("id, name, code, category, level, is_active, is_national")
      .eq("is_national", true)
      .order("category")
      .order("name");
    if (data) setSubjects(data as SubjectRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);

  const saveSubject = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code || null,
      category: form.category || null,
      level: form.level,
      is_active: form.is_active,
      is_national: true,
      school_id: null,
    };
    const { error } = editing
      ? await supabase.from("subjects").update(payload).eq("id", editing.id)
      : await supabase.from("subjects").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Subject Updated" : "Subject Created" });
      setShowModal(false);
      fetchSubjects();
    }
    setSaving(false);
  };

  const deleteSubject = async (id: string) => {
    if (!confirm("Delete this national subject? This may affect all schools.")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchSubjects(); }
  };

  const toggleActive = async (s: SubjectRow) => {
    await supabase.from("subjects").update({ is_active: !s.is_active }).eq("id", s.id);
    fetchSubjects();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", category: "Core", level: "junior_secondary", is_active: true });
    setShowModal(true);
  };

  const openEdit = (s: SubjectRow) => {
    setEditing(s);
    setForm({
      name: s.name, code: s.code || "", category: s.category || "Core",
      level: s.level || "junior_secondary", is_active: s.is_active,
    });
    setShowModal(true);
  };

  const filtered = subjects.filter(s => {
    if (filterLevel !== "all" && s.level !== filterLevel) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.code || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    subjects: filtered.filter(s => (s.category || "Core") === cat),
  })).filter(g => g.subjects.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">National CBC Subjects</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Ministry of Education curriculum subjects · {subjects.length} subjects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSubjects} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={openCreate} className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Add Subject
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search subjects..." className="pl-9"
          />
        </div>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-bold text-foreground">No subjects found</p>
          <p className="text-sm text-muted-foreground">Add national CBC subjects for all schools to use.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.category}>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {group.category}
                <Badge variant="secondary" className="text-[10px]">{group.subjects.length}</Badge>
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border">
                      {["Subject", "Code", "Level", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.subjects.map(s => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-foreground">{s.name}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{s.code || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {LEVELS.find(l => l.value === s.level)?.label.split(" (")[0] || s.level}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => toggleActive(s)}>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                              s.is_active
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="h-7 w-7 p-0">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteSubject(s.id)} className="h-7 w-7 p-0 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">{editing ? "Edit Subject" : "Add National Subject"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Subject Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Subject Code</Label>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. MATH" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Level</Label>
              <Select value={form.level} onValueChange={v => setForm(p => ({ ...p, level: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.filter(l => l.value !== "all").map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveSubject} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
