// EXAMPLE: How to connect your Dashboard.tsx to the backend API
// This file shows you how to replace the hardcoded data with API calls

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
    // State for storing data from API
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [financeStats, setFinanceStats] = useState({
        totalIncome: 0,
        pendingFees: 0,
        pendingStudentsCount: 0,
    });
    const [studentStats, setStudentStats] = useState({
        total: 0,
        active: 0,
        preMedical: 0,
        preEngineering: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all data when component mounts
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);

                // Fetch students
                const studentsRes = await fetch(`${API_BASE_URL}/students`);
                const studentsData = await studentsRes.json();

                // Fetch teachers
                const teachersRes = await fetch(`${API_BASE_URL}/teachers`);
                const teachersData = await teachersRes.json();

                // Fetch finance stats
                const financeRes = await fetch(`${API_BASE_URL}/finance/stats/overview`);
                const financeData = await financeRes.json();

                // Fetch student stats
                const studentStatsRes = await fetch(`${API_BASE_URL}/students/stats/overview`);
                const studentStatsData = await studentStatsRes.json();

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

                if (studentStatsData.success) {
                    setStudentStats(studentStatsData.data);
                }

                setLoading(false);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError("Failed to load dashboard data");
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Show loading state
    if (loading) {
        return (
            <DashboardLayout title="Dashboard">
                <div className="flex items-center justify-center h-96">
                    <p className="text-lg text-muted-foreground">Loading dashboard...</p>
                </div>
            </DashboardLayout>
        );
    }

    // Show error state
    if (error) {
        return (
            <DashboardLayout title="Dashboard">
                <div className="flex items-center justify-center h-96">
                    <p className="text-lg text-destructive">{error}</p>
                </div>
            </DashboardLayout>
        );
    }

    // Calculate new students this month (those added in last 30 days)
    const newStudentsThisMonth = students.filter((student) => {
        const admissionDate = new Date(student.admissionDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return admissionDate > thirtyDaysAgo;
    }).length;

    // Get recent admissions (last 4)
    const recentAdmissions = students
        .sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate))
        .slice(0, 4)
        .map((student) => ({
            name: student.name,
            class: student.class,
            group: student.group,
            date: new Date(student.admissionDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }),
        }));

    return (
        <DashboardLayout title="Dashboard">
            {/* Header Banner */}
            <HeaderBanner
                title="Welcome to Academy Management"
                subtitle="Track and manage all academy operations"
            />

            {/* KPI Cards - NOW USING REAL DATA FROM API */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Total Students"
                    value={studentStats.total.toString()}
                    subtitle={`${newStudentsThisMonth} new this month`}
                    icon={Users}
                    variant="primary"
                    trend={{
                        value: Math.round((newStudentsThisMonth / studentStats.total) * 100),
                        isPositive: true
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
                    subtitle={`${Math.round((financeStats.totalIncome / (financeStats.totalIncome + financeStats.pendingFees)) * 100)}% collected`}
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

            {/* Secondary Stats - NOW USING REAL DATA */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                        <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{studentStats.preMedical}</p>
                        <p className="text-sm text-muted-foreground">Pre-Medical</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-light">
                        <Award className="h-5 w-5 text-success" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{studentStats.preEngineering}</p>
                        <p className="text-sm text-muted-foreground">Pre-Engineering</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-light">
                        <GraduationCap className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">
                            {students.filter(s => s.class === 'MDCAT' || s.class === 'ECAT').length}
                        </p>
                        <p className="text-sm text-muted-foreground">MDCAT/ECAT Prep</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                        <UserCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">85%</p>
                        <p className="text-sm text-muted-foreground">Attendance Today</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <RevenueChart />
                <StudentDistributionChart />
            </div>

            {/* Recent Admissions - NOW USING REAL DATA */}
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
                                <p className="text-sm text-muted-foreground">No recent admissions</p>
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

/*
 * INTEGRATION STEPS:
 * 
 * 1. Make sure your backend server is running on http://localhost:5000
 * 2. Replace the content of your current Dashboard.tsx with this code
 * 3. The API calls will automatically fetch data when the component loads
 * 4. Update the Charts components similarly to use real data
 * 
 * KEY DIFFERENCES FROM HARDCODED VERSION:
 * - Added useState hooks for storing API data
 * - Added useEffect hook to fetch data on component mount
 * - Added loading and error states
 * - Using real data from API instead of hardcoded arrays
 * - Calculating statistics from real data
 */
