import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, UserCheck, Users, RefreshCw, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StreamRow = {
  id: string; name: string; class_id: string; class_teacher_id: string | null;
  classes: { name: string } | null;
};
type Teacher = { id: string; first_name: string; last_name: string };

export default function ClassTeacherAssignmentPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [streamsRes, teachersRes] = await Promise.all([
      supabase.from("streams").select("id, name, class_id, class_teacher_id, classes(name)")
        .eq("school_id", schoolId).eq("is_active", true).order("name"),
      supabase.from("profiles").select("id, first_name, last_name")
        .eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true).order("first_name"),
    ]);
    if (streamsRes.data) setStreams(streamsRes.data as any);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  // Teachers already assigned as class teachers
  const assignedTeacherIds = new Set(
    streams.filter(s => s.class_teacher_id).map(s => s.class_teacher_id!)
  );

  const availableTeachers = (currentTeacherId: string | null) =>
    teachers.filter(t => !assignedTeacherIds.has(t.id) || t.id === currentTeacherId);

  const assignTeacher = async (streamId: string, teacherId: string | null) => {
    setSaving(streamId);
    const { error } = await supabase.from("streams")
      .update({ class_teacher_id: teacherId })
      .eq("id", streamId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: teacherId ? "Teacher Assigned" : "Teacher Removed" });
      fetchData();
    }
    setSaving(null);
  };

  const getTeacherName = (id: string | null) => {
    if (!id) return null;
    const t = teachers.find(t => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : "Unknown";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Class Teacher Assignments</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {streams.filter(s => s.class_teacher_id).length}/{streams.length} streams assigned
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Users className="w-10 h-10" />
            <p className="font-semibold">No streams created yet</p>
            <p className="text-xs">Create streams in Classes & Streams first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Class", "Stream", "Class Teacher", "Action"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {streams.map(s => {
                  const teacherName = getTeacherName(s.class_teacher_id);
                  const available = availableTeachers(s.class_teacher_id);
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{(s.classes as any)?.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.name}</td>
                      <td className="px-4 py-3">
                        {teacherName ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-semibold text-foreground">{teacherName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={s.class_teacher_id || ""}
                            onValueChange={v => assignTeacher(s.id, v || null)}
                            disabled={saving === s.id}
                          >
                            <SelectTrigger className="w-48 h-8 text-xs">
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.first_name} {t.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {s.class_teacher_id && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => assignTeacher(s.id, null)}
                              disabled={saving === s.id}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {saving === s.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
