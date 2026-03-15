import { useState, useEffect, useRef } from "react";
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
  BarChart2,
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
  Camera,
  Upload,
  Receipt,
  ChevronDown,
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
  return "http://localhost:5001/api";
};
const API_BASE_URL = getApiBaseUrl();

// ========================================
//  OWNER DASHBOARD COMPONENT
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
  const [ownerClosePreview, setOwnerClosePreview] = useState<any>(null);
  const [ownerClosePreviewOpen, setOwnerClosePreviewOpen] = useState(false);

  // Real stats from API
  const [stats, setStats] = useState({
    chemistryRevenue: 0,
    pendingReimbursements: 0,
    poolRevenue: 0,
    floatingCash: 0,
    ownerNetRevenue: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    todayIncome: 0,
    todayExpenses: 0,
    totalStudents: 0,
    activeStudents: 0,
    totalTeachers: 0,
    totalExpected: 0,
    totalCollected: 0,
    totalPending: 0,
    collectionRate: 0,
    monthlyFeesCollected: 0,
    monthlyFeesCount: 0,
    netProfit: 0,
  });

  // Analytics data
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Academy config (owner name for banner)
  const [academyOwner, setAcademyOwner] = useState("");

  // Payout summary (partner/owner earnings)
  const [payoutSummary, setPayoutSummary] = useState<any>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditTarget, setCreditTarget] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);

  // Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("");

  // Inline close preview (auto-fetched for real-time display)
  const [inlinePreview, setInlinePreview] = useState<any>(null);
  const [inlinePreviewLoading, setInlinePreviewLoading] = useState(true);
  const [closeBreakdownExpanded, setCloseBreakdownExpanded] = useState(false);

  // Academy pool report (per-class, per-student details)
  const [academyPoolReport, setAcademyPoolReport] = useState<any>(null);
  const [academyPoolLoading, setAcademyPoolLoading] = useState(true);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

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

  // Fetch payout summary
  const fetchPayoutSummary = async () => {
    try {
      setPayoutLoading(true);
      const res = await fetch(`${API_BASE_URL}/finance/partner/payout-summary`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setPayoutSummary(data.data);
      }
    } catch (err) {
      console.error("Error fetching payout summary:", err);
    } finally {
      setPayoutLoading(false);
    }
  };

  // Fetch inline close preview (real-time breakdown)
  const fetchInlinePreview = async () => {
    try {
      setInlinePreviewLoading(true);
      const res = await fetch(`${API_BASE_URL}/finance/close-preview`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setInlinePreview(data.data);
      }
    } catch (err) {
      console.error("Error fetching inline preview:", err);
    } finally {
      setInlinePreviewLoading(false);
    }
  };

  // Fetch academy pool report
  const fetchAcademyPoolReport = async () => {
    try {
      setAcademyPoolLoading(true);
      const res = await fetch(`${API_BASE_URL}/finance/academy-pool-report`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setAcademyPoolReport(data.data);
      }
    } catch (err) {
      console.error("Error fetching academy pool report:", err);
    } finally {
      setAcademyPoolLoading(false);
    }
  };

  // Credit partner balance
  const handleCreditBalance = async () => {
    if (!creditTarget || !creditAmount) return;
    try {
      setCreditLoading(true);
      const res = await fetch(`${API_BASE_URL}/finance/partner/credit-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: creditTarget.userId,
          amount: Number(creditAmount),
          type: "Adjustment",
          note: creditNote || `Manual credit by ${user?.fullName}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Balance Updated", description: data.message });
        setCreditModalOpen(false);
        setCreditAmount("");
        setCreditNote("");
        setCreditTarget(null);
        fetchPayoutSummary();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update balance", variant: "destructive" });
    } finally {
      setCreditLoading(false);
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
        <title>${reportData.period} Financial Report - Edwardian Academy</title>
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
        <h1> ${reportData.period} Financial Report</h1>
        <p style="color: #64748b;">Edwardian Academy - Generated on ${new Date(reportData.generatedAt).toLocaleString()}</p>
        
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
          <p>Edwardian Academy - Confidential Financial Report</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleCloseDay = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/close-preview`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setOwnerClosePreview(data.data);
        setOwnerClosePreviewOpen(true);
      } else {
        // Fallback to old preview
        const res2 = await fetch(`${API_BASE_URL}/finance/close-day/preview`, { credentials: "include" });
        const data2 = await res2.json();
        if (data2.success) {
          setOwnerClosePreview(data2.data);
          setOwnerClosePreviewOpen(true);
        } else {
          setCloseConfirmOpen(true);
        }
      }
    } catch {
      setCloseConfirmOpen(true);
    }
  };

  const confirmCloseDay = async () => {
    setIsClosing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/finance/close-day`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || `Day closed! PKR ${(data.data?.closedAmount || 0).toLocaleString()} moved to verified.`);
        fetchStats();
        fetchInlinePreview();
        fetchAcademyPoolReport();
      } else {
        setError(data.message || "Failed to close day.");
      }
    } catch (err) {
      console.error("Error closing day:", err);
      setError("Failed to connect to server for closing day.");
    } finally {
      setIsClosing(false);
      setCloseConfirmOpen(false);
      setOwnerClosePreviewOpen(false);
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

        // Fetch payout summary
        await fetchPayoutSummary();

        // Fetch inline close preview + academy pool report
        await fetchInlinePreview();
        await fetchAcademyPoolReport();

        // Fetch academy config (owner name)
        try {
          const configRes = await fetch(`${API_BASE_URL}/config`, { credentials: "include" });
          const configData = await configRes.json();
          if (configData.success && configData.data?.academyOwner) {
            setAcademyOwner(configData.data.academyOwner);
          }
        } catch (_) {}

        setLoading(false);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load data from server");
        setLoading(false);
      }
    };
    fetchData();

    // Auto-refresh stats every 30 seconds for real-time sync
    const pollInterval = setInterval(() => {
      fetchStats();
      fetchAnalytics();
      fetchPayoutSummary();
      fetchInlinePreview();
      fetchAcademyPoolReport();
    }, 30000);

    return () => clearInterval(pollInterval);
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
              <span className="text-red-400">{academyOwner || user?.fullName || "Owner"}</span>
            </h1>
            <p className="text-slate-300 text-lg">
              Edwardian Academy - Management Dashboard
            </p>
          </div>
        </div>

        {/* Success/Error Alerts */}
        {successMessage && (
          <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
                
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900">Success!</p>
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-600 hover:text-green-800"
              >
                x
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
                x
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  PKR {(stats.monthlyIncome || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">This month's income</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  PKR {(stats.monthlyExpenses || 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">This month's outflow</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </div>

        </div>

        {/* ======= DAILY REVENUE CLOSE — Real-time calculation proof ======= */}
        <div className="mt-6">
          <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900">Daily Revenue Close</CardTitle>
                    <CardDescription className="text-slate-600">
                      Real-time calculation of your uncollected revenue — tuition splits + academy share
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Floating Cash</p>
                  <p className="text-3xl font-black text-emerald-700">
                    PKR {(inlinePreview?.netTotal ?? stats.floatingCash ?? 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Wallet Verified: <span className="font-semibold text-slate-700">PKR {(user as any)?.walletBalance?.verified?.toLocaleString() || "0"}</span></p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inline Revenue Breakdown — always visible */}
              {inlinePreviewLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mr-2" />
                  <span className="text-sm text-slate-500">Loading revenue breakdown...</span>
                </div>
              ) : inlinePreview && (inlinePreview.totalEntries > 0) ? (
                <div className="space-y-3">
                  {/* Summary Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-100/60 rounded-xl p-3 border border-emerald-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-700" />
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tuition Revenue</p>
                      </div>
                      <p className="text-xl font-black text-emerald-800">PKR {(inlinePreview.tuitionRevenue?.total || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-600">{inlinePreview.tuitionRevenue?.count || 0} fee entries (100% share)</p>
                    </div>
                    <div className="bg-blue-100/60 rounded-xl p-3 border border-blue-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Briefcase className="h-3.5 w-3.5 text-blue-700" />
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Academy Share</p>
                      </div>
                      <p className="text-xl font-black text-blue-800">PKR {(inlinePreview.academyShareRevenue?.total || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-blue-600">{inlinePreview.academyShareRevenue?.count || 0} entries from teacher splits</p>
                    </div>
                    <div className="bg-amber-100/60 rounded-xl p-3 border border-amber-200">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Adjustments</p>
                      </div>
                      <p className="text-xl font-black text-amber-800">PKR {(inlinePreview.withdrawalAdjustments?.total || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-amber-600">{inlinePreview.withdrawalAdjustments?.count || 0} withdrawal deductions</p>
                    </div>
                  </div>

                  {/* Expandable Calculation Proof */}
                  <button
                    onClick={() => setCloseBreakdownExpanded(!closeBreakdownExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                  >
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Calculation Proof — Per Student Breakdown
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${closeBreakdownExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {closeBreakdownExpanded && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                      {/* Tuition Items */}
                      {inlinePreview.tuitionRevenue?.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5" />
                            Tuition Revenue — Your classes (100% share, split with partners)
                          </p>
                          <div className="space-y-1.5">
                            {inlinePreview.tuitionRevenue.items.map((item: any, idx: number) => (
                              <div key={item._id || idx} className="flex items-center justify-between p-3 rounded-lg bg-white border border-emerald-100 hover:border-emerald-200 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-800">{item.studentName}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{item.className}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {item.splitDetails?.description || item.description || "Equal split among owner/partners"}
                                    {item.splitDetails?.totalFee && (
                                      <span className="ml-1 text-slate-400">
                                        · Total fee: PKR {item.splitDetails.totalFee.toLocaleString()} ÷ {item.splitDetails.splitCount} = PKR {item.amount?.toLocaleString()}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <span className="font-bold text-emerald-700 text-sm ml-3">+PKR {(item.amount || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Academy Share Items */}
                      {inlinePreview.academyShareRevenue?.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            Academy Share — From teacher split classes (your % from config)
                          </p>
                          <div className="space-y-1.5">
                            {inlinePreview.academyShareRevenue.items.map((item: any, idx: number) => (
                              <div key={item._id || idx} className="flex items-center justify-between p-3 rounded-lg bg-white border border-blue-100 hover:border-blue-200 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-800">{item.studentName}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{item.className}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {item.splitDetails?.description || item.description || "Academy share"}
                                  </p>
                                </div>
                                <span className="font-bold text-blue-700 text-sm ml-3">+PKR {(item.amount || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Withdrawal Adjustment Items */}
                      {inlinePreview.withdrawalAdjustments?.items?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Withdrawal Adjustments — Deductions for student refunds
                          </p>
                          <div className="space-y-1.5">
                            {inlinePreview.withdrawalAdjustments.items.map((item: any, idx: number) => (
                              <div key={item._id || idx} className="flex items-center justify-between p-3 rounded-lg bg-white border border-red-100 hover:border-red-200 transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-800">{item.studentName}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{item.className}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">Refund deduction</p>
                                </div>
                                <span className="font-bold text-red-700 text-sm ml-3">PKR {(item.amount || 0).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Net Total Calculation */}
                      <div className="bg-slate-900 text-white rounded-xl p-4 mt-2">
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-300">Tuition Revenue (100% share)</span>
                            <span className="font-semibold text-emerald-400">+PKR {(inlinePreview.tuitionRevenue?.total || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">Academy Share (config %)</span>
                            <span className="font-semibold text-blue-400">+PKR {(inlinePreview.academyShareRevenue?.total || 0).toLocaleString()}</span>
                          </div>
                          {(inlinePreview.withdrawalAdjustments?.total || 0) !== 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-300">Withdrawal Adjustments</span>
                              <span className="font-semibold text-red-400">PKR {(inlinePreview.withdrawalAdjustments?.total || 0).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-white text-base">NET CLOSEABLE</span>
                            <span className="font-black text-emerald-400 text-lg">PKR {(inlinePreview.netTotal || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-200">
                  <p className="text-sm text-slate-500">No uncollected revenue to close. Revenue will appear here when students pay fees.</p>
                </div>
              )}

              {/* Close Day Button */}
              <div className="flex items-center gap-4 pt-2">
                <Button
                  size="lg"
                  className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={handleCloseDay}
                  disabled={isClosing || !inlinePreview?.totalEntries}
                >
                  {isClosing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-5 w-5 mr-2" />
                  )}
                  Close Day — Review &amp; Verify
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats Row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {stats.totalStudents || 0}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{stats.activeStudents || 0} active</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Teachers</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {stats.totalTeachers || analytics?.quickStats?.totalTeachers || 0}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">On payroll</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Collection</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {stats.collectionRate || 0}%
                </p>
                <p className="text-xs text-slate-400 mt-0.5">PKR {(stats.totalCollected || 0).toLocaleString()} / {(stats.totalExpected || 0).toLocaleString()}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <CreditCard className="h-5 w-5" />
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

        {/* ======= ACADEMY POOL & REVENUE DISTRIBUTION ======= */}
        <Card className="mt-6 border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <HandCoins className="h-6 w-6 text-emerald-600" />
              Revenue Distribution &amp; Academy Pool
            </CardTitle>
            <CardDescription className="text-slate-600">
              Real-time breakdown: how every PKR flows from student fees to teachers, academy pool, and stakeholders — {payoutSummary?.month || "This Month"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* === Academy Pool Summary === */}
            {academyPoolLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                <span className="text-sm text-slate-500">Loading academy pool data...</span>
              </div>
            ) : academyPoolReport?.summary ? (
              <div className="space-y-4">
                {/* Pool Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-3 border border-sky-200">
                    <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Total Fee Collected</p>
                    <p className="text-xl font-black text-sky-900">PKR {(academyPoolReport.summary.totalFeeCollected || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-sky-600">All classes this month</p>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200">
                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Academy Pool</p>
                    <p className="text-xl font-black text-violet-900">PKR {(academyPoolReport.summary.totalAcademyPool || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-violet-600">From teacher splits (30% etc)</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Tuition Revenue</p>
                    <p className="text-xl font-black text-emerald-900">PKR {(academyPoolReport.summary.totalTuitionRevenue || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-600">Owner/Partner 100% share</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Academy Distributed</p>
                    <p className="text-xl font-black text-amber-900">PKR {(academyPoolReport.summary.totalAcademyRevenue || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-amber-600">Split by config %</p>
                  </div>
                </div>

                {/* Academy Share Split Config */}
                {academyPoolReport.summary.academyShareSplit?.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Academy Pool Distribution Config</p>
                    <div className="flex items-center gap-3">
                      {academyPoolReport.summary.academyShareSplit.map((s: any) => (
                        <div key={s.userId} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.role === "OWNER" ? "bg-red-100 border border-red-200" : "bg-blue-100 border border-blue-200"}`}>
                          <span className={`text-xs font-bold ${s.role === "OWNER" ? "text-red-700" : "text-blue-700"}`}>{s.fullName}</span>
                          <span className={`text-sm font-black ${s.role === "OWNER" ? "text-red-800" : "text-blue-800"}`}>{s.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-Class Revenue Breakdown */}
                {academyPoolReport.classBreakdown?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-sky-600" />
                      Per-Class Revenue Trail — How Each PKR Was Generated
                    </p>
                    <div className="space-y-2">
                      {academyPoolReport.classBreakdown.map((cls: any) => (
                        <div key={cls.classId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          {/* Class Header */}
                          <button
                            onClick={() => setExpandedClass(expandedClass === cls.classId ? null : cls.classId)}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold text-xs">
                                {cls.classTitle?.charAt(0) || "?"}
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-semibold text-slate-800">{cls.classTitle}</p>
                                <p className="text-[10px] text-slate-500">{cls.gradeLevel} · {cls.students?.length || 0} students paid · {cls.teachers?.length || 0} teachers</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-slate-500">Fee Collected</p>
                                <p className="text-sm font-bold text-slate-900">PKR {(cls.totalFeeCollected || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-violet-500">→ Academy Pool</p>
                                <p className="text-sm font-bold text-violet-700">PKR {(cls.totalAcademyPool || 0).toLocaleString()}</p>
                              </div>
                              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedClass === cls.classId ? "rotate-180" : ""}`} />
                            </div>
                          </button>

                          {/* Expanded: Teacher splits + Student details */}
                          {expandedClass === cls.classId && (
                            <div className="border-t border-slate-100 p-3 space-y-3 bg-slate-50/50">
                              {/* Teachers in this class */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Teachers &amp; Their Splits</p>
                                <div className="flex flex-wrap gap-2">
                                  {cls.teachers?.map((t: any, tidx: number) => (
                                    <div key={tidx} className={`px-3 py-1.5 rounded-lg border text-xs ${
                                      t.role === "OWNER" ? "bg-red-50 border-red-200 text-red-800" :
                                      t.role === "PARTNER" ? "bg-blue-50 border-blue-200 text-blue-800" :
                                      "bg-white border-slate-200 text-slate-800"
                                    }`}>
                                      <span className="font-semibold">{t.name}</span>
                                      <span className="text-slate-500 ml-1">({t.subject})</span>
                                      {t.compType === "tuition" && (
                                        <span className="ml-1 text-emerald-600 font-bold">100% tuition</span>
                                      )}
                                      {t.compType === "percentage" && (
                                        <span className="ml-1">
                                          <span className="text-emerald-600 font-bold">{t.teacherShare}%</span>
                                          <span className="text-slate-400"> / </span>
                                          <span className="text-violet-600 font-bold">{t.academyShare}% academy</span>
                                        </span>
                                      )}
                                      {t.compType === "perStudent" && (
                                        <span className="ml-1 text-orange-600 font-bold">PKR {(t.perStudentAmount || 0).toLocaleString()}/student</span>
                                      )}
                                      {t.compType === "fixed" && (
                                        <span className="ml-1 text-purple-600 font-bold">Fixed PKR {(t.fixedSalary || 0).toLocaleString()}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Student-by-student breakdown */}
                              <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Student Fee Breakdown</p>
                                <div className="space-y-1">
                                  {cls.students?.map((s: any, sidx: number) => (
                                    <div key={sidx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 text-sm">
                                      <div>
                                        <span className="font-medium text-slate-800">{s.studentName}</span>
                                        {s.studentId && <span className="text-xs text-slate-400 ml-2">#{s.studentId}</span>}
                                      </div>
                                      <div className="flex items-center gap-4 text-xs">
                                        <span className="text-slate-600">Fee: <span className="font-bold">PKR {(s.feePaid || 0).toLocaleString()}</span></span>
                                        <span className="text-emerald-700">Teacher: <span className="font-bold">PKR {(s.teacherPayout || 0).toLocaleString()}</span></span>
                                        <span className="text-violet-700">Academy: <span className="font-bold">PKR {(s.academyContribution || 0).toLocaleString()}</span></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Class Total */}
                              <div className="flex items-center justify-between p-2.5 bg-slate-900 text-white rounded-lg text-sm">
                                <span className="font-medium">Class Total</span>
                                <div className="flex items-center gap-4">
                                  <span>Fees: <span className="font-bold">PKR {(cls.totalFeeCollected || 0).toLocaleString()}</span></span>
                                  <span className="text-emerald-400">Teachers: <span className="font-bold">PKR {(cls.totalTeacherPayout || 0).toLocaleString()}</span></span>
                                  <span className="text-violet-400">Academy Pool: <span className="font-bold">PKR {(cls.totalAcademyPool || 0).toLocaleString()}</span></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-Stakeholder DailyRevenue Breakdown */}
                {academyPoolReport.stakeholders?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      Stakeholder Revenue Trail — Owner &amp; Partners
                    </p>
                    <div className="space-y-3">
                      {academyPoolReport.stakeholders.map((sh: any) => (
                        <div key={sh.userId} className={`rounded-xl border-2 p-4 ${sh.role === "OWNER" ? "border-red-200 bg-red-50/30" : "border-blue-200 bg-blue-50/30"}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-xs shadow ${sh.role === "OWNER" ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
                                {sh.fullName?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{sh.fullName}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sh.role === "OWNER" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{sh.role} · {sh.configPercentage}% config</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <p className="text-[10px] text-emerald-600 font-medium">Tuition</p>
                                <p className="text-sm font-bold text-emerald-700">PKR {(sh.tuitionTotal || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-blue-600 font-medium">Academy Share</p>
                                <p className="text-sm font-bold text-blue-700">PKR {(sh.academyTotal || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-orange-600 font-medium">Uncollected</p>
                                <p className="text-sm font-bold text-orange-700">PKR {(sh.uncollected || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-600 font-medium">Collected</p>
                                <p className="text-sm font-bold text-slate-700">PKR {(sh.collected || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          {/* Recent entries */}
                          {sh.entries?.length > 0 && (
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {sh.entries.slice(0, 10).map((e: any, eidx: number) => (
                                <div key={eidx} className="flex items-center justify-between px-2 py-1 rounded bg-white/60 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded-full font-bold ${e.type === "TUITION_SHARE" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                      {e.type === "TUITION_SHARE" ? "TUI" : "ACA"}
                                    </span>
                                    <span className="text-slate-700">{e.studentName} · {e.className}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${e.status === "UNCOLLECTED" ? "text-orange-600" : "text-green-600"}`}>
                                      {e.status === "UNCOLLECTED" ? "⏳" : "✅"} PKR {(e.amount || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {sh.entries.length > 10 && (
                                <p className="text-[10px] text-slate-400 text-center py-1">+ {sh.entries.length - 10} more entries</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* === Legacy Revenue Distribution (existing payout summary) === */}
            {payoutLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : payoutSummary?.partnersAndOwner?.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-600" />
                  Partner &amp; Owner Balances
                </p>
                {payoutSummary.partnersAndOwner.map((p: any) => (
                  <div key={p.userId} className={`rounded-xl border-2 transition-all ${p.role === "OWNER" ? "border-red-200 bg-red-50/30" : "border-blue-200 bg-blue-50/30"}`}>
                    {/* Partner/Owner Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition-colors rounded-t-xl"
                      onClick={() => setExpandedPartner(expandedPartner === p.userId ? null : p.userId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow ${p.role === "OWNER" ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-blue-500 to-blue-700"}`}>
                          {p.fullName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{p.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.role === "OWNER" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{p.role}</span>
                            {p.subject && <span className="text-xs text-slate-500">{p.subject}</span>}
                            <span className="text-xs text-slate-400">{p.totalStudents} students</span>
                            <span className="text-xs text-slate-400">{p.classes?.length || 0} classes</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">This Month</p>
                          <p className="text-lg font-bold text-emerald-700">PKR {(p.monthlyEarnings?.totalMonthly || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Balance</p>
                          <p className="text-lg font-bold text-sky-700">PKR {(p.balance?.total || 0).toLocaleString()}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreditTarget(p);
                            setCreditModalOpen(true);
                          }}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />
                          Credit
                        </Button>
                        <ArrowRight className={`h-5 w-5 text-slate-400 transition-transform ${expandedPartner === p.userId ? "rotate-90" : ""}`} />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedPartner === p.userId && (
                      <div className="border-t p-4 space-y-4">
                        {/* Earnings Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-xs text-emerald-600 font-medium">Teaching Income</p>
                            <p className="text-lg font-bold text-emerald-700">PKR {(p.monthlyEarnings?.teachingIncome || 0).toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                            <p className="text-xs text-violet-600 font-medium">Pool Dividends</p>
                            <p className="text-lg font-bold text-violet-700">PKR {(p.monthlyEarnings?.dividendIncome || 0).toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <p className="text-xs text-orange-600 font-medium">Floating</p>
                            <p className="text-lg font-bold text-orange-700">PKR {(p.balance?.floating || 0).toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                            <p className="text-xs text-green-600 font-medium">Verified</p>
                            <p className="text-lg font-bold text-green-700">PKR {(p.balance?.verified || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Classes */}
                        {p.classes?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4 text-sky-500" /> Classes ({p.classes.length})
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {p.classes.map((c: any) => (
                                <div key={c.classId} className="flex items-center justify-between p-2.5 bg-white rounded-lg border">
                                  <div>
                                    <p className="text-sm font-medium text-slate-800">{c.classTitle}</p>
                                    <p className="text-xs text-slate-500">{c.gradeLevel} — {c.mySubjects?.join(", ") || "All subjects"}</p>
                                  </div>
                                  <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">{c.enrolledCount} students</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* All-Time Summary */}
                        <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                          <span className="text-sm font-medium text-slate-600">All-Time Earnings</span>
                          <span className="text-sm font-bold text-slate-900">PKR {(p.allTimeEarnings?.totalAllTime || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <HandCoins className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No partner/owner data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Balance Modal */}
        <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Credit Balance — {creditTarget?.fullName}
              </DialogTitle>
              <DialogDescription>
                Manually credit or adjust the verified balance for this partner/owner.
                Use negative amounts to deduct.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {creditTarget && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Current Balance:</span>
                    <span className="font-semibold">PKR {(creditTarget.balance?.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (PKR)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter amount..."
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note (optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Reason for adjustment..."
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreditBalance}
                disabled={creditLoading || !creditAmount}
              >
                {creditLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {Number(creditAmount) >= 0 ? "Credit" : "Deduct"} Balance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Financial Reports Section */}
        <Card className="mt-6 border-slate-200 bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
              <FileText className="h-6 w-6 text-red-600" />
              Generate Financial Reports
            </CardTitle>
            <CardDescription className="text-slate-600">
              One-click reports for any period - printable & downloadable
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

        {/* --- OWNER CLOSE DAY PREVIEW DIALOG --- */}
        <Dialog open={ownerClosePreviewOpen} onOpenChange={setOwnerClosePreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Lock className="h-5 w-5 text-emerald-600" />
                Daily Revenue Close — Review
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                Review your revenue breakdown before closing. Floating cash → Verified.
              </DialogDescription>
            </DialogHeader>

            {ownerClosePreview && (
              <div className="space-y-4">
                {/* Net Total Banner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Net Closeable Amount</p>
                    <p className="text-3xl font-black text-emerald-900">PKR {(ownerClosePreview.netTotal || ownerClosePreview.totalAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right text-sm text-emerald-700">
                    <p><span className="font-semibold">{ownerClosePreview.totalEntries || ownerClosePreview.transactionCount || 0}</span> entries</p>
                  </div>
                </div>

                {/* Tuition Revenue Section */}
                {ownerClosePreview.tuitionRevenue && ownerClosePreview.tuitionRevenue.count > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4" />
                        Tuition Revenue (100% Share)
                      </p>
                      <span className="text-sm font-bold text-emerald-700">PKR {ownerClosePreview.tuitionRevenue.total.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      {ownerClosePreview.tuitionRevenue.items.map((item: any, idx: number) => (
                        <div key={item._id || idx} className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-slate-800 text-sm">{item.studentName || "Student"}</span>
                            <span className="font-bold text-emerald-700 text-sm">PKR {(item.amount || 0).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500">{item.className} · {item.description || "Equal split among teachers"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Academy Share Revenue Section */}
                {ownerClosePreview.academyShareRevenue && ownerClosePreview.academyShareRevenue.count > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        Academy Share Revenue
                      </p>
                      <span className="text-sm font-bold text-blue-700">PKR {ownerClosePreview.academyShareRevenue.total.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      {ownerClosePreview.academyShareRevenue.items.map((item: any, idx: number) => (
                        <div key={item._id || idx} className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-slate-800 text-sm">{item.studentName || "Student"}</span>
                            <span className="font-bold text-blue-700 text-sm">PKR {(item.amount || 0).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500">{item.className} · {item.description || "Academy share split"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Withdrawal Adjustments Section */}
                {ownerClosePreview.withdrawalAdjustments && ownerClosePreview.withdrawalAdjustments.count > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" />
                        Withdrawal Adjustments
                      </p>
                      <span className="text-sm font-bold text-red-700">PKR {ownerClosePreview.withdrawalAdjustments.total.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      {ownerClosePreview.withdrawalAdjustments.items.map((item: any, idx: number) => (
                        <div key={item._id || idx} className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-slate-800 text-sm">{item.studentName || "Student"}</span>
                            <span className="font-bold text-red-700 text-sm">PKR {(item.amount || 0).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500">{item.className} · Refund deduction</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: Old-format breakdown for backwards compatibility */}
                {!ownerClosePreview.tuitionRevenue && (ownerClosePreview.breakdown || []).length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Student Breakdown</p>
                    <div className="space-y-2">
                      {ownerClosePreview.breakdown.map((item: any, idx: number) => (
                        <div key={item.studentId || idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-800 text-sm">{item.studentName}</span>
                            <span className="font-bold text-emerald-700 text-sm">PKR {(item.totalMyShare || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(item.subjects || []).map((s: any, si: number) => (
                              <span key={si} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.shareType === 'PARTNER_100' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {s.subject}: PKR {(s.teacherShare || 0).toLocaleString()}
                                {s.shareType === 'PARTNER_100' && <span className="text-[10px]">(100%)</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {ownerClosePreview.totalEntries === 0 && (!ownerClosePreview.breakdown || ownerClosePreview.breakdown?.length === 0) && (
                  <p className="text-sm text-slate-500 text-center py-4">No uncollected revenue to close.</p>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 mt-2">
              <Button variant="outline" onClick={() => setOwnerClosePreviewOpen(false)} className="h-10">
                Cancel
              </Button>
              <Button
                onClick={confirmCloseDay}
                disabled={isClosing}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isClosing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
                Confirm &amp; Close Day
              </Button>
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
                 Close Day
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </DashboardLayout>
    </TooltipProvider>
  );
};


// ========================================
//  PARTNER DASHBOARD COMPONENT
// ========================================
const PartnerDashboard = () => {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "transactions" | "earnings" | "timetable">("overview");
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Financial data
  const [partnerStats, setPartnerStats] = useState<any>(null);

  // Teacher-like data
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Settlement history
  const [settlements, setSettlements] = useState<any[]>([]);

  // Payout summary (classes, students, money trail)
  const [payoutData, setPayoutData] = useState<any>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [isClosingDay, setIsClosingDay] = useState(false);
  const [showMoneyTrail, setShowMoneyTrail] = useState(false);
  const [closePreview, setClosePreview] = useState<any>(null);
  const [closePreviewOpen, setClosePreviewOpen] = useState(false);

  // Inline close preview for partner
  const [partnerInlinePreview, setPartnerInlinePreview] = useState<any>(null);
  const [partnerPreviewLoading, setPartnerPreviewLoading] = useState(true);
  const [partnerBreakdownExpanded, setPartnerBreakdownExpanded] = useState(false);

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const capitalizeSubject = (s: string) => {
    const map: Record<string, string> = {
      biology: "Biology", chemistry: "Chemistry", physics: "Physics",
      math: "Mathematics", english: "English", urdu: "Urdu",
      islamiat: "Islamiat", computer: "Computer Science", zoology: "Zoology", botany: "Botany",
    };
    return map[s?.toLowerCase()] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "N/A");
  };

  // Fetch partner dashboard data
  const fetchPartnerData = async () => {
    try {
      setLoading(true);

      // Fetch partner financial stats (includes teacher credits now)
      const statsRes = await fetch(`${API_BASE_URL}/finance/partner/dashboard`, { credentials: "include" });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setPartnerStats(statsData.data);
      }

      // Fetch teacher profile if partnerId links to teacher
      if (user?.teacherId) {
        const profileRes = await fetch(`${API_BASE_URL}/teachers/${user.teacherId}`, { credentials: "include" });
        const profileData = await profileRes.json();
        if (profileData.success) setTeacherProfile(profileData.data);
      }

      // Fetch timetable
      const ttRes = await fetch(`${API_BASE_URL}/timetable`, { credentials: "include" });
      const ttData = await ttRes.json();
      if (ttData.success) {
        const sorted = (ttData.data || []).sort((a: any, b: any) => {
          const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return (a.startTime || "").localeCompare(b.startTime || "");
        });
        setTimetable(sorted);
      }

      // Fetch settlement history for this partner
      const settlementsRes = await fetch(`${API_BASE_URL}/finance/partner/settlements`, { credentials: "include" });
      const settlementsData = await settlementsRes.json();
      if (settlementsData.success) setSettlements(settlementsData.data || []);

      // Fetch payout summary (classes, students, revenue trail)
      try {
        const payoutRes = await fetch(`${API_BASE_URL}/finance/partner/payout-summary`, { credentials: "include" });
        const payoutResData = await payoutRes.json();
        if (payoutResData.success && payoutResData.data?.partnersAndOwner?.length > 0) {
          setPayoutData(payoutResData.data.partnersAndOwner[0]);
        }
      } catch (e) {
        console.error("Payout summary fetch error:", e);
      }
      setPayoutLoading(false);
    } catch (err) {
      console.error("Error fetching partner data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, [user]);

  // Profile image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid file", description: "Please select an image" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB" }); return; }
    try {
      setUploadingImage(true);
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            if (width > 800) { height = (height * 800) / width; width = 800; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("Canvas error")); return; }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          };
          img.onerror = () => reject(new Error("Load error"));
          img.src = ev.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Read error"));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_BASE_URL}/teachers/me/profile`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ profileImage: compressedBase64 }),
      });
      const data = await res.json();
      if (data.success) {
        setTeacherProfile((prev: any) => ({ ...prev, profileImage: compressedBase64 }));
        await checkAuth();
        toast({ title: "Profile picture updated!" });
      } else {
        toast({ title: "Update failed", description: data.message });
      }
    } catch (err) {
      toast({ title: "Upload error", description: "Something went wrong" });
    } finally {
      setUploadingImage(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  };

  // Payment request handler

  // Fetch inline close preview for partner (auto-loads on mount + polls)
  const fetchPartnerInlinePreview = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/finance/close-preview`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setPartnerInlinePreview(data.data);
      }
    } catch (err) {
      // silent
    } finally {
      setPartnerPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerInlinePreview();
    const interval = setInterval(fetchPartnerInlinePreview, 30000);
    return () => clearInterval(interval);
  }, []);

  // Daily Closing handler for partners — shows preview first
  const handlePartnerCloseDay = async () => {
    try {
      setIsClosingDay(true);
      const res = await fetch(`${API_BASE_URL}/finance/close-preview`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setClosePreview(data.data);
        setClosePreviewOpen(true);
      } else {
        // Fallback to old preview
        const res2 = await fetch(`${API_BASE_URL}/finance/close-day/preview`, { credentials: "include" });
        const data2 = await res2.json();
        if (data2.success) {
          setClosePreview(data2.data);
          setClosePreviewOpen(true);
        } else {
          setError(data2.message || "Nothing to close today.");
        }
      }
    } catch (err) {
      setError("Failed to connect to server.");
    } finally {
      setIsClosingDay(false);
    }
  };

  const confirmPartnerCloseDay = async () => {
    try {
      setIsClosingDay(true);
      const res = await fetch(`${API_BASE_URL}/finance/close-day`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Day closed! PKR ${(data.data?.closedAmount || data.data?.totalAmount || 0).toLocaleString()} verified.`);
        setClosePreviewOpen(false);
        fetchPartnerData();
        fetchPartnerInlinePreview();
      } else {
        setError(data.message || "Failed to close day.");
      }
    } catch (err) {
      setError("Failed to connect to server.");
    } finally {
      setIsClosingDay(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayClasses = timetable.filter((t: any) => t.day === today);
  const currentImage = teacherProfile?.profileImage || user?.profileImage;
  const tc = partnerStats?.teacherCredits;

  const groupedByDay = timetable.reduce((acc: any, entry: any) => {
    if (!acc[entry.day]) acc[entry.day] = [];
    acc[entry.day].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <DashboardLayout title="Partner Dashboard">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Partner Dashboard">
      <input ref={profileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 p-6 md:p-8 shadow-2xl border-b-4 border-yellow-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 relative group">
            {currentImage ? (
              <img src={currentImage} alt={user?.fullName} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-4 border-yellow-400/50 shadow-xl" />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-yellow-400/50 shadow-xl">
                <span className="text-3xl font-bold text-white">{user?.fullName?.charAt(0) || "P"}</span>
              </div>
            )}
            {user?.teacherId && (
              <button onClick={() => profileInputRef.current?.click()} disabled={uploadingImage}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-4 border-transparent">
                {uploadingImage ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : (
                  <div className="text-center"><Camera className="h-5 w-5 text-white mx-auto" /><span className="text-[10px] text-white font-medium">Change</span></div>
                )}
              </button>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Welcome, <span className="text-yellow-400">{user?.fullName || "Partner"}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium border border-yellow-500/30">
                <Briefcase className="h-3.5 w-3.5" /> {user?.role || "Partner"}
              </span>
              {teacherProfile?.subject && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
                  <BookOpen className="h-3.5 w-3.5" /> {capitalizeSubject(teacherProfile.subject)}
                </span>
              )}
              {partnerStats?.splitPercentage > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 text-slate-300 text-xs font-medium border border-slate-500/30">
                  <PieChart className="h-3.5 w-3.5" /> {partnerStats.splitPercentage}% Expense Share
                </span>
              )}
            </div>
            <p className="text-blue-200 text-sm mt-2">
              Edwardian Academy - {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="mt-4 bg-green-50 border border-green-300 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800 flex-1">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 text-sm font-bold">x</button>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-300 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-sm font-bold">x</button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {([ "overview", "expenses", "transactions", "earnings", "timetable"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            {tab === "overview" ? "Overview" : tab === "expenses" ? "My Expenses" : tab === "transactions" ? "Transactions" : tab === "earnings" ? "Earnings & Trail" : "Timetable"}
          </button>
        ))}
      </div>

      {/* ======= OVERVIEW TAB ======= */}
      {activeTab === "overview" && (
        <div className="mt-6 space-y-6">
          {/* ── Daily Revenue Close ── */}
          {(() => {
            const pip = partnerInlinePreview;
            const netTotal = pip?.netTotal || 0;
            const tuitionTotal = pip?.tuitionRevenue?.total || 0;
            const academyTotal = pip?.academyShareRevenue?.total || 0;
            const adjustTotal = pip?.withdrawalAdjustments?.total || 0;
            const hasData = netTotal > 0 || (tc?.floating || 0) > 0;
            if (!hasData && !partnerPreviewLoading) return null;

            return (
              <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                {/* Header */}
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                      <Lock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-900">Daily Revenue Close</h3>
                      <p className="text-xs text-amber-600">{new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-700 font-medium">Closeable Amount</p>
                    <p className="text-3xl font-black text-amber-900">PKR {(netTotal || tc?.floating || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Summary cards */}
                {pip && (
                  <div className="px-5 pb-3 grid grid-cols-3 gap-3">
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-600 font-medium">Tuition Revenue</p>
                      <p className="text-lg font-bold text-emerald-700">PKR {tuitionTotal.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{pip.tuitionRevenue?.count || 0} entries</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 font-medium">Academy Share</p>
                      <p className="text-lg font-bold text-blue-700">PKR {academyTotal.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{pip.academyShareRevenue?.count || 0} entries</p>
                    </div>
                    <div className="bg-white/70 rounded-lg p-3 text-center">
                      <p className="text-xs text-red-600 font-medium">Adjustments</p>
                      <p className="text-lg font-bold text-red-700">{adjustTotal < 0 ? "−" : ""}PKR {Math.abs(adjustTotal).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{pip.withdrawalAdjustments?.count || 0} entries</p>
                    </div>
                  </div>
                )}

                {/* Expandable calculation proof */}
                {pip && (pip.tuitionRevenue?.items?.length > 0 || pip.academyShareRevenue?.items?.length > 0) && (
                  <div className="px-5 pb-3">
                    <button
                      onClick={() => setPartnerBreakdownExpanded(!partnerBreakdownExpanded)}
                      className="w-full flex items-center justify-between py-2 px-3 bg-white/50 rounded-lg text-sm font-medium text-amber-800 hover:bg-white/70 transition"
                    >
                      <span className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Calculation Proof — Per-Student Breakdown
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${partnerBreakdownExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {partnerBreakdownExpanded && (
                      <div className="mt-2 space-y-3 max-h-[400px] overflow-y-auto">
                        {/* Tuition items */}
                        {pip.tuitionRevenue?.items?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-emerald-700 mb-1 uppercase tracking-wide">Tuition Revenue</p>
                            {pip.tuitionRevenue.items.map((item: any, i: number) => (
                              <div key={i} className="bg-white rounded-lg p-3 mb-2 border border-emerald-100">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-sm text-slate-800">{item.studentName || "Student"}</p>
                                    <p className="text-xs text-slate-500">{item.className || "Class"}</p>
                                  </div>
                                  <p className="font-bold text-emerald-700">+PKR {(item.amount || 0).toLocaleString()}</p>
                                </div>
                                {item.splitDetails && (
                                  <div className="mt-1.5 p-2 bg-emerald-50 rounded text-xs text-emerald-700">
                                    {item.splitDetails.totalFee && <span>Fee: PKR {item.splitDetails.totalFee.toLocaleString()}</span>}
                                    {item.splitDetails.splitCount && <span className="ml-2">÷ {item.splitDetails.splitCount} teachers</span>}
                                    {item.splitDetails.yourShare && <span className="ml-2">= PKR {item.splitDetails.yourShare.toLocaleString()}/each</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Academy share items */}
                        {pip.academyShareRevenue?.items?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Academy Share Revenue</p>
                            {pip.academyShareRevenue.items.map((item: any, i: number) => (
                              <div key={i} className="bg-white rounded-lg p-3 mb-2 border border-blue-100">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-sm text-slate-800">{item.studentName || "Student"}</p>
                                    <p className="text-xs text-slate-500">{item.className || "Class"}</p>
                                  </div>
                                  <p className="font-bold text-blue-700">+PKR {(item.amount || 0).toLocaleString()}</p>
                                </div>
                                {item.splitDetails && (
                                  <div className="mt-1.5 p-2 bg-blue-50 rounded text-xs text-blue-700">
                                    {item.splitDetails.totalFee && <span>Fee: PKR {item.splitDetails.totalFee.toLocaleString()}</span>}
                                    {item.splitDetails.teacherShare && <span className="ml-2">Teacher: {item.splitDetails.teacherShare}%</span>}
                                    {item.splitDetails.academyShare && <span className="ml-2">Academy: {item.splitDetails.academyShare}%</span>}
                                    {item.splitDetails.yourConfigShare && <span className="ml-2">Your split: {item.splitDetails.yourConfigShare}%</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Withdrawal adjustments */}
                        {pip.withdrawalAdjustments?.items?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-700 mb-1 uppercase tracking-wide">Withdrawal Adjustments</p>
                            {pip.withdrawalAdjustments.items.map((item: any, i: number) => (
                              <div key={i} className="bg-white rounded-lg p-3 mb-2 border border-red-100">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold text-sm text-slate-800">{item.studentName || "Adjustment"}</p>
                                    <p className="text-xs text-slate-500">{item.className || ""}</p>
                                  </div>
                                  <p className="font-bold text-red-600">−PKR {Math.abs(item.amount || 0).toLocaleString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Net total bar + Close button */}
                <div className="bg-amber-900 text-white px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-200">Net Closeable</p>
                    <p className="text-2xl font-black">PKR {(netTotal || tc?.floating || 0).toLocaleString()}</p>
                  </div>
                  <Button
                    className="bg-white text-amber-900 hover:bg-amber-100 font-bold px-6"
                    onClick={handlePartnerCloseDay}
                    disabled={isClosingDay || netTotal === 0}
                  >
                    {isClosingDay ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    Close Day — Review & Verify
                  </Button>
                </div>
              </div>
            );
          })()}
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Expense Debt */}
            <div className={`rounded-2xl p-5 shadow-lg border-l-4 ${(partnerStats?.expenseDebt || 0) > 0 ? "bg-red-50 border-red-500" : "bg-white border-green-500"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-medium ${(partnerStats?.expenseDebt || 0) > 0 ? "text-red-700" : "text-slate-600"}`}>Expense Payable</p>
                  <p className={`text-3xl font-bold mt-1 ${(partnerStats?.expenseDebt || 0) > 0 ? "text-red-600" : "text-slate-900"}`}>
                    PKR {(partnerStats?.expenseDebt || 0).toLocaleString()}
                  </p>
                  {(partnerStats?.expenseDebt || 0) > 0 ? (
                    <p className="text-xs text-red-600 font-medium mt-1">Contact owner to settle</p>
                  ) : (
                    <p className="text-xs text-green-600 font-medium mt-1">All Caught Up!</p>
                  )}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow ${(partnerStats?.expenseDebt || 0) > 0 ? "bg-red-500 text-white" : "bg-green-100 text-green-600"}`}>
                  {(partnerStats?.expenseDebt || 0) > 0 ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
              </div>
            </div>

            {/* Total Settled */}
            <div className="rounded-2xl bg-white p-5 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Settled</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">PKR {(partnerStats?.totalSettled || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Lifetime payments</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow">
                  <HandCoins className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Teacher Credits */}
            {tc && (
              <div className="rounded-2xl bg-white p-5 shadow-lg border-l-4 border-emerald-500">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Teacher Credits</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">PKR {(tc.totalCredits || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">Unpaid earnings</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>
              </div>
            )}

            {/* Today's Classes */}
            <div className="rounded-2xl bg-white p-5 shadow-lg border-l-4 border-purple-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Today's Classes</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{todayClasses.length}</p>
                  <p className="text-xs text-slate-500 mt-1">{today}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow">
                  <CalendarDays className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Expense Debt Breakdown */}
          {partnerStats?.debtDetails && partnerStats.debtDetails.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-red-800">
                  <FileText className="h-5 w-5" /> Outstanding Expense Shares
                </CardTitle>
                <CardDescription className="text-red-600">
                  Your share of academy expenses ({partnerStats.splitPercentage}%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {partnerStats.debtDetails.map((d: any) => (
                    <div key={d.expenseId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{d.title}</p>
                        <p className="text-xs text-slate-500">{d.category} - {new Date(d.expenseDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">PKR {d.myShare.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{d.myPercentage}% of {d.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Teacher Earnings Summary (if partner is also teacher) */}
          {tc && (
            <Card className="border-emerald-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
                  <Wallet className="h-5 w-5" /> Teacher Earnings Summary
                </CardTitle>
                <CardDescription>
                  Your teaching credits for {capitalizeSubject(tc.subject || "")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium">Floating</p>
                    <p className="text-lg font-bold text-orange-700">PKR {(tc.floating || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 font-medium">Verified</p>
                    <p className="text-lg font-bold text-green-700">PKR {(tc.verified || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Pending</p>
                    <p className="text-lg font-bold text-blue-700">PKR {(tc.pending || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-700">PKR {(tc.totalPaid || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Schedule Preview */}
          {todayClasses.length > 0 && (
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5 text-emerald-600" /> Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayClasses.map((entry: any, idx: number) => (
                    <div key={entry._id || idx} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold">{idx + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{entry.classId?.classTitle || entry.classId?.className || "Class"}</p>
                        <p className="text-xs text-slate-500">{capitalizeSubject(entry.subject)}</p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700">{entry.startTime} - {entry.endTime}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Classes & Students (from payout data) */}
          {!payoutLoading && payoutData && (
            <>
              {/* My Classes */}
              {payoutData.classes?.length > 0 && (
                <Card className="border-sky-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-sky-800">
                      <BookOpen className="h-5 w-5" /> My Classes ({payoutData.classes.length})
                    </CardTitle>
                    <CardDescription>Classes you teach with student count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {payoutData.classes.map((c: any) => (
                        <div key={c.classId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-sky-100 hover:shadow-md transition-all">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{c.classTitle}</p>
                            <p className="text-xs text-slate-500">{c.gradeLevel} — {c.mySubjects?.join(", ") || "All subjects"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-200">{c.enrolledCount} students</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Earnings Summary */}
              <Card className="border-violet-200 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg text-violet-800">
                        <TrendingUp className="h-5 w-5" /> Monthly Revenue
                      </CardTitle>
                      <CardDescription>Your earnings this month</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-700">PKR {(payoutData.monthlyEarnings?.totalMonthly || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">This Month</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-medium">Teaching Income (100%)</p>
                      <p className="text-lg font-bold text-emerald-700">PKR {(payoutData.monthlyEarnings?.teachingIncome || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                      <p className="text-xs text-violet-600 font-medium">Pool Dividends</p>
                      <p className="text-lg font-bold text-violet-700">PKR {(payoutData.monthlyEarnings?.dividendIncome || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Students This Month */}
              {payoutData.newStudents?.length > 0 && (
                <Card className="border-emerald-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
                      <UserPlus className="h-5 w-5" /> New Students This Month ({payoutData.newStudents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {payoutData.newStudents.map((s: any) => (
                        <div key={s.studentId} className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{s.studentName}</p>
                            <p className="text-xs text-slate-500">{s.class} — ID: {s.studentId}</p>
                          </div>
                          <span className="text-sm font-semibold text-emerald-700">PKR {(s.totalFee || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Students */}
              {payoutData.students?.length > 0 && (
                <Card className="border-slate-200 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                      <GraduationCap className="h-5 w-5" /> My Students ({payoutData.totalStudents})
                    </CardTitle>
                    <CardDescription>Students enrolled in your classes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-80 overflow-y-auto space-y-1.5">
                      {payoutData.students.map((s: any) => (
                        <div key={s.studentId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border hover:bg-white transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{s.studentName?.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{s.studentName}</p>
                              <p className="text-xs text-slate-500">{s.class} — ID: {s.studentId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-700">PKR {(s.paidAmount || 0).toLocaleString()} / {(s.totalFee || 0).toLocaleString()}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.feeStatus === "paid" ? "bg-green-100 text-green-700" : s.feeStatus === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s.feeStatus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ======= MY EXPENSES TAB ======= */}
      {activeTab === "expenses" && (
        <div className="mt-6">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-red-600" /> My Expense Shares
                  </CardTitle>
                  <CardDescription>
                    Your {partnerStats?.splitPercentage || 0}% share of academy expenses
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">PKR {(partnerStats?.expenseDebt || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Outstanding</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!partnerStats?.debtDetails || partnerStats.debtDetails.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="text-sm font-medium text-green-700">All Caught Up!</p>
                  <p className="text-xs text-slate-500">No outstanding expense shares</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partnerStats.debtDetails.map((d: any) => (
                    <div key={d.expenseId} className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{d.title}</p>
                          <p className="text-xs text-slate-500">{d.category}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "PAID" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {d.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total: PKR {d.totalAmount.toLocaleString()}</span>
                        <span className="font-bold text-red-600">My Share: PKR {d.myShare.toLocaleString()} ({d.myPercentage}%)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{new Date(d.expenseDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                  ))}
                  {(partnerStats?.expenseDebt || 0) > 0 && (
                    <p className="text-sm text-center text-red-600 font-medium mt-2 py-3 border border-red-200 rounded-lg bg-red-50">
                      PKR {partnerStats.expenseDebt.toLocaleString()} outstanding — the owner will record your settlement
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======= TRANSACTIONS TAB ======= */}
      {activeTab === "transactions" && (
        <div className="mt-6 space-y-6">
          {/* Expense Settlements */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HandCoins className="h-5 w-5 text-blue-600" /> Expense Settlements
                  </CardTitle>
                  <CardDescription>Payments recorded by the owner for your expense shares</CardDescription>
                </div>
                {settlements.length > 0 && (
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-700">
                      PKR {settlements.filter((s: any) => s.status === "COMPLETED").reduce((sum: number, s: any) => sum + (s.amount || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Total settled</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <div className="text-center py-12">
                  <HandCoins className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No settlements recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {settlements.map((s: any) => (
                    <div key={s._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm text-white ${s.status === "COMPLETED" ? "bg-blue-500" : "bg-orange-400"}`}>
                          <HandCoins className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Expense Settlement {s.method ? `· ${s.method}` : ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(s.date || s.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            {s.recordedBy?.fullName ? ` — recorded by ${s.recordedBy.fullName}` : ""}
                          </p>
                          {s.notes && <p className="text-xs text-slate-400 mt-0.5">{s.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-700">PKR {(s.amount || 0).toLocaleString()}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teacher Payouts in Transactions view */}
          {tc && tc.payoutHistory && tc.payoutHistory.length > 0 && (
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-emerald-600" /> Teacher Salary Payouts
                </CardTitle>
                <CardDescription>Payments received for your teaching work</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {tc.payoutHistory.map((p: any) => (
                    <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
                          <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {p.voucherId || "Salary Payout"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(p.paymentDate || p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            {p.month && p.year ? ` — ${p.month} ${p.year}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-700">+PKR {(p.amountPaid || 0).toLocaleString()}</p>
                        <p className={`text-xs ${p.status === "paid" ? "text-green-600" : "text-orange-500"}`}>{p.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ======= TEACHER EARNINGS TAB ======= */}
      {activeTab === "earnings" && (
        <div className="mt-6 space-y-6">
          {tc ? (
            <>
              {/* Current Balance Card */}
              <Card className="border-emerald-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
                    <Wallet className="h-5 w-5" /> Current Balance
                  </CardTitle>
                  <CardDescription>
                    Teaching credits for {capitalizeSubject(tc.subject || "")} ({tc.compensationType})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider">Floating</p>
                      <p className="text-2xl font-bold text-orange-700 mt-1">PKR {(tc.floating || 0).toLocaleString()}</p>
                      <p className="text-xs text-orange-500 mt-1">Today's unverified</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <p className="text-xs text-green-600 font-semibold uppercase tracking-wider">Verified</p>
                      <p className="text-2xl font-bold text-green-700 mt-1">PKR {(tc.verified || 0).toLocaleString()}</p>
                      <p className="text-xs text-green-500 mt-1">Ready for payout</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Pending</p>
                      <p className="text-2xl font-bold text-blue-700 mt-1">PKR {(tc.pending || 0).toLocaleString()}</p>
                      <p className="text-xs text-blue-500 mt-1">Awaiting processing</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Total Paid</p>
                      <p className="text-2xl font-bold text-emerald-700 mt-1">PKR {(tc.totalPaid || 0).toLocaleString()}</p>
                      <p className="text-xs text-emerald-500 mt-1">Lifetime payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Money Trail */}
              {payoutData && (
                <>
                  <Card className="border-violet-200 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-violet-800">
                        <TrendingUp className="h-5 w-5" /> Revenue Trail — This Month
                      </CardTitle>
                      <CardDescription>Per-student fee breakdown showing your 100% teaching income</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 text-center">
                          <p className="text-xs text-violet-600 font-semibold uppercase tracking-wider">Teaching Income</p>
                          <p className="text-xl font-bold text-violet-700 mt-1">PKR {(payoutData.monthlyEarnings?.teachingIncome || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Pool Dividends</p>
                          <p className="text-xl font-bold text-emerald-700 mt-1">PKR {(payoutData.monthlyEarnings?.dividendIncome || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Total This Month</p>
                          <p className="text-xl font-bold text-blue-700 mt-1">PKR {(payoutData.monthlyEarnings?.totalMonthly || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Per-student breakdown */}
                      {payoutData.moneyTrail?.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Per-Student Fee Payments</p>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {payoutData.moneyTrail.map((trail: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-200 text-violet-700 font-bold text-sm">
                                    {(trail.studentName || "?")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{trail.studentName}</p>
                                    <p className="text-xs text-slate-500">
                                      {trail.month} · {trail.splitType?.replace(/_/g, " ")}
                                      {trail.date ? ` · ${new Date(trail.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-violet-700">+PKR {(trail.teacherShare || 0).toLocaleString()}</p>
                                  <p className="text-xs text-slate-400">of PKR {(trail.feeAmount || 0).toLocaleString()} total</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <TrendingUp className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-500">No fee payments recorded this month</p>
                        </div>
                      )}

                      {/* Pool dividends */}
                      {payoutData.dividends?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pool Dividend Payments</p>
                          <div className="space-y-2">
                            {payoutData.dividends.map((d: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{d.description || "Pool Dividend"}</p>
                                  <p className="text-xs text-slate-500">
                                    {d.poolType} pool · {d.percentage}% share
                                    {d.date ? ` · ${new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-emerald-700">+PKR {(d.amount || 0).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* All-Time Summary */}
                  <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart2 className="h-5 w-5 text-slate-600" /> All-Time Earnings Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Teaching</p>
                          <p className="text-lg font-bold text-slate-800 mt-1">PKR {(payoutData.allTimeEarnings?.teachingIncome || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dividends</p>
                          <p className="text-lg font-bold text-slate-800 mt-1">PKR {(payoutData.allTimeEarnings?.dividendIncome || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Earned</p>
                          <p className="text-lg font-bold text-slate-800 mt-1">PKR {(payoutData.allTimeEarnings?.totalAllTime || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Paid Out</p>
                          <p className="text-lg font-bold text-emerald-700 mt-1">PKR {(payoutData.allTimeEarnings?.totalPaid || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Payout History */}
              <Card className="border-slate-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-blue-600" /> Payout History
                  </CardTitle>
                  <CardDescription>Your teacher salary payouts</CardDescription>
                </CardHeader>
                <CardContent>
                  {!tc.payoutHistory || tc.payoutHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm text-slate-500">No payouts recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {tc.payoutHistory.map((p: any) => (
                        <div key={p._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
                              <ArrowUpRight className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {p.voucherId || "Payout"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(p.paymentDate || p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                {p.month && p.year ? ` — ${p.month} ${p.year}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600">+PKR {(p.amountPaid || 0).toLocaleString()}</p>
                            <p className={`text-xs ${p.status === "paid" ? "text-green-500" : "text-orange-500"}`}>{p.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-slate-200 shadow-lg">
              <CardContent className="py-12">
                <div className="text-center text-slate-500">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No Teacher Record Linked</p>
                  <p className="text-xs mt-1">Your account is not linked to a teacher profile.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ======= TIMETABLE TAB ======= */}
      {activeTab === "timetable" && (
        <div className="mt-6">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-600" /> Weekly Timetable
              </CardTitle>
              <CardDescription>Your complete teaching schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {timetable.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No timetable assigned yet</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {dayOrder.filter(day => groupedByDay[day]).map(day => (
                    <div key={day}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${day === today ? "text-emerald-600" : "text-slate-500"}`}>{day}</h3>
                        {day === today && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Today</span>}
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {groupedByDay[day].map((entry: any, idx: number) => (
                          <div key={entry._id || idx} className={`p-3 rounded-lg border transition-all hover:shadow-md ${day === today ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold ${day === today ? "text-emerald-700" : "text-slate-700"}`}>{entry.startTime} - {entry.endTime}</span>
                              {entry.room && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.room}</span>}
                            </div>
                            <p className="font-medium text-slate-900 text-sm">{entry.classId?.classTitle || entry.classId?.className || "Class"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{capitalizeSubject(entry.subject)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {/* ======= CLOSE DAY PREVIEW DIALOG ======= */}
      <Dialog open={closePreviewOpen} onOpenChange={setClosePreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="h-5 w-5 text-amber-600" />
              Daily Revenue Close — Review
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Review your revenue breakdown before closing. Floating cash → Verified.
            </DialogDescription>
          </DialogHeader>

          {closePreview && (
            <div className="space-y-4">
              {/* Net Total Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-amber-700 font-bold">Net Closeable Amount</p>
                  <p className="text-3xl font-black text-amber-900">PKR {(closePreview.netTotal || closePreview.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="text-right text-sm text-amber-700">
                  <p><span className="font-semibold">{closePreview.totalEntries || closePreview.transactionCount || 0}</span> entries</p>
                </div>
              </div>

              {/* Tuition Revenue Section */}
              {closePreview.tuitionRevenue && closePreview.tuitionRevenue.count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      Tuition Revenue (100% Share)
                    </p>
                    <span className="text-sm font-bold text-emerald-700">PKR {closePreview.tuitionRevenue.total.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    {closePreview.tuitionRevenue.items.map((item: any, idx: number) => (
                      <div key={item._id || idx} className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-slate-800 text-sm">{item.studentName || "Student"}</span>
                          <span className="font-bold text-emerald-700 text-sm">PKR {(item.amount || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500">{item.className} · {item.description || "Equal split among teachers"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Academy Share Revenue Section */}
              {closePreview.academyShareRevenue && closePreview.academyShareRevenue.count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      Academy Share Revenue
                    </p>
                    <span className="text-sm font-bold text-blue-700">PKR {closePreview.academyShareRevenue.total.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    {closePreview.academyShareRevenue.items.map((item: any, idx: number) => (
                      <div key={item._id || idx} className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-slate-800 text-sm">{item.studentName || "Student"}</span>
                          <span className="font-bold text-blue-700 text-sm">PKR {(item.amount || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500">{item.className} · {item.description || "Academy share split"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Withdrawal Adjustments Section */}
              {closePreview.withdrawalAdjustments && closePreview.withdrawalAdjustments.count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      Withdrawal Adjustments
                    </p>
                    <span className="text-sm font-bold text-red-700">PKR {closePreview.withdrawalAdjustments.total.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    {closePreview.withdrawalAdjustments.items.map((item: any, idx: number) => (
                      <div key={item._id || idx} className="bg-red-50/50 border border-red-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-slate-800 text-sm">{item.studentName || "Student"}</span>
                          <span className="font-bold text-red-700 text-sm">PKR {(item.amount || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500">{item.className} · Refund deduction</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback: Old-format breakdown for backwards compatibility */}
              {!closePreview.tuitionRevenue && (closePreview.breakdown || []).length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Student Breakdown</p>
                  <div className="space-y-2">
                    {closePreview.breakdown.map((item: any, idx: number) => (
                      <div key={item.studentId || idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-slate-800 text-sm">{item.studentName}</span>
                          <span className="font-bold text-emerald-700 text-sm">PKR {(item.totalMyShare || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(item.subjects || []).map((s: any, si: number) => (
                            <span key={si} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.shareType === 'PARTNER_100' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {s.subject}: PKR {(s.teacherShare || 0).toLocaleString()}
                              {s.shareType === 'PARTNER_100' && <span className="text-[10px]">(100%)</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {closePreview.totalEntries === 0 && (!closePreview.breakdown || closePreview.breakdown?.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-4">No uncollected revenue to close.</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setClosePreviewOpen(false)} className="h-10">
              Cancel
            </Button>
            <Button
              onClick={confirmPartnerCloseDay}
              disabled={isClosingDay}
              className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isClosingDay ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
              Confirm &amp; Close Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};


// ========================================
//  TEACHER DASHBOARD COMPONENT
// ========================================
const TeacherDashboard = () => {
  const { user, checkAuth } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

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

  // Profile image upload handler - compresses and syncs to both Teacher + User
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file (JPEG, PNG)" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB" });
      return;
    }
    try {
      setUploadingImage(true);
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            const maxWidth = 800;
            if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("Canvas error")); return; }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = ev.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_BASE_URL}/teachers/me/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileImage: compressedBase64 }),
      });
      const data = await res.json();
      if (data.success) {
        setTeacherProfile((prev: any) => ({ ...prev, profileImage: compressedBase64 }));
        await checkAuth();
        toast({ title: "Profile picture updated!", description: "Your new photo has been saved." });
      } else {
        toast({ title: "Update failed", description: data.message || "Could not update profile picture" });
      }
    } catch (err) {
      console.error("Error uploading profile image:", err);
      toast({ title: "Upload error", description: "Something went wrong. Please try again." });
    } finally {
      setUploadingImage(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
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

  // Current profile image (prefer teacher profile, fallback to user)
  const currentImage = teacherProfile?.profileImage || user?.profileImage;

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
      {/* Hidden file input for profile image */}
      <input
        ref={profileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Hero Header with Teacher Info */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-8 shadow-2xl border-b-4 border-emerald-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 flex items-center gap-6">
          {/* Teacher Avatar - Clickable to change */}
          <div className="flex-shrink-0 relative group">
            {currentImage ? (
              <img
                src={currentImage}
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
            {/* Hover overlay - click to change photo */}
            <button
              onClick={() => profileInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer border-4 border-transparent"
            >
              {uploadingImage ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <div className="text-center">
                  <Camera className="h-6 w-6 text-white mx-auto" />
                  <span className="text-[10px] text-white font-medium mt-1 block">Change</span>
                </div>
              )}
            </button>
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
              {(teacherProfile?.phone || user?.phone) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-500/20 text-slate-300 text-sm font-medium border border-slate-500/30">
                   {teacherProfile?.phone || user?.phone}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Edwardian Academy - {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
              Today's Schedule - {today}
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
                      {entry.classId?.gradeLevel ? ` - ${entry.classId.gradeLevel}` : entry.classId?.section ? ` - ${entry.classId.section}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">{capitalizeSubject(entry.subject)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-700">
                      {entry.startTime} - {entry.endTime}
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
                            {entry.startTime} - {entry.endTime}
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
//  STAFF DASHBOARD COMPONENT
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
            Edwardian Academy - Staff Panel
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-medium border border-sky-500/30">
              {perms.length} Module{perms.length !== 1 ? "s" : ""} Accessible
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
              Online
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
//  MAIN DASHBOARD COMPONENT (GATEKEEPER)
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

  //  ROLE-BASED GATEKEEPER
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
