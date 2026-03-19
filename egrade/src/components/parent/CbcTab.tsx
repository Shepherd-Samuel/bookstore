import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

const RATING_STYLES: Record<string, string> = {
  EE: "bg-green-100 text-green-700 border-green-200",
  ME: "bg-blue-100 text-blue-700 border-blue-200",
  AE: "bg-amber-100 text-amber-700 border-amber-200",
  BE: "bg-red-100 text-red-700 border-red-200",
};

const RATING_LABELS: Record<string, string> = {
  EE: "Exceeding",
  ME: "Meeting",
  AE: "Approaching",
  BE: "Below",
};

interface Props {
  strandAssessments: any[];
  subjects: any[];
  ratingCounts: Record<string, number>;
}

function CbcTab({ strandAssessments, subjects, ratingCounts }: Props) {
  return (
    <div className="space-y-4">
      {/* Rating summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["EE", "ME", "AE", "BE"] as const).map((level) => (
          <div
            key={level}
            className="bg-card rounded-2xl border border-border p-4 text-center shadow-sm"
          >
            <p
              className={`text-3xl font-black ${
                level === "EE"
                  ? "text-green-600"
                  : level === "ME"
                  ? "text-blue-600"
                  : level === "AE"
                  ? "text-amber-600"
                  : "text-destructive"
              }`}
            >
              {ratingCounts[level]}
            </p>
            <p className="text-[11px] font-bold text-muted-foreground mt-1">
              {RATING_LABELS[level]}
            </p>
          </div>
        ))}
      </div>

      {strandAssessments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center space-y-3">
          <ClipboardList className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">
            No CBC assessments available yet.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Subject", "Strand", "Sub-Strand", "Rating", "Term", "Comments"].map((h) => (
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
                {strandAssessments.slice(0, 50).map((sa: any) => {
                  const sub = subjects.find((s: any) => s.id === sa.subject_id);
                  return (
                    <tr key={sa.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-foreground">
                        {sub?.name || "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground">{sa.strand}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{sa.sub_strand}</td>
                      <td className="px-5 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-black ${RATING_STYLES[sa.rating] || ""}`}
                        >
                          {sa.rating}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {sa.term} {sa.academic_year}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {sa.comments || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CbcTab);
