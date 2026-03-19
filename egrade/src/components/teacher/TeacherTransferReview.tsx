import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Loader2, ArrowRightLeft, CheckCircle2, Clock, FileText, Shield,
  DollarSign, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { groupExamMarks } from "@/lib/transferUtils";

type TransferRow = {
  id: string; student_id: string; status: string; reason: string | null;
  destination_school: string | null; fee_balance: number; admin_comments: string | null;
  teacher_comments: string | null; discipline_summary: any; exam_summary: any;
  initiated_at: string; class_teacher_id: string | null;
};

export default function TeacherTransferReview() {
  const { profile } = useAuth();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRow | null>(null);
  const [teacherComments, setTeacherComments] = useState("");
  const [approving, setApproving] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id || !profile?.school_id) return;
    setLoading(true);

    // Get transfers where this teacher is the class teacher
    const { data: transferData } = await supabase.from("student_transfers")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("class_teacher_id", profile.id)
      .in("status", ["initiated", "teacher_reviewed"])
      .order("initiated_at", { ascending: false });

    const list = (transferData || []) as TransferRow[];
    setTransfers(list);

    if (list.length > 0) {
      const studentIds = [...new Set(list.map(t => t.student_id))];
      const { data: profiles } = await supabase.from("profiles")
        .select("id, first_name, last_name, adm_no")
        .in("id", studentIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = `${p.first_name} ${p.last_name} (${p.adm_no || "—"})`; });
      setStudentNames(nameMap);
    }
    setLoading(false);
  }, [profile?.id, profile?.school_id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async () => {
    if (!selectedTransfer) return;
    setApproving(true);
    try {
      const { error } = await supabase.from("student_transfers")
        .update({
          status: "teacher_reviewed",
          teacher_comments: teacherComments || null,
          teacher_reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedTransfer.id);
      if (error) throw error;
      // Log history
      await supabase.from("transfer_history_log").insert({
        transfer_id: selectedTransfer.id, action: "Teacher Approved",
        performed_by: profile?.id, comments: teacherComments || "Class teacher approved the transfer.",
      } as any);
      toast.success("Transfer approved. Awaiting admin completion.");
      setSelectedTransfer(null);
      setTeacherComments("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve transfer");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (transfers.length === 0) {
    return (
      <div className="stat-card text-center py-8">
        <ArrowRightLeft className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No pending transfer reviews.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-primary" /> Pending Transfer Reviews
      </h3>

      {transfers.map(t => (
        <div key={t.id} className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">{studentNames[t.student_id] || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">
                {t.reason || "No reason"} · {t.destination_school || "No destination"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={t.status === "initiated" ? "bg-amber-500/10 text-amber-700" : "bg-blue-500/10 text-blue-700"}>
                {t.status === "initiated" ? <><Clock className="w-3 h-3 mr-1" /> Pending Review</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</>}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(t); setTeacherComments(t.teacher_comments || ""); }}>
                <FileText className="w-3 h-3 mr-1" /> Review
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Review Dialog */}
      <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Transfer — {studentNames[selectedTransfer?.student_id || ""] || "Student"}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="discipline" className="text-xs">Discipline</TabsTrigger>
                <TabsTrigger value="academics" className="text-xs">Academics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Reason</p>
                    <p className="text-sm font-semibold text-foreground">{selectedTransfer.reason || "—"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Fee Balance</p>
                    <p className={`font-bold ${Number(selectedTransfer.fee_balance) > 0 ? "text-red-600" : "text-green-600"}`}>
                      KES {Number(selectedTransfer.fee_balance).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border col-span-2">
                    <p className="text-xs text-muted-foreground font-semibold">Destination</p>
                    <p className="text-sm text-foreground">{selectedTransfer.destination_school || "Not specified"}</p>
                  </div>
                </div>
                {selectedTransfer.admin_comments && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-xs text-muted-foreground font-semibold">Admin Comments</p>
                    <p className="text-sm text-foreground">{selectedTransfer.admin_comments}</p>
                  </div>
                )}
                {Number(selectedTransfer.fee_balance) > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                      Student has an outstanding fee balance of KES {Number(selectedTransfer.fee_balance).toLocaleString()}. You may still approve the transfer, but the certificate will not be issued until fees are cleared.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Your Comments (optional)</label>
                  <Textarea
                    value={teacherComments}
                    onChange={e => setTeacherComments(e.target.value)}
                    placeholder="Add any notes about the student's conduct, character, or recommendations..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="discipline">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Discipline Records</h3>
                  </div>
                  {(Array.isArray(selectedTransfer.discipline_summary) ? selectedTransfer.discipline_summary : []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No discipline records.</p>
                  ) : (selectedTransfer.discipline_summary as any[]).map((d: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border border-border">
                      <p className="font-semibold text-foreground text-sm">{d.incident}</p>
                      <p className="text-xs text-muted-foreground mt-1">Action: {d.action_taken || "None"}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="academics">
                <div className="space-y-4">
                  <h3 className="font-bold text-foreground mb-3">Exam Results</h3>
                  {(() => {
                    const rawExams = Array.isArray(selectedTransfer.exam_summary) ? selectedTransfer.exam_summary : [];
                    if (rawExams.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No exam records.</p>;
                    const grouped = groupExamMarks(rawExams);
                    return grouped.map((g, gi) => (
                      <div key={gi} className="rounded-xl border border-border overflow-hidden">
                        <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center justify-between">
                          <p className="font-bold text-foreground text-sm">{g.examName}</p>
                          <span className="text-xs text-muted-foreground">{g.term}</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border">
                            <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Paper</th>
                            <th className="text-left text-xs font-semibold text-muted-foreground py-2 px-3">Score</th>
                          </tr></thead>
                          <tbody className="divide-y divide-border">
                            {g.papers.map((p, pi) => (
                              <tr key={pi}><td className="py-2 px-3">{p.paperName}</td><td className="py-2 px-3 font-bold">{p.score ?? "—"}/{p.outOf}</td></tr>
                            ))}
                            <tr className="bg-muted/20 font-bold"><td className="py-2 px-3">Total</td><td className="py-2 px-3">{g.totalScore}/{g.totalOutOf}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    ));
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            {selectedTransfer?.status === "initiated" && (
              <Button onClick={handleApprove} disabled={approving}>
                {approving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve Transfer
              </Button>
            )}
            {selectedTransfer?.status === "teacher_reviewed" && (
              <p className="text-xs text-muted-foreground">Already approved. Awaiting admin completion.</p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
