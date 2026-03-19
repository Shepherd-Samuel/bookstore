import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";

// Dashboards
import { AdminDashboard, TeacherDashboard, ParentDashboard } from "@/components/Dashboards";
import SaasAdminDashboard from "@/pages/saas-admin/SaasAdminDashboard";
import StudentDashboard from "@/pages/student/StudentDashboard";

// SaaS Admin Pages
import SchoolsPage from "@/pages/saas-admin/SchoolsPage";
import PlansPage from "@/pages/saas-admin/PlansPage";
import ErrorLogsPage from "@/pages/saas-admin/ErrorLogsPage";
import MaintenancePage from "@/pages/saas-admin/MaintenancePage";
import CurriculumUploadPage from "@/pages/saas-admin/CurriculumUploadPage";
import ClassesManagementPage from "@/pages/saas-admin/ClassesManagementPage";
import SubjectsManagementPage from "@/pages/saas-admin/SubjectsManagementPage";

// School Admin Pages
import MembersPage from "@/pages/school-admin/MembersPage";
import ClassesStreamsPage from "@/pages/school-admin/ClassesStreamsPage";
import TeacherAllocationPage from "@/pages/school-admin/TeacherAllocationPage";
import StudentEnrollmentPage from "@/pages/school-admin/StudentEnrollmentPage";
import ParentStudentLinkingPage from "@/pages/school-admin/ParentStudentLinkingPage";
import StudentTransferPage from "@/pages/school-admin/StudentTransferPage";
import AttendancePage from "@/pages/school-admin/AttendancePage";
import FinancePage from "@/pages/school-admin/FinancePage";
import SchoolSettingsPage from "@/pages/school-admin/SchoolSettingsPage";
import DisciplinePage from "@/pages/school-admin/DisciplinePage";
import ClassTeacherAssignmentPage from "@/pages/school-admin/ClassTeacherAssignmentPage";
import SubjectPapersPage from "@/pages/school-admin/SubjectPapersPage";
import ExamApprovalPage from "@/pages/school-admin/ExamApprovalPage";
import ExamAnalysisPage from "@/pages/school-admin/ExamAnalysisPage";
import GradingManagementPage from "@/pages/school-admin/GradingManagementPage";

// Teacher Pages
import TeacherAssessmentsPage from "@/pages/teacher/AssessmentsPage";
import CbcStrandAssessmentPage from "@/pages/teacher/CbcStrandAssessmentPage";
import DigitalExamCreatorPage from "@/pages/teacher/DigitalExamCreatorPage";
import ExamMarksPage from "@/pages/teacher/ExamMarksPage";
import MyClassPage from "@/pages/teacher/MyClassPage";

// Student Pages
import StudentExamPortal from "@/pages/student/StudentExamPortal";
import ParentPortalPage from "@/pages/parent/ParentPortalPage";

// School Admin Pages (Exams)
import ExamsPage from "@/pages/school-admin/ExamsPage";

// Shared Pages
import ProfilePage from "@/pages/shared/ProfilePage";
import NoticeboardPage from "@/pages/shared/NoticeboardPage";
import ReportsPage from "@/pages/shared/ReportsPage";
import SupportPage from "@/pages/shared/SupportPage";
import SupportTicketsPage from "@/pages/saas-admin/SupportTicketsPage";
import TimetablePage from "@/pages/shared/TimetablePage";

// Auth


function PlaceholderPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-black text-foreground">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-xs">{desc}</p>
      <span className="text-xs font-bold px-3 py-1 rounded-full text-accent-foreground bg-accent">Coming Soon</span>
    </div>
  );
}

const PLACEHOLDER_PAGES: Record<string, { title: string; desc: string }> = {
  curriculum: { title: "Curriculum Design", desc: "KICD-aligned lesson planning with strand, sub-strand, and learning outcomes." },
  finance: { title: "Fee Management", desc: "M-Pesa integration, fee structures for JSS/SSS, PDF receipts, and tracking." },
  library: { title: "Library & Resources", desc: "Physical books + KICD-approved digital content management." },
  discipline: { title: "Discipline Records", desc: "Incident reporting and tracking for Ministry compliance." },
  noticeboard: { title: "Noticeboard", desc: "Real-time announcements for term dates, PTMs, and school events." },
  reports: { title: "CBC Reports", desc: "Generate comprehensive learner progress reports with EE/ME/AE/BE levels." },
  settings: { title: "Settings", desc: "School profile, user management, NEMIS integration, and system configuration." },
};

// Define which pages each role can access
const ROLE_PAGES: Record<string, string[]> = {
  saas_admin: ["dashboard", "schools", "plans", "error-logs", "maintenance", "curriculum-upload", "classes-management", "subjects-management", "support-tickets", "reports", "settings", "profile", "support"],
  school_admin: ["dashboard", "members", "classes", "allocation", "class-teachers", "students", "parent-linking", "transfers", "attendance", "assessments", "cbc-strand-assessment", "digital-exams", "exam-approval", "exam-analysis", "exams", "exam-marks", "subject-papers", "grading", "curriculum", "finance", "discipline", "timetable", "noticeboard", "reports", "settings", "profile", "support"],
  teacher: ["dashboard", "my-class", "assessments", "cbc-strand-assessment", "digital-exams", "exams", "exam-marks", "attendance", "students", "curriculum", "discipline", "timetable", "noticeboard", "reports", "profile", "support"],
  parent: ["dashboard", "portal", "assessments", "finance", "attendance", "timetable", "noticeboard", "profile", "support"],
  student: ["dashboard", "assessments", "student-exams", "timetable", "noticeboard", "profile", "support"],
};

