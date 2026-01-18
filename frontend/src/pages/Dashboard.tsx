/**
 * Dashboard.tsx - Role-Based Dashboard Engine
 *
 * This is the GATEKEEPER that routes users to their appropriate dashboard:
 * - OWNER: Full financial visibility (Net Profit, Academy Cash, All Debts)
 * - PARTNER: Personal Portal (My Cash, My Expenses, My Earnings) - NO global stats
 * - OPERATOR/STAFF: Operational view (Student counts, Quick Actions) - ZERO financials
 *
 * SECURITY: Partners CANNOT see academy-wide revenue, net profit, or expenses.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  AlertCircle,
  FlaskConical,
  Wallet,
  DollarSign,
  FileText,
  HandCoins,
  ClipboardCheck,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  History,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

// Import reusable modal components
import { SettlementModal } from "@/components/finance/SettlementModal";
import { AddExpenseDialog } from "@/components/finance/AddExpenseDialog";
import { DayClosingModal } from "@/components/finance/DayClosingModal";

// API Base URL
const API_BASE_URL = "http://localhost:5000/api";

// ========================================
// 👑 OWNER DASHBOARD COMPONENT
// ========================================
const OwnerDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Real stats from API
  const [stats, setStats] = useState({
    chemistryRevenue: 0,
    pendingReimbursements: 0,
    poolRevenue: 0,
    floatingCash: 0,
  });

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/dashboard-stats`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch students
        const studentsRes = await fetch(`${API_BASE_URL}/students`, {
          credentials: "include",
        });
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          setStudents(studentsData.data);
        }

        // Fetch financial stats
        await fetchStats();

        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load data from server");
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeStudents = students.filter(
    (s: any) => s.status === "active",
  ).length;

  if (loading) {
    return (
      <DashboardLayout title="Owner Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Loading dashboard data...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Owner Dashboard">
      {/* Royal Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 p-8 shadow-2xl border-b-4 border-yellow-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back,{" "}
            <span className="text-yellow-400">{user?.fullName || "Owner"}</span>
          </h1>
          <p className="text-blue-200 text-lg">
            Manage your financial streams and academy operations
          </p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMessage && (
        <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
              ✓
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900">Success!</p>
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border-2 border-red-400 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Owner KPI Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-cyan-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Chemistry Collection
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.chemistryRevenue > 0
                  ? Math.round(stats.chemistryRevenue / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-slate-500">Your subject revenue</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg">
              <FlaskConical className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-orange-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Partner Debt (Recoverable)
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.pendingReimbursements > 0
                  ? Math.round(stats.pendingReimbursements / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-slate-500">Zahid/Saud owe you</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-lg">
              <AlertCircle className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-yellow-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Academy Pool
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.poolRevenue > 0
                  ? Math.round(stats.poolRevenue / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-slate-500">30% shared revenue</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
              <Wallet className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Total Enrolled
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                {activeStudents > 0 ? activeStudents : "0"}
              </p>
              <p className="text-xs text-slate-500">Active students</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <Users className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Owner Quick Actions */}
      <Card className="mt-8 border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-slate-600">
            Perform daily operations and manage finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Button
              size="lg"
              onClick={() => setIsClosingModalOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              End of Day Closing
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsExpenseDialogOpen(true)}
              className="w-full h-14 bg-white border-2 border-orange-400 text-orange-600 font-semibold hover:bg-orange-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <FileText className="mr-2 h-5 w-5" />
              Record Expense
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsSettlementModalOpen(true)}
              className="w-full h-14 bg-green-50 border-2 border-green-400 text-green-600 font-semibold hover:bg-green-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <HandCoins className="mr-2 h-5 w-5" />
              Receive Partner Payment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <DayClosingModal
        isOpen={isClosingModalOpen}
        onOpenChange={setIsClosingModalOpen}
        floatingCash={stats.floatingCash}
        userName={user?.fullName}
        onSuccess={fetchStats}
      />

      <AddExpenseDialog
        isOpen={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
      />

      <SettlementModal
        isOpen={isSettlementModalOpen}
        onOpenChange={setIsSettlementModalOpen}
      />
    </DashboardLayout>
  );
};

