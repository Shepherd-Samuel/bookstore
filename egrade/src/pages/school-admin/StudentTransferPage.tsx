import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import EGradeLoader from "@/components/ui/EGradeLoader";

import {
  Loader2, Search, ArrowRightLeft, RotateCcw, FileText, CheckCircle2,
  Clock, XCircle, AlertTriangle, User, DollarSign, Shield, History,
  Award, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupExamMarks } from "@/lib/transferUtils";
import { generateTransferCertificate } from "@/lib/transferCertificate";
import { sanitizeInput } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/rateLimit";

type Profile = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
  stream_id: string | null; class_id: string | null; is_active: boolean;
};

type TransferRow = {
  id: string; student_id: string; status: string; reason: string | null;
  destination_school: string | null; fee_balance: number; admin_comments: string | null;
  teacher_comments: string | null; discipline_summary: any; exam_summary: any;
  initiated_at: string; teacher_reviewed_at: string | null;
  completed_at: string | null; cancelled_at: string | null;
  class_teacher_id: string | null; initiated_by: string;
};

type Stream = { id: string; name: string; class_id: string; class_teacher_id: string | null };
type ClassRow = { id: string; name: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  initiated: { label: "Initiated", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  teacher_reviewed: { label: "Teacher Approved", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Readmitted", color: "bg-muted text-muted-foreground border-border", icon: RotateCcw },
};

export default function StudentTransferPage() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;

  const [students, setStudents] = useState<Profile[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [teacherNames, setTeacherNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Initiate dialog
  const [showInitiate, setShowInitiate] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [reason, setReason] = useState("");
  const [destSchool, setDestSchool] = useState("");
  const [adminComments, setAdminComments] = useState("");
  const [initiating, setInitiating] = useState(false);

  // Detail dialog
  const [detailTransfer, setDetailTransfer] = useState<TransferRow | null>(null);
  const [historyLog, setHistoryLog] = useState<any[]>([]);
  const [schoolData, setSchoolData] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [studentsRes, transfersRes, streamsRes, classesRes, schoolRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, adm_no, stream_id, class_id, is_active")
        .eq("school_id", schoolId).eq("role", "student"),
      supabase.from("student_transfers").select("*").eq("school_id", schoolId).order("initiated_at", { ascending: false }),
      supabase.from("streams").select("id, name, class_id, class_teacher_id").eq("school_id", schoolId),
      supabase.from("classes").select("id, name").eq("school_id", schoolId),
      supabase.from("schools").select("school_name, logo_url, address, phone, email, moto").eq("id", schoolId).single(),
    ]);
    const studentList = (studentsRes.data || []) as Profile[];
    const transferList = (transfersRes.data || []) as TransferRow[];
    setStudents(studentList);
    setTransfers(transferList);
    setStreams((streamsRes.data || []) as Stream[]);
    setClasses((classesRes.data || []) as ClassRow[]);
    if (schoolRes.data) setSchoolData(schoolRes.data);

    // Build name maps
    const nameMap: Record<string, string> = {};
    studentList.forEach(s => { nameMap[s.id] = `${s.first_name} ${s.last_name}`; });
    setStudentNames(nameMap);

    // Teacher names for class teachers
    const teacherIds = new Set<string>();
    (streamsRes.data || []).forEach((s: any) => { if (s.class_teacher_id) teacherIds.add(s.class_teacher_id); });
    transferList.forEach(t => { if (t.class_teacher_id) teacherIds.add(t.class_teacher_id); });
    if (teacherIds.size > 0) {
      const { data: teachers } = await supabase.from("profiles").select("id, first_name, last_name")
        .in("id", Array.from(teacherIds));
      const tMap: Record<string, string> = {};
      (teachers || []).forEach((t: any) => { tMap[t.id] = `${t.first_name} ${t.last_name}`; });
      setTeacherNames(tMap);
    }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Students who don't have an active (non-cancelled) transfer
  const activeTransferStudentIds = new Set(
    transfers.filter(t => t.status !== "cancelled").map(t => t.student_id)
  );
  const eligibleStudents = students.filter(s =>
    s.is_active && !activeTransferStudentIds.has(s.id) &&
    (`${s.first_name} ${s.last_name} ${s.adm_no || ""}`.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredTransfers = transfers.filter(t =>
    filterStatus === "all" || t.status === filterStatus
  );

  const getClassName = (classId: string | null) => classes.find(c => c.id === classId)?.name || "—";
  const getStreamName = (streamId: string | null) => streams.find(s => s.id === streamId)?.name || "—";

  const handleInitiate = async () => {
    if (!selectedStudent || !schoolId || !profile?.id) return;
    setInitiating(true);
    try {
      enforceRateLimit("transfer-initiate", 5, 60_000);
      // 1. Calculate fee balance based on student's class level
      const [feeCatsRes, paymentsRes] = await Promise.all([
        supabase.from("fee_categories").select("amount, level").eq("school_id", schoolId),
        supabase.from("fee_payments").select("amount_paid").eq("student_id", selectedStudent.id).eq("school_id", schoolId),
      ]);
      const studentClass = classes.find(c => c.id === selectedStudent.class_id);
      // Use actual class level from DB - look up from classes with level
      const { data: classWithLevel } = await supabase.from("classes").select("level").eq("id", selectedStudent.class_id || "").single();
      const studentLevel = classWithLevel?.level || "primary";
      const totalFees = (feeCatsRes.data || [])
        .filter((f: any) => f.level === "all" || f.level === studentLevel)
        .reduce((s: number, f: any) => s + Number(f.amount), 0);
      const totalPaid = (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
      const balance = totalFees - totalPaid;

      // 2. Gather discipline records
      const { data: discipline } = await supabase.from("discipline_records")
        .select("incident, action_taken, date_reported").eq("student_id", selectedStudent.id).eq("school_id", schoolId);

      // 3. Gather exam summary
      const { data: examMarks } = await supabase.from("exam_marks")
        .select("score, out_of, exam:exams(name, term), subject_paper:subject_papers(paper_name)")
        .eq("student_id", selectedStudent.id).eq("school_id", schoolId);

      // 4. Find class teacher
      const stream = streams.find(s => s.id === selectedStudent.stream_id);
      const classTeacherId = stream?.class_teacher_id || null;

      // 5. Insert transfer record
      const { data: inserted, error } = await supabase.from("student_transfers").insert({
        school_id: schoolId,
        student_id: selectedStudent.id,
        initiated_by: profile.id,
        class_teacher_id: classTeacherId,
        status: "initiated",
        reason: sanitizeInput(reason, 500),
        destination_school: destSchool ? sanitizeInput(destSchool, 200) : null,
        fee_balance: balance,
        admin_comments: adminComments ? sanitizeInput(adminComments, 1000) : null,
        discipline_summary: discipline || [],
        exam_summary: examMarks || [],
      } as any).select("id").single();

      if (error) throw error;

      // 6. Log history
      await supabase.from("transfer_history_log").insert({
        transfer_id: inserted.id,
        action: "Transfer Initiated",
        performed_by: profile.id,
        comments: `Reason: ${reason}. Destination: ${destSchool || "Not specified"}. Fee balance: KES ${balance.toLocaleString()}`,
      } as any);

      toast.success("Transfer initiated successfully");
      setShowInitiate(false);
      setSelectedStudent(null);
      setReason("");
      setDestSchool("");
      setAdminComments("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate transfer");
    } finally {
      setInitiating(false);
    }
  };

  const handleComplete = async (transfer: TransferRow) => {
    if (transfer.status !== "teacher_reviewed") {
      toast.error("Class teacher must review the transfer first");
      return;
    }
    const { error } = await supabase.from("student_transfers")
      .update({ status: "completed", completed_at: new Date().toISOString() } as any)
      .eq("id", transfer.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").update({ is_active: false }).eq("id", transfer.student_id);
    await supabase.from("transfer_history_log").insert({
      transfer_id: transfer.id, action: "Transfer Completed",
      performed_by: profile?.id, comments: "Student deactivated. Transfer finalized by admin.",
    } as any);
    toast.success("Transfer completed. Student deactivated.");
    loadData();
    setDetailTransfer(null);
  };

  const handleReadmit = async (transfer: TransferRow) => {
    const { error } = await supabase.from("student_transfers")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as any)
      .eq("id", transfer.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("profiles").update({ is_active: true }).eq("id", transfer.student_id);
    await supabase.from("transfer_history_log").insert({
      transfer_id: transfer.id, action: "Student Readmitted",
      performed_by: profile?.id, comments: "Transfer reversed. Student reactivated.",
    } as any);
    toast.success("Student readmitted successfully");
    loadData();
    setDetailTransfer(null);
  };

  const loadHistory = async (transferId: string) => {
    const { data } = await supabase.from("transfer_history_log")
      .select("*").eq("transfer_id", transferId).order("created_at", { ascending: true });
    setHistoryLog(data || []);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><EGradeLoader message="Loading transfers..." /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-primary" /> Student Transfers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage student transfers with class teacher approval</p>
        </div>
        <Button onClick={() => setShowInitiate(true)}>
          <ArrowRightLeft className="w-4 h-4 mr-1" /> Initiate Transfer
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Initiated", count: transfers.filter(t => t.status === "initiated").length, icon: Clock, color: "text-amber-600" },
          { label: "Teacher Approved", count: transfers.filter(t => t.status === "teacher_reviewed").length, icon: CheckCircle2, color: "text-blue-600" },
          { label: "Completed", count: transfers.filter(t => t.status === "completed").length, icon: CheckCircle2, color: "text-green-600" },
          { label: "Readmitted", count: transfers.filter(t => t.status === "cancelled").length, icon: RotateCcw, color: "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-xl font-black text-foreground">{s.count}</p>
                <p className="text-[10px] text-muted-foreground font-semibold">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transfers</SelectItem>
            <SelectItem value="initiated">Initiated</SelectItem>
            <SelectItem value="teacher_reviewed">Teacher Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Readmitted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transfers Table */}
      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              {["Student", "Adm No", "Destination", "Fee Balance", "Status", "Date", "Actions"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransfers.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No transfers found.</td></tr>
            ) : filteredTransfers.map(t => {
              const student = students.find(s => s.id === t.student_id);
              const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.initiated;
              const StatusIcon = cfg.icon;
              return (
                <tr key={t.id} className="hover:bg-muted/30">
                  <td className="py-2.5 px-3 font-semibold text-foreground">
                    {studentNames[t.student_id] || "Unknown"}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{student?.adm_no || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{t.destination_school || "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className={Number(t.fee_balance) > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                      KES {Number(t.fee_balance).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className={cfg.color}>
                      <StatusIcon className="w-3 h-3 mr-1" /> {cfg.label}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">
                    {new Date(t.initiated_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setDetailTransfer(t)}>
                        <FileText className="w-3 h-3 mr-1" /> View
                      </Button>
                      {t.status === "teacher_reviewed" && (
                        <Button size="sm" onClick={() => handleComplete(t)}>
                          Complete
                        </Button>
                      )}
                      {t.status === "completed" && (
                        <Button size="sm" variant="secondary" onClick={() => handleReadmit(t)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Readmit
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Initiate Transfer Dialog */}
      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Initiate Student Transfer</DialogTitle>
          </DialogHeader>

          {!selectedStudent ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search student by name or adm no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {eligibleStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No eligible students found.</p>
                ) : eligibleStudents.slice(0, 20).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 text-left transition-colors"
                  >
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.adm_no || "No adm"} · {getClassName(s.class_id)} {getStreamName(s.stream_id)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="font-bold text-foreground">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedStudent.adm_no || "—"} · {getClassName(selectedStudent.class_id)} {getStreamName(selectedStudent.stream_id)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Reason for Transfer *</label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Parent relocation, personal reasons..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Destination School</label>
                <Input value={destSchool} onChange={e => setDestSchool(e.target.value)} placeholder="Name of receiving school" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Admin Comments</label>
                <Textarea value={adminComments} onChange={e => setAdminComments(e.target.value)} placeholder="Additional notes..." />
              </div>
              <p className="text-xs text-muted-foreground">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Fee balance, discipline records, and exam results will be compiled automatically.
              </p>
            </div>
          )}

          <DialogFooter>
            {selectedStudent && (
              <>
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>Back</Button>
                <Button onClick={handleInitiate} disabled={initiating || !reason.trim()}>
                  {initiating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Initiate Transfer
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Detail Dialog */}
      <Dialog open={!!detailTransfer} onOpenChange={() => setDetailTransfer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
          </DialogHeader>
          {detailTransfer && (
            <Tabs defaultValue="overview" className="space-y-4" onValueChange={(v) => { if (v === "history") loadHistory(detailTransfer.id); }}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
                <TabsTrigger value="discipline" className="text-xs">Discipline</TabsTrigger>
                <TabsTrigger value="academics" className="text-xs">Academics</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Student</p>
                    <p className="font-bold text-foreground">{studentNames[detailTransfer.student_id] || "Unknown"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Status</p>
                    <Badge variant="outline" className={STATUS_CONFIG[detailTransfer.status]?.color || ""}>
                      {STATUS_CONFIG[detailTransfer.status]?.label || detailTransfer.status}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Destination</p>
                    <p className="font-semibold text-foreground">{detailTransfer.destination_school || "Not specified"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Class Teacher</p>
                    <p className="font-semibold text-foreground">{teacherNames[detailTransfer.class_teacher_id || ""] || "Not assigned"}</p>
                  </div>
                </div>
                {detailTransfer.reason && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Reason</p>
                    <p className="text-sm text-foreground">{detailTransfer.reason}</p>
                  </div>
                )}
                {detailTransfer.admin_comments && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Admin Comments</p>
                    <p className="text-sm text-foreground">{detailTransfer.admin_comments}</p>
                  </div>
                )}
                {detailTransfer.teacher_comments && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Teacher Comments</p>
                    <p className="text-sm text-foreground">{detailTransfer.teacher_comments}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  {detailTransfer.status === "teacher_reviewed" && (
                    <Button onClick={() => handleComplete(detailTransfer)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Complete Transfer
                    </Button>
                  )}
                  {detailTransfer.status === "completed" && (
                    <>
                      <Button variant="secondary" onClick={() => handleReadmit(detailTransfer)}>
                        <RotateCcw className="w-4 h-4 mr-1" /> Readmit Student
                      </Button>
                      {Number(detailTransfer.fee_balance) > 0 ? (
                        <div className="flex items-center gap-2 text-xs text-destructive font-semibold">
                          <AlertTriangle className="w-4 h-4" />
                          Certificate blocked — KES {Number(detailTransfer.fee_balance).toLocaleString()} fee balance outstanding
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => {
                          const student = students.find(s => s.id === detailTransfer.student_id);
                          generateTransferCertificate({
                            studentName: studentNames[detailTransfer.student_id] || "Unknown",
                            admNo: student?.adm_no || "—",
                            className: getClassName(student?.class_id || null),
                            streamName: getStreamName(student?.stream_id || null),
                            destinationSchool: detailTransfer.destination_school || "Not specified",
                            reason: detailTransfer.reason || "—",
                            feeBalance: Number(detailTransfer.fee_balance),
                            completedAt: detailTransfer.completed_at || detailTransfer.initiated_at,
                            adminComments: detailTransfer.admin_comments,
                            teacherComments: detailTransfer.teacher_comments,
                            school: schoolData,
                          });
                        }}>
                          <Award className="w-4 h-4 mr-1" /> Print Certificate
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="finance">
                <div className="p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Fee Balance at Transfer</h3>
                  </div>
                  <p className={`text-3xl font-black ${Number(detailTransfer.fee_balance) > 0 ? "text-destructive" : "text-primary"}`}>
                    KES {Number(detailTransfer.fee_balance).toLocaleString()}
                  </p>
                  {Number(detailTransfer.fee_balance) > 0 && (
                    <p className="text-xs text-destructive mt-1">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Outstanding fee arrears at time of transfer
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="discipline">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Discipline Records</h3>
                  </div>
                  {(Array.isArray(detailTransfer.discipline_summary) ? detailTransfer.discipline_summary : []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No discipline records.</p>
                  ) : (detailTransfer.discipline_summary as any[]).map((d: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border border-border">
                      <p className="font-semibold text-foreground text-sm">{d.incident}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Action: {d.action_taken || "None"}</span>
                        <span>{d.date_reported ? new Date(d.date_reported).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="academics">
                <div className="space-y-4">
                  <h3 className="font-bold text-foreground mb-3">Exam Results Snapshot</h3>
                  {(() => {
                    const rawExams = Array.isArray(detailTransfer.exam_summary) ? detailTransfer.exam_summary : [];
                    if (rawExams.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No exam records.</p>;
                    const grouped = groupExamMarks(rawExams);
                    return grouped.map((g, gi) => (
                      <div key={gi} className="rounded-xl border border-border overflow-hidden">
                        <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
                          <p className="font-bold text-foreground text-sm">{g.examName}</p>
                          <span className="text-xs text-muted-foreground">{g.term}</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Paper</th>
                              <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {g.papers.map((p, pi) => (
                              <tr key={pi} className="hover:bg-muted/30">
                                <td className="py-2 px-3 text-foreground">{p.paperName}</td>
                                <td className="py-2 px-3 font-bold">{p.score ?? "—"}/{p.outOf}</td>
                              </tr>
                            ))}
                            <tr className="bg-muted/20 font-bold">
                              <td className="py-2 px-3 text-foreground">Total</td>
                              <td className="py-2 px-3">{g.totalScore}/{g.totalOutOf}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ));
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Transfer History Log</h3>
                  </div>
                  {historyLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No history entries yet.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                      {historyLog.map((log: any, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                          <div className="p-3 rounded-xl border border-border">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground text-sm">{log.action}</p>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            {log.comments && <p className="text-xs text-muted-foreground mt-1">{log.comments}</p>}
                            {log.performed_by && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                By: {studentNames[log.performed_by] || teacherNames[log.performed_by] || log.performed_by}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
