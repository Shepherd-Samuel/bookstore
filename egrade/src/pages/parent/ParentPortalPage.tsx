import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookOpen, Award, ClipboardList, Calendar, DollarSign, Printer } from "lucide-react";
import { useParentData } from "@/hooks/useParentData";
import EGradeLoader from "@/components/ui/EGradeLoader";
import ChildSelector from "@/components/parent/ChildSelector";
import ExamsTab from "@/components/parent/ExamsTab";
import CbcTab from "@/components/parent/CbcTab";
import AttendanceTab from "@/components/parent/AttendanceTab";
import ReportTab from "@/components/parent/ReportTab";
import FeeStatement from "@/components/finance/FeeStatement";

export default function ParentPortalPage() {
  const data = useParentData();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <EGradeLoader message="Loading parent portal..." />
      </div>
    );
  }

  if (!data.parentFound || data.children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-black text-foreground">No Children Linked</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your account has no students linked yet. Please contact the school administration to link your children.
        </p>
      </div>
    );
  }

  const { selectedChild } = data;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-primary" /> Parent Portal
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your child's academic progress, exam results, and attendance
        </p>
      </div>

      {/* Child selector + info */}
      <ChildSelector
        children={data.children}
        selectedChildId={data.selectedChildId}
        onSelect={data.setSelectedChildId}
      />

      {/* Tab content */}
      {data.childLoading ? (
        <div className="flex items-center justify-center py-16">
          <EGradeLoader size="sm" message="Loading data..." />
        </div>
      ) : (
        <Tabs defaultValue="exams" className="space-y-5">
          <TabsList className="w-full max-w-2xl h-auto flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="exams" className="text-sm gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <Award className="w-4 h-4" /> Exams
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-sm gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <ClipboardList className="w-4 h-4" /> CBC
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-sm gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <DollarSign className="w-4 h-4" /> Fees
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-sm gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <Calendar className="w-4 h-4" /> Attendance
            </TabsTrigger>
            <TabsTrigger value="report" className="text-sm gap-1.5 rounded-lg data-[state=active]:shadow-sm">
              <Printer className="w-4 h-4" /> Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exams">
            <ExamsTab examResults={data.examResults} />
          </TabsContent>

          <TabsContent value="assessments">
            <CbcTab
              strandAssessments={data.strandAssessments}
              subjects={data.subjects}
              ratingCounts={data.ratingCounts}
            />
          </TabsContent>

          <TabsContent value="fees">
            {selectedChild && data.schoolId && (
              <FeeStatement
                studentId={selectedChild.id}
                schoolId={data.schoolId}
                studentName={`${selectedChild.first_name} ${selectedChild.last_name}`}
                admNo={selectedChild.adm_no || null}
              />
            )}
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTab
              attendance={data.attendance}
              summary={data.attendanceSummary}
            />
          </TabsContent>

          <TabsContent value="report">
            <ReportTab
              child={selectedChild}
              children={data.children}
              examResults={data.examResults}
              attendanceSummary={data.attendanceSummary}
              strandAssessments={data.strandAssessments}
              school={data.school}
              streams={data.streams}
              classes={data.classes}
              teachers={data.teachers}
              subjects={data.subjects}
              papers={data.papers}
              examMarks={data.examMarks}
              exams={data.exams}
              competencies={data.competencies}
              gradingEntries={data.gradingEntries}
              getLevel={data.getLevel}
              getGrade={data.getGrade}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
