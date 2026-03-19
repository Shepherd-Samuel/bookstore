import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import {
  Plus, Pencil, Trash2, Loader2, Layers, GraduationCap,
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

type ClassRow = {
  id: string; name: string; level: string; description: string | null;
  is_active: boolean;
};

const LEVELS = [
  { value: "primary", label: "Primary (Grade 1-6)" },
  { value: "junior_secondary", label: "Junior Secondary (Grade 7-9)" },
  { value: "senior_secondary", label: "Senior Secondary (Grade 10-12)" },
];

export default function ClassesManagementPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", level: "junior_secondary", description: "" });

  const fetchClasses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("classes")
      .select("id, name, level, description, is_active")
      .order("level")
      .order("name");
    if (data) setClasses(data as ClassRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const saveClass = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload = { name: sanitizeInput(form.name, 100), level: form.level, description: form.description ? sanitizeInput(form.description, 500) : null };
    const { error } = editing
      ? await supabase.from("classes").update(payload).eq("id", editing.id)
      : await supabase.from("classes").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Class Updated" : "Class Created" });
      setShowModal(false);
      fetchClasses();
    }
    setSaving(false);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class? This affects all schools using it.")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchClasses(); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", level: "junior_secondary", description: "" });
    setShowModal(true);
  };

  const openEdit = (c: ClassRow) => {
    setEditing(c);
    setForm({ name: c.name, level: c.level, description: c.description || "" });
    setShowModal(true);
  };

  const groupedByLevel = LEVELS.map(l => ({
    ...l,
    classes: classes.filter(c => c.level === l.value),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">CBC Classes Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            National CBC classes shared across all schools · {classes.length} classes
          </p>
        </div>
        <Button onClick={openCreate} className="font-bold gap-2">
          <Plus className="w-4 h-4" /> Add Class
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByLevel.map(group => (
            <div key={group.value}>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                {group.label}
              </h3>
              {group.classes.length === 0 ? (
                <p className="text-xs text-muted-foreground ml-6 mb-4">No classes in this level yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                  {group.classes.map(cls => (
                    <div key={cls.id} className="stat-card">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-subtle">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-black text-foreground">{cls.name}</p>
                            {cls.description && <p className="text-[10px] text-muted-foreground">{cls.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(cls)} className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteClass(cls.id)} className="h-7 w-7 p-0 text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">{editing ? "Edit Class" : "Create CBC Class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Class Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Grade 7" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Level</Label>
              <Select value={form.level} onValueChange={v => setForm(p => ({ ...p, level: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveClass} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
