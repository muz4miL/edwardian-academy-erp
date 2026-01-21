import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";

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
  const [isClosing, setIsClosing] = useState(false);

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

  // Handle End of Day Closing
  const handleCloseDay = async () => {
    const floatingAmount = stats.floatingCash || 0;

    if (floatingAmount === 0) {
      alert("❌ No floating cash to close. Collect some payments first!");
      return;
    }

    const confirmed = confirm(
      `🔒 Confirm Daily Closing\n\nYou are about to lock PKR ${floatingAmount.toLocaleString()} into your verified balance.\n\nThis action cannot be undone. Continue?`,
    );

    if (!confirmed) return;

    try {
      setIsClosing(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`${API_BASE_URL}/finance/close-day`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: `Daily closing by ${user?.fullName}`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(data.message || "✅ Day closed successfully!");
        // Refetch stats to show updated floating cash (should be 0 now)
        await fetchStats();
      } else {
        setError(data.message || "Failed to close day");
      }
    } catch (err: any) {
      console.error("Error closing day:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsClosing(false);
    }
  };

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
              onClick={handleCloseDay}
              disabled={isClosing}
              className="w-full h-14 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              {isClosing ? "Closing..." : "End of Day Closing"}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 bg-white border-2 border-orange-400 text-orange-600 font-semibold hover:bg-orange-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <FileText className="mr-2 h-5 w-5" />
              Record Expense
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 bg-green-50 border-2 border-green-400 text-green-600 font-semibold hover:bg-green-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <HandCoins className="mr-2 h-5 w-5" />
              Receive Partner Payment
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Demo Data Active
              </p>
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

// ========================================
// 🤝 PARTNER DASHBOARD COMPONENT
// ========================================
const PartnerDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Real stats from API
  const [stats, setStats] = useState({
    floatingCash: 0,
    tuitionRevenue: 0,
    expenseDebt: 0,
  });

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      // Fetch general stats
      const res = await fetch(`${API_BASE_URL}/finance/dashboard-stats`, {
        credentials: "include",
      });
      const data = await res.json();

      // Fetch expense debt from Module 3 endpoint
      let expenseDebt = 0;
      try {
        const debtRes = await fetch(
          `${API_BASE_URL}/finance/partner-expense-debt`,
          {
            credentials: "include",
          },
        );
        const debtData = await debtRes.json();
        if (debtData.success) {
          expenseDebt = debtData.data.totalDebt || 0;
        }
      } catch (debtErr) {
        console.error("Error fetching expense debt:", debtErr);
      }

      if (data.success) {
        setStats({
          floatingCash: data.data.floatingCash || 0,
          tuitionRevenue: data.data.tuitionRevenue || 0,
          expenseDebt: expenseDebt,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

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
        await fetchStats();
        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle End of Day Closing
  const handleCloseDay = async () => {
    const floatingAmount = stats.floatingCash || 0;

    if (floatingAmount === 0) {
      alert("❌ No floating cash to close. Collect some payments first!");
      return;
    }

    const confirmed = confirm(
      `🔒 Confirm Daily Closing\n\nYou are about to lock PKR ${floatingAmount.toLocaleString()} into your verified balance.\n\nThis action cannot be undone. Continue?`,
    );

    if (!confirmed) return;

    try {
      setIsClosing(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`${API_BASE_URL}/finance/close-day`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: `Daily closing by ${user?.fullName}`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(data.message || "✅ Day closed successfully!");
        await fetchStats();
      } else {
        setError(data.message || "Failed to close day");
      }
    } catch (err: any) {
      console.error("Error closing day:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsClosing(false);
    }
  };

  const activeStudents = students.filter(
    (s: any) => s.status === "active",
  ).length;

  if (loading) {
    return (
      <DashboardLayout title="Partner Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Partner Dashboard">
      {/* Royal Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 p-8 shadow-2xl border-b-4 border-yellow-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome,{" "}
            <span className="text-yellow-400">
              {user?.fullName || "Partner"}
            </span>
          </h1>
          <p className="text-blue-200 text-lg">
            Track your collections and manage your teaching revenue
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

      {/* Partner KPI Cards */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Floating Cash (Orange - Needs Closing) */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-orange-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Cash in Hand (Unverified)
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.floatingCash > 0
                  ? Math.round(stats.floatingCash / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ Needs End of Day Closing
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
              <Wallet className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* 2. Tuition Revenue (Green) */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-green-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Total Tuition Revenue
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.tuitionRevenue > 0
                  ? Math.round(stats.tuitionRevenue / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-slate-500">Verified collections</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* 3. Expense Debt (Red - Warning) */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-red-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Payable to Sir Waqar
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">
                PKR{" "}
                {stats.expenseDebt > 0
                  ? Math.round(stats.expenseDebt / 1000)
                  : 0}
                K
              </p>
              <p className="text-xs text-red-600 font-medium">
                Your share of expenses
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-lg">
              <AlertCircle className="h-7 w-7" />
            </div>
          </div>
        </div>

        {/* 4. My Students */}
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-2">
                Enrolled in my Subjects
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

      {/* Partner Quick Actions - ONLY End of Day Closing */}
      <Card className="mt-8 border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
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
              onClick={handleCloseDay}
              disabled={isClosing}
              className="w-full h-14 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              {isClosing ? "Closing..." : "End of Day Closing"}
            </Button>
            <p className="text-sm text-slate-500 mt-3 text-center">
              Lock your floating cash of{" "}
              <span className="font-bold text-orange-600">
                PKR {stats.floatingCash.toLocaleString()}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ========================================
// 👨‍💼 STAFF DASHBOARD COMPONENT (Fallback)
// ========================================
const StaffDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Staff Dashboard">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">
            Welcome, {user?.fullName}
          </h2>
          <p className="text-slate-500">Staff dashboard coming soon...</p>
        </div>
      </div>
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

  // Fallback for STAFF or other roles
  return <StaffDashboard />;
};

export default Dashboard;
