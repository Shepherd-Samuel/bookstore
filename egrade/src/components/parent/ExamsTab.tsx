import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, FileText } from "lucide-react";
import type { ExamResult } from "@/hooks/useParentData";

interface Props {
  examResults: ExamResult[];
}

function ExamsTab({ examResults }: Props) {
  if (examResults.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-16 text-center space-y-3">
        <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">No exam results available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance chart */}
      {examResults.length > 1 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Performance Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={examResults.map((e) => ({ name: e.name, "%": e.percentage }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="%" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Exam cards */}
      {examResults.map((er) => (
        <div key={er.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-foreground text-base">{er.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {er.term} · {er.academic_year}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-black text-foreground leading-none">{er.percentage}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {er.total}/{er.outOf}
                </p>
              </div>
              <Badge className="text-sm font-black px-3 py-1">{er.grade}</Badge>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {er.points} pts
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Subject", "Score", "Out Of", "%", "Grade"].map((h) => (
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
                {er.subjects.map((sub, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-foreground">{sub.name}</td>
                    <td className="px-5 py-3 text-sm font-bold text-foreground tabular-nums">
                      {sub.score ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">{sub.outOf}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          sub.percentage >= 60
                            ? "text-green-600"
                            : sub.percentage >= 40
                            ? "text-amber-600"
                            : "text-destructive"
                        }`}
                      >
                        {sub.percentage}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-[11px] font-black">
                        {sub.grade}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ExamsTab);
