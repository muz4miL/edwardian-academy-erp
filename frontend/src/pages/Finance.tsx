import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  Plus,
  Trash2,
  Package,
  CheckSquare,
  Receipt,
  Loader2,
  CreditCard,
  Search,
  HandCoins,
  Calculator,
  Users,
  FileText,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { MiscPaymentPDF, type MiscPaymentPDFData } from "@/components/print/MiscPaymentPDF";
import { TeacherDepositModal } from "@/components/finance/TeacherDepositModal";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

// ==================== TYPES ====================
interface Asset {
  id: string;
  itemName: string;
  investorName: string;
  purchaseDate: string;
  originalCost: number;
  depreciationRate: number; // % per year
}

interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  vendorName: string;
  dueDate: string;
  expenseDate: string;
  description?: string;
  paidBy?: {
    fullName?: string;
    username?: string;
  };
  createdAt: string;
}

interface FinanceHistoryItem {
  _id: string;
  type: string;
  category: string;
  amount: number;
  description?: string;
  date?: string;
  createdAt?: string;
  source?: "transaction" | "expense";
}

// ==================== HELPERS ====================
function calculateCurrentValue(
  originalCost: number,
  depreciationRate: number,
  purchaseDate: string,
): number {
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const yearsElapsed =
    (now.getTime() - purchase.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsElapsed < 0) return originalCost;
  // Reducing balance method
  const currentValue =
    originalCost * Math.pow(1 - depreciationRate / 100, yearsElapsed);
  return Math.max(0, Math.round(currentValue));
}

