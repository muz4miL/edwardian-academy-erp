import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Building2,
  Tag,
  FileText,
  HelpCircle,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ExpenseShare {
  partner: string;
  partnerName: string;
  partnerKey?: string;
  amount: number;
  percentage: number;
  status: "UNPAID" | "PAID" | "N/A";
  paidAt?: string;
}

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
  billNumber?: string;
  description?: string;
  paidByType?: string;
  hasPartnerDebt?: boolean;
  shares?: ExpenseShare[];
}

interface ExpenseTrackerProps {
  expenses: Expense[];
  totalExpenses: number;
  isLoading: boolean;
}

const getApiBaseUrl = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes(".app.github.dev")
  ) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, "");
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
};
const API_BASE_URL = getApiBaseUrl();

export const ExpenseTracker = ({
  expenses,
  totalExpenses,
  isLoading,
}: ExpenseTrackerProps) => {
  const queryClient = useQueryClient();

  // Form state
  const [expenseTitle, setExpenseTitle] = useState("");

  // Expanded rows to show partner shares
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpanded = (expenseId: string) => {
    setExpandedExpenses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [paidByType, setPaidByType] = useState("ACADEMY_CASH"); // NEW: Who paid for this expense

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) throw new Error("Failed to create expense");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });

      // Show different message based on who paid
      if (data.debtGenerated) {
        toast.success("✅ Expense added! Partner debt generated.", {
          description: `${data.shares
            ?.filter((s: any) => s.status === "UNPAID")
            .map((s: any) => `${s.partner}: PKR ${s.amount.toLocaleString()}`)
            .join(", ")}`,
        });
      } else {
        toast.success("✅ Expense added successfully!");
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }

      // Reset form
      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseAmount("");
      setVendorName("");
      setPaidByType("ACADEMY_CASH");
    },
    onError: () => {
      toast.error("❌ Failed to add expense. Please try again.");
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/expenses/${expenseId}/mark-paid`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to mark as paid");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });
      toast.success("✅ Expense marked as paid!");
    },
    onError: () => {
      toast.error("❌ Failed to update expense status.");
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/expenses/${expenseId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to delete expense");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });
      toast.success("🗑️ Expense deleted successfully!");
    },
    onError: () => {
      toast.error("❌ Failed to delete expense.");
    },
  });

  const handleAddExpense = () => {
    if (
      !expenseTitle ||
      !expenseCategory ||
      !expenseAmount ||
      !vendorName
    ) {
      toast.error("⚠️ Please fill all required fields marked with *");
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
      paidByType, // NEW: Send who paid for this expense
    });
  };

  // Reset form after successful creation
  const resetForm = () => {
    setExpenseTitle("");
    setExpenseCategory("");
    setExpenseAmount("");
    setVendorName("");
    setPaidByType("ACADEMY_CASH");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            PAID
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-semibold animate-pulse">
            <AlertCircle className="h-3 w-3 mr-1" />
            OVERDUE
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold">
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        );
    }
  };

  // Split expenses by status
  const pendingExpenses = expenses.filter(
    (e) => e.status === "pending" || e.status === "overdue",
  );
  const paidExpenses = expenses.filter((e) => e.status === "paid");
  const overdueCount = expenses.filter((e) => e.status === "overdue").length;
  const pendingTotal = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mt-6 rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50/80 to-orange-50/50 p-6 card-shadow">
      {/* Header with Summary */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
            <TrendingDown className="h-6 w-6 text-red-600" />
            Daily Expenses
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Track all academy expenses including rent, utilities,
                    salaries, and supplies.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </h3>
          <p className="text-sm text-muted-foreground">
            Add, track, and manage all operational costs
          </p>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-3">
          <div className="bg-white rounded-lg p-3 border-2 border-yellow-200 min-w-[120px]">
            <p className="text-xs text-muted-foreground mb-0.5">Pending</p>
            <p className="text-xl font-bold text-yellow-600">
              PKR {pendingTotal.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {pendingExpenses.length} bills
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border-2 border-green-200 min-w-[120px]">
            <p className="text-xs text-muted-foreground mb-0.5">Total Paid</p>
            <p className="text-xl font-bold text-green-600">
              PKR {totalExpenses.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {paidExpenses.length} bills
            </p>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
          <span className="text-sm font-semibold text-red-800">
            ⚠️ You have {overdueCount} overdue{" "}
            {overdueCount === 1 ? "payment" : "payments"} that need immediate
            attention!
          </span>
        </div>
      )}

      {/* Add Expense Form */}
      <div className="bg-white rounded-xl p-5 border-2 border-red-300 shadow-sm mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-red-600" />
          Add New Expense
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label
              htmlFor="expense-title"
              className="text-xs font-semibold flex items-center gap-1"
            >
              <FileText className="h-3 w-3 text-red-600" />
              Expense Title <span className="text-red-600">*</span>
            </Label>
            <Input
              id="expense-title"
              placeholder="e.g., Electricity Bill"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              className="bg-background h-10 border-2 focus:border-red-500"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="vendor-name"
              className="text-xs font-semibold flex items-center gap-1"
            >
              <Building2 className="h-3 w-3 text-red-600" />
              Vendor/Supplier <span className="text-red-600">*</span>
            </Label>
            <Input
              id="vendor-name"
              placeholder="e.g., PESCO, SNGPL"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="bg-background h-10 border-2 focus:border-red-500"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="expense-category"
              className="text-xs font-semibold flex items-center gap-1"
            >
              <Tag className="h-3 w-3 text-red-600" />
              Category <span className="text-red-600">*</span>
            </Label>
            <Select value={expenseCategory} onValueChange={setExpenseCategory}>
              <SelectTrigger className="bg-background h-10 border-2">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Generator Fuel">
                  ⛽ Generator Fuel
                </SelectItem>
                <SelectItem value="Electricity Bill">
                  💡 Electricity Bill
                </SelectItem>
                <SelectItem value="Staff Tea & Refreshments">
                  ☕ Staff Tea & Refreshments
                </SelectItem>
                <SelectItem value="Marketing / Ads">📣 Marketing / Ads</SelectItem>
                <SelectItem value="Stationery">📚 Stationery</SelectItem>
                <SelectItem value="Rent">🏢 Rent</SelectItem>
                <SelectItem value="Salaries">💵 Salaries</SelectItem>
                <SelectItem value="Utilities">💧 Utilities</SelectItem>
                <SelectItem value="Equipment/Asset">
                  🧰 Equipment/Asset
                </SelectItem>
                <SelectItem value="Misc">📦 Misc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="expense-amount"
              className="text-xs font-semibold flex items-center gap-1"
            >
              <DollarSign className="h-3 w-3 text-red-600" />
              Amount (PKR) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="expense-amount"
              type="number"
              placeholder="0"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="bg-background h-10 border-2 focus:border-red-500"
            />
          </div>

        </div>

        {/* Paid By Dropdown - Financial Sovereignty Feature */}
        <div className="mt-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
          <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-red-600" />
            Payment Source
          </Label>
          <Select value={paidByType} onValueChange={setPaidByType}>
            <SelectTrigger className="bg-white h-10 border-2 border-gray-300">
              <SelectValue placeholder="Select payment source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACADEMY_CASH">
                Academy Cash (Normal Flow)
              </SelectItem>
            </SelectContent>
          </Select>
          {paidByType !== "ACADEMY_CASH" && (
            <div className="mt-2 p-2 bg-amber-100 rounded-md">
              <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                ⚠️ This will generate debt for other partners
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={handleAddExpense}
          disabled={createExpenseMutation.isPending}
          className="w-full bg-red-600 hover:bg-red-700 h-11 font-semibold text-base mt-4 shadow-lg hover:shadow-xl transition-all"
        >
          {createExpenseMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Adding
              Expense...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-5 w-5" /> Add Expense
            </>
          )}
        </Button>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        {/* Pending & Overdue Expenses */}
        {pendingExpenses.length > 0 && (
          <div className="bg-white rounded-xl p-4 border-2 border-yellow-200">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending & Overdue ({pendingExpenses.length})
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Total: PKR {pendingTotal.toLocaleString()}
              </span>
            </h4>
            <div className="space-y-2">
              {pendingExpenses.map((expense) => (
                <div key={expense._id} className="space-y-2">
                  <div
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      expense.status === "overdue"
                        ? "border-red-300 bg-red-50 hover:bg-red-100"
                        : "border-yellow-200 bg-yellow-50/50 hover:bg-yellow-100"
                    } transition-all`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-base text-foreground">
                          {expense.title}
                        </p>
                        {getStatusBadge(expense.status)}
                        {/* Partner Debt Badge - Shows when a partner paid out-of-pocket */}
                        {(expense as any).paidByType &&
                          (expense as any).paidByType !== "ACADEMY_CASH" && (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                              💳 Paid by {(expense as any).paidByType}
                            </Badge>
                          )}
                        {(expense as any).hasPartnerDebt && (
                          <Badge className="bg-purple-500 hover:bg-purple-600 text-white text-xs animate-pulse">
                            ⚡ Debt Generated
                          </Badge>
                        )}
                        {expense.shares && expense.shares.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => toggleExpanded(expense._id)}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Shares
                            {expandedExpenses.has(expense._id) ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="px-2.5 py-1 rounded-full bg-white border font-medium">
                          {expense.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {expense.vendorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due:{" "}
                          {new Date(expense.dueDate).toLocaleDateString(
                            "en-PK",
                            { day: "numeric", month: "short" },
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-red-600 min-w-[120px] text-right">
                        PKR {expense.amount.toLocaleString()}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => markAsPaidMutation.mutate(expense._id)}
                        disabled={markAsPaidMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 font-semibold px-4"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Mark Paid
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() =>
                          deleteExpenseMutation.mutate(expense._id)
                        }
                        disabled={deleteExpenseMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Partner Shares Breakdown */}
                  {expandedExpenses.has(expense._id) &&
                    expense.shares &&
                    expense.shares.length > 0 && (
                      <div className="ml-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Partner Contributions
                        </h5>
                        <div className="grid grid-cols-3 gap-2">
                          {expense.shares.map((share, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-white rounded border text-center"
                            >
                              <p className="text-xs font-medium text-gray-700">
                                {share.partnerName}
                              </p>
                              <p className="text-sm font-bold text-blue-600">
                                PKR {share.amount.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {share.percentage}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paid Expenses */}
        {paidExpenses.length > 0 && (
          <div className="bg-white rounded-xl p-4 border-2 border-green-200">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Paid Expenses ({paidExpenses.length})
            </h4>
            <div className="space-y-2">
              {paidExpenses.map((expense) => (
                <div key={expense._id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-100 transition-colors opacity-90">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground">
                          {expense.title}
                        </p>
                        {getStatusBadge(expense.status)}
                        {expense.shares && expense.shares.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-[10px] text-blue-600 hover:text-blue-700"
                            onClick={() => toggleExpanded(expense._id)}
                          >
                            <Users className="h-2.5 w-2.5 mr-1" />
                            Shares
                            {expandedExpenses.has(expense._id) ? (
                              <ChevronUp className="h-2.5 w-2.5 ml-1" />
                            ) : (
                              <ChevronDown className="h-2.5 w-2.5 ml-1" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-white border text-[10px]">
                          {expense.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {expense.vendorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          Paid:{" "}
                          {expense.paidDate
                            ? new Date(expense.paidDate).toLocaleDateString(
                                "en-PK",
                                { day: "numeric", month: "short" },
                              )
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-green-600 min-w-[100px] text-right">
                        PKR {expense.amount.toLocaleString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() =>
                          deleteExpenseMutation.mutate(expense._id)
                        }
                        disabled={deleteExpenseMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Partner Shares Breakdown */}
                  {expandedExpenses.has(expense._id) &&
                    expense.shares &&
                    expense.shares.length > 0 && (
                      <div className="ml-4 p-2 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Partner Contributions
                        </h5>
                        <div className="grid grid-cols-3 gap-2">
                          {expense.shares.map((share, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-white rounded border text-center"
                            >
                              <p className="text-xs font-medium text-gray-700">
                                {share.partnerName}
                              </p>
                              <p className="text-sm font-bold text-green-600">
                                PKR {share.amount.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {share.percentage}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && expenses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <TrendingDown className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">
              No Expenses Yet
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start by adding your first expense using the form above
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>Rent • Utilities • Salaries • Supplies</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600 mb-3" />
            <p className="text-sm text-muted-foreground">Loading expenses...</p>
          </div>
        )}
      </div>
    </div>
  );
};
