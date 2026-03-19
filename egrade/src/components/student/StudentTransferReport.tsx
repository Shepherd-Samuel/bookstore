import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2, ArrowRightLeft, AlertTriangle,
  CheckCircle2, Clock, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TransferRow = {
  id: string; status: string; reason: string | null;
  destination_school: string | null; fee_balance: number;
  admin_comments: string | null; teacher_comments: string | null;
  initiated_at: string; completed_at: string | null;
};

export default function StudentTransferReport() {
  const { profile } = useAuth();
  const [transfer, setTransfer] = useState<TransferRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id || !profile?.school_id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("student_transfers")
        .select("*")
        .eq("student_id", profile.id)
        .in("status", ["completed", "teacher_reviewed", "initiated"])
        .order("initiated_at", { ascending: false })
        .limit(1);
      if (data?.[0]) setTransfer(data[0] as TransferRow);
      setLoading(false);
    };
    load();
  }, [profile?.id, profile?.school_id]);

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (!transfer) return null;

  const isCompleted = transfer.status === "completed";

  return (
    <div className="stat-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-foreground">Transfer Status</h3>
            <p className="text-xs text-muted-foreground">
              {transfer.destination_school ? `To: ${transfer.destination_school}` : "Transfer in progress"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={
          isCompleted ? "bg-green-500/10 text-green-700 border-green-200" :
          transfer.status === "teacher_reviewed" ? "bg-blue-500/10 text-blue-700 border-blue-200" :
          "bg-amber-500/10 text-amber-700 border-amber-200"
        }>
          {isCompleted ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</> :
           transfer.status === "teacher_reviewed" ? <><Clock className="w-3 h-3 mr-1" /> Awaiting Admin</> :
           <><Clock className="w-3 h-3 mr-1" /> In Progress</>}
        </Badge>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-4 h-4" /> Admin Initiated
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-1 ${transfer.status !== "initiated" ? "text-green-600" : "text-muted-foreground"}`}>
          {transfer.status !== "initiated" ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />} Teacher Review
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-1 ${isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />} Complete
        </div>
      </div>

      {Number(transfer.fee_balance) > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-xs text-red-600 font-semibold">Fee arrears: KES {Number(transfer.fee_balance).toLocaleString()}. Please clear your balance to receive the transfer certificate.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        <FileText className="w-3 h-3 inline mr-1" />
        Transfer certificates are issued by the school administration upon completion and fee clearance.
      </p>
    </div>
  );
}
