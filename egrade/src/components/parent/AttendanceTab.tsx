import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import type { AttendanceSummary } from "@/hooks/useParentData";

const STATUS_STYLES: Record<string, string> = {
  present: "bg-green-100 text-green-700 border-green-200",
  absent: "bg-red-100 text-red-700 border-red-200",
  late: "bg-amber-100 text-amber-700 border-amber-200",
};

interface Props {
  attendance: any[];
  summary: AttendanceSummary;
}

function AttendanceTab({ attendance, summary }: Props) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-3xl font-black text-primary">{summary.pct}%</p>
          <p className="text-[11px] font-bold text-muted-foreground mt-1">Attendance Rate</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-3xl font-black text-green-600">{summary.present}</p>
          <p className="text-[11px] font-bold text-muted-foreground mt-1">Present</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-3xl font-black text-destructive">{summary.absent}</p>
          <p className="text-[11px] font-bold text-muted-foreground mt-1">Absent</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm">
          <p className="text-3xl font-black text-amber-600">{summary.late}</p>
          <p className="text-[11px] font-bold text-muted-foreground mt-1">Late</p>
        </div>
      </div>

      {attendance.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center space-y-3">
          <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">No attendance records available.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Date", "Status", "Notes"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-foreground">
                      {new Date(a.date).toLocaleDateString("en-KE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-black capitalize ${STATUS_STYLES[a.status] || ""}`}
                      >
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{a.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(AttendanceTab);
