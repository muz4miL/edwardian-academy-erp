import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Loader2,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  UserPlus,
  Clock,
  BookOpen,
  CalendarDays,
  MapPin,
  BarChart3,
  Download,
  Printer,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingDown,
  Briefcase,
  ArrowRight,
  Search,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";

// API Base URL - Auto-detect Codespaces
const getApiBaseUrl = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes(".app.github.dev")
  ) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, "");
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  return "http://localhost:5000/api";
};
const API_BASE_URL = getApiBaseUrl();

// ========================================
// ðŸ‘‘ OWNER DASHBOARD COMPONENT
// ========================================
const CHART_COLORS = ["#0EA5E9", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState("7d");
  const [isClosing, setIsClosing] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  // Real stats from API
  const [stats, setStats] = useState({
    chemistryRevenue: 0,
    pendingReimbursements: 0,
    poolRevenue: 0,
    floatingCash: 0,
    ownerNetRevenue: 0,
  });

  // Analytics data
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("");

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

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch(`${API_BASE_URL}/finance/analytics-dashboard`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Generate report
  const generateReport = async (period: string) => {
    try {
      setReportPeriod(period);
      setReportLoading(true);
      setReportOpen(true);
      const res = await fetch(
        `${API_BASE_URL}/finance/generate-report?period=${period}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error("Error generating report:", err);
    } finally {
      setReportLoading(false);
    }
  };

  // Print report
  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !reportData) return;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportData.period} Financial Report â€” Edwardian Academy</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; }
          h1 { color: #0f172a; border-bottom: 3px solid #0EA5E9; padding-bottom: 12px; }
          h2 { color: #334155; margin-top: 30px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
          .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
          .stat-box .label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
          .stat-box .value { font-size: 24px; font-weight: 700; }
          .revenue { color: #059669; }
          .expense { color: #dc2626; }
          .profit { color: #0EA5E9; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>ðŸ“Š ${reportData.period} Financial Report</h1>
        <p style="color: #64748b;">Edwardian Academy â€” Generated on ${new Date(reportData.generatedAt).toLocaleString()}</p>
        
        <div class="summary">
          <div class="stat-box">
            <div class="label">Total Revenue</div>
            <div class="value revenue">PKR ${reportData.totalRevenue?.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="label">Total Expenses</div>
            <div class="value expense">PKR ${reportData.totalExpenses?.toLocaleString()}</div>
          </div>
          <div class="stat-box">
            <div class="label">Net Profit</div>
            <div class="value profit">PKR ${reportData.netProfit?.toLocaleString()}</div>
          </div>
        </div>

        <h2>Revenue Breakdown</h2>
        <table>
          <thead><tr><th>Category</th><th>Amount (PKR)</th><th>Transactions</th></tr></thead>
          <tbody>
            ${reportData.revenueByCategory?.map((r: any) => `<tr><td>${r.category}</td><td>${r.amount?.toLocaleString()}</td><td>${r.transactions}</td></tr>`).join("") || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No revenue data</td></tr>'}
          </tbody>
        </table>

        <h2>Expense Breakdown</h2>
        <table>
          <thead><tr><th>Category</th><th>Amount (PKR)</th><th>Transactions</th></tr></thead>
          <tbody>
            ${reportData.expenseByCategory?.map((e: any) => `<tr><td>${e.category}</td><td>${e.amount?.toLocaleString()}</td><td>${e.transactions}</td></tr>`).join("") || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No expense data</td></tr>'}
          </tbody>
        </table>

        <h2>Fee Collection</h2>
        <p>Total Fees Collected: <strong>PKR ${reportData.feesCollected?.total?.toLocaleString() || 0}</strong> (${reportData.feesCollected?.count || 0} records)</p>

        <div class="footer">
          <p>Edwardian Academy â€” Confidential Financial Report</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCloseDay = () => {
    setCloseConfirmOpen(true);
  };

  const confirmCloseDay = async () => {
    setIsClosing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finance/close-day`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        fetchStats(); // Refresh stats after closing day
      } else {
        setError(data.message || "Failed to close day.");
      }
    } catch (err) {
      console.error("Error closing day:", err);
      setError("Failed to connect to server for closing day.");
    } finally {
      setIsClosing(false);
      setCloseConfirmOpen(false);
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

        // Fetch analytics
        await fetchAnalytics();

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
    <TooltipProvider>
      <DashboardLayout title="Owner Dashboard">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-red-900 p-8 shadow-2xl border-b-4 border-red-500">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back,{" "}
              <span className="text-red-400">{user?.fullName || "Owner"}</span>
            </h1>
            <p className="text-slate-300 text-lg">
              Edwardian Academy â€” Management Dashboard
            </p>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {successMessage && (
          <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                âœ“
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900">Success!</p>
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800"
              >
                âœ•
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
                âœ•
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  PKR {(analytics?.quickStats?.monthlyRevenue || stats.ownerNetRevenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">This month</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-sky-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Revenue</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  PKR {(analytics?.quickStats?.todayRevenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">Today so far</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics?.quickStats?.totalStudents || activeStudents || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">Enrolled</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-violet-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Teachers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analytics?.quickStats?.totalTeachers || 0}
                </p>
                <p className="text-xs text-slate-400 mt-1">On payroll</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {analyticsLoading ? (
          <div className="mt-8 flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading analytics...</p>
            </div>
          </div>
        ) : analytics ? (
          <>
            {/* Revenue vs Expenses Chart */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card className="border-slate-200 bg-white shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <BarChart3 className="h-5 w-5 text-sky-500" />
                    Revenue vs Expenses
                  </CardTitle>
                  <CardDescription>Last 6 months comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.revenueVsExpenses} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                          formatter={(value: number) => [`PKR ${value.toLocaleString()}`, undefined]}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Student Growth Chart */}
              <Card className="border-slate-200 bg-white shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Student Growth
                  </CardTitle>
                  <CardDescription>Enrollment over 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.enrollmentData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="totalStudents" name="Total Students" stroke="#0EA5E9" fill="url(#colorStudents)" strokeWidth={2} />
                        <Bar dataKey="newStudents" name="New Enrollments" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profit Trend + Fee Collection + Expense Breakdown */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* Profit Trend */}
              <Card className="border-slate-200 bg-white shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <Activity className="h-5 w-5 text-violet-500" />
                    Profit Trend
                  </CardTitle>
                  <CardDescription>Monthly net income</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.revenueVsExpenses} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                          formatter={(value: number) => [`PKR ${value.toLocaleString()}`, "Profit"]}
                        />
                        <Line type="monotone" dataKey="profit" name="Profit" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: "#8B5CF6", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Fee Collection Status */}
              <Card className="border-slate-200 bg-white shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <CreditCard className="h-5 w-5 text-sky-500" />
                    Fee Collection
                  </CardTitle>
                  <CardDescription>Current month status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-medium text-emerald-800">Paid</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-900">PKR {(analytics.feeCollection?.paid?.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-emerald-600">{analytics.feeCollection?.paid?.count || 0} students</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                        <span className="text-sm font-medium text-amber-800">Pending</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-900">PKR {(analytics.feeCollection?.pending?.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-amber-600">{analytics.feeCollection?.pending?.count || 0} students</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card className="border-slate-200 bg-white shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                    <PieChart className="h-5 w-5 text-amber-500" />
                    Expense Breakdown
                  </CardTitle>
                  <CardDescription>This month by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.expenseCategories && analytics.expenseCategories.length > 0 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={analytics.expenseCategories}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            dataKey="amount"
                            nameKey="category"
                            paddingAngle={3}
                          >
                            {analytics.expenseCategories.map((_: any, idx: number) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                            formatter={(value: number) => [`PKR ${value.toLocaleString()}`, undefined]}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-sm text-slate-400">
                      No expenses recorded this month
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        {/* Financial Reports Section */}
        <Card className="mt-6 border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <FileText className="h-6 w-6 text-red-600" />
              Generate Financial Reports
            </CardTitle>
            <CardDescription className="text-slate-600">
              One-click reports for any period â€” printable & downloadable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Button
                size="lg"
                className="h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                onClick={() => generateReport("today")}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Today's Sale</span>
                  </div>
                  <span className="text-xs opacity-80">Daily Report</span>
                </div>
              </Button>

              <Button
                size="lg"
                className="h-16 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                onClick={() => generateReport("week")}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Week's Sale</span>
                  </div>
                  <span className="text-xs opacity-80">Weekly Report</span>
                </div>
              </Button>

              <Button
                size="lg"
                className="h-16 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                onClick={() => generateReport("month")}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Month's Sale</span>
                  </div>
                  <span className="text-xs opacity-80">Monthly Report</span>
                </div>
              </Button>

              <Button
                size="lg"
                className="h-16 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
                onClick={() => (window.location.href = "/finance")}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Full Finance</span>
                  </div>
                  <span className="text-xs opacity-80">Detailed Ledger</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6 border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <ClipboardCheck className="h-6 w-6 text-red-600" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-600">
              Manage daily operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <Button
                size="lg"
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
                onClick={() => (window.location.href = "/finance?tab=expenses")}
              >
                <FileText className="mr-2 h-5 w-5" />
                Record Expense
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 border-2 border-red-500 text-red-600 font-semibold hover:bg-red-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => (window.location.href = "/admissions")}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                New Admission
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 border-2 border-violet-500 text-violet-600 font-semibold hover:bg-violet-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => (window.location.href = "/teachers")}
              >
                <HandCoins className="mr-2 h-5 w-5" />
                Teacher Payments
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 border-2 border-amber-500 text-amber-600 font-semibold hover:bg-amber-50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                onClick={() => (window.location.href = "/reports")}
              >
                <BarChart3 className="mr-2 h-5 w-5" />
                Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Modal */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5 text-sky-500" />
                {reportData?.period || "Financial"} Report
              </DialogTitle>
              <DialogDescription>
                {reportData
                  ? `Generated on ${new Date(reportData.generatedAt).toLocaleString()}`
                  : "Generating report..."}
              </DialogDescription>
            </DialogHeader>

            {reportLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Crunching numbers...</p>
                </div>
              </div>
            ) : reportData ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                    <p className="text-xs font-semibold text-emerald-600 uppercase">Revenue</p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">
                      PKR {reportData.totalRevenue?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
                    <p className="text-xs font-semibold text-red-600 uppercase">Expenses</p>
                    <p className="text-xl font-bold text-red-900 mt-1">
                      PKR {reportData.totalExpenses?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-center">
                    <p className="text-xs font-semibold text-sky-600 uppercase">Net Profit</p>
                    <p className={`text-xl font-bold mt-1 ${reportData.netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}>
                      PKR {reportData.netProfit?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Revenue Breakdown */}
                {reportData.revenueByCategory?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      Revenue Breakdown
                    </h3>
                    <div className="space-y-2">
                      {reportData.revenueByCategory.map((r: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="text-sm text-slate-700">{r.category}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-emerald-700">PKR {r.amount?.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 ml-2">({r.transactions} txn)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expense Breakdown */}
                {reportData.expenseByCategory?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                      Expense Breakdown
                    </h3>
                    <div className="space-y-2">
                      {reportData.expenseByCategory.map((e: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="text-sm text-slate-700">{e.category}</span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-red-700">PKR {e.amount?.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 ml-2">({e.transactions} txn)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fee Collection */}
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
                  <h3 className="text-sm font-semibold text-sky-800 mb-1">Fee Collection</h3>
                  <p className="text-sm text-sky-700">
                    Collected <strong>PKR {reportData.feesCollected?.total?.toLocaleString() || 0}</strong> from{" "}
                    <strong>{reportData.feesCollected?.count || 0}</strong> fee records
                  </p>
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                Close
              </Button>
              {reportData && (
                <Button
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={printReport}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- DAILY CLOSING DIALOG --- */}
        <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
          <AlertDialogContent className="max-w-md border-2 border-emerald-100 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-6 w-6 text-emerald-600" />
                Daily Closing Confirmation
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 py-3 text-lg">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-6 shadow-inner">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-emerald-700 mb-1">Cash to be Vaulted</p>
                  <p className="text-4xl font-black text-emerald-950">PKR {(stats.floatingCash || 0).toLocaleString()}</p>
                </div>
                Are you sure you want to move your floating cash to the <span className="font-bold text-slate-900 underline">Verified Accounts</span>?
                <br /><br />
                This will lock the amount for today's session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="h-12 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                Review Cash
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCloseDay}
                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-200"
              >
                ðŸ”’ Close Day
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </DashboardLayout>
    </TooltipProvider>
  );
};

// ========================================
// ðŸ¤ PARTNER DASHBOARD COMPONENT
// ========================================
const PartnerDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  // Real stats from API
  const [stats, setStats] = useState({
    floatingCash: 0,
    tuitionRevenue: 0,
    expenseDebt: 0,
    hasExpenseDebt: false,
    expenseDebtDetails: [] as any[],
  });

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      // Fetch general stats (SRS 3.0 - includes expense debt from Expense shares)
      const res = await fetch(`${API_BASE_URL}/finance/dashboard-stats`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setStats({
          floatingCash: data.data.floatingCash || 0,
          tuitionRevenue: data.data.tuitionRevenue || 0,
          expenseDebt: data.data.expenseDebt || 0,
          hasExpenseDebt: data.data.hasExpenseDebt || false,
          expenseDebtDetails: data.data.expenseDebtDetails || [],
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
      toast({
        title: "Nothing to close",
        description: "No floating cash available to close at this time.",
        variant: "destructive"
      });
      return;
    }

    setCloseConfirmOpen(true);
  };

  const confirmCloseDay = async () => {
    const floatingAmount = stats.floatingCash || 0;
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
        setSuccessMessage(data.message || "âœ… Day closed successfully!");
        await fetchStats();
      } else {
        setError(data.message || "Failed to close day");
      }
    } catch (err: any) {
      console.error("Error closing day:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsClosing(false);
      setCloseConfirmOpen(false);
    }
  };

  // Handle Record Payment (Debt Repayment to Owner)
  const handleRecordPayment = async () => {
    const amount = parseInt(paymentAmount) || 0;

    if (amount <= 0) {
      setError("Please enter a valid payment amount greater than 0");
      return;
    }

    if (amount > stats.expenseDebt) {
      setError(
        `Cannot pay more than your outstanding debt of PKR ${stats.expenseDebt.toLocaleString()}`,
      );
      return;
    }

    try {
      setIsProcessingPayment(true);
      setError(null);

      const res = await fetch(`${API_BASE_URL}/finance/repay-debt`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          notes: paymentNotes || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(
          data.message ||
          `âœ… Payment of PKR ${amount.toLocaleString()} recorded successfully!`,
        );
        setPaymentModalOpen(false);
        setPaymentAmount("");
        setPaymentNotes("");
        await fetchStats(); // Refresh stats to show updated debt
      } else {
        setError(data.message || "Failed to record payment");
      }
    } catch (err: any) {
      console.error("Error recording payment:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsProcessingPayment(false);
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
              âœ“
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-900">Success!</p>
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              âœ•
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
              âœ•
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
                âš ï¸ Needs End of Day Closing
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

        {/* 3. Expense Debt (Red - Warning) - SRS 3.0 Module 3 */}
        <div
          className={`group relative overflow-hidden rounded-2xl backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 ${stats.expenseDebt > 0
            ? "bg-red-50 border-red-500 animate-pulse"
            : "bg-white/90 border-slate-300"
            }`}
        >
          {/* Prominent Alert Badge for Outstanding Debt */}
          {stats.expenseDebt > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg shadow-lg">
              ACTION REQUIRED
            </div>
          )}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p
                className={`text-sm font-medium mb-2 ${stats.expenseDebt > 0 ? "text-red-700" : "text-slate-600"}`}
              >
                {stats.expenseDebt > 0
                  ? "âš ï¸ Expense Payable"
                  : "Expense Payable"}
              </p>
              <p
                className={`text-4xl font-bold mb-1 ${stats.expenseDebt > 0 ? "text-red-600" : "text-slate-900"}`}
              >
                PKR{" "}
                {stats.expenseDebt > 0 ? stats.expenseDebt.toLocaleString() : 0}
              </p>
              <p
                className={`text-xs font-medium ${stats.expenseDebt > 0 ? "text-red-500" : "text-green-600"}`}
              >
                {stats.expenseDebt > 0
                  ? `Outstanding expense balance`
                  : "âœ“ All Caught Up!"}
              </p>
              {/* Record Payment Button - Only shown when there's debt */}
              {stats.expenseDebt > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPaymentModalOpen(true)}
                  className="mt-3 w-full bg-white hover:bg-red-50 border-red-300 text-red-700 hover:text-red-800 font-medium"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl shadow-lg ${stats.expenseDebt > 0
                ? "bg-red-500 text-white"
                : "bg-green-100 text-green-600"
                }`}
            >
              {stats.expenseDebt > 0 ? (
                <AlertCircle className="h-7 w-7" />
              ) : (
                <CheckCircle2 className="h-7 w-7" />
              )}
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

      {/* --- DAILY CLOSING DIALOG --- */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent className="max-w-md border-2 border-blue-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-600" />
              Partner Daily Closing
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 py-3 text-lg">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6 shadow-inner">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-700 mb-1">Cash to be Reported</p>
                <p className="text-4xl font-black text-blue-950">PKR {(stats.floatingCash || 0).toLocaleString()}</p>
              </div>
              Lock this amount into the verified balance? This will finalize your collections for today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCloseDay}
              className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-200"
            >
              ðŸ”’ Verify & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Recording Modal */}
    </DashboardLayout>
  );
};

// ========================================
// ðŸ§‘â€ðŸ« TEACHER DASHBOARD COMPONENT
// ========================================
const TeacherDashboard = () => {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);

        // Fetch teacher profile details
        if (user?.teacherId) {
          const profileRes = await fetch(`${API_BASE_URL}/teachers/${user.teacherId}`, {
            credentials: "include",
          });
          const profileData = await profileRes.json();
          if (profileData.success) {
            setTeacherProfile(profileData.data);
          }
        }

        // Fetch timetable (auto-filtered by backend for TEACHER role)
        const ttRes = await fetch(`${API_BASE_URL}/timetable`, {
          credentials: "include",
        });
        const ttData = await ttRes.json();
        if (ttData.success) {
          // Sort by day order then by time
          const sorted = (ttData.data || []).sort((a: any, b: any) => {
            const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return (a.startTime || "").localeCompare(b.startTime || "");
          });
          setTimetable(sorted);
        }
      } catch (err) {
        console.error("Error fetching teacher data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, [user]);

  const capitalizeSubject = (s: string) => {
    const map: Record<string, string> = {
      biology: "Biology", chemistry: "Chemistry", physics: "Physics",
      math: "Mathematics", english: "English", urdu: "Urdu",
      islamiat: "Islamiat", computer: "Computer Science",
    };
    return map[s?.toLowerCase()] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "N/A");
  };

  // Get today's day name
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayClasses = timetable.filter((t: any) => t.day === today);

  // Group timetable by day
  const groupedByDay = timetable.reduce((acc: any, entry: any) => {
    if (!acc[entry.day]) acc[entry.day] = [];
    acc[entry.day].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <DashboardLayout title="Teacher Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Teacher Dashboard">
      {/* Hero Header with Teacher Info */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-8 shadow-2xl border-b-4 border-emerald-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 flex items-center gap-6">
          {/* Teacher Avatar */}
          <div className="flex-shrink-0">
            {teacherProfile?.profileImage || user?.profileImage ? (
              <img
                src={teacherProfile?.profileImage || user?.profileImage}
                alt={user?.fullName}
                className="h-24 w-24 rounded-2xl object-cover border-4 border-emerald-400/50 shadow-xl"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center border-4 border-emerald-400/50 shadow-xl">
                <span className="text-3xl font-bold text-white">
                  {user?.fullName?.charAt(0) || "T"}
                </span>
              </div>
            )}
          </div>
          {/* Teacher Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">
              Welcome, <span className="text-emerald-400">{user?.fullName || "Teacher"}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-medium border border-emerald-500/30">
                <BookOpen className="h-4 w-4" />
                {capitalizeSubject(teacherProfile?.subject || "")}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/20 text-slate-300 text-sm font-medium border border-slate-500/30">
                <GraduationCap className="h-4 w-4" />
                {teacherProfile?.status === "active" ? "Active Teacher" : "Teacher"}
              </span>
              {user?.phone && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/20 text-slate-300 text-sm font-medium border border-slate-500/30">
                  ðŸ“ž {user.phone}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Edwardian Academy â€” {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Today's Classes</p>
              <p className="text-4xl font-bold text-slate-900">{todayClasses.length}</p>
              <p className="text-xs text-slate-500 mt-1">{today}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
              <CalendarDays className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Weekly Classes</p>
              <p className="text-4xl font-bold text-slate-900">{timetable.length}</p>
              <p className="text-xs text-slate-500 mt-1">Classes per week</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
              <Clock className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-l-4 border-purple-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Subject</p>
              <p className="text-2xl font-bold text-slate-900">{capitalizeSubject(teacherProfile?.subject || "")}</p>
              <p className="text-xs text-slate-500 mt-1">Assigned subject</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
              <BookOpen className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule - Highlighted */}
      {todayClasses.length > 0 && (
        <Card className="mt-8 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <CalendarDays className="h-5 w-5" />
              </div>
              Today's Schedule â€” {today}
            </CardTitle>
            <CardDescription className="text-slate-600">
              Your classes for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayClasses.map((entry: any, idx: number) => (
                <div
                  key={entry._id || idx}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-lg">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {entry.classId?.classTitle || entry.classId?.className || entry.subject || "Class"}
                      {entry.classId?.gradeLevel ? ` â€” ${entry.classId.gradeLevel}` : entry.classId?.section ? ` â€” ${entry.classId.section}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">{capitalizeSubject(entry.subject)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-700">
                      {entry.startTime} â€” {entry.endTime}
                    </p>
                    {entry.room && (
                      <p className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {entry.room}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Week Timetable */}
      <Card className="mt-8 border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
              <Clock className="h-5 w-5" />
            </div>
            Weekly Timetable
          </CardTitle>
          <CardDescription className="text-slate-600">
            Your complete teaching schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timetable.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Timetable Set</h3>
              <p className="text-slate-500">Your timetable hasn't been assigned yet. Please contact the admin.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dayOrder.filter(day => groupedByDay[day]).map((day) => (
                <div key={day}>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${day === today ? "text-emerald-600" : "text-slate-500"}`}>
                      {day}
                    </h3>
                    {day === today && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        Today
                      </span>
                    )}
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {groupedByDay[day].map((entry: any, idx: number) => (
                      <div
                        key={entry._id || idx}
                        className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${day === today
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-slate-50 border-slate-200"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${day === today ? "text-emerald-700" : "text-slate-700"}`}>
                            {entry.startTime} â€” {entry.endTime}
                          </span>
                          {entry.room && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {entry.room}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-slate-900">
                          {entry.classId?.classTitle || entry.classId?.className || "Class"}
                          {entry.classId?.gradeLevel ? ` (${entry.classId.gradeLevel})` : entry.classId?.section ? ` (${entry.classId.section})` : ""}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{capitalizeSubject(entry.subject)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ========================================
// ðŸ‘¨â€ðŸ’¼ STAFF DASHBOARD COMPONENT
// ========================================
const StaffDashboard = () => {
  const { user } = useAuth();
  const [staffStats, setStaffStats] = useState<any>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    todayAdmissions: 0,
    recentInquiries: 0,
  });
  const [loading, setLoading] = useState(true);

  const perms = user?.permissions || ["dashboard"];
  const hasPerm = (p: string) => perms.includes(p);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);

        // Fetch basic counts based on permissions
        const promises: Promise<any>[] = [];

        if (hasPerm("students") || hasPerm("admissions")) {
          promises.push(
            fetch(`${API_BASE_URL}/students`, { credentials: "include" })
              .then((r) => r.json())
              .catch(() => ({ success: false }))
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        if (hasPerm("teachers")) {
          promises.push(
            fetch(`${API_BASE_URL}/teachers`, { credentials: "include" })
              .then((r) => r.json())
              .catch(() => ({ success: false }))
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        if (hasPerm("classes")) {
          promises.push(
            fetch(`${API_BASE_URL}/classes`, { credentials: "include" })
              .then((r) => r.json())
              .catch(() => ({ success: false }))
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        const [studentsData, teachersData, classesData] = await Promise.all(promises);

        setStaffStats({
          totalStudents: studentsData?.data?.length || studentsData?.students?.length || 0,
          totalTeachers: teachersData?.data?.length || teachersData?.teachers?.length || 0,
          totalClasses: classesData?.data?.length || classesData?.classes?.length || 0,
        });
      } catch (err) {
        console.error("Staff dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaffData();
  }, []);

  // Quick action items based on permissions
  const quickActions = [
    { perm: "admissions", label: "New Admission", icon: UserPlus, href: "/admissions", color: "from-emerald-500 to-emerald-600" },
    { perm: "students", label: "View Students", icon: GraduationCap, href: "/students", color: "from-sky-500 to-sky-600" },
    { perm: "teachers", label: "View Teachers", icon: Users, href: "/teachers", color: "from-violet-500 to-violet-600" },
    { perm: "finance", label: "Finance", icon: DollarSign, href: "/finance", color: "from-amber-500 to-amber-600" },
    { perm: "classes", label: "Classes", icon: BookOpen, href: "/classes", color: "from-rose-500 to-rose-600" },
    { perm: "timetable", label: "Timetable", icon: CalendarDays, href: "/timetable", color: "from-indigo-500 to-indigo-600" },
    { perm: "sessions", label: "Sessions", icon: Clock, href: "/sessions", color: "from-teal-500 to-teal-600" },
    { perm: "inquiries", label: "Inquiries", icon: ClipboardCheck, href: "/inquiries", color: "from-orange-500 to-orange-600" },
  ].filter((a) => hasPerm(a.perm));

  if (loading) {
    return (
      <DashboardLayout title="Staff Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Staff Dashboard">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 p-8 shadow-2xl border-b-4 border-sky-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back,{" "}
            <span className="text-sky-400">{user?.fullName || "Staff"}</span>
          </h1>
          <p className="text-slate-300 text-lg">
            Edwardian Academy â€” Staff Panel
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-medium border border-sky-500/30">
              {perms.length} Module{perms.length !== 1 ? "s" : ""} Accessible
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
              â— Online
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Permission Based */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasPerm("students") && (
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-sky-500 cursor-pointer" onClick={() => window.location.href = "/students"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{staffStats.totalStudents}</p>
                <p className="text-xs text-slate-400 mt-1">Enrolled students</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {hasPerm("teachers") && (
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-violet-500 cursor-pointer" onClick={() => window.location.href = "/teachers"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Teachers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{staffStats.totalTeachers}</p>
                <p className="text-xs text-slate-400 mt-1">Active teachers</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}

        {hasPerm("classes") && (
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-emerald-500 cursor-pointer" onClick={() => window.location.href = "/classes"}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Classes</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{staffStats.totalClasses}</p>
                <p className="text-xs text-slate-400 mt-1">Active classes</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card className="mt-8 border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <ClipboardCheck className="h-6 w-6 text-sky-600" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-600">
              Navigate to your assigned modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <Button
                  key={action.perm}
                  size="lg"
                  className={`h-14 bg-gradient-to-r ${action.color} text-white font-semibold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300`}
                  onClick={() => (window.location.href = action.href)}
                >
                  <action.icon className="mr-2 h-5 w-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Permissions */}
      <Card className="mt-6 border-slate-200 bg-white shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Your Access Permissions
          </CardTitle>
          <CardDescription>Modules assigned to your account by the administrator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {perms.map((p: string) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-sm font-medium text-slate-700 border border-slate-200"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

// ========================================
// ðŸ›¡ï¸ MAIN DASHBOARD COMPONENT (GATEKEEPER)
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

  // ðŸ›¡ï¸ ROLE-BASED GATEKEEPER
  if (user.role === "OWNER") {
    return <OwnerDashboard />;
  }

  if (user.role === "PARTNER") {
    return <PartnerDashboard />;
  }

  if (user.role === "TEACHER") {
    return <TeacherDashboard />;
  }

  // Fallback for STAFF or other roles
  return <StaffDashboard />;
};

export default Dashboard;
