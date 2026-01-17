import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as InfoTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Wallet,
  Users,
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  HelpCircle,
  Info,
  Search,
  History,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaymentReceipt } from "@/components/finance/PaymentReceipt";
import { TeacherPayrollTable } from "@/components/finance/TeacherPayrollTable";
import { ExpenseTracker } from "@/components/finance/ExpenseTracker";
import { useAuth } from "@/context/AuthContext";

// API Base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Finance History Item Type
interface FinanceHistoryItem {
  _id: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "PARTNER_WITHDRAWAL";
  description: string;
  amount: number;
  status: string;
  isExpense: boolean;
  category?: string;
  collectedBy?: string;
  studentName?: string;
  paidBy?: string;
  vendorName?: string;
}

const Finance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  // Payment receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>("all"); // Task 4: Teacher filter

  // Finance History state
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");

  // Fetch Finance History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["finance", "history"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/finance/history`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch finance history");
      const result = await response.json();
      return result.data as FinanceHistoryItem[];
    },
    refetchInterval: 30000,
  });

  // Fetch real-time finance stats with error handling
  const {
    data: financeData,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["finance", "stats"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/finance/stats/overview`,
      );
      if (!response.ok) throw new Error("Failed to fetch finance stats");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/expenses?limit=10`);
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const result = await response.json();
      return result.data;
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) throw new Error("Failed to create expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Expense added successfully");
      // Reset form
      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseAmount("");
    },
    onError: () => {
      toast.error("Failed to add expense");
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/expenses/${expenseId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) throw new Error("Failed to delete expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      toast.success("Expense deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete expense");
    },
  });

  // Process teacher payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async ({
      teacherId,
      amountPaid,
    }: {
      teacherId: string;
      amountPaid: number;
    }) => {
      const response = await fetch(`${API_BASE_URL}/api/teachers/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          amount: amountPaid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process payment");
      }

      return response.json();
    },
    onSuccess: (response) => {
      console.log("✅ Payout successful:", response);
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setVoucherData(response.data);
      setIsReceiptOpen(true);
      toast.success("Payment processed successfully!");
    },
    onError: (error: any) => {
      console.error("❌ Payout failed:", error);
      toast.error(error.message || "Failed to process payment");
    },
  });

  const handleAddExpense = () => {
    if (!expenseTitle || !expenseCategory || !expenseAmount) {
      toast.error("Please fill all expense fields");
      return;
    }

    createExpenseMutation.mutate({
      title: expenseTitle,
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
    });
  };

  const handlePayTeacher = (teacher: any) => {
    console.log(
      "🔍 Teacher object received:",
      JSON.stringify(teacher, null, 2),
    );

    if (teacher.earnedAmount <= 0) {
      toast.error("No payment due for this teacher");
      return;
    }

    const payload = {
      teacherId: teacher._id || teacher.teacherId || teacher.id,
      amountPaid: teacher.earnedAmount,
    };

    console.log("💰 Payout Request Payload:", JSON.stringify(payload, null, 2));
    console.log(
      "📋 Payload Details - teacherId:",
      payload.teacherId,
      "amount:",
      payload.amountPaid,
    );

    processPaymentMutation.mutate(payload);
  };

  // Loading state
  if (statsLoading) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (statsError) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-foreground">
            Failed to load finance data
          </p>
          <p className="text-sm text-muted-foreground">
            Please check your connection and try again
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["finance"] })
            }
          >
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const {
    totalIncome = 0,
    totalExpected = 0,
    totalPending = 0,
    pendingStudentsCount = 0,
    totalTeacherLiabilities = 0,
    teacherPayroll = [],
    academyShare = 0,
    totalExpenses = 0,
    netProfit = 0,
    collectionRate = 0,
  } = financeData || {};

  const expenses = expensesData || [];

  // TASK 4: Triple-Split Financial Chart Data - Filter out zero values
  const rawChartData = [
    {
      name: "Net Profit",
      value: Math.max(0, netProfit || 0),
      color: "#3b82f6",
    }, // Blue
    {
      name: "Teacher Payouts",
      value: totalTeacherLiabilities || 0,
      color: "#10b981",
    }, // Green
    { name: "Expenses", value: totalExpenses || 0, color: "#ef4444" }, // Red
  ];

  // Only include non-zero values in chart
  const chartData = rawChartData.filter((item) => item.value > 0);
  const hasChartData = chartData.length > 0;

  const COLORS = ["#3b82f6", "#10b981", "#ef4444"];

  return (
    <TooltipProvider>
      <DashboardLayout title="Finance">
        <HeaderBanner
          title="Finance Management"
          subtitle="Real-time financial analytics and expense tracking"
        />

        {/* KPI Cards with Tooltips */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Collected"
            value={`PKR ${(totalIncome / 1000).toFixed(0)}K`}
            subtitle={`${collectionRate}% collection rate`}
            icon={TrendingUp}
            variant="success"
            trend={{ value: collectionRate, isPositive: collectionRate > 70 }}
          />

          <div className="relative">
            <KPICard
              title="Teacher Liabilities"
              value={`PKR ${(totalTeacherLiabilities / 1000).toFixed(0)}K`}
              subtitle={`${teacherPayroll.length} active teachers`}
              icon={GraduationCap}
              variant="warning"
            />
            <InfoTooltip>
              <TooltipTrigger asChild>
                <button
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  title="Teacher Liabilities Info"
                  aria-label="Teacher Liabilities Info"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Total amount owed to teachers based on collected fees from
                  their students. This is calculated using their compensation
                  model (70/30 split, fixed salary, or hybrid).
                </p>
              </TooltipContent>
            </InfoTooltip>
          </div>

          <KPICard
            title="Total Expenses"
            value={`PKR ${(totalExpenses / 1000).toFixed(0)}K`}
            subtitle="Operational costs"
            icon={TrendingDown}
            variant="danger"
          />

          <div className="relative">
            <KPICard
              title="Net Profit"
              value={`PKR ${(netProfit / 1000).toFixed(0)}K`}
              subtitle="After all costs"
              icon={Wallet}
              variant={netProfit > 0 ? "primary" : "danger"}
            />
            <InfoTooltip>
              <TooltipTrigger asChild>
                <button
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                  title="Net Profit Info"
                  aria-label="Net Profit Info"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Net Profit = Total Collected - (Teacher Payouts + Operational
                  Expenses). This is the academy's final profit after all costs.
                </p>
              </TooltipContent>
            </InfoTooltip>
          </div>
        </div>

        {/* Warning for Negative Profit */}
        {netProfit < 0 && (
          <div className="mt-4 rounded-lg border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">
                ⚠️ Warning: Monthly Loss Detected
              </h4>
              <p className="text-sm text-red-700 mt-1">
                Your monthly expenses and teacher payouts (PKR{" "}
                {(totalTeacherLiabilities + totalExpenses).toLocaleString()})
                exceed the collected revenue (PKR {totalIncome.toLocaleString()}
                ). Consider reviewing operational costs or improving fee
                collection.
              </p>
            </div>
          </div>
        )}

        {/* Charts & Revenue Breakdown */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* TASK 4: Triple-Split Pie Chart */}
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Financial Distribution
            </h3>
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      `PKR ${value.toLocaleString()}`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No financial data available yet
              </div>
            )}
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              Revenue Breakdown
            </h3>

            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                Total Revenue Collected
              </p>
              <p className="text-3xl font-bold text-foreground">
                PKR {totalIncome.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-success/20 bg-success-light p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-success" />
                    <span className="text-sm font-medium text-success">
                      Teacher Payouts
                    </span>
                  </div>
                  <p className="text-lg font-bold text-success">
                    PKR {totalTeacherLiabilities.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-destructive/20 bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      Expenses
                    </span>
                  </div>
                  <p className="text-lg font-bold text-destructive">
                    PKR {totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary-light p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Net Profit
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    PKR {netProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Payroll Table */}
        <TeacherPayrollTable
          teachers={teacherPayroll}
          filter={teacherFilter}
          onFilterChange={setTeacherFilter}
          onPay={handlePayTeacher}
          isPaying={processPaymentMutation.isPending}
        />

        {/* Finance History (Ledger) Section */}
        <div className="mt-6 rounded-xl border border-border bg-card p-6 card-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Finance History{" "}
                {user?.role === "OWNER" ? "(All Records)" : "(Your Records)"}
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input - Owner only */}
              {user?.role === "OWNER" && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by partner name..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                  />
                </div>
              )}
              {/* Type Filter */}
              <Select
                value={historyTypeFilter}
                onValueChange={setHistoryTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="PARTNER_WITHDRAWAL">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !historyData || historyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No financial records found</p>
              <p className="text-sm">
                Transactions and expenses will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData
                    .filter((item) => {
                      // Type filter
                      if (
                        historyTypeFilter !== "all" &&
                        item.type !== historyTypeFilter
                      ) {
                        return false;
                      }
                      // Search filter (Owner only - by partner name)
                      if (user?.role === "OWNER" && historySearch) {
                        const searchLower = historySearch.toLowerCase();
                        const collectedBy =
                          item.collectedBy?.toLowerCase() || "";
                        const paidBy = item.paidBy?.toLowerCase() || "";
                        return (
                          collectedBy.includes(searchLower) ||
                          paidBy.includes(searchLower)
                        );
                      }
                      return true;
                    })
                    .slice(0, 50) // Limit to 50 records for performance
                    .map((item) => {
                      // Determine amount color based on type
                      const isPositive =
                        item.type === "INCOME" ||
                        item.type === "PARTNER_WITHDRAWAL";
                      const amountColorClass = isPositive
                        ? "text-green-600 font-semibold"
                        : "text-red-600 font-semibold";

                      // Format date
                      const formattedDate = new Date(
                        item.date,
                      ).toLocaleDateString("en-PK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      // Status badge variant
                      const getStatusVariant = (status: string) => {
                        switch (status?.toUpperCase()) {
                          case "VERIFIED":
                          case "PAID":
                            return "default";
                          case "FLOATING":
                          case "PENDING":
                            return "secondary";
                          case "CANCELLED":
                          case "OVERDUE":
                            return "destructive";
                          default:
                            return "outline";
                        }
                      };

                      return (
                        <TableRow key={item._id}>
                          <TableCell className="whitespace-nowrap">
                            {formattedDate}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.isExpense ? "destructive" : "default"
                              }
                            >
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.description}
                            {item.collectedBy && user?.role === "OWNER" && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (by {item.collectedBy})
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right ${amountColorClass}`}
                          >
                            {isPositive ? "+" : "-"}PKR{" "}
                            {item.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* TASK 3: Daily Expenses Section */}
        <ExpenseTracker
          expenses={expenses}
          totalExpenses={totalExpenses}
          isLoading={expensesLoading}
        />

        {/* Payment Receipt Modal */}
        <PaymentReceipt
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          voucherData={voucherData}
        />
      </DashboardLayout>
    </TooltipProvider>
  );
};

export default Finance;