export default function Index() {
  const { user, profile, effectiveRole, loading, schoolStatus, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [activePage, setActivePage] = useState("dashboard");

  // Redirect unauthenticated users to landing
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-primary animate-pulse">
            <span className="text-white font-black text-lg">e</span>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Loading eGrade M|S...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const role = effectiveRole;

  // School suspension lockout — SaaS admins bypass this
  if (role !== "saas_admin" && schoolStatus && !schoolStatus.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-destructive/10">
            <span className="text-3xl">🚫</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">School Suspended</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Access to <strong>{schoolStatus.school_name}</strong> has been temporarily suspended.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-left space-y-3">
            {role === "school_admin" ? (
              <>
                <p className="text-sm font-semibold text-foreground">As the school administrator:</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Your school subscription may have expired</li>
                  <li>Contact the eGrade super admin to renew your subscription</li>
                  <li>Once renewed, all modules will be restored automatically</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">What you can do:</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Contact your school administrator about this issue</li>
                  <li>The administrator needs to renew the school's subscription</li>
                  <li>Once resolved, all your data and modules will be accessible again</li>
                </ul>
              </>
            )}
          </div>
          <button
            onClick={signOut}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Sign out and try another account
          </button>
        </div>
      </div>
    );
  }

  // Enforce role-based page access
  const handleNavigate = (page: string) => {
    const allowedPages = ROLE_PAGES[role] || ROLE_PAGES.student;
    if (allowedPages.includes(page)) {
      setActivePage(page);
    }
  };

  const renderPage = () => {
    // Shared pages accessible to all roles
    if (activePage === "profile") return <ProfilePage />;
    if (activePage === "support") return <SupportPage />;
    if (activePage === "timetable") return <TimetablePage />;

    // ── SaaS Admin pages ──
    if (role === "saas_admin") {
      switch (activePage) {
        case "dashboard": return <SaasAdminDashboard />;
        case "schools": return <SchoolsPage />;
        case "plans": return <PlansPage />;
        case "error-logs": return <ErrorLogsPage />;
        case "maintenance": return <MaintenancePage />;
        case "curriculum-upload": return <CurriculumUploadPage />;
        case "classes-management": return <ClassesManagementPage />;
        case "subjects-management": return <SubjectsManagementPage />;
        case "support-tickets": return <SupportTicketsPage />;
      }
    }

    // ── School Admin pages ──
    if (role === "school_admin") {
      switch (activePage) {
        case "dashboard": return <AdminDashboard />;
        case "members": return <MembersPage />;
        case "classes": return <ClassesStreamsPage />;
        case "allocation": return <TeacherAllocationPage />;
        case "students": return <StudentEnrollmentPage />;
        case "parent-linking": return <ParentStudentLinkingPage />;
        case "transfers": return <StudentTransferPage />;
        case "attendance": return <AttendancePage />;
        case "assessments": return <TeacherAssessmentsPage />;
        case "cbc-strand-assessment": return <CbcStrandAssessmentPage />;
        case "digital-exams": return <DigitalExamCreatorPage />;
        case "exam-approval": return <ExamApprovalPage />;
        case "exam-analysis": return <ExamAnalysisPage />;
        case "exams": return <ExamsPage />;
        case "exam-marks": return <ExamMarksPage />;
        case "finance": return <FinancePage />;
        case "discipline": return <DisciplinePage />;
        case "class-teachers": return <ClassTeacherAssignmentPage />;
        case "subject-papers": return <SubjectPapersPage />;
        case "grading": return <GradingManagementPage />;
        case "settings": return <SchoolSettingsPage />;
        case "noticeboard": return <NoticeboardPage />;
        case "reports": return <ReportsPage />;
      }
    }

    // ── Teacher pages ──
    if (role === "teacher") {
      switch (activePage) {
        case "dashboard": return <TeacherDashboard />;
        case "my-class": return <MyClassPage />;
        case "assessments": return <TeacherAssessmentsPage />;
        case "cbc-strand-assessment": return <CbcStrandAssessmentPage />;
        case "digital-exams": return <DigitalExamCreatorPage />;
        case "exams": return <ExamsPage />;
        case "exam-marks": return <ExamMarksPage />;
        case "attendance": return <AttendancePage />;
        case "discipline": return <DisciplinePage />;
        case "noticeboard": return <NoticeboardPage />;
        case "reports": return <ReportsPage />;
      }
    }

    // ── Student pages ──
    if (role === "student") {
      switch (activePage) {
        case "dashboard": return <StudentDashboard />;
        case "student-exams": return <StudentExamPortal />;
        case "noticeboard": return <NoticeboardPage />;
      }
    }

    // ── Parent pages ──
    if (role === "parent") {
      switch (activePage) {
        case "dashboard": return <ParentDashboard />;
        case "portal": return <ParentPortalPage />;
        case "noticeboard": return <NoticeboardPage />;
        case "finance": return <ParentPortalPage />;
        case "attendance": return <ParentPortalPage />;
      }
    }

    // Fallback dashboard
    if (activePage === "dashboard") {
      return <AdminDashboard />;
    }

    const placeholder = PLACEHOLDER_PAGES[activePage];
    if (placeholder) return <PlaceholderPage title={placeholder.title} desc={placeholder.desc} />;
    return <PlaceholderPage title="Module" desc="This module is under development." />;
  };

  return (
    <DashboardLayout activePage={activePage} onNavigate={handleNavigate}>
      {renderPage()}
    </DashboardLayout>
  );
}
