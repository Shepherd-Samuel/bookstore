import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Loader2, Layers, Users, UserCheck,
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
  id: string; name: string; level: string; description: string;
  is_active: boolean;
};
type StreamRow = {
  id: string; name: string; class_id: string; capacity: number | null;
  is_active: boolean; class_teacher_id: string | null;
};
type TeacherRow = {
  id: string; first_name: string; last_name: string;
};

export default function ClassesStreamsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [editingStream, setEditingStream] = useState<StreamRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [streamForm, setStreamForm] = useState({ name: "", class_id: "", capacity: 45, class_teacher_id: "" });

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [classesRes, streamsRes, teachersRes] = await Promise.all([
      supabase.from("classes").select("id, name, level, description, is_active").eq("is_active", true).order("name"),
      supabase.from("streams").select("*").eq("school_id", schoolId).order("name"),
      supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true).order("first_name"),
    ]);
    if (classesRes.data) setClasses(classesRes.data as ClassRow[]);
    if (streamsRes.data) setStreams(streamsRes.data as StreamRow[]);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const saveStream = async () => {
    if (!streamForm.name || !streamForm.class_id || !schoolId) return;
    setSaving(true);
    const payload = {
      name: streamForm.name,
      class_id: streamForm.class_id,
      school_id: schoolId,
      capacity: Number(streamForm.capacity),
      class_teacher_id: streamForm.class_teacher_id || null,
    };
    const { error } = editingStream
      ? await supabase.from("streams").update(payload).eq("id", editingStream.id)
      : await supabase.from("streams").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingStream ? "Stream Updated" : "Stream Created" });
      setShowStreamModal(false);
      fetchData();
    }
    setSaving(false);
  };

  const deleteStream = async (id: string) => {
    if (!confirm("Delete this stream?")) return;
    await supabase.from("streams").delete().eq("id", id);
    fetchData();
  };

  const openEditStream = (s: StreamRow) => {
    setEditingStream(s);
    setStreamForm({ name: s.name, class_id: s.class_id, capacity: s.capacity || 45, class_teacher_id: s.class_teacher_id || "" });
    setShowStreamModal(true);
  };

  const openCreateStream = (classId?: string) => {
    setEditingStream(null);
    setStreamForm({ name: "", class_id: classId || "", capacity: 45, class_teacher_id: "" });
    setShowStreamModal(true);
  };

  const getTeacherName = (id: string | null) => {
    if (!id) return "Not assigned";
    const t = teachers.find(t => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : "Unknown";
  };

  const getClassStreams = (classId: string) => streams.filter(s => s.class_id === classId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Classes & Streams</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {classes.length} CBC classes · {streams.length} streams in your school
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Classes are managed nationally by the platform. You manage streams for your school.
          </p>
        </div>
        <Button onClick={() => openCreateStream()} className="font-bold gap-2">
          <Plus className="w-4 h-4" /> Add Stream
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Layers className="w-12 h-12" />
          <p className="font-semibold">No CBC classes available yet</p>
          <p className="text-xs">The platform admin will set up national classes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classes.map(cls => {
            const clsStreams = getClassStreams(cls.id);
            return (
              <div key={cls.id} className="stat-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-subtle">
                      <Layers className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-foreground">{cls.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{cls.level.replace("_", " ")}</p>
                    </div>
                  </div>
                </div>

                {clsStreams.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-3">No streams yet</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {clsStreams.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-semibold text-foreground">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">cap: {s.capacity}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <UserCheck className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{getTeacherName(s.class_teacher_id)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditStream(s)} className="h-6 w-6 p-0">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteStream(s.id)} className="h-6 w-6 p-0 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button size="sm" variant="outline" onClick={() => openCreateStream(cls.id)} className="w-full gap-1.5 text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5" /> Add Stream
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stream Modal */}
      <Dialog open={showStreamModal} onOpenChange={setShowStreamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black">{editingStream ? "Edit Stream" : "Create Stream"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Class *</Label>
              <Select value={streamForm.class_id} onValueChange={v => setStreamForm(p => ({ ...p, class_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Stream Name *</Label>
              <Input value={streamForm.name} onChange={e => setStreamForm(p => ({ ...p, name: e.target.value }))} placeholder="Stream A" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Capacity</Label>
              <Input type="number" value={streamForm.capacity} onChange={e => setStreamForm(p => ({ ...p, capacity: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Class Teacher</Label>
              <Select value={streamForm.class_teacher_id} onValueChange={v => setStreamForm(p => ({ ...p, class_teacher_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Assign class teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStreamModal(false)}>Cancel</Button>
            <Button onClick={saveStream} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingStream ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