// ========================================
// 🤝 PARTNER DASHBOARD COMPONENT (SECURED VIEW)
// ========================================
const PartnerDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // Fetch Partner Portal Stats (PERSONALIZED - no global data exposed)
  const {
    data: portalStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["partner-portal-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/finance/partner-portal-stats`, {
        credentials: "include",
      });
      if (!res.ok) {
        // Fallback to old dashboard-stats for backwards compatibility
        const fallbackRes = await fetch(`${API_BASE_URL}/finance/dashboard-stats`, {
          credentials: "include",
        });
        const fallbackData = await fallbackRes.json();
        return {
          cashInHand: fallbackData.data?.floatingCash || 0,
          expenseLiability: 0,
          totalEarnings: fallbackData.data?.tuitionRevenue || 0,
          netPosition: 0,
          todayStats: { amount: 0, count: 0 },
          pendingExpenses: [],
          settlementHistory: [],
        };
      }
      const data = await res.json();
      return data.data;
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const studentsRes = await fetch(`${API_BASE_URL}/students`, {
          credentials: "include",
        });
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          setStudents(studentsData.data);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeStudents = students.filter(
    (s: any) => s.status === "active",
  ).length;

  if (loading || statsLoading) {
    return (
      <DashboardLayout title="Partner Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = portalStats || {
    cashInHand: 0,
    expenseLiability: 0,
    totalEarnings: 0,
    netPosition: 0,
    todayStats: { amount: 0, count: 0 },
    pendingExpenses: [],
    settlementHistory: [],
  };

  return (
    <DashboardLayout title="Partner Dashboard">
      {/* Partner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-800 to-cyan-900 p-8 shadow-2xl border-b-4 border-emerald-400">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome,{" "}
            <span className="text-emerald-300">
              {user?.fullName || "Partner"}
            </span>
          </h1>
          <p className="text-teal-200 text-lg">
            Your personal financial dashboard
          </p>
        </div>
      </div>

      {/* Partner KPI Cards - PERSONALIZED DATA ONLY */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Cash in Hand (Floating - needs closing) */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-orange-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Cash in Hand
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.cashInHand > 0
                  ? stats.cashInHand.toLocaleString()
                  : "0"}
              </p>
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ Unverified - Close Day
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
              <Wallet className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* 2. My Expense Liability (What I owe) */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-red-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Payable to Academy
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.expenseLiability > 0
                  ? stats.expenseLiability.toLocaleString()
                  : "0"}
              </p>
              <p className="text-xs text-red-600 font-medium">
                Your share of expenses
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-lg">
              <TrendingDown className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* 3. Total Earnings (70% share) */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Total Earnings
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.totalEarnings > 0
                  ? Math.round(stats.totalEarnings / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-slate-500">Your 70% share</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
              <TrendingUp className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* 4. Active Students */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                My Students
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                {activeStudents > 0 ? activeStudents : "0"}
              </p>
              <p className="text-xs text-slate-500">Enrolled in my subjects</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Partner Quick Actions - LIMITED OPTIONS */}
      <Card className="mt-8 border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-slate-600">
            Close your daily collections to verify your cash
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Button
              size="lg"
              onClick={() => setIsClosingModalOpen(true)}
              className="w-full h-14 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Close Day & Handover Cash
            </Button>
            <p className="text-sm text-slate-500 mt-3 text-center">
              Lock your floating cash of{" "}
              <span className="font-bold text-orange-600">
                PKR {stats.cashInHand.toLocaleString()}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Financial History Table */}
      {stats.settlementHistory && stats.settlementHistory.length > 0 && (
        <Card className="mt-6 border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
              <History className="h-5 w-5 text-slate-600" />
              My Settlement History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.settlementHistory.slice(0, 5).map((item: any) => (
                  <TableRow key={item._id} className="hover:bg-slate-50">
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {new Date(item.date).toLocaleDateString("en-PK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      +PKR {item.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.status === "VERIFIED"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }
                      >
                        {item.status === "VERIFIED" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Day Closing Modal */}
      <DayClosingModal
        isOpen={isClosingModalOpen}
        onOpenChange={setIsClosingModalOpen}
        floatingCash={stats.cashInHand}
        userName={user?.fullName}
        onSuccess={() => refetchStats()}
      />
    </DashboardLayout>
  );
};

// ========================================
// 👨‍💼 OPERATOR/STAFF DASHBOARD (NO FINANCIALS)
// ========================================
const OperatorDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const studentsRes = await fetch(`${API_BASE_URL}/students`, {
          credentials: "include",
        });
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
          setStudents(studentsData.data);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeStudents = students.filter(
    (s: any) => s.status === "active",
  ).length;

  const pendingStudents = students.filter(
    (s: any) => s.feeStatus === "pending" || s.feeStatus === "partial",
  ).length;

  if (loading) {
    return (
      <DashboardLayout title="Staff Dashboard">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Staff Dashboard">
      {/* Welcome Banner - NO MONEY */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-8 shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, {user?.fullName || "Staff"}
          </h1>
          <p className="text-slate-300 text-lg">
            Manage student operations and daily tasks
          </p>
        </div>
      </div>

      {/* Operational Stats Only - NO FINANCIAL DATA */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-xl border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">
                Active Students
              </p>
              <p className="text-4xl font-bold text-slate-900">
                {activeStudents}
              </p>
              <p className="text-xs text-slate-500">Currently enrolled</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">
                Fee Pending
              </p>
              <p className="text-4xl font-bold text-slate-900">
                {pendingStudents}
              </p>
              <p className="text-xs text-slate-500">Need follow-up</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">
                Total Students
              </p>
              <p className="text-4xl font-bold text-slate-900">
                {students.length}
              </p>
              <p className="text-xs text-slate-500">In database</p>
            </div>
            <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-slate-600" />
            Quick Access
          </CardTitle>
          <CardDescription>
            Navigate to common operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Button variant="outline" className="h-12" asChild>
              <a href="/students">
                <Users className="mr-2 h-4 w-4" />
                View Students
              </a>
            </Button>
            <Button variant="outline" className="h-12" asChild>
              <a href="/admissions">
                <GraduationCap className="mr-2 h-4 w-4" />
                New Admission
              </a>
            </Button>
            <Button variant="outline" className="h-12" asChild>
              <a href="/timetable">
                <Calendar className="mr-2 h-4 w-4" />
                Timetable
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ========================================
// 🛡️ MAIN DASHBOARD COMPONENT (GATEKEEPER)
// ========================================
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();

  // Safety guard: Wait for auth to load
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Safety guard: User must exist
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  // 🛡️ ROLE-BASED GATEKEEPER
  if (user.role === "OWNER") {
    return <OwnerDashboard />;
  }

  if (user.role === "PARTNER") {
    return <PartnerDashboard />;
  }

  // Fallback for STAFF, OPERATOR, or other roles
  return <OperatorDashboard />;
};

export default Dashboard;
