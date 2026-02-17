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
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { MiscPaymentPDF, type MiscPaymentPDFData } from "@/components/print/MiscPaymentPDF";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
              Fee Collections
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {formatCurrency(stats?.totalIncome || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Expenses
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
              Net Balance
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(stats?.netProfit || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue - Expenses
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
          <Button
            onClick={() => setShowExpenseDialog(true)}
            className="bg-red-600 hover:bg-red-700 shadow-lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
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
          <TabsList className="grid w-full grid-cols-4 max-w-3xl">
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

          <TabsContent value="assets" className="mt-6">
            <AssetRegistry />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Finance;