function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`;
}

// ==================== FINANCE OVERVIEW TAB ====================
const FinanceOverview = () => {
  const [search, setSearch] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["finance", "stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/finance/stats/overview`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load finance stats");
      return res.json();
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["finance", "history"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/finance/history?limit=200`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load finance history");
      return res.json();
    },
  });

  const stats = statsData?.data;
  const history: FinanceHistoryItem[] = historyData?.data || [];

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return history;
    return history.filter((item) => {
      const haystack = [
        item.type,
        item.category,
        item.description,
        item.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [history, search]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(stats?.totalIncome || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.monthlyFeesCount ? `${stats.monthlyFeesCount} fee payments this month` : "This month"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Monthly Expenses
            </p>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {formatCurrency(stats?.totalExpenses || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Net Profit
            </p>
            <p className={`text-2xl font-bold mt-1 ${(stats?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatCurrency(stats?.netProfit || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue − Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-600" />
              Finance Ledger
            </CardTitle>
            <CardDescription>
              All income and expense transactions in one scrollable log
            </CardDescription>
          </div>
          <div className="w-64">
            <Input
              placeholder="Search by type, category, or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-3 text-muted-foreground">
                Loading transactions...
              </span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No transactions yet</p>
              <p className="text-sm mt-1">
                Admissions and expenses will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold text-right">
                      Amount (PKR)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.date || item.createdAt || Date.now())
                          .toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.type === "EXPENSE"
                              ? "text-red-600"
                              : "text-emerald-600"
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.category || "—"}</TableCell>
                      <TableCell className="font-medium">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell
                        className={
                          item.type === "EXPENSE"
                            ? "text-right font-bold text-red-600"
                            : "text-right font-bold text-emerald-700"
                        }
                      >
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== ASSET REGISTRY TAB ====================

const AssetRegistry = () => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);

  // Form state
  const [itemName, setItemName] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [originalCost, setOriginalCost] = useState("");
  const [depreciationRate, setDepreciationRate] = useState("10");
  const [alsoRecordExpense, setAlsoRecordExpense] = useState(false);

  // Fetch assets from API
  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  const assets: (Asset & { _id?: string })[] = (assetsData?.data || []).map((a: any) => ({
    id: a._id,
    _id: a._id,
    itemName: a.itemName,
    investorName: a.investorName,
    purchaseDate: a.purchaseDate,
    originalCost: a.originalCost,
    depreciationRate: a.depreciationRate,
  }));

  const totalOriginal = assets.reduce((sum, a) => sum + a.originalCost, 0);
  const totalCurrent = assets.reduce(
    (sum, a) =>
      sum +
      calculateCurrentValue(a.originalCost, a.depreciationRate, a.purchaseDate),
    0,
  );

  // Create asset mutation
  const createMutation = useMutation({
    mutationFn: async (newAsset: { itemName: string; investorName: string; purchaseDate: string; originalCost: number; depreciationRate: number }) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newAsset),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create asset");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  // Delete asset mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete asset");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Asset removed");
    },
  });

  const handleAdd = async () => {
    if (!itemName || !purchaseDate || !originalCost) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await createMutation.mutateAsync({
        itemName,
        investorName: investorName || "Academy",
        purchaseDate,
        originalCost: Number(originalCost),
        depreciationRate: Number(depreciationRate),
      });
      toast.success(`${itemName} added to registry`);

      // Also record as expense if checkbox is checked
      if (alsoRecordExpense) {
        fetch(`${API_BASE_URL}/api/finance/record-transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: "expense",
            category: "Equipment/Asset",
            amount: Number(originalCost),
            description: `Asset Purchase: ${itemName}${investorName ? ` (Investor: ${investorName})` : ""}`,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success("Expense record created automatically");
            }
          })
          .catch(() => {});
      }

      // Reset form
      setItemName("");
      setInvestorName("");
      setPurchaseDate("");
      setOriginalCost("");
      setDepreciationRate("10");
      setAlsoRecordExpense(false);
      setShowDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add asset");
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Assets
            </p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {assets.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Original Value
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(totalOriginal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Current Value
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatCurrency(totalCurrent)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Depreciated by {formatCurrency(totalOriginal - totalCurrent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-600" />
              Asset Registry
            </CardTitle>
            <CardDescription>
              Track investments and their declining value over time
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading assets...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No assets registered</p>
              <p className="text-sm mt-1">
                Add generators, ACs, furniture, and other investments to track
                depreciation.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead className="font-semibold">Item Name</TableHead>
                  <TableHead className="font-semibold">Investor</TableHead>
                  <TableHead className="font-semibold">Purchase Date</TableHead>
                  <TableHead className="font-semibold text-right">
                    Original Cost
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    Depr. Rate
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Current Value
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const currentVal = calculateCurrentValue(
                    asset.originalCost,
                    asset.depreciationRate,
                    asset.purchaseDate,
                  );
                  const depreciatedPct = (
                    (1 - currentVal / asset.originalCost) *
                    100
                  ).toFixed(1);
                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        {asset.itemName}
                      </TableCell>
                      <TableCell>{asset.investorName}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(asset.purchaseDate).toLocaleDateString(
                            "en-GB",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(asset.originalCost)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {asset.depreciationRate}% / yr
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <span className="font-bold text-amber-700">
                            {formatCurrency(currentVal)}
                          </span>
                          <p className="text-xs text-red-500">
                            -{depreciatedPct}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(asset.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>
              Register a new investment asset to track its depreciation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                placeholder="e.g. Generator 5kW"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Investor Name</Label>
              <Input
                placeholder="e.g. Owner / Academy"
                value={investorName}
                onChange={(e) => setInvestorName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date *</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Original Cost (PKR) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={originalCost}
                  onChange={(e) => setOriginalCost(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Depreciation Rate (% per Year)</Label>
              <Input
                type="number"
                placeholder="10"
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Standard: 10% for electronics, 5% for furniture
              </p>
            </div>

            {/* Also Record as Expense Checkbox */}
            <div className="flex items-start space-x-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <Checkbox
                id="alsoRecordExpense"
                checked={alsoRecordExpense}
                onCheckedChange={(checked) =>
                  setAlsoRecordExpense(checked === true)
                }
                className="mt-0.5"
              />
              <div className="grid gap-0.5 leading-none">
                <label
                  htmlFor="alsoRecordExpense"
                  className="text-sm font-medium cursor-pointer"
                >
                  Also record as Expense
                </label>
                <p className="text-xs text-muted-foreground">
                  Automatically create an expense entry for this asset purchase
                  in the finance system.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700">
              Add Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== DAILY EXPENSES TAB ====================
const DailyExpenses = () => {
  const queryClient = useQueryClient();
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [showSplitConfirmDialog, setShowSplitConfirmDialog] = useState(false);

  // Fetch config to check if current month already split
  const { data: configData } = useQuery({
    queryKey: ["config-split-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/config`, { credentials: "include" });
      if (!res.ok) return null;
      const result = await res.json();
      return result.data;
    },
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const alreadySplitThisMonth =
    configData?.lastExpenseSplitMonth === currentMonth &&
    configData?.lastExpenseSplitYear === currentYear;

  // Form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseVendor, setExpenseVendor] = useState("");

  // Peshawar-specific expense categories
  const EXPENSE_CATEGORIES = [
    "Generator Fuel",
    "Electricity Bill",
    "Staff Tea & Refreshments",
    "Marketing / Ads",
    "Stationery",
    "Rent",
    "Salaries",
    "Utilities",
    "Equipment/Asset",
    "Misc",
  ];

  // Fetch expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/expenses`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load expenses");
      return res.json();
    },
  });

  const expenses: Expense[] = expensesData?.data || [];

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const res = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(expenseData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to record expense");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense Recorded", {
        description: "Expense has been added to the daily log.",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }
      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseVendor("");
      setShowExpenseDialog(false);
    },
    onError: (error: any) => {
      toast.error("Failed to Record Expense", {
        description: error.message || "An error occurred.",
      });
    },
  });

  const handleAddExpense = () => {
    if (
      !expenseTitle ||
      !expenseCategory ||
      !expenseAmount ||
      !expenseVendor
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    createExpenseMutation.mutate({
      title: expenseTitle,
      category: expenseCategory,
      amount: Number(expenseAmount),
      vendorName: expenseVendor,
      description: expenseDescription || undefined,
    });
  };

  // Month-end: recalculate splits for expenses missing partner assignments
  const handleRecalculateSplits = async () => {
    setShowSplitConfirmDialog(false);
    const month = currentMonth;
    const year = currentYear;

    setIsSplitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/finance/partner/recalculate-splits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month, year }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Splits Recalculated", {
          description: `${result.data?.updatedCount ?? 0} expense(s) updated. Total debt assigned: PKR ${result.data?.totalDebtAssigned?.toLocaleString() || 0}`,
        });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["partner-all-debts"] });
        queryClient.invalidateQueries({ queryKey: ["config-split-status"] });
      } else {
        throw new Error(result.message || "Failed to recalculate");
      }
    } catch (err: any) {
      toast.error("Recalculation Failed", { description: err.message });
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-600" />
              Daily Expense Log
            </CardTitle>
            <CardDescription>
              Track and record all academy expenses in real-time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSplitConfirmDialog(true)}
              disabled={isSplitting || alreadySplitThisMonth}
              className={alreadySplitThisMonth ? "border-gray-300 text-gray-400 cursor-not-allowed" : "border-amber-300 text-amber-700 hover:bg-amber-50"}
              title={alreadySplitThisMonth ? `Already split for ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}` : "Split this month's expenses among partners"}
            >
              {isSplitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : alreadySplitThisMonth ? (
                <CheckSquare className="mr-2 h-4 w-4" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              {alreadySplitThisMonth ? "Month Already Split" : "Split Month Expenses"}
            </Button>
            <Button
              onClick={() => setShowExpenseDialog(true)}
              className="bg-red-600 hover:bg-red-700 shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-3 text-muted-foreground">
                Loading expenses...
              </span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No expenses recorded yet</p>
              <p className="text-sm mt-1">
                Click "Record Expense" to add your first entry.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">
                    Amount (PKR)
                  </TableHead>
                  <TableHead className="font-semibold">Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(
                        expense.expenseDate || expense.createdAt,
                      ).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.title || expense.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.paidBy?.fullName ||
                        expense.paidBy?.username ||
                        "System"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-600" />
              Record New Expense
            </DialogTitle>
            <DialogDescription>
              Add a new expense entry to the daily log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Expense Title *</Label>
              <Input
                placeholder="e.g. Generator Diesel - January"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={expenseCategory}
                onValueChange={setExpenseCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor/Supplier *</Label>
              <Input
                placeholder="e.g. PESCO, SNGPL"
                value={expenseVendor}
                onChange={(e) => setExpenseVendor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Additional details..."
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExpenseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={createExpenseMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {createExpenseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Expense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SPLIT MONTH CONFIRMATION DIALOG ===== */}
      <Dialog open={showSplitConfirmDialog} onOpenChange={setShowSplitConfirmDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 shrink-0">
                <Calculator className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-lg">Split Month Expenses</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {now.toLocaleString("en-US", { month: "long", year: "numeric" })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
              <p className="text-sm font-medium text-amber-900">
                This will calculate each partner's share for every un-split expense recorded this month, based on the percentages set in Configuration.
              </p>
              <div className="flex items-start gap-2 text-xs text-amber-700">
                <span className="mt-0.5">⚠️</span>
                <span>This action can only be performed <strong>once per month</strong>. After splitting, the button will be locked until next month.</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Month</span>
              <span className="font-semibold text-gray-800">
                {now.toLocaleString("en-US", { month: "long" })} {currentYear}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSplitConfirmDialog(false)}
              disabled={isSplitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecalculateSplits}
              disabled={isSplitting}
              className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
            >
              {isSplitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Splitting...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Confirm & Split
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== STUDENT COLLECTIONS ====================
const StudentCollections = () => {
  const queryClient = useQueryClient();
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentType, setPaymentType] = useState("trip");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [searchFilter, setSearchFilter] = useState("");
  const [cachedLogo, setCachedLogo] = useState<string | null>(null);

  // Load logo for PDF
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/logo.png");
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setCachedLogo(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.log("Logo load skipped");
      }
    };
    loadLogo();
  }, []);

  // Search students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", "search", studentSearch],
    queryFn: async () => {
      const params = studentSearch ? `?search=${encodeURIComponent(studentSearch)}` : "";
      const res = await fetch(`${API_BASE_URL}/api/students${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search students");
      return res.json();
    },
    enabled: showCollectDialog,
  });

  // Get misc payment history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["finance", "misc-payments"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/finance/student-misc-payments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load misc payments");
      return res.json();
    },
  });

  const miscPayments = historyData?.data || [];
  const filteredPayments = miscPayments.filter((p: any) => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      p.description?.toLowerCase().includes(search) ||
      p.category?.toLowerCase().includes(search) ||
      p.studentId?.studentName?.toLowerCase().includes(search) ||
      p.studentId?.studentId?.toLowerCase().includes(search)
    );
  });

  const paymentTypes = [
    { value: "trip", label: "Trip Fee" },
    { value: "test", label: "Test Fee" },
    { value: "lab", label: "Lab Fee" },
    { value: "library", label: "Library Fee" },
    { value: "sports", label: "Sports Fee" },
    { value: "event", label: "Event Fee" },
    { value: "misc", label: "Other / Misc" },
  ];

  // Collect misc payment mutation
  const collectMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_BASE_URL}/api/finance/student-misc-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      toast.success("Payment Recorded", {
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["finance"] });

      // Generate receipt PDF
      const receiptData: MiscPaymentPDFData = data.data.receiptData;
      try {
        const blob = await pdf(
          <MiscPaymentPDF data={receiptData} logoDataUrl={cachedLogo || undefined} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch (e) {
        console.error("PDF generation error:", e);
        toast.error("Receipt generation failed");
      }

      // Reset form
      setShowCollectDialog(false);
      setSelectedStudent(null);
      setAmount("");
      setDescription("");
      setPaymentType("trip");
      setPaymentMethod("Cash");
      setStudentSearch("");
    },
    onError: (error: any) => {
      toast.error("Payment Failed", { description: error.message });
    },
  });

  const handleCollect = () => {
    if (!selectedStudent || !amount || Number(amount) <= 0) {
      toast.error("Please select a student and enter a valid amount");
      return;
    }
    collectMutation.mutate({
      studentId: selectedStudent._id,
      amount: Number(amount),
      paymentType,
      description,
      paymentMethod,
    });
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const categoryLabels: Record<string, string> = {
    Trip_Fee: "Trip",
    Test_Fee: "Test",
    Lab_Fee: "Lab",
    Library_Fee: "Library",
    Sports_Fee: "Sports",
    Event_Fee: "Event",
    Student_Misc: "Misc",
  };

  const categoryColors: Record<string, string> = {
    Trip_Fee: "bg-blue-100 text-blue-700",
    Test_Fee: "bg-purple-100 text-purple-700",
    Lab_Fee: "bg-amber-100 text-amber-700",
    Library_Fee: "bg-emerald-100 text-emerald-700",
    Sports_Fee: "bg-orange-100 text-orange-700",
    Event_Fee: "bg-pink-100 text-pink-700",
    Student_Misc: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Student Misc Collections
              </CardTitle>
              <CardDescription>
                Collect & track non-tuition payments — trips, tests, labs, events, and more
              </CardDescription>
            </div>
            <Button onClick={() => setShowCollectDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Collection
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Collection History</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, type, or description..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-500">Loading collections...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No misc collections recorded yet</p>
              <p className="text-sm mt-1">Click "New Collection" to record a student payment</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Collected By</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p: any) => (
                    <TableRow key={p._id}>
                      <TableCell className="text-slate-600">
                        {formatDate(p.date || p.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={categoryColors[p.category] || "bg-slate-100 text-slate-700"}
                        >
                          {categoryLabels[p.category] || p.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{p.studentId?.studentName || "-"}</span>
                          {p.studentId?.studentId && (
                            <span className="text-xs text-slate-400 ml-1">({p.studentId.studentId})</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-600">
                        {p.description || "-"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {p.collectedBy?.fullName || "Staff"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        PKR {p.amount?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collect Payment Dialog */}
      <Dialog open={showCollectDialog} onOpenChange={setShowCollectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Record Student Misc Payment
            </DialogTitle>
            <DialogDescription>
              Collect a non-tuition payment for trips, tests, labs, events, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Search */}
            <div>
              <Label>Student *</Label>
              {selectedStudent ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-3 mt-1">
                  <div>
                    <span className="font-semibold">{selectedStudent.studentName}</span>
                    <span className="text-xs ml-2 text-slate-500">({selectedStudent.studentId})</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {selectedStudent.class} | Father: {selectedStudent.fatherName || "-"}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="mt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name or student ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {studentsData?.data && studentsData.data.length > 0 && (
                    <div className="max-h-40 overflow-auto border rounded-md mt-1 bg-white shadow-sm">
                      {studentsData.data.slice(0, 8).map((s: any) => (
                        <button
                          key={s._id}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentSearch("");
                          }}
                        >
                          <span className="font-medium text-sm">{s.studentName}</span>
                          <span className="text-xs ml-2 text-slate-400">({s.studentId})</span>
                          <span className="text-xs ml-2 text-slate-500">{s.class}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Type */}
            <div>
              <Label>Payment Type *</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount & Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (PKR) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                  min="1"
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="e.g., Annual trip to Swat Valley, March 2026"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCollect}
              disabled={collectMutation.isPending || !selectedStudent || !amount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {collectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Collect & Generate Receipt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== PARTNER SETTLEMENTS COMPONENT (OWNER ONLY) ====================
const PartnerSettlements = () => {
  const queryClient = useQueryClient();
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [settlementMethod, setSettlementMethod] = useState("CASH");

  // Fetch all partner debts
  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ["partner-all-debts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/finance/partner/all-debts`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load partner debts");
      return res.json();
    },
  });

  // Fetch all settlements
  const { data: settlementsData, isLoading: settlementsLoading } = useQuery({
    queryKey: ["partner-settlements"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/finance/partner/settlements`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load settlements");
      return res.json();
    },
  });

  const partnerDebts = debtsData?.data || [];
  const settlements = settlementsData?.data || [];

  // Record settlement mutation
  const recordSettlementMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/api/finance/partner/record-settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to record settlement");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["partner-all-debts"] });
      queryClient.invalidateQueries({ queryKey: ["partner-settlements"] });
      toast.success("Settlement Recorded", {
        description: data.message || "Settlement has been recorded.",
      });
      setShowSettlementDialog(false);
      setSelectedPartner(null);
      setSettlementAmount("");
      setSettlementNotes("");
      setSettlementMethod("CASH");
    },
    onError: (error: any) => {
      toast.error("Settlement Failed", {
        description: error.message || "An error occurred.",
      });
    },
  });

  // Confirm pending settlement mutation
  const confirmSettlementMutation = useMutation({
    mutationFn: async (settlementId: string) => {
      const res = await fetch(`${API_BASE_URL}/api/finance/partner/settlements/${settlementId}/confirm`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to confirm");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-all-debts"] });
      queryClient.invalidateQueries({ queryKey: ["partner-settlements"] });
      toast.success("Settlement Confirmed");
    },
    onError: (error: any) => {
      toast.error("Confirmation Failed", { description: error.message });
    },
  });

  const handleRecordSettlement = () => {
    if (!selectedPartner || !settlementAmount || Number(settlementAmount) <= 0) {
      toast.error("Please select a partner and enter a valid amount");
      return;
    }
    recordSettlementMutation.mutate({
      partnerId: selectedPartner.userId,
      amount: Number(settlementAmount),
      notes: settlementNotes || undefined,
      method: settlementMethod,
    });
  };

  const totalOverallDebt = partnerDebts.reduce((sum: number, p: any) => sum + (p.expenseDebt || 0), 0);

  return (
    <div className="space-y-6">
      {/* Partner Debt Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {debtsLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : partnerDebts.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No partners configured in expense split
          </div>
        ) : (
          partnerDebts.map((partner: any) => (
            <Card key={partner.userId} className={`shadow-lg border-l-4 ${partner.expenseDebt > 0 ? "border-red-500" : "border-green-500"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{partner.fullName}</CardTitle>
                    <CardDescription>{partner.splitPercentage}% expense share - {partner.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding Debt</span>
                    <span className={`font-bold ${partner.expenseDebt > 0 ? "text-red-600" : "text-green-600"}`}>
                      PKR {(partner.expenseDebt || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending Approval</span>
                    <span className="font-medium text-orange-600">PKR {(partner.totalPending || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Settled</span>
                    <span className="font-medium text-blue-600">PKR {(partner.totalSettled || 0).toLocaleString()}</span>
                  </div>
                  {partner.expenseDebt > 0 && (
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setSelectedPartner(partner);
                        setShowSettlementDialog(true);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-1" /> Record Payment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Total Outstanding */}
      {totalOverallDebt > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Total Outstanding from All Partners</p>
                <p className="text-xs text-red-600">Amount owed to owner across all expense splits</p>
              </div>
              <p className="text-2xl font-bold text-red-700">PKR {totalOverallDebt.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Settlement History
          </CardTitle>
          <CardDescription>All expense debt payments from partners</CardDescription>
        </CardHeader>
        <CardContent>
          {settlementsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No settlements recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Partner</TableHead>
                  <TableHead className="font-semibold text-right">Amount (PKR)</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s: any) => (
                  <TableRow key={s._id}>
                    <TableCell className="text-sm">
                      {new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="font-medium">{s.partnerName || s.partnerId?.fullName || "—"}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {Number(s.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{s.method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${s.status === "COMPLETED" ? "bg-green-100 text-green-700" : s.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"}`}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.notes || "—"}</TableCell>
                    <TableCell>
                      {s.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                          disabled={confirmSettlementMutation.isPending}
                          onClick={() => confirmSettlementMutation.mutate(s._id)}
                        >
                          Confirm
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Settlement Dialog */}
      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              Record Settlement
            </DialogTitle>
            <DialogDescription>
              Record a payment received from {selectedPartner?.fullName || "partner"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-xl border">
              <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Partner</p>
              <p className="text-lg font-bold">{selectedPartner?.fullName}</p>
              <p className="text-sm text-red-600 font-medium">
                Outstanding: PKR {(selectedPartner?.expenseDebt || 0).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={settlementMethod} onValueChange={setSettlementMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Monthly settlement"
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettlementDialog(false)}>Cancel</Button>
            <Button
              onClick={handleRecordSettlement}
              disabled={recordSettlementMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {recordSettlementMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</>
              ) : (
                "Record Settlement"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== TEACHER PAYROLL TAB ====================
const TeacherPayrollTab = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creditTeacher, setCreditTeacher] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [depositTeacher, setDepositTeacher] = useState<{ id: string; name: string } | null>(null);
  const [classFilters, setClassFilters] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const queryClient = useQueryClient();

  // Build month options: current month + last 5 months
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      opts.push({ val, label });
    }
    return opts;
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["teacher-payroll-report-finance", selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      const res = await fetch(
        `${API_BASE_URL}/api/finance/teacher-payroll-report?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch teacher payroll report");
      return res.json();
    },
  });

  const creditMutation = useMutation({
    mutationFn: async ({ teacherId, amount, description }: { teacherId: string; amount: number; description: string }) => {
      // Step 1: Credit the teacher's wallet (adds to pending balance)
      const creditRes = await fetch(`${API_BASE_URL}/api/teachers/${teacherId}/wallet/credit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description }),
      });
      const creditData = await creditRes.json();
      if (!creditData.success) throw new Error(creditData.message || "Credit failed");

      // Step 2: Immediately release payment (debit from pending, creates TeacherPayment + Expense)
      const debitRes = await fetch(`${API_BASE_URL}/api/teachers/${teacherId}/wallet/debit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: description || `Salary payment — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}` }),
      });
      const debitData = await debitRes.json();
      if (!debitData.success) throw new Error(debitData.message || "Payment release failed");

      return debitData;
    },
    onSuccess: (data) => {
      toast.success(`Payment of ${formatCurrency(Number(creditAmount))} released successfully! Voucher: ${data.voucherId || "Generated"}`);
      setCreditTeacher(null);
      setCreditAmount("");
      setCreditNote("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["teacher-payroll-report-finance"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to pay teacher");
    },
  });

  const report = data?.data || [];
  const totalOwed = data?.totalOwed || 0;
  const teachersWithBalance = report.filter((t: any) => t.netOwed > 0);
  const totalAlreadyPaid = report.reduce((s: number, t: any) => s + (t.alreadyPaid || 0), 0);

  const compConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    percentage: { label: "% Split", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: "%" },
    perStudent: { label: "Per Student", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: "S" },
    fixed: { label: "Fixed Salary", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: "F" },
    hybrid: { label: "Hybrid", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", icon: "H" },
  };

  // Build class options for a teacher from proof items (percentage/perStudent) or feeFlowItems (fixed/hybrid)
  const getClassOptions = (t: any): string[] => {
    const items: any[] = t.proof?.items || [];
    const feeFlowItems: any[] = t.proof?.feeFlowItems || [];
    const all = [...items, ...feeFlowItems];
    return Array.from(new Set(all.map((it) => it.className).filter((c) => typeof c === "string" && c.trim()))).sort();
  };

  const selectedMonthLabel = monthOptions.find((m) => m.val === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-5">
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Teacher Payroll</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time salary report — click any teacher to see the full breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setExpanded(null); setClassFilters({}); }}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
            <Loader2 className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      {teachersWithBalance.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold">
            {teachersWithBalance.length}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              {teachersWithBalance.length} teacher{teachersWithBalance.length !== 1 ? "s" : ""} need to be paid for {selectedMonthLabel}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Total due: <span className="font-bold">{formatCurrency(totalOwed)}</span>
              {totalAlreadyPaid > 0 && <span className="ml-2 opacity-70">· Already paid: {formatCurrency(totalAlreadyPaid)}</span>}
            </p>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 shrink-0">{formatCurrency(totalOwed)}</div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Teachers on Payroll</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{report.length}</p>
            <p className="text-xs text-slate-400 mt-1">Excl. Owner &amp; Partners</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Total Owed This Month</p>
            <p className="text-3xl font-extrabold text-emerald-700 mt-1">{formatCurrency(totalOwed)}</p>
            <p className="text-xs text-emerald-500 mt-1">{selectedMonthLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Already Paid</p>
            <p className="text-3xl font-extrabold text-blue-700 mt-1">{formatCurrency(totalAlreadyPaid)}</p>
            <p className="text-xs text-blue-500 mt-1">Payments processed this period</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Teacher list ── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-9 w-9 animate-spin text-violet-500" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm font-medium">Failed to load payroll report</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : report.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-xl bg-slate-50">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No teacher payroll data for {selectedMonthLabel}</p>
            <p className="text-sm mt-1 text-slate-400">When students pay fees, teacher earnings appear here.</p>
          </div>
        ) : (
          report.map((t: any) => {
            const cfg = compConfig[t.compensationType] || compConfig.fixed;
            const isOpen = expanded === t.teacherId;
            const classOptions = getClassOptions(t);
            const selectedClass = classFilters[t.teacherId] || "";

            // Filtered items for percentage / perStudent proof items
            const proofItems: any[] = t.proof?.items || [];
            const feeFlowItems: any[] = t.proof?.feeFlowItems || [];
            const filteredProof = selectedClass ? proofItems.filter((it) => it.className === selectedClass) : proofItems;
            const filteredFlow = selectedClass ? feeFlowItems.filter((it) => it.className === selectedClass) : feeFlowItems;

            // Totals for filtered view
            const filteredTeacherTotal = filteredProof.reduce((s, it) => s + (Number(it.teacherShare) || 0), 0);
            const filteredAcademyTotal = filteredProof.reduce((s, it) => s + (Number(it.academyPoolShare) || 0), 0);
            const filteredSubjectTotal = filteredProof.reduce((s, it) => s + (Number(it.amount) || 0), 0);

            // Revenue bar widths
            const totalRevenue = t.revenueFlow?.subjectFeesCollected || 0;
            const teacherPct = totalRevenue > 0 ? Math.round(((t.revenueFlow?.teacherShareFromFees || 0) / totalRevenue) * 100) : 0;
            const academyPct = totalRevenue > 0 ? Math.round(((t.revenueFlow?.academyPoolRouted || 0) / totalRevenue) * 100) : 0;
            const ownerPct = totalRevenue > 0 ? Math.round(((t.revenueFlow?.ownerPartnerDirectRouted || 0) / totalRevenue) * 100) : 0;

            return (
              <div key={t.teacherId} className={`rounded-xl border overflow-hidden transition-shadow ${isOpen ? "shadow-md border-slate-300" : "border-slate-200 hover:border-slate-300"}`}>
                {/* ── Collapsed header ── */}
                <div
                  className="flex flex-wrap items-center gap-3 p-4 cursor-pointer bg-white hover:bg-slate-50/70 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : t.teacherId)}
                >
                  {/* Avatar */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color} text-lg font-extrabold border ${cfg.border}`}>
                    {(t.teacherName || "T").charAt(0).toUpperCase()}
                  </div>

                  {/* Name + type + classes */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{t.teacherName}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                        {t.compensationType === "percentage" && t.proof?.teacherSharePercent && (
                          <span>· {t.proof.teacherSharePercent}%</span>
                        )}
                      </span>
                      {t.subject && <span className="text-xs text-slate-500">{t.subject}</span>}
                    </div>
                    {/* Classes taught chips */}
                    {classOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {classOptions.slice(0, 5).map((c) => (
                          <span key={c} className="inline-block text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 border border-slate-200">{c}</span>
                        ))}
                        {classOptions.length > 5 && (
                          <span className="inline-block text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">+{classOptions.length - 5} more</span>
                        )}
                      </div>
                    )}
                    {/* Quick calc summary */}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t.compensationType === "percentage" && `${t.proof?.feeRecordCount || 0} fee payments · ${formatCurrency(t.revenueFlow?.subjectFeesCollected || 0)} collected`}
                      {t.compensationType === "perStudent" && `${t.proof?.activeStudentCount || 0} active students · ${formatCurrency(t.proof?.perStudentAmount || 0)}/student`}
                      {t.compensationType === "fixed" && `Fixed monthly salary`}
                      {t.compensationType === "hybrid" && `${formatCurrency(t.proof?.baseSalary || 0)} base + ${t.proof?.profitSharePercent || 0}% profit`}
                    </p>
                  </div>

                  {/* Right side: amount + actions */}
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="text-right">
                      <p className={`text-xl font-extrabold tabular-nums ${t.netOwed > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {formatCurrency(t.netOwed || 0)}
                      </p>
                      <p className="text-[10px] text-slate-400">Net owed</p>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => setDepositTeacher({ id: t.teacherId, name: t.teacherName })}
                      >
                        <Wallet className="h-3 w-3 mr-1" /> Deposit
                      </Button>
                      {t.netOwed > 0 && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => { setCreditTeacher(t); setCreditAmount(String(t.netOwed)); }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Pay {formatCurrency(t.netOwed)}
                        </Button>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {isOpen && (
                  <div className="border-t bg-slate-50/60 p-4 space-y-4">

                    {/* Ledger row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Gross Earned</p>
                        <p className="text-base font-bold text-emerald-600 mt-0.5">{formatCurrency(t.grossEarned || t.grossOwed || 0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Already Paid</p>
                        <p className="text-base font-bold text-blue-600 mt-0.5">{formatCurrency(t.alreadyPaid || 0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Deductions</p>
                        <p className="text-base font-bold text-red-500 mt-0.5">{formatCurrency(t.withdrawalAdjustments || t.withdrawalDeduction || 0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-2 border-emerald-300">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">You Owe</p>
                        <p className="text-base font-extrabold text-emerald-700 mt-0.5">{formatCurrency(t.netOwed || 0)}</p>
                      </div>
                    </div>

                    {/* ── Plain-English Explanation ── */}
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-bold text-slate-700 mb-1.5">Why this amount? (Simple explanation)</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t.compensationType === "percentage" && (
                          <>
                            <strong>{t.teacherName}</strong> earns <strong>{t.proof?.teacherSharePercent || 0}%</strong> of every fee paid by students in their class.{" "}
                            This month, <strong>{t.proof?.feeRecordCount || 0}</strong> students paid fees totalling{" "}
                            <strong>{formatCurrency(t.revenueFlow?.subjectFeesCollected || 0)}</strong>. Their share ({t.proof?.teacherSharePercent || 0}%) =&nbsp;
                            <strong className="text-emerald-700">{formatCurrency(t.grossEarned || t.grossOwed || 0)}</strong>.
                            Academy keeps <strong className="text-blue-700">{formatCurrency(t.revenueFlow?.academyPoolRouted || 0)}</strong>.
                          </>
                        )}
                        {t.compensationType === "perStudent" && (
                          <>
                            <strong>{t.teacherName}</strong> earns <strong>{formatCurrency(t.proof?.perStudentAmount || 0)}</strong> for every active student.{" "}
                            They have <strong>{t.proof?.activeStudentCount || 0}</strong> active students this month.{" "}
                            Total = <strong className="text-emerald-700">{formatCurrency(t.proof?.calculatedAmount || 0)}</strong>.
                          </>
                        )}
                        {t.compensationType === "fixed" && (
                          <>
                            <strong>{t.teacherName}</strong> has a <strong>fixed monthly salary</strong> of{" "}
                            <strong className="text-emerald-700">{formatCurrency(t.proof?.fixedSalary || 0)}</strong> — same every month regardless of student count.
                            {t.alreadyPaid > 0 && <> Already paid <strong>{formatCurrency(t.alreadyPaid)}</strong> this month.</>}
                          </>
                        )}
                        {t.compensationType === "hybrid" && (
                          <>
                            <strong>{t.teacherName}</strong> gets a base salary of <strong>{formatCurrency(t.proof?.baseSalary || 0)}</strong> plus{" "}
                            <strong>{t.proof?.profitSharePercent || 0}%</strong> profit share (<strong>{formatCurrency(t.proof?.profitShareAmount || 0)}</strong>).{" "}
                            Total = <strong className="text-emerald-700">{formatCurrency((t.proof?.baseSalary || 0) + (t.proof?.profitShareAmount || 0))}</strong>.
                          </>
                        )}
                      </p>
                    </div>

                    {/* ── Revenue Flow Bar ── */}
                    {totalRevenue > 0 && (
                      <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                        <p className="text-xs font-bold text-slate-700">Revenue Flow — {formatCurrency(totalRevenue)} collected from students</p>
                        <div className="flex rounded-full overflow-hidden h-5 w-full text-[10px] font-bold">
                          {teacherPct > 0 && (
                            <div className="flex items-center justify-center bg-emerald-500 text-white" style={{ width: `${teacherPct}%` }}>
                              {teacherPct > 8 ? `${teacherPct}%` : ""}
                            </div>
                          )}
                          {academyPct > 0 && (
                            <div className="flex items-center justify-center bg-blue-500 text-white" style={{ width: `${academyPct}%` }}>
                              {academyPct > 8 ? `${academyPct}%` : ""}
                            </div>
                          )}
                          {ownerPct > 0 && (
                            <div className="flex items-center justify-center bg-amber-500 text-white" style={{ width: `${ownerPct}%` }}>
                              {ownerPct > 8 ? `${ownerPct}%` : ""}
                            </div>
                          )}
                          {(100 - teacherPct - academyPct - ownerPct) > 0 && (
                            <div className="flex-1 bg-slate-200" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-slate-600">Teacher: <strong className="text-emerald-700">{formatCurrency(t.revenueFlow?.teacherShareFromFees || 0)}</strong></span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
                            <span className="text-slate-600">Academy pool: <strong className="text-blue-700">{formatCurrency(t.revenueFlow?.academyPoolRouted || 0)}</strong></span>
                          </span>
                          {(t.revenueFlow?.ownerPartnerDirectRouted || 0) > 0 && (
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500" />
                              <span className="text-slate-600">Owner direct: <strong className="text-amber-700">{formatCurrency(t.revenueFlow.ownerPartnerDirectRouted)}</strong></span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Class filter + breakdown table ── */}
                    {(proofItems.length > 0 || feeFlowItems.length > 0) && (
                      <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-700">
                            {t.compensationType === "percentage" && "Fee-by-fee breakdown"}
                            {t.compensationType === "perStudent" && "Per-class student breakdown"}
                            {(t.compensationType === "fixed" || t.compensationType === "hybrid") && "Revenue from teacher's classes"}
                          </p>
                          {classOptions.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">Filter class:</span>
                              <select
                                className="h-7 text-[11px] rounded-md border border-slate-200 bg-white px-2 pr-6"
                                value={selectedClass}
                                onChange={(e) => setClassFilters((prev) => ({ ...prev, [t.teacherId]: e.target.value }))}
                              >
                                <option value="">All classes ({classOptions.length})</option>
                                {classOptions.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                              {selectedClass && (
                                <button
                                  type="button"
                                  className="text-[11px] text-slate-400 hover:text-slate-700 underline"
                                  onClick={() => setClassFilters((prev) => ({ ...prev, [t.teacherId]: "" }))}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Filtered summary strip */}
                        {selectedClass && (t.compensationType === "percentage") && (
                          <div className="flex flex-wrap gap-3 text-[11px] bg-violet-50 border border-violet-100 rounded-md px-3 py-2">
                            <span className="font-semibold text-violet-700">{selectedClass}</span>
                            <span className="text-slate-600">Payments: <strong>{filteredProof.length}</strong></span>
                            <span className="text-slate-600">Fees: <strong>{formatCurrency(filteredSubjectTotal)}</strong></span>
                            <span className="text-emerald-700">Teacher: <strong>{formatCurrency(filteredTeacherTotal)}</strong></span>
                            <span className="text-blue-700">Academy: <strong>{formatCurrency(filteredAcademyTotal)}</strong></span>
                          </div>
                        )}

                        {/* PERCENTAGE — fee items */}
                        {t.compensationType === "percentage" && (
                          filteredProof.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic px-1">No fee records for this selection.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                              {filteredProof.map((item: any, i: number) => (
                                <div key={i} className="rounded-lg bg-emerald-50/60 border border-emerald-100 px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-800 truncate">
                                      {item.studentName}
                                      {item.className && <span className="text-slate-400 ml-1.5 font-normal">· {item.className}</span>}
                                      {item.subject && <span className="text-slate-400 ml-1.5 font-normal">({item.subject})</span>}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700 shrink-0">
                                      {formatCurrency(item.teacherShare || 0)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 mt-1 text-[10px] text-slate-500">
                                    <span>Fee paid: <strong>{formatCurrency(item.amount || 0)}</strong></span>
                                    <span className="text-blue-600">Academy pool: <strong>{formatCurrency(item.academyPoolShare || 0)}</strong></span>
                                    {item.ownerPartnerDirectShare > 0 && (
                                      <span className="text-amber-600">Owner: <strong>{formatCurrency(item.ownerPartnerDirectShare)}</strong></span>
                                    )}
                                    {item.date && <span>{new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
                                  </div>
                                  {item.stakeholderSplits?.length > 0 && (
                                    <p className="text-[10px] text-violet-600 mt-0.5">
                                      {item.stakeholderSplits.map((s: any) => `${s.fullName || s.role}: ${formatCurrency(s.amount)}`).join(" · ")}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        )}

                        {/* PER STUDENT — class rows */}
                        {t.compensationType === "perStudent" && (
                          <div className="space-y-1.5">
                            {(selectedClass
                              ? proofItems.filter((it) => it.className === selectedClass)
                              : proofItems
                            ).map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded-lg bg-blue-50/60 border border-blue-100 px-3 py-2.5">
                                <div>
                                  <p className="text-xs font-semibold text-slate-800">{item.className}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {item.studentCount} student{item.studentCount !== 1 ? "s" : ""} × {formatCurrency(item.perStudentAmount || 0)} per student
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-blue-700">{formatCurrency(item.total || 0)}</p>
                              </div>
                            ))}
                            {proofItems.length === 0 && (
                              <p className="text-[11px] text-slate-400 italic px-1">No class data available.</p>
                            )}
                          </div>
                        )}

                        {/* FIXED / HYBRID — show fee flow items from their classes */}
                        {(t.compensationType === "fixed" || t.compensationType === "hybrid") && (
                          filteredFlow.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic px-1">No fee records found for this teacher's classes.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                              {filteredFlow.map((item: any, i: number) => (
                                <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-slate-800 truncate">
                                      {item.studentName}
                                      {item.subject && <span className="text-slate-400 ml-1.5 font-normal">({item.subject})</span>}
                                      {item.className && <span className="text-slate-400 ml-1.5 font-normal">· {item.className}</span>}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 shrink-0">{formatCurrency(item.subjectFee || 0)}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 mt-0.5 text-[10px] text-slate-500">
                                    <span className="text-emerald-600">Teacher portion: <strong>{formatCurrency(item.teacherShare || 0)}</strong></span>
                                    <span className="text-blue-600">Academy pool: <strong>{formatCurrency(item.academyPoolShare || 0)}</strong></span>
                                    {item.ownerPartnerDirectShare > 0 && (
                                      <span className="text-amber-600">Owner: <strong>{formatCurrency(item.ownerPartnerDirectShare)}</strong></span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        )}

                        {/* Collection note */}
                        {t.proof?.collectionHandling && (
                          <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1.5 mt-1">
                            {t.proof.collectionHandling}
                          </p>
                        )}
                      </div>
                    )}


                    {/* Pay button inside panel — class-filter-aware */}
                    {t.netOwed > 0 && (
                      <div className="flex flex-col gap-2">
                        {selectedClass && filteredTeacherTotal > 0 && (
                          <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-[11px]">
                            <span className="text-violet-700 font-semibold">Class filter active:</span>
                            <span className="text-slate-600">{selectedClass}</span>
                            <span className="ml-auto text-emerald-700 font-bold">{formatCurrency(filteredTeacherTotal)} teacher share for this class</span>
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          {selectedClass && filteredTeacherTotal > 0 && filteredTeacherTotal !== t.netOwed && (
                            <Button
                              variant="outline"
                              className="text-violet-700 border-violet-200 hover:bg-violet-50 text-sm h-9"
                              onClick={() => { setCreditTeacher(t); setCreditAmount(String(Math.round(filteredTeacherTotal))); }}
                            >
                              <Plus className="h-4 w-4 mr-1.5" />
                              Pay for {selectedClass} — {formatCurrency(filteredTeacherTotal)}
                            </Button>
                          )}
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9"
                            onClick={() => { setCreditTeacher(t); setCreditAmount(String(t.netOwed)); }}
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Pay {t.teacherName} — {formatCurrency(t.netOwed)} (full)
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Pay Teacher Dialog ── */}
      <Dialog open={!!creditTeacher} onOpenChange={(open) => !open && setCreditTeacher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay {creditTeacher?.teacherName}</DialogTitle>
            <DialogDescription>
              Release salary payment for <strong>{selectedMonthLabel}</strong>. A payment voucher + expense record will be created.
              Net owed: <strong>{formatCurrency(creditTeacher?.netOwed || 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Amount (PKR)</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter amount"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                placeholder={`e.g. ${selectedMonthLabel} salary payment`}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditTeacher(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!creditAmount || Number(creditAmount) <= 0 || creditMutation.isPending}
              onClick={() => {
                if (creditTeacher) {
                  creditMutation.mutate({
                    teacherId: creditTeacher.teacherId,
                    amount: Number(creditAmount),
                    description: creditNote || `Salary payment — ${selectedMonthLabel}`,
                  });
                }
              }}
            >
              {creditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Pay {formatCurrency(Number(creditAmount) || 0)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Teacher Deposit Modal ── */}
      <TeacherDepositModal
        teacher={depositTeacher ? { _id: depositTeacher.id, name: depositTeacher.name, subject: "" } : null}
        open={!!depositTeacher}
        onOpenChange={(open) => !open && setDepositTeacher(null)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["teacher-payroll-report-finance"] });
        }}
      />
    </div>
  );
};

// ==================== MAIN FINANCE COMPONENT ====================
const Finance = () => {
  // Get tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    // Update active tab if URL changes
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, []);

  return (
    <DashboardLayout title="Finance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Finance Dashboard
            </h1>
            <p className="text-slate-600 mt-1">
              Track revenue, expenses, and academy assets
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-4 py-2">
            <Wallet className="mr-2 h-4 w-4" />
            Finance
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-5xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Collections
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Daily Expenses
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Teacher Payroll
            </TabsTrigger>
            <TabsTrigger value="settlements" className="flex items-center gap-2">
              <HandCoins className="h-4 w-4" />
              Settlements
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Asset Registry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <FinanceOverview />
          </TabsContent>

          <TabsContent value="collections" className="mt-6">
            <StudentCollections />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <DailyExpenses />
          </TabsContent>

          <TabsContent value="payroll" className="mt-6">
            <TeacherPayrollTab />
          </TabsContent>

          <TabsContent value="settlements" className="mt-6">
            <PartnerSettlements />
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            <AssetRegistry />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Finance;
