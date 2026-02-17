import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Teachers from "./pages/Teachers";
import TeacherProfile from "./pages/TeacherProfile";
import Finance from "./pages/Finance";
import Classes from "./pages/Classes";
import Configuration from "./pages/Configuration";
import Timetable from "./pages/Timetable";
import Sessions from "./pages/Sessions";
import StudentCard from "./pages/StudentCard";
import UserManagement from "./pages/UserManagement";
import WebsiteManager from "./pages/WebsiteManager";
import PublicLanding from "./pages/PublicLanding";
import Leads from "./pages/Leads";
// Payroll removed — teacher payments handled via Teachers tab
// Phase 2 & 3: Security & LMS
import Gatekeeper from "./pages/Gatekeeper";
import PublicRegister from "./pages/PublicRegister";
import PendingApprovals from "./pages/PendingApprovals";
import VerificationHub from "./pages/VerificationHub";
import StudentPortal from "./pages/StudentPortal";
import Lectures from "./pages/Lectures";
import Reports from "./pages/Reports";
import Attendance from "./pages/Attendance";
// Phase 4: Online Exam System
import Exams from "./pages/Exams";
import ExamBuilder from "./pages/ExamBuilder";
import ExamRoom from "./pages/ExamRoom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/public-home" element={<PublicLanding />} />
            {/* Phase 3: Public Registration & Student Portal */}
            <Route path="/register" element={<PublicRegister />} />
            <Route path="/student-portal" element={<StudentPortal />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admissions"
              element={
                <ProtectedRoute>
                  <Admissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute>
                  <Students />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id"
              element={
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute>
                  <Teachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers/:id"
              element={
                <ProtectedRoute>
                  <TeacherProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute>
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute>
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timetable"
              element={
                <ProtectedRoute>
                  <Timetable />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <Sessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuration"
              element={
                <ProtectedRoute>
                  <Configuration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-card"
              element={
                <ProtectedRoute>
                  <StudentCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/website-manager"
              element={
                <ProtectedRoute>
                  <WebsiteManager />
                </ProtectedRoute>
              }
            />


            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              }
            />
            {/* Phase 2: Security Gates */}
            <Route
              path="/gatekeeper"
              element={
                <ProtectedRoute>
                  <Gatekeeper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pending-approvals"
              element={
                <ProtectedRoute>
                  <PendingApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/front-desk"
              element={
                <ProtectedRoute>
                  <VerificationHub />
                </ProtectedRoute>
              }
            />
            {/* Phase 3: Academic Video Module */}
            <Route
              path="/lectures"
              element={
                <ProtectedRoute>
                  <Lectures />
                </ProtectedRoute>
              }
            />
            {/* Phase 4: Online Exam System */}
            <Route
              path="/exams"
              element={
                <ProtectedRoute>
                  <Exams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/create"
              element={
                <ProtectedRoute>
                  <ExamBuilder />
                </ProtectedRoute>
              }
            />
            <Route path="/exam/:examId" element={<ExamRoom />} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
