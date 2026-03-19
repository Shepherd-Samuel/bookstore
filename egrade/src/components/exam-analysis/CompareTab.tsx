import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart3, FileSpreadsheet, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type Exam = { id: string; name: string; term: string | null; academic_year: string | null };
type Subject = { id: string; name: string };
type SubjectPaper = { id: string; paper_name: string; subject_id: string; class_id: string | null; default_out_of: number };
type ExamMark = {
  id: string; exam_id: string; student_id: string; subject_paper_id: string;
  score: number | null; out_of: number;
};
type Profile = { id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null; class_id: string | null };
type Stream = { id: string; name: string; class_id: string };

function getGrade(pct: number): string {
  if (pct >= 80) return "A";
  if (pct >= 60) return "B";
  if (pct >= 40) return "C";
  if (pct >= 20) return "D";
  return "E";
}

function downloadCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => {
      const val = String(r[h] ?? "");
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface CompareTabProps {
  schoolId: string;
  exams: Exam[];
  classes: { id: string; name: string }[];
  streams: Stream[];
  subjects: Subject[];
  papers: SubjectPaper[];
  students: Profile[];
}

export default function CompareTab({ schoolId, exams, classes, streams, subjects, papers, students }: CompareTabProps) {
  const [examA, setExamA] = useState("");
  const [examB, setExamB] = useState("");
  const [classId, setClassId] = useState("");
  const [marksA, setMarksA] = useState<ExamMark[]>([]);
  const [marksB, setMarksB] = useState<ExamMark[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!examA || !examB || !classId || !schoolId) { setMarksA([]); setMarksB([]); return; }
    const classStudentIds = students.filter(s => s.class_id === classId).map(s => s.id);
    if (!classStudentIds.length) { setMarksA([]); setMarksB([]); return; }

    (async () => {
      setLoading(true);
      const fetchMarks = async (examId: string) => {
        const all: ExamMark[] = [];
        for (let i = 0; i < classStudentIds.length; i += 50) {
          const batch = classStudentIds.slice(i, i + 50);
          const { data } = await supabase.from("exam_marks")
            .select("id, exam_id, student_id, subject_paper_id, score, out_of")
            .eq("school_id", schoolId).eq("exam_id", examId)
            .in("student_id", batch);
          if (data) all.push(...(data as ExamMark[]));
        }
        return all;
      };
      const [a, b] = await Promise.all([fetchMarks(examA), fetchMarks(examB)]);
      setMarksA(a);
      setMarksB(b);
      setLoading(false);
    })();
  }, [examA, examB, classId, schoolId, students]);

  const examAData = exams.find(e => e.id === examA);
  const examBData = exams.find(e => e.id === examB);

  const calcStats = (marks: ExamMark[]) => {
    const scored = marks.filter(m => m.score !== null);
    if (!scored.length) return { mean: 0, passRate: 0, count: 0, studentCount: 0 };
    const pcts = scored.map(m => ((m.score || 0) / m.out_of) * 100);
    return {
      mean: Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10,
      passRate: Math.round((pcts.filter(p => p >= 40).length / pcts.length) * 1000) / 10,
      count: scored.length,
      studentCount: new Set(scored.map(m => m.student_id)).size,
    };
  };

  const statsA = useMemo(() => calcStats(marksA), [marksA]);
  const statsB = useMemo(() => calcStats(marksB), [marksB]);

  // Subject comparison
  const subjectComparison = useMemo(() => {
    const getSubjectAvgs = (marks: ExamMark[]) => {
      const bySubject: Record<string, number[]> = {};
      marks.filter(m => m.score !== null).forEach(m => {
        const paper = papers.find(p => p.id === m.subject_paper_id);
        if (!paper) return;
        const subId = paper.subject_id;
        if (!bySubject[subId]) bySubject[subId] = [];
        bySubject[subId].push(((m.score || 0) / m.out_of) * 100);
      });
      return Object.fromEntries(Object.entries(bySubject).map(([k, v]) => [k, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10]));
    };
    const avgsA = getSubjectAvgs(marksA);
    const avgsB = getSubjectAvgs(marksB);
    const allSubIds = new Set([...Object.keys(avgsA), ...Object.keys(avgsB)]);
    return [...allSubIds].map(subId => {
      const name = subjects.find(s => s.id === subId)?.name || "Unknown";
      return {
        subject: name,
        [examAData?.name || "Exam A"]: avgsA[subId] || 0,
        [examBData?.name || "Exam B"]: avgsB[subId] || 0,
        diff: Math.round(((avgsB[subId] || 0) - (avgsA[subId] || 0)) * 10) / 10,
      };
    }).sort((a, b) => b.diff - a.diff);
  }, [marksA, marksB, papers, subjects, examAData, examBData]);

  // Stream comparison
  const streamComparison = useMemo(() => {
    const getStreamAvgs = (marks: ExamMark[]) => {
      const byStream: Record<string, number[]> = {};
      marks.filter(m => m.score !== null).forEach(m => {
        const st = students.find(s => s.id === m.student_id);
        if (!st?.stream_id) return;
        if (!byStream[st.stream_id]) byStream[st.stream_id] = [];
        byStream[st.stream_id].push(((m.score || 0) / m.out_of) * 100);
      });
      return Object.fromEntries(Object.entries(byStream).map(([k, v]) => [k, Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10]));
    };
    const avgsA = getStreamAvgs(marksA);
    const avgsB = getStreamAvgs(marksB);
    const allStreamIds = new Set([...Object.keys(avgsA), ...Object.keys(avgsB)]);
    return [...allStreamIds].map(streamId => {
      const name = streams.find(s => s.id === streamId)?.name || "Unknown";
      return {
        stream: name,
        [examAData?.name || "Exam A"]: avgsA[streamId] || 0,
        [examBData?.name || "Exam B"]: avgsB[streamId] || 0,
        diff: Math.round(((avgsB[streamId] || 0) - (avgsA[streamId] || 0)) * 10) / 10,
      };
    }).sort((a, b) => b.diff - a.diff);
  }, [marksA, marksB, students, streams, examAData, examBData]);

  // Student movement
  const studentMovement = useMemo(() => {
    const getRank = (marks: ExamMark[]) => {
      const byStudent: Record<string, { total: number; outOf: number }> = {};
      marks.filter(m => m.score !== null).forEach(m => {
        if (!byStudent[m.student_id]) byStudent[m.student_id] = { total: 0, outOf: 0 };
        byStudent[m.student_id].total += (m.score || 0);
        byStudent[m.student_id].outOf += m.out_of;
      });
      return Object.entries(byStudent)
        .map(([id, d]) => ({ id, pct: d.outOf ? (d.total / d.outOf) * 100 : 0 }))
        .sort((a, b) => b.pct - a.pct)
        .map((s, i) => ({ ...s, rank: i + 1 }));
    };
    const rankA = getRank(marksA);
    const rankB = getRank(marksB);
    const rankMapA = Object.fromEntries(rankA.map(r => [r.id, r]));
    const rankMapB = Object.fromEntries(rankB.map(r => [r.id, r]));
    const allIds = new Set([...rankA.map(r => r.id), ...rankB.map(r => r.id)]);

    return [...allIds].map(id => {
      const student = students.find(s => s.id === id);
      const a = rankMapA[id];
      const b = rankMapB[id];
      return {
        name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
        admNo: student?.adm_no || "—",
        pctA: a ? Math.round(a.pct * 10) / 10 : null,
        pctB: b ? Math.round(b.pct * 10) / 10 : null,
        rankA: a?.rank ?? null,
        rankB: b?.rank ?? null,
        rankChange: (a && b) ? a.rank - b.rank : null,
        pctChange: (a && b) ? Math.round((b.pct - a.pct) * 10) / 10 : null,
      };
    }).filter(s => s.pctA !== null || s.pctB !== null)
      .sort((a, b) => (b.pctChange ?? 0) - (a.pctChange ?? 0));
  }, [marksA, marksB, students]);

  const nameA = examAData?.name || "Exam A";
  const nameB = examBData?.name || "Exam B";

  const handleExport = () => {
    downloadCSV(studentMovement.map(s => ({
      Student: s.name, "Adm No": s.admNo,
      [`${nameA} %`]: s.pctA ?? "—", [`${nameA} Rank`]: s.rankA ?? "—",
      [`${nameB} %`]: s.pctB ?? "—", [`${nameB} Rank`]: s.rankB ?? "—",
      "% Change": s.pctChange ?? "—", "Rank Change": s.rankChange ?? "—",
    })), `compare_${nameA}_vs_${nameB}`);
  };

  const ready = examA && examB && classId && !loading && marksA.length + marksB.length > 0;

  return (
    <div className="space-y-4">
      {/* Selection */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ArrowLeftRight className="w-4 h-4" /> Compare Two Exams
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Exam A</label>
            <Select value={examA} onValueChange={setExamA}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select first exam" /></SelectTrigger>
              <SelectContent>
                {exams.filter(e => e.id !== examB).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.term} {e.academic_year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Exam B</label>
            <Select value={examB} onValueChange={setExamB}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select second exam" /></SelectTrigger>
              <SelectContent>
                {exams.filter(e => e.id !== examA).map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.term} {e.academic_year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Class</label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && (!examA || !examB || !classId) && (
        <div className="bg-card rounded-xl border border-border p-12 text-center space-y-3">
          <ArrowLeftRight className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-bold text-foreground">Select two exams and a class to compare</p>
        </div>
      )}

      {ready && (
        <>
          {/* Summary comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
              <Badge variant="outline" className="text-xs font-bold">{nameA}</Badge>
              <p className="text-2xl font-black text-foreground">{statsA.mean}%</p>
              <p className="text-xs text-muted-foreground">{statsA.studentCount} students · Pass rate: {statsA.passRate}%</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
              <Badge variant="outline" className="text-xs font-bold">{nameB}</Badge>
              <p className="text-2xl font-black text-foreground">{statsB.mean}%</p>
              <p className="text-xs text-muted-foreground">{statsB.studentCount} students · Pass rate: {statsB.passRate}%</p>
            </div>
          </div>

          {/* Diff badge */}
          <div className="flex items-center justify-center">
            <Badge variant={statsB.mean >= statsA.mean ? "default" : "destructive"} className="text-sm font-bold">
              {statsB.mean >= statsA.mean ? "↑" : "↓"} {Math.abs(Math.round((statsB.mean - statsA.mean) * 10) / 10)}% overall change
            </Badge>
          </div>

          {/* Subject comparison chart */}
          {subjectComparison.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-foreground mb-4">Subject Comparison (Average %)</h3>
              <ResponsiveContainer width="100%" height={Math.max(250, subjectComparison.length * 45)}>
                <BarChart data={subjectComparison} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="subject" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey={nameA} fill="hsl(200, 80%, 50%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={nameB} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject diff table */}
          {subjectComparison.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[450px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Subject", nameA, nameB, "Change"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjectComparison.map(s => (
                    <tr key={s.subject} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold text-foreground text-xs">{s.subject}</td>
                      <td className="px-4 py-2.5 text-xs">{(s as any)[nameA]}%</td>
                      <td className="px-4 py-2.5 text-xs">{(s as any)[nameB]}%</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold ${s.diff >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {s.diff >= 0 ? "↑" : "↓"}{Math.abs(s.diff)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stream comparison */}
          {streamComparison.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-bold text-foreground mb-4">Stream Comparison</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, streamComparison.length * 50)}>
                <BarChart data={streamComparison} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stream" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey={nameA} fill="hsl(200, 80%, 50%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={nameB} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Student movement table */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Student Progress</h3>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleExport}>
              <FileSpreadsheet className="w-3 h-3" /> Export CSV
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-border">
                  {["Student", "Adm No", `${nameA} %`, `${nameA} Rank`, `${nameB} %`, `${nameB} Rank`, "% Change", "Rank Δ"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentMovement.slice(0, 50).map(s => (
                  <tr key={s.name + s.admNo} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-semibold text-foreground text-xs">{s.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.admNo}</td>
                    <td className="px-3 py-2 text-xs">{s.pctA ?? "—"}%</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.rankA ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{s.pctB ?? "—"}%</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.rankB ?? "—"}</td>
                    <td className="px-3 py-2">
                      {s.pctChange !== null ? (
                        <span className={`text-xs font-bold ${s.pctChange >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {s.pctChange >= 0 ? "↑" : "↓"}{Math.abs(s.pctChange)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {s.rankChange !== null ? (
                        <span className={`text-xs font-bold ${s.rankChange >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {s.rankChange > 0 ? `↑${s.rankChange}` : s.rankChange < 0 ? `↓${Math.abs(s.rankChange)}` : "—"}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {studentMovement.length > 50 && (
              <div className="px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Showing top 50 of {studentMovement.length} students</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
