import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Loader2, UserCheck, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Allocation = {
  id: string;
  teacher_id: string;
  subject_id: string;
  stream_id: string;
  is_active: boolean;
  teacher?: { first_name: string; last_name: string };
  subject?: { name: string };
  stream?: { name: string; classes?: { name: string } };
};

type Teacher = { id: string; first_name: string; last_name: string };
type Subject = { id: string; name: string };
type ClassRow = { id: string; name: string };
type StreamWithClass = { id: string; name: string; class_id: string; classes: { name: string } | null };

export default function TeacherAllocationPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [streams, setStreams] = useState<StreamWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ teacher_id: "", subject_id: "", class_id: "", stream_id: "" });
  const [conflict, setConflict] = useState<string | null>(null);

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [allocRes, teacherRes, subjectRes, classesRes, streamRes] = await Promise.all([
      supabase
        .from("subject_teacher_allocations")
        .select("*, teacher:profiles!subject_teacher_allocations_teacher_id_fkey(first_name, last_name), subject:subjects!subject_teacher_allocations_subject_id_fkey(name), stream:streams!subject_teacher_allocations_stream_id_fkey(name, classes(name))")
        .eq("school_id", schoolId)
        .eq("is_active", true),
      supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true),
      supabase.from("subjects").select("id, name").or(`school_id.eq.${schoolId},is_national.eq.true`).eq("is_active", true),
      supabase.from("classes").select("id, name").eq("is_active", true).order("name"),
      supabase.from("streams").select("id, name, class_id, classes(name)").eq("school_id", schoolId).eq("is_active", true),
    ]);
    if (allocRes.data) setAllocations(allocRes.data as any);
    if (teacherRes.data) setTeachers(teacherRes.data);
    if (subjectRes.data) setSubjects(subjectRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (streamRes.data) setStreams(streamRes.data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  // Filter streams by selected class
  const filteredStreams = form.class_id
    ? streams.filter(s => s.class_id === form.class_id)
    : [];

  // Filter out subject+stream combos that are already allocated
  const availableSubjects = subjects.filter(sub => {
    if (!form.stream_id) return true;
    return !allocations.some(a => a.subject_id === sub.id && a.stream_id === form.stream_id);
  });

  const handleSave = async () => {
    if (!form.teacher_id || !form.subject_id || !form.stream_id || !schoolId) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    // Check conflict
    const existing = allocations.find(
      a => a.subject_id === form.subject_id && a.stream_id === form.stream_id
    );
    if (existing) {
      const teacherName = existing.teacher ? `${existing.teacher.first_name} ${existing.teacher.last_name}` : "another teacher";
      setConflict(`${existing.subject?.name} in ${(existing.stream as any)?.classes?.name} — ${existing.stream?.name} is already assigned to ${teacherName}.`);
      return;
    }
    setConflict(null);
    setSaving(true);
    const { error } = await supabase.from("subject_teacher_allocations").insert({
      teacher_id: form.teacher_id,
      subject_id: form.subject_id,
      stream_id: form.stream_id,
      school_id: schoolId,
      is_active: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Teacher Allocated" });
      setShowModal(false);
      setForm({ teacher_id: "", subject_id: "", class_id: "", stream_id: "" });
      fetchData();
    }
    setSaving(false);
  };

  const deleteAllocation = async (id: string) => {
    if (!confirm("Remove this allocation?")) return;
    await supabase.from("subject_teacher_allocations").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Subject–Teacher Allocation</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{allocations.length} allocations · {teachers.length} teachers</p>
          <p className="text-[10px] text-muted-foreground mt-1">Each subject in a stream can only be assigned to one teacher.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={() => { setForm({ teacher_id: "", subject_id: "", class_id: "", stream_id: "" }); setConflict(null); setShowModal(true); }} className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Allocate Teacher
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : allocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <UserCheck className="w-10 h-10" />
            <p className="font-semibold">No allocations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Teacher", "Subject", "Class / Stream", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocations.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {a.teacher?.first_name} {a.teacher?.last_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.subject?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(a.stream as any)?.classes?.name} — {a.stream?.name}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => deleteAllocation(a.id)} className="h-7 w-7 p-0 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
            <DialogTitle className="font-black">Allocate Teacher to Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Teacher *</Label>
              <Select value={form.teacher_id} onValueChange={v => { setForm(p => ({ ...p, teacher_id: v })); setConflict(null); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Class *</Label>
              <Select value={form.class_id} onValueChange={v => { setForm(p => ({ ...p, class_id: v, stream_id: "", subject_id: "" })); setConflict(null); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Stream *</Label>
              <Select value={form.stream_id} onValueChange={v => { setForm(p => ({ ...p, stream_id: v, subject_id: "" })); setConflict(null); }} disabled={!form.class_id}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={form.class_id ? "Select stream" : "Select class first"} /></SelectTrigger>
                <SelectContent>
                  {filteredStreams.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.classes?.name} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Subject *</Label>
              <Select value={form.subject_id} onValueChange={v => { setForm(p => ({ ...p, subject_id: v })); setConflict(null); }} disabled={!form.stream_id}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={form.stream_id ? "Select subject" : "Select stream first"} /></SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.stream_id && availableSubjects.length === 0 && (
                <p className="text-[10px] text-emerald-600 mt-1 font-medium">✓ All subjects in this stream are allocated!</p>
              )}
            </div>
            {conflict && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{conflict}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Allocate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
