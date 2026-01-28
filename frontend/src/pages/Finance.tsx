import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  Building2,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  BarChart3,
  Shield,
  Eye,
  EyeOff,
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
import { useAuth } from "@/context/AuthContext";
import { KPICard } from "@/components/dashboard/KPICard";

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

// Expense Type
interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  vendorName: string;
  dueDate: string;
  expenseDate: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue";
  paidByType?: "ACADEMY_CASH" | "WAQAR" | "ZAHID" | "SAUD";
}

const Finance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Determine if user can see analytics (Owner only)
  const isOwner = user?.role === "OWNER";
  const showAnalytics = isOwner;

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [dueDate, setDueDate] = useState(
    () => new Date().toISOString().split("T")[0],
  ); // Default to today
  const [paidByType, setPaidByType] = useState("WAQAR"); // Always Waqar

  // Payment receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  // Finance History state
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");

  // Fetch Finance History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["finance-history"],
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

  // Fetch real-time finance stats (Owner only sees full data)
  const {
    data: financeData,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ["finance", "stats"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/finance/stats/overview`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to fetch finance stats");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000,
    retry: 2,
    enabled: showAnalytics, // Only fetch if owner
  });

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/expenses?limit=50`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const result = await response.json();
      return result.data as Expense[];
    },
  });

  // Create expense mutation - invalidates finance-history for instant ledger update
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create expense");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate finance-history for instant ledger update
      queryClient.invalidateQueries({ queryKey: ["finance-history"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });

      toast.success("✅ Expense recorded successfully!", {
        description: `${data.data?.title || "Expense"} - PKR ${data.data?.amount?.toLocaleString() || "0"}`,
      });

      // Reset form
      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseAmount("");
      setVendorName("");
      setDueDate("");
      setPaidByType("ACADEMY_CASH");
    },
    onError: (error: any) => {
      toast.error("Failed to add expense", {
        description: error.message,
      });
    },
  });

  // Mark expense as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/expenses/${expenseId}/mark-paid`,
        { method: "PATCH", credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to mark as paid");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-history"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });
      toast.success("✅ Expense marked as paid!");
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/expenses/${expenseId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to delete expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance-history"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });
      toast.success("🗑️ Expense deleted");
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
        credentials: "include",
        body: JSON.stringify({ teacherId, amount: amountPaid }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process payment");
      }
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setVoucherData(response.data);
      setIsReceiptOpen(true);
      toast.success("Payment processed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process payment");
    },
  });

  const handleAddExpense = () => {
    if (
      !expenseTitle ||
      !expenseCategory ||
      !expenseAmount ||
      !vendorName ||
      !dueDate
    ) {
      toast.error("⚠️ Please fill all required fields");
      return;
    }

    if (parseFloat(expenseAmount) <= 0) {
      toast.error("⚠️ Amount must be greater than 0");
      return;
    }

    createExpenseMutation.mutate({
      title: expenseTitle,
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      vendorName,
      dueDate: dueDate || new Date().toISOString().split("T")[0], // Auto-set to today if empty
      paidByType: "WAQAR", // Always deduct from Waqar's revenue
    });
  };

  const handlePayTeacher = (teacher: any) => {
    if (teacher.earnedAmount <= 0) {
      toast.error("No payment due for this teacher");
      return;
    }
    processPaymentMutation.mutate({
      teacherId: teacher._id || teacher.teacherId || teacher.id,
      amountPaid: teacher.earnedAmount,
    });
  };

  // Loading state - only for stats if owner
  if (statsLoading && isOwner) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state for stats (Owner only)
  if (statsError && isOwner) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-foreground">
            Failed to load finance data
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
  const pendingExpenses = expenses.filter(
    (e) => e.status === "pending" || e.status === "overdue",
  );
  const paidExpenses = expenses.filter((e) => e.status === "paid");
  const pendingTotal = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            PAID
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs animate-pulse">
            <AlertCircle className="h-3 w-3 mr-1" />
            OVERDUE
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        );
    }
  };

  return (
    <TooltipProvider>
      <DashboardLayout title="Finance">
        {/* ============================================ */}
        {/* HERO SECTION: EXPENSE ENTRY FORM */}
        {/* ============================================ */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <Plus className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Add New Expense
              </h2>
              <p className="text-sm text-gray-500">
                Record operational costs and bills
              </p>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label
                htmlFor="expense-title"
                className="text-xs font-medium text-gray-700 flex items-center gap-1"
              >
                <FileText className="h-3 w-3 text-gray-500" />
                Expense Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expense-title"
                placeholder="e.g., Electricity Bill"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="bg-gray-50 h-10 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="vendor-name"
                className="text-xs font-medium text-gray-700 flex items-center gap-1"
              >
                <Building2 className="h-3 w-3 text-gray-500" />
                Vendor/Supplier <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vendor-name"
                placeholder="e.g., PESCO, SNGPL"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="bg-gray-50 h-10 border-gray-300 focus:border-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="expense-category"
                className="text-xs font-medium text-gray-700 flex items-center gap-1"
              >
                <Tag className="h-3 w-3 text-gray-500" />
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={expenseCategory}
                onValueChange={setExpenseCategory}
              >
                <SelectTrigger className="bg-gray-50 h-10 border-gray-300">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Utilities">💡 Utilities</SelectItem>
                  <SelectItem value="Rent">🏢 Rent/Lease</SelectItem>
                  <SelectItem value="Salaries">💵 Salaries</SelectItem>
                  <SelectItem value="Stationery">📚 Stationery</SelectItem>
                  <SelectItem value="Marketing">📣 Marketing</SelectItem>
                  <SelectItem value="Misc">📦 Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="expense-amount"
                className="text-xs font-medium text-gray-700 flex items-center gap-1"
              >
                <DollarSign className="h-3 w-3 text-gray-500" />
                Amount (PKR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expense-amount"
                type="number"
                placeholder="0"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="bg-gray-50 h-10 border-gray-300 focus:border-gray-500"
              />
            </div>


          </div>

          {/* Expense Source - Auto-assigned to Sir Waqar */}
          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Label className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-amber-600" />
              Expense Source
            </Label>
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border border-amber-300">
              <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  Sir Waqar's Revenue
                </p>
                <p className="text-xs text-amber-600">
                  All expenses deducted from Owner's revenue
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleAddExpense}
            disabled={createExpenseMutation.isPending}
            className="w-full mt-4 bg-gray-900 hover:bg-gray-800 h-11 font-medium text-white"
          >
            {createExpenseMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </>
            )}
          </Button>
        </div>

        {/* ============================================ */}
        {/* LIVE LEDGER: FINANCE HISTORY TABLE */}
        {/* ============================================ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Finance History
              </h3>
              <Badge variant="outline" className="text-xs">
                Live Ledger
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input - Owner only */}
              {isOwner && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by partner..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 w-full sm:w-56 bg-gray-50 border-gray-300"
                  />
                </div>
              )}
              {/* Type Filter */}
              <Select
                value={historyTypeFilter}
                onValueChange={setHistoryTypeFilter}
              >
                <SelectTrigger className="w-full sm:w-36 bg-gray-50 border-gray-300">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : !historyData || historyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm">Transactions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">
                      Date
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Type
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Description
                    </TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">
                      Amount
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData
                    .filter((item) => {
                      if (
                        historyTypeFilter !== "all" &&
                        item.type !== historyTypeFilter
                      ) {
                        return false;
                      }
                      if (isOwner && historySearch) {
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
                    .slice(0, 50)
                    .map((item) => {
                      const isPositive =
                        item.type === "INCOME" ||
                        item.type === "PARTNER_WITHDRAWAL";
                      const amountColorClass = isPositive
                        ? "text-emerald-600 font-semibold"
                        : "text-red-600 font-semibold";

                      const formattedDate = new Date(
                        item.date,
                      ).toLocaleDateString("en-PK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

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
                        <TableRow key={item._id} className="hover:bg-gray-50">
                          <TableCell className="whitespace-nowrap text-gray-600">
                            {formattedDate}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.isExpense ? "destructive" : "default"
                              }
                              className="text-xs"
                            >
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-gray-700">
                            {item.description}
                            {item.collectedBy && isOwner && (
                              <span className="text-xs text-gray-400 ml-2">
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
                            <Badge
                              variant={getStatusVariant(item.status)}
                              className="text-xs"
                            >
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

        {/* ============================================ */}
        {/* PENDING EXPENSES LIST */}
        {/* ============================================ */}
        {pendingExpenses.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Pending Bills ({pendingExpenses.length})
                </h3>
              </div>
              <span className="text-sm font-medium text-gray-500">
                Total: PKR {pendingTotal.toLocaleString()}
              </span>
            </div>
            <div className="space-y-3">
              {pendingExpenses.map((expense) => (
                <div
                  key={expense._id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    expense.status === "overdue"
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-gray-900">
                        {expense.title}
                      </p>
                      {getStatusBadge(expense.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="px-2 py-0.5 rounded bg-white border">
                        {expense.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {expense.vendorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due:{" "}
                        {new Date(expense.dueDate).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">
                      PKR {expense.amount.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => markAsPaidMutation.mutate(expense._id)}
                      disabled={markAsPaidMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark Paid
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-100"
                      onClick={() => deleteExpenseMutation.mutate(expense._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for no expenses */}
        {!expensesLoading && expenses.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center mb-6">
            <TrendingDown className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              No Expenses Yet
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Start by adding your first expense using the form above
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <FileText className="h-3 w-3" />
              <span>Rent • Utilities • Salaries • Supplies</span>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* OWNER-ONLY: ANALYTICS SECTION */}
        {/* ============================================ */}
        {showAnalytics && financeData && (
          <>
            {/* Analytics Header */}
            <div className="flex items-center gap-3 mb-4 mt-8">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Owner Analytics
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Visible only to you
                </p>
              </div>
            </div>

            {/* KPI Cards (Owner Only) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <KPICard
                title="Total Collected"
                value={`PKR ${(totalIncome / 1000).toFixed(0)}K`}
                subtitle={`${collectionRate}% collection rate`}
                icon={TrendingUp}
                variant="success"
                trend={{
                  value: collectionRate,
                  isPositive: collectionRate > 70,
                }}
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
                    <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Total amount owed to teachers based on collected fees.
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
                    <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Net Profit = Collected - (Teacher Payouts + Expenses)
                    </p>
                  </TooltipContent>
                </InfoTooltip>
              </div>
            </div>

            {/* Warning for Negative Profit */}
            {netProfit < 0 && (
              <div className="mb-6 rounded-lg border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">
                    ⚠️ Warning: Monthly Loss Detected
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    Your expenses exceed revenue. Consider reviewing costs.
                  </p>
                </div>
              </div>
            )}

            {/* Teacher Payroll Table (Owner Only) */}
            <TeacherPayrollTable
              teachers={teacherPayroll}
              filter={teacherFilter}
              onFilterChange={setTeacherFilter}
              onPay={handlePayTeacher}
              isPaying={processPaymentMutation.isPending}
            />
          </>
        )}

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
