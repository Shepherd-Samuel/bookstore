import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar, Clock, Plus, Trash2, Wand2, Printer, Settings2, BookOpen, Loader2 } from "lucide-react";

const SCHOOL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_LABELS: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };

interface TimetablePeriod {
  id: string;
  school_id: string;
  period_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  break_label: string;
}

interface Stream { id: string; name: string; class_id: string; school_id: string; }
interface ClassItem { id: string; name: string; level: string; }
interface Subject { id: string; name: string; code?: string; }
interface Allocation { id: string; stream_id: string; subject_id: string; teacher_id: string; }
interface TimetableSlot {
  id: string;
  stream_id: string;
  subject_id: string;
  teacher_id: string;
  period_id: string;
  day_of_week: string;
}
interface Demand {
  id: string;
  stream_id: string;
  subject_id: string;
  periods_per_week: number;
  is_core_daily: boolean;
}
interface Profile { id: string; first_name: string; last_name: string; }

export default function TimetablePage() {
  const { profile, effectiveRole } = useAuth();
  const schoolId = profile?.school_id;
  const isAdmin = effectiveRole === "school_admin";

  // Data state
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filter state
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStream, setSelectedStream] = useState<string>("");

  // Period setup dialog
  const [showPeriodSetup, setShowPeriodSetup] = useState(false);
  const [newPeriodNumber, setNewPeriodNumber] = useState(1);
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("08:40");
  const [newIsBreak, setNewIsBreak] = useState(false);
  const [newBreakLabel, setNewBreakLabel] = useState("");

  // Demand dialog
  const [showDemandSetup, setShowDemandSetup] = useState(false);
  const [demandStream, setDemandStream] = useState("");
  const [demandSubject, setDemandSubject] = useState("");
  const [demandPPW, setDemandPPW] = useState(3);
  const [demandCoreDaily, setDemandCoreDaily] = useState(false);

  // For teacher/student: auto-select their stream
  useEffect(() => {
    if (effectiveRole === "teacher" && profile?.id) {
      // Find streams where teacher is class teacher
      supabase.from("streams").select("id, class_id").eq("class_teacher_id", profile.id).limit(1)
        .then(({ data }) => {
          if (data?.[0]) {
            setSelectedStream(data[0].id);
            setSelectedClass(data[0].class_id);
          }
        });
    }
    if (effectiveRole === "student" && profile?.stream_id) {
      setSelectedStream(profile.stream_id);
      if (profile.class_id) setSelectedClass(profile.class_id);
    }
  }, [effectiveRole, profile]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [periodsRes, classesRes, streamsRes, subjectsRes, allocRes, slotsRes, demandRes, teacherRes] = await Promise.all([
        supabase.from("timetable_periods").select("*").eq("school_id", schoolId).order("period_number"),
        supabase.from("classes").select("id, name, level").eq("school_id", schoolId).eq("is_active", true).order("name"),
        supabase.from("streams").select("id, name, class_id, school_id").eq("school_id", schoolId).eq("is_active", true).order("name"),
        supabase.from("subjects").select("id, name, code").order("name"),
        supabase.from("subject_teacher_allocations").select("id, stream_id, subject_id, teacher_id").eq("school_id", schoolId).eq("is_active", true),
        supabase.from("timetable_slots").select("*").eq("school_id", schoolId),
        supabase.from("subject_demand").select("*").eq("school_id", schoolId),
        supabase.from("profiles").select("id, first_name, last_name").eq("school_id", schoolId).eq("role", "teacher").eq("is_active", true),
      ]);
      setPeriods((periodsRes.data as any[]) || []);
      setClasses((classesRes.data as any[]) || []);
      setStreams((streamsRes.data as any[]) || []);
      setSubjects((subjectsRes.data as any[]) || []);
      setAllocations((allocRes.data as any[]) || []);
      setSlots((slotsRes.data as any[]) || []);
      setDemands((demandRes.data as any[]) || []);
      setTeachers((teacherRes.data as any[]) || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load timetable data");
    }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Helpers
  const subjectMap = useMemo(() => Object.fromEntries(subjects.map(s => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => Object.fromEntries(teachers.map(t => [t.id, t])), [teachers]);
  const periodMap = useMemo(() => Object.fromEntries(periods.map(p => [p.id, p])), [periods]);
  const streamMap = useMemo(() => Object.fromEntries(streams.map(s => [s.id, s])), [streams]);
  const classMap = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])), [classes]);

  const filteredStreams = useMemo(() =>
    selectedClass ? streams.filter(s => s.class_id === selectedClass) : streams,
    [selectedClass, streams]
  );

  const lessonPeriods = useMemo(() => periods.filter(p => !p.is_break), [periods]);
  const sortedPeriods = useMemo(() => [...periods].sort((a, b) => a.period_number - b.period_number), [periods]);

  const filteredSlots = useMemo(() => {
    if (selectedStream) return slots.filter(s => s.stream_id === selectedStream);
    if (selectedClass) {
      const streamIds = new Set(filteredStreams.map(s => s.id));
      return slots.filter(s => streamIds.has(s.stream_id));
    }
    return slots;
  }, [selectedStream, selectedClass, slots, filteredStreams]);

  // ─── Period Management ───
  const addPeriod = async () => {
    if (!schoolId) return;
    const { error } = await supabase.from("timetable_periods").insert({
      school_id: schoolId,
      period_number: newPeriodNumber,
      start_time: newStartTime,
      end_time: newEndTime,
      is_break: newIsBreak,
      break_label: newIsBreak ? newBreakLabel : "",
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Period number already exists" : error.message);
    } else {
      toast.success(`Period ${newPeriodNumber} added`);
      setNewPeriodNumber(prev => prev + 1);
      setNewStartTime(newEndTime);
      const [h, m] = newEndTime.split(":").map(Number);
      setNewEndTime(`${String(h).padStart(2, "0")}:${String(m + 40 > 59 ? (m + 40) % 60 : m + 40).padStart(2, "0")}`);
      fetchData();
    }
  };

  const deletePeriod = async (id: string) => {
    const { error } = await supabase.from("timetable_periods").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Period removed"); fetchData(); }
  };

  // ─── Demand Management ───
  const addDemand = async () => {
    if (!schoolId || !demandStream || !demandSubject) return;
    const { error } = await supabase.from("subject_demand").upsert({
      school_id: schoolId,
      stream_id: demandStream,
      subject_id: demandSubject,
      periods_per_week: demandPPW,
      is_core_daily: demandCoreDaily,
    }, { onConflict: "school_id,stream_id,subject_id,academic_year,term" });
    if (error) toast.error(error.message);
    else { toast.success("Subject demand saved"); fetchData(); }
  };

  const deleteDemand = async (id: string) => {
    await supabase.from("subject_demand").delete().eq("id", id);
    fetchData();
  };

  // ─── Timetable Generation (Greedy Algorithm) ───
  const generateTimetable = async () => {
    if (!schoolId) return;
    if (lessonPeriods.length === 0) { toast.error("Set up periods first"); return; }
    if (demands.length === 0) { toast.error("Set up subject demand first"); return; }
    if (allocations.length === 0) { toast.error("Allocate teachers to subjects first"); return; }

    setGenerating(true);
    try {
      // Clear existing slots
      await supabase.from("timetable_slots").delete().eq("school_id", schoolId);

      // Build data structures
      const assignmentMap: Record<string, Record<string, string>> = {}; // streamId -> subjectId -> teacherId
      allocations.forEach(a => {
        if (!assignmentMap[a.stream_id]) assignmentMap[a.stream_id] = {};
        assignmentMap[a.stream_id][a.subject_id] = a.teacher_id;
      });

      const demandMap: Record<string, Record<string, { left: number; coreDaily: boolean }>> = {};
      demands.forEach(d => {
        if (!demandMap[d.stream_id]) demandMap[d.stream_id] = {};
        demandMap[d.stream_id][d.subject_id] = { left: d.periods_per_week, coreDaily: d.is_core_daily };
      });

      const slotConflicts: Record<string, Record<string, Set<string>>> = {}; // day -> periodId -> Set<teacherId>
      const dailyLessonCount: Record<string, Record<string, Record<string, number>>> = {}; // streamId -> subjectId -> day -> count
      const newSlots: any[] = [];

      // Greedy scheduling
      for (const day of SCHOOL_DAYS) {
        for (const period of lessonPeriods) {
          const activeStreams = selectedClass
            ? streams.filter(s => s.class_id === selectedClass)
            : streams;

          for (const stream of activeStreams) {
            const streamAssignments = assignmentMap[stream.id] || {};
            const streamDemand = demandMap[stream.id] || {};

            let bestCandidate: { subjectId: string; teacherId: string } | null = null;
            let bestPriority = -1;

            for (const [subjectId, teacherId] of Object.entries(streamAssignments)) {
              const demand = streamDemand[subjectId];
              if (!demand || demand.left <= 0) continue;

              // Check teacher conflict
              if (slotConflicts[day]?.[period.id]?.has(teacherId)) continue;

              const dayCount = dailyLessonCount[stream.id]?.[subjectId]?.[day] || 0;
              let priority = 0;

              // Core daily subject not yet scheduled today
              if (demand.coreDaily && dayCount === 0) {
                priority = 2;
              } else if (demand.left > 0) {
                priority = 1 + demand.left / 1000;
              }

              // Avoid scheduling same subject twice in a day unless necessary
              if (dayCount >= 2) priority *= 0.3;
              else if (dayCount >= 1 && !demand.coreDaily) priority *= 0.7;

              if (priority > bestPriority) {
                bestPriority = priority;
                bestCandidate = { subjectId, teacherId };
              }
            }

            if (bestCandidate) {
              // Record conflict
              if (!slotConflicts[day]) slotConflicts[day] = {};
              if (!slotConflicts[day][period.id]) slotConflicts[day][period.id] = new Set();
              slotConflicts[day][period.id].add(bestCandidate.teacherId);

              // Decrement demand
              if (demandMap[stream.id]?.[bestCandidate.subjectId]) {
                demandMap[stream.id][bestCandidate.subjectId].left--;
              }

              // Track daily count
              if (!dailyLessonCount[stream.id]) dailyLessonCount[stream.id] = {};
              if (!dailyLessonCount[stream.id][bestCandidate.subjectId]) dailyLessonCount[stream.id][bestCandidate.subjectId] = {};
              dailyLessonCount[stream.id][bestCandidate.subjectId][day] = (dailyLessonCount[stream.id][bestCandidate.subjectId][day] || 0) + 1;

              newSlots.push({
                school_id: schoolId,
                stream_id: stream.id,
                subject_id: bestCandidate.subjectId,
                teacher_id: bestCandidate.teacherId,
                period_id: period.id,
                day_of_week: day,
              });
            }
          }
        }
      }

      // Batch insert (chunks of 500)
      for (let i = 0; i < newSlots.length; i += 500) {
        const chunk = newSlots.slice(i, i + 500);
        const { error } = await supabase.from("timetable_slots").insert(chunk);
        if (error) throw error;
      }

      // Check unfulfilled demand
      let unfulfilled = 0;
      Object.values(demandMap).forEach(streamDemands => {
        Object.values(streamDemands).forEach(d => {
          if (d.left > 0) unfulfilled += d.left;
        });
      });

      if (unfulfilled > 0) {
        toast.warning(`Timetable generated with ${newSlots.length} slots. ${unfulfilled} periods could not be scheduled due to conflicts.`);
      } else {
        toast.success(`Timetable successfully generated with ${newSlots.length} slots!`);
      }

      fetchData();
    } catch (err: any) {
      toast.error("Generation failed: " + (err.message || "Unknown error"));
    }
    setGenerating(false);
  };

  // ─── Print ───
  const handlePrint = () => {
    const streamLabel = selectedStream ? `${classMap[streamMap[selectedStream]?.class_id]?.name || ""} — ${streamMap[selectedStream]?.name}` : "Whole School";
    const printContent = document.getElementById("timetable-grid");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Timetable — ${streamLabel}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; }
        th { background: #1f2937; color: white; }
        .break-cell { background: #fef3c7; font-weight: bold; }
        .slot-cell { background: #ecfdf5; }
        h2 { margin-bottom: 8px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h2>Timetable: ${streamLabel}</h2>
      ${printContent.outerHTML}
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─── Build timetable grid data ───
  const getSlotForCell = (day: string, periodId: string) => {
    if (selectedStream) {
      return filteredSlots.find(s => s.day_of_week === day && s.period_id === periodId);
    }
    return filteredSlots.filter(s => s.day_of_week === day && s.period_id === periodId);
  };

  const isSingleView = !!selectedStream;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            School Timetable
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Set up periods, subject demand, and generate timetables." : "View the weekly class schedule."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filteredSlots.length > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          )}
          {isAdmin && (
            <Button onClick={generateTimetable} disabled={generating} size="sm">
              {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
              {generating ? "Generating..." : "Generate Timetable"}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Select Grade</Label>
              <Select value={selectedClass} onValueChange={v => { setSelectedClass(v === "all" ? "" : v); setSelectedStream(""); }}>
                <SelectTrigger><SelectValue placeholder="All Grades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Select Stream</Label>
              <Select value={selectedStream} onValueChange={v => setSelectedStream(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All Streams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {filteredStreams.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {classMap[s.class_id]?.name} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="secondary" className="text-xs">
                {filteredSlots.length} slots · {lessonPeriods.length} periods/day
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Tabs: Setup + View */}
      {isAdmin ? (
        <Tabs defaultValue="view" className="space-y-4">
          <TabsList>
            <TabsTrigger value="view">
              <Calendar className="w-4 h-4 mr-1" /> View Timetable
            </TabsTrigger>
            <TabsTrigger value="periods">
              <Clock className="w-4 h-4 mr-1" /> Bell Schedule
            </TabsTrigger>
            <TabsTrigger value="demand">
              <BookOpen className="w-4 h-4 mr-1" /> Subject Demand
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view">
            <TimetableGrid
              sortedPeriods={sortedPeriods}
              filteredSlots={filteredSlots}
              isSingleView={isSingleView}
              subjectMap={subjectMap}
              teacherMap={teacherMap}
              periodMap={periodMap}
              streamMap={streamMap}
              classMap={classMap}
            />
          </TabsContent>

          <TabsContent value="periods">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bell Schedule Setup</CardTitle>
                <CardDescription>Define lesson periods and breaks for the school day. Each period applies to all classes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add period form */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end p-4 rounded-lg border border-dashed border-border bg-muted/30">
                  <div>
                    <Label className="text-xs">Period #</Label>
                    <Input type="number" min={1} value={newPeriodNumber} onChange={e => setNewPeriodNumber(+e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch checked={newIsBreak} onCheckedChange={setNewIsBreak} />
                    <Label className="text-xs">Break?</Label>
                  </div>
                  {newIsBreak && (
                    <div>
                      <Label className="text-xs">Break Label</Label>
                      <Input value={newBreakLabel} onChange={e => setNewBreakLabel(e.target.value)} placeholder="e.g. BREAK, LUNCH" />
                    </div>
                  )}
                  <Button onClick={addPeriod} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                {/* Existing periods */}
                {sortedPeriods.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No periods set up yet. Add your first period above.</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedPeriods.map(p => (
                          <TableRow key={p.id} className={p.is_break ? "bg-accent/30" : ""}>
                            <TableCell className="font-bold">{p.period_number}</TableCell>
                            <TableCell>{p.start_time?.slice(0, 5)}</TableCell>
                            <TableCell>{p.end_time?.slice(0, 5)}</TableCell>
                            <TableCell>
                              {p.is_break ? (
                                <Badge variant="secondary">{p.break_label || "Break"}</Badge>
                              ) : (
                                <Badge variant="outline">Lesson</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => deletePeriod(p.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demand">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subject Demand</CardTitle>
                <CardDescription>Set how many periods per week each subject needs in each stream. Mark core subjects that must appear daily.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add demand form */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end p-4 rounded-lg border border-dashed border-border bg-muted/30">
                  <div>
                    <Label className="text-xs">Stream</Label>
                    <Select value={demandStream} onValueChange={setDemandStream}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {streams.map(s => (
                          <SelectItem key={s.id} value={s.id}>{classMap[s.class_id]?.name} — {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Subject</Label>
                    <Select value={demandSubject} onValueChange={setDemandSubject}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Periods/Week</Label>
                    <Input type="number" min={1} max={25} value={demandPPW} onChange={e => setDemandPPW(+e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Switch checked={demandCoreDaily} onCheckedChange={setDemandCoreDaily} />
                    <Label className="text-xs">Daily Core</Label>
                  </div>
                  <Button onClick={addDemand} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Save
                  </Button>
                </div>

                {/* Existing demands */}
                {demands.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No subject demands configured yet.</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stream</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Periods/Week</TableHead>
                          <TableHead>Core Daily</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {demands.map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="text-xs">
                              {classMap[streamMap[d.stream_id]?.class_id]?.name} — {streamMap[d.stream_id]?.name}
                            </TableCell>
                            <TableCell className="font-medium">{subjectMap[d.subject_id]?.name || d.subject_id}</TableCell>
                            <TableCell>{d.periods_per_week}</TableCell>
                            <TableCell>{d.is_core_daily ? <Badge>Daily</Badge> : "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => deleteDemand(d.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Non-admin: just the timetable grid
        <TimetableGrid
          sortedPeriods={sortedPeriods}
          filteredSlots={filteredSlots}
          isSingleView={isSingleView}
          subjectMap={subjectMap}
          teacherMap={teacherMap}
          periodMap={periodMap}
          streamMap={streamMap}
          classMap={classMap}
        />
      )}
    </div>
  );
}

// ─── Timetable Grid Component ───
function TimetableGrid({
  sortedPeriods,
  filteredSlots,
  isSingleView,
  subjectMap,
  teacherMap,
  periodMap,
  streamMap,
  classMap,
}: {
  sortedPeriods: TimetablePeriod[];
  filteredSlots: TimetableSlot[];
  isSingleView: boolean;
  subjectMap: Record<string, Subject>;
  teacherMap: Record<string, Profile>;
  periodMap: Record<string, TimetablePeriod>;
  streamMap: Record<string, Stream>;
  classMap: Record<string, ClassItem>;
}) {
  if (sortedPeriods.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No bell schedule set up yet.</p>
          <p className="text-xs text-muted-foreground mt-1">The school admin needs to configure periods first.</p>
        </CardContent>
      </Card>
    );
  }

  if (filteredSlots.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No timetable generated yet.</p>
          <p className="text-xs text-muted-foreground mt-1">The timetable hasn't been generated for this selection.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto" id="timetable-grid">
          <table className="w-full border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-foreground text-background">
                <th className="p-2.5 text-left font-semibold border-r border-background/20 sticky left-0 bg-foreground z-10 min-w-[80px]">
                  Day
                </th>
                {sortedPeriods.map(p => (
                  <th
                    key={p.id}
                    className={`p-2.5 text-center font-semibold border-r border-background/20 min-w-[90px] ${
                      p.is_break ? "bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    {p.is_break ? (
                      <span className="text-[10px] font-bold uppercase">{p.break_label || "Break"}</span>
                    ) : (
                      <>
                        <span className="block">P{p.period_number}</span>
                        <span className="block text-[10px] font-normal opacity-70">
                          {p.start_time?.slice(0, 5)}
                        </span>
                      </>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHOOL_DAYS.map(day => (
                <tr key={day} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2.5 font-bold text-foreground bg-muted/50 border-r border-border sticky left-0 z-10">
                    {DAY_LABELS[day]}
                  </td>
                  {sortedPeriods.map(period => {
                    if (period.is_break) {
                      return (
                        <td key={period.id} className="p-2 text-center bg-accent/20 border-r border-border">
                          <span className="text-[10px] font-bold text-accent-foreground/60 uppercase">
                            {period.break_label || "Break"}
                          </span>
                        </td>
                      );
                    }

                    const daySlots = filteredSlots.filter(
                      s => s.day_of_week === day && s.period_id === period.id
                    );

                    if (daySlots.length === 0) {
                      return (
                        <td key={period.id} className="p-2 text-center text-muted-foreground/40 border-r border-border">
                          —
                        </td>
                      );
                    }

                    if (isSingleView) {
                      const slot = daySlots[0];
                      const subj = subjectMap[slot.subject_id];
                      const teacher = teacherMap[slot.teacher_id];
                      return (
                        <td key={period.id} className="p-1.5 border-r border-border">
                          <div className="rounded-md bg-primary/10 border border-primary/20 p-1.5 text-center">
                            <span className="block text-[11px] font-bold text-primary truncate">
                              {subj?.code || subj?.name || "—"}
                            </span>
                            <span className="block text-[9px] text-muted-foreground truncate">
                              {teacher ? `${teacher.first_name} ${teacher.last_name?.[0]}.` : ""}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // Block view: multiple streams
                    return (
                      <td key={period.id} className="p-1 border-r border-border align-top">
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {daySlots.slice(0, 4).map(slot => {
                            const subj = subjectMap[slot.subject_id];
                            const stream = streamMap[slot.stream_id];
                            return (
                              <div key={slot.id} className="rounded bg-secondary/50 px-1 py-0.5">
                                <span className="block text-[9px] font-bold text-secondary-foreground truncate">
                                  {classMap[stream?.class_id]?.name?.replace("Grade ", "G")}/{stream?.name}
                                </span>
                                <span className="block text-[8px] text-muted-foreground truncate">
                                  {subj?.code || subj?.name}
                                </span>
                              </div>
                            );
                          })}
                          {daySlots.length > 4 && (
                            <span className="text-[8px] text-muted-foreground">+{daySlots.length - 4} more</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
