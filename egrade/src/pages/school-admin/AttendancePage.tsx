import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Download, Save, CheckCircle2, XCircle, Clock, Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StreamRow = { id: string; name: string; class_id: string; class_teacher_id: string | null };
type ClassRow = { id: string; name: string };
type Student = { id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null };
type AttendanceRecord = { id: string; student_id: string; status: string; notes: string | null };

const STATUS_OPTIONS = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-green-600" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-red-600" },
  { value: "late", label: "Late", icon: Clock, color: "text-amber-600" },
];

export default function AttendancePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStream, setSelectedStream] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<Record<string, { status: string; notes: string }>>({});
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);

  const schoolId = profile?.school_id;

  useEffect(() => {
    if (!schoolId) return;
    const fetchSetup = async () => {
      setLoading(true);
      const [classesRes, streamsRes, studentsRes] = await Promise.all([
        supabase.from("classes").select("id, name").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("streams").select("id, name, class_id, class_teacher_id").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id").eq("school_id", schoolId).eq("role", "student").eq("is_active", true),
      ]);
      if (classesRes.data) setClasses(classesRes.data);
      if (streamsRes.data) setStreams(streamsRes.data);
      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      setLoading(false);
    };
    fetchSetup();
  }, [schoolId]);

  // Load attendance when stream or date changes
  useEffect(() => {
    if (!selectedStream || !schoolId) return;
    const loadAttendance = async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, student_id, status, notes")
        .eq("stream_id", selectedStream)
        .eq("date", selectedDate)
        .eq("school_id", schoolId);

      const map: Record<string, { status: string; notes: string }> = {};
      const streamStudents = students.filter(s => s.stream_id === selectedStream);
      streamStudents.forEach(s => { map[s.id] = { status: "present", notes: "" }; });
      if (data) {
        setExistingRecords(data as AttendanceRecord[]);
        data.forEach((r: any) => { map[r.student_id] = { status: r.status, notes: r.notes || "" }; });
      } else {
        setExistingRecords([]);
      }
      setAttendance(map);
    };
    loadAttendance();
  }, [selectedStream, selectedDate, students, schoolId]);

  const streamStudents = students.filter(s => s.stream_id === selectedStream);

  const handleSave = async () => {
    if (!schoolId || !profile?.id || !selectedStream) return;
    setSaving(true);

    for (const [studentId, { status, notes }] of Object.entries(attendance)) {
      const existing = existingRecords.find(r => r.student_id === studentId);
      if (existing) {
        await supabase.from("attendance").update({ status, notes }).eq("id", existing.id);
      } else {
        await supabase.from("attendance").insert({
          student_id: studentId,
          stream_id: selectedStream,
          school_id: schoolId,
          date: selectedDate,
          marked_by: profile.id,
          status,
          notes,
        });
      }
    }

    toast({ title: "Attendance Saved", description: `${streamStudents.length} records updated for ${selectedDate}.` });
    setSaving(false);
  };

  const exportReport = () => {
    const headers = ["Adm No", "Name", "Status", "Notes", "Date"];
    const rows = streamStudents.map(s => {
      const att = attendance[s.id];
      return [s.adm_no || "", `${s.first_name} ${s.last_name}`, att?.status || "", att?.notes || "", selectedDate];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report Exported" });
  };

  const presentCount = Object.values(attendance).filter(a => a.status === "present").length;
  const absentCount = Object.values(attendance).filter(a => a.status === "absent").length;
  const lateCount = Object.values(attendance).filter(a => a.status === "late").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Attendance Register</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Class teacher attendance marking · Ministry compliance ready
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Only class teachers can mark attendance for their assigned streams.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedStream && (
            <Button variant="outline" onClick={exportReport} className="font-bold gap-2">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs font-semibold">Stream</Label>
          <Select value={selectedStream} onValueChange={setSelectedStream}>
            <SelectTrigger className="w-48 mt-1"><SelectValue placeholder="Select stream" /></SelectTrigger>
            <SelectContent>
              {streams
                .filter(s => {
                  // School admins see all streams; teachers only see their assigned streams
                  if (profile?.role === 'school_admin') return true;
                  return s.class_teacher_id === profile?.id;
                })
                .map(s => {
                  const cls = classes.find(c => c.id === s.class_id);
                  return <SelectItem key={s.id} value={s.id}>{cls?.name} — {s.name}</SelectItem>;
                })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold">Date</Label>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40 mt-1" />
        </div>
      </div>

      {selectedStream && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-lg font-black text-foreground">{presentCount}</p>
                <p className="text-xs text-muted-foreground font-semibold">Present</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-lg font-black text-foreground">{absentCount}</p>
                <p className="text-xs text-muted-foreground font-semibold">Absent</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-lg font-black text-foreground">{lateCount}</p>
                <p className="text-xs text-muted-foreground font-semibold">Late</p>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {streamStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Users className="w-10 h-10" />
                <p className="font-semibold">No students in this stream</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["#", "Adm No", "Student Name", "Status", "Notes"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {streamStudents.map((s, i) => {
                      const att = attendance[s.id] || { status: "present", notes: "" };
                      return (
                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">{s.adm_no || "—"}</td>
                          <td className="px-4 py-2.5 font-semibold text-foreground">{s.first_name} {s.last_name}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              {STATUS_OPTIONS.map(opt => {
                                const Icon = opt.icon;
                                const isActive = att.status === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => setAttendance(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], status: opt.value },
                                    }))}
                                    className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors border ${
                                      isActive
                                        ? `${opt.color} border-current bg-current/10`
                                        : "text-muted-foreground border-transparent hover:border-border"
                                    }`}
                                  >
                                    <Icon className="w-3 h-3" />
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <Input
                              className="h-7 text-xs"
                              placeholder="Notes..."
                              value={att.notes}
                              onChange={e => setAttendance(prev => ({
                                ...prev,
                                [s.id]: { ...prev[s.id], notes: e.target.value },
                              }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Attendance
          </Button>
        </>
      )}
    </div>
  );
}
