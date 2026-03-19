import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, FileCheck } from "lucide-react";
import { buildFullReport, openPrintWindow, openSavePDF } from "@/lib/reportCardPrint";
import type { ChildProfile, ExamResult, AttendanceSummary } from "@/hooks/useParentData";
import type { GradeEntry } from "@/hooks/useGradingScale";

interface Props {
  child: ChildProfile | null;
  children: ChildProfile[];
  examResults: ExamResult[];
  attendanceSummary: AttendanceSummary;
  strandAssessments: any[];
  // Print context
  school: any;
  streams: any[];
  classes: any[];
  teachers: Record<string, string>;
  subjects: any[];
  papers: any[];
  examMarks: any[];
  exams: any[];
  competencies: any[];
  gradingEntries: GradeEntry[];
  getLevel: any;
  getGrade: any;
}

function ReportTab({
  child,
  children,
  examResults,
  attendanceSummary,
  strandAssessments,
  school,
  streams,
  classes,
  teachers,
  subjects,
  papers,
  examMarks,
  exams,
  competencies,
  gradingEntries,
  getLevel,
  getGrade,
}: Props) {
  const [selectedExam, setSelectedExam] = useState("all");

  const ctx = {
    school, streams, classes, teachers, subjects, papers,
    examMarks, exams, strandAssessments, competencies,
    gradingEntries, getLevel, getGrade,
  };

  const handlePrint = useCallback(() => {
    if (!child) return;
    openPrintWindow(buildFullReport(ctx, child, selectedExam));
  }, [child, selectedExam, ctx]);

  const handleSavePDF = useCallback(() => {
    if (!child) return;
    const name = `${child.first_name}_${child.last_name}_Report`;
    openSavePDF(buildFullReport(ctx, child, selectedExam), name);
  }, [child, selectedExam, ctx]);

  const handlePrintAll = useCallback(() => {
    if (children.length === 0) return;
    const pages = children
      .map(
        (c, i) =>
          `${buildFullReport(ctx, c, selectedExam)}${i < children.length - 1 ? '<div class="page-break"></div>' : ""}`
      )
      .join("");
    openPrintWindow(pages);
  }, [children, selectedExam, ctx]);

  const examsWithMarks = exams.filter((ex) => examMarks.some((m) => m.exam_id === ex.id));

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" /> Full Report Card
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a comprehensive, printable report card including exam results, CBC assessments, and competencies.
          </p>
        </div>
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-full sm:w-[220px] h-10 text-sm">
            <SelectValue placeholder="Select exam" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {examsWithMarks.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {ex.name} ({ex.academic_year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePrint} className="font-bold gap-2">
          <Printer className="w-4 h-4" /> Print Report Card
        </Button>
        <Button onClick={handleSavePDF} variant="outline" className="font-bold gap-2">
          <Download className="w-4 h-4" /> Save as PDF
        </Button>
        {children.length > 1 && (
          <Button onClick={handlePrintAll} variant="outline" className="font-bold gap-2">
            <Printer className="w-4 h-4" /> Print All Children
          </Button>
        )}
      </div>

      {/* Preview summary */}
      {child && examResults.length > 0 && (
        <div className="border border-border rounded-xl p-5 bg-muted/20 space-y-3">
          <p className="text-sm font-bold text-foreground">Preview Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-foreground">{examResults[0]?.percentage || 0}%</p>
              <p className="text-[11px] text-muted-foreground font-medium">Latest Exam</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{examResults[0]?.grade || "—"}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Grade</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{strandAssessments.length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">CBC Assessments</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{attendanceSummary.pct}%</p>
              <p className="text-[11px] text-muted-foreground font-medium">Attendance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ReportTab);
