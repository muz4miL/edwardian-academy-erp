import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  RevenueChart,
  StudentDistributionChart,
} from "@/components/dashboard/Charts";
import { RevenueSplitCard } from "@/components/dashboard/RevenueSplitCard";
import {
  Users,
  GraduationCap,
  DollarSign,
  AlertCircle,
  BookOpen,
  Award,
  UserCheck,
} from "lucide-react";

// API Base URL
const API_BASE_URL = "http://localhost:5000/api";

const Dashboard = () => {
  // State for API data
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [financeStats, setFinanceStats] = useState({
    totalIncome: 0,
    pendingFees: 0,
    pendingStudentsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from backend when component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch students
        const studentsRes = await fetch(`${API_BASE_URL}/students`);
        const studentsData = await studentsRes.json();

        // Fetch teachers
        const teachersRes = await fetch(`${API_BASE_URL}/teachers`);
        const teachersData = await teachersRes.json();

        // Fetch finance stats
        const financeRes = await fetch(`${API_BASE_URL}/finance/stats/overview`);
        const financeData = await financeRes.json();

        // Update state with API data
        if (studentsData.success) {
          setStudents(studentsData.data);
        }

        if (teachersData.success) {
          setTeachers(teachersData.data);
        }

        if (financeData.success) {
          setFinanceStats(financeData.data);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Make sure backend is running on port 5000.");
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate statistics from fetched data
  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.status === "active").length;
  const preMedicalCount = students.filter((s: any) => s.group === "Pre-Medical").length;
  const preEngineeringCount = students.filter((s: any) => s.group === "Pre-Engineering").length;
  const mdcatEcatCount = students.filter((s: any) =>
    s.class?.toLowerCase()?.includes('mdcat') || s.class?.toLowerCase()?.includes('ecat')
  ).length;

  // Calculate new students this month (last 30 days)
  const newStudentsThisMonth = students.filter((student: any) => {
    if (!student.admissionDate) return false;
    const admissionDate = new Date(student.admissionDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return admissionDate > thirtyDaysAgo;
  }).length;

  // Calculate collection percentage
  const totalFees = financeStats.totalIncome + financeStats.pendingFees;
  const collectionPercentage = totalFees > 0
    ? Math.round((financeStats.totalIncome / totalFees) * 100)
    : 0;

  // Get recent admissions (last 4 students)
  const recentAdmissions = students
    .sort((a: any, b: any) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
    .slice(0, 4)
    .map((student: any) => ({
      name: student.studentName || 'Unknown',
      class: student.class || 'N/A',
      group: student.group || 'N/A',
      date: student.admissionDate
        ? new Date(student.admissionDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
        : 'N/A',
    }));

  // Loading state
  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg text-destructive mb-2">⚠️ {error}</p>
            <p className="text-sm text-muted-foreground">
              Ensure your backend server is running: <code className="bg-secondary px-2 py-1 rounded">npm run dev</code>
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Header Banner */}
      <HeaderBanner
        title="Welcome to Academy Management"
        subtitle="Track and manage all academy operations"
      />

      {/* KPI Cards - NOW WITH REAL DATA FROM API */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Students"
          value={totalStudents.toString()}
          subtitle={`${newStudentsThisMonth} new this month`}
          icon={Users}
          variant="primary"
          trend={{
            value: totalStudents > 0 ? Math.round((newStudentsThisMonth / totalStudents) * 100) : 0,
            isPositive: true,
          }}
        />
        <KPICard
          title="Total Teachers"
          value={teachers.length.toString()}
          subtitle="All subjects covered"
          icon={GraduationCap}
          variant="success"
        />
        <KPICard
          title="Monthly Revenue"
          value={`PKR ${Math.round(financeStats.totalIncome / 1000)}K`}
          subtitle={`${collectionPercentage}% collected`}
          icon={DollarSign}
          variant="primary"
        />
        <KPICard
          title="Pending Fees"
          value={`PKR ${Math.round(financeStats.pendingFees / 1000)}K`}
          subtitle={`${financeStats.pendingStudentsCount} students`}
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Secondary Stats - NOW WITH REAL DATA */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{preMedicalCount}</p>
            <p className="text-sm text-muted-foreground">Pre-Medical</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-light">
            <Award className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{preEngineeringCount}</p>
            <p className="text-sm text-muted-foreground">Pre-Engineering</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-light">
            <GraduationCap className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{mdcatEcatCount}</p>
            <p className="text-sm text-muted-foreground">MDCAT/ECAT Prep</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {activeStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Active Students</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <StudentDistributionChart />
      </div>

      {/* Recent Admissions - NOW WITH REAL DATA */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Recent Admissions
            </h3>
            <div className="space-y-3">
              {recentAdmissions.length > 0 ? (
                recentAdmissions.map((student, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-secondary p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.class} - {student.group}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{student.date}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent admissions found
                </p>
              )}
            </div>
          </div>
        </div>
        <RevenueSplitCard />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
