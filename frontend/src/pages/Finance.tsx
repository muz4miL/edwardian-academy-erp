import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Wallet,
  Loader2,
  Plus,
  TrendingDown,
  HelpCircle,
  Search,
  History,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  BarChart3,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaymentReceipt } from "@/components/finance/PaymentReceipt";
import { TeacherPayrollTable } from "@/components/finance/TeacherPayrollTable";
import { useAuth } from "@/context/AuthContext";
import { motion, useMotionValue, useSpring, Variants } from "framer-motion";

// --- VISUAL CONFIGURATION ---
const COLORS = {
  navy: "#0F172A",
  slate: "#F8FAFC",
  gold: "#D97706",
  glass: "bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl",
  glassInput: "bg-white/40 border-b border-slate-300 focus:border-[#D97706] focus:border-b-2 rounded-none transition-all",
};

// API Base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// --- TYPES ---
interface FinanceHistoryItem {
  _id: string;
  date: string;
  type: "INCOME" | "EXPENSE" | "PARTNER_WITHDRAWAL" | "DIVIDEND" | "DEBT";
  description: string;
  amount: number;
  status: string;
  isExpense: boolean;
  category?: string;
  collectedBy?: string;
  studentName?: string;
  paidBy?: string;
  stream?: string;
  splitDetails?: {
    partnerName?: string;
    percentage?: number;
    poolType?: string;
    teacherShare?: number;
    academyShare?: number;
  };
  vendorName?: string;
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
  paidByType?: "ACADEMY_CASH" | "WAQAR" | "ZAHID" | "SAUD";
}

// --- MOTION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

// --- MAIN COMPONENT ---
const Finance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isOwner = user?.role === "OWNER";
  const showAnalytics = isOwner;

  // --- STATE ---
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [dueDate, setDueDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [paidByType, setPaidByType] = useState("WAQAR");
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");

  // --- QUERIES ---
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
    enabled: showAnalytics,
  });

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

  // --- MUTATIONS ---
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
      queryClient.invalidateQueries({ queryKey: ["finance-history"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });

      toast.success("✅ Expense recorded successfully!", {
        description: `${data.data?.title || "Expense"} - PKR ${data.data?.amount?.toLocaleString() || "0"}`,
      });

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

  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/finance/transaction/${transactionId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to delete transaction");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["finance-history"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });
      const isExpense = data.deletedTransaction?.type === "EXPENSE";
      toast.success("✅ Transaction deleted", {
        description: isExpense
          ? `${data.deletedTransaction.description} removed\n✓ Partner expense shares also cleared`
          : data.message || "Transaction removed from ledger",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to delete transaction", {
        description: error.message || "Please try again",
      });
    },
  });

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

  // --- HANDLERS ---
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
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      paidByType: "WAQAR",
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

  // --- DATA DERIVATION ---
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
    ownerNetRevenue = 0,
    collectionRate = 0,
  } = financeData || {};

  const expenses = expensesData || [];
  const pendingExpenses = expenses.filter(
    (e) => e.status === "pending" || e.status === "overdue",
  );
  const pendingTotal = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-600/90 hover:bg-emerald-700 text-white text-xs border-0 shadow-sm backdrop-blur-sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            PAID
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-600/90 hover:bg-red-700 text-white text-xs animate-pulse border-0 shadow-sm backdrop-blur-sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            OVERDUE
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-600/90 hover:bg-amber-700 text-white text-xs border-0 shadow-sm backdrop-blur-sm">
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        );
    }
  };

  // --- UI HELPERS ---
  const MagneticWrapper = ({ children }: { children: React.ReactNode }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
      const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - left - width / 2;
      const offsetY = event.clientY - top - height / 2;
      x.set(offsetX / 8);
      y.set(offsetY / 8);
    }
    function onMouseLeave() {
      x.set(0);
      y.set(0);
    }

    return (
      <motion.div onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} style={{ x: mouseX, y: mouseY }} className="h-full w-full">
        {children}
      </motion.div>
    );
  };

  if (statsLoading && isOwner) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex items-center justify-center h-96 bg-[#F8FAFC]">
          <Loader2 className="h-8 w-8 animate-spin text-[#D97706]" />
        </div>
      </DashboardLayout>
    );
  }

  if (statsError && isOwner) {
    return (
      <DashboardLayout title="Finance">
        <div className="flex flex-col items-center justify-center h-96 gap-4 bg-[#F8FAFC]">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-[#0F172A]">
            Failed to load finance data
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["finance"] })} className="bg-[#D97706] hover:bg-[#B45309]">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <TooltipProvider>
      <DashboardLayout title="Finance">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-8 font-sans selection:bg-[#D97706] selection:text-white"
        >
          
          {/* ============================================ */}
          {/* SECTION: PREMIUM INPUT BAR */}
          {/* ============================================ */}
          <motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto">
            <div className={`${COLORS.glass} rounded-[2.5rem] p-2 md:p-3 flex flex-col md:flex-row items-center gap-4 shadow-2xl shadow-[#0F172A]/5 relative overflow-hidden`}>
              {/* Decorative Gold Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#D97706]/5 to-transparent pointer-events-none" />
              
              <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-[#0F172A] text-[#D97706] shrink-0 z-10 shadow-lg">
                <Plus className="h-6 w-6" />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddExpense(); }} className="flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-3 z-10">
                
                {/* Title */}
                <div className="md:col-span-4 relative group">
                  <Input
                    placeholder="Expense Title (e.g. Electricity)"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className={`${COLORS.glassInput} bg-transparent text-[#0F172A] font-medium placeholder:text-slate-400 h-12`}
                  />
                </div>

                {/* Vendor */}
                <div className="md:col-span-3 relative">
                   <Input
                    placeholder="Vendor"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className={`${COLORS.glassInput} bg-transparent text-[#0F172A] font-medium placeholder:text-slate-400 h-12`}
                  />
                </div>

                {/* Category */}
                <div className="md:col-span-2">
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger className="h-12 bg-transparent border-b border-slate-300 focus:border-[#D97706] rounded-none text-[#0F172A] font-medium">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Rent">Rent</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                      <SelectItem value="Stationery">Stationery</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Misc">Misc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="md:col-span-3 relative">
                  <Input
                    type="number"
                    placeholder="PKR Amount"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className={`${COLORS.glassInput} bg-transparent text-[#D97706] font-bold text-lg text-right placeholder:text-slate-400 h-12`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">PKR</span>
                </div>

                {/* Hidden Date Input (Defaulted to today) */}
                <input type="hidden" value={dueDate} readOnly />

                <div className="md:col-span-12 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={createExpenseMutation.isPending}
                    className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-full px-8 h-12 font-bold tracking-wide transition-all hover:scale-105 shadow-lg shadow-[#0F172A]/20 flex items-center gap-2"
                  >
                    {createExpenseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add Expense
                  </Button>
                </div>
              </form>
            </div>
            <p className="text-center text-slate-500 text-xs mt-3 font-medium">
              * Deducted from Sir Waqar's Revenue Pool
            </p>
          </motion.div>

          {/* ============================================ */}
          {/* SECTION: LIVE LEDGER */}
          {/* ============================================ */}
          <motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto">
            <div className={`${COLORS.glass} rounded-[2rem] p-6 md:p-8 mb-8`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#0F172A]">Finance History</h2>
                  <p className="text-slate-500 text-sm font-medium">Real-time transaction ledger</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {isOwner && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by partner..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="pl-9 w-full sm:w-56 bg-white/40 border-slate-200 rounded-full focus:border-[#D97706] focus:ring-[#D97706]/20"
                      />
                    </div>
                  )}
                  <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40 bg-white/40 border-slate-200 rounded-full">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="DIVIDEND">Dividends</SelectItem>
                      <SelectItem value="DEBT">Debts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#D97706]" />
                </div>
              ) : !historyData || historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-24 h-24 rounded-full bg-gradient-to-b from-white to-slate-200 shadow-inner mb-6 relative"
                  >
                     <div className="absolute inset-0 rounded-full border border-white/50 blur-sm" />
                  </motion.div>
                  <h3 className="font-serif text-xl text-slate-600">Ledger is Empty</h3>
                  <p className="text-sm">Transactions will appear here in real-time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <Table>
                    <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
                      <TableRow className="hover:bg-slate-50 border-b border-slate-200">
                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Date</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Type</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Description</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Amount</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Status</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData
                        .filter((item) => {
                          if (historyTypeFilter !== "all" && item.type !== historyTypeFilter) return false;
                          if (isOwner && historySearch) {
                            const searchLower = historySearch.toLowerCase();
                            return (item.collectedBy?.toLowerCase() || "").includes(searchLower) ||
                                   (item.paidBy?.toLowerCase() || "").includes(searchLower);
                          }
                          return true;
                        })
                        .slice(0, 50)
                        .map((item) => {
                          const isPositive = ["INCOME", "PARTNER_WITHDRAWAL", "DIVIDEND"].includes(item.type);
                          const amountColorClass = isPositive ? "text-emerald-600 font-bold" : "text-red-500 font-bold";
                          const formattedDate = new Date(item.date).toLocaleDateString("en-PK", {
                            day: "2-digit", month: "short", year: "numeric",
                          });

                          const getTypeBadgeClass = (type: string) => {
                            switch (type) {
                              case "INCOME": return "bg-emerald-100 text-emerald-700 border-emerald-200";
                              case "EXPENSE": return "bg-red-100 text-red-700 border-red-200";
                              case "DIVIDEND": return "bg-violet-100 text-violet-700 border-violet-200";
                              case "DEBT": return "bg-amber-100 text-amber-700 border-amber-200";
                              default: return "bg-slate-100 text-slate-700 border-slate-200";
                            }
                          };

                          return (
                            <motion.tr
                              key={item._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="hover:bg-white/50 transition-colors border-b border-slate-50 last:border-0 group"
                            >
                              <TableCell className="whitespace-nowrap text-slate-600 font-medium py-4">{formattedDate}</TableCell>
                              <TableCell>
                                <Badge className={`text-xs border-0 font-medium ${getTypeBadgeClass(item.type)}`}>
                                  {item.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs text-slate-800 py-4">
                                <div className="font-semibold">{item.description}</div>
                                {item.collectedBy && isOwner && (
                                  <div className="text-xs text-slate-400 mt-1">by {item.collectedBy}</div>
                                )}
                              </TableCell>
                              <TableCell className={`text-right py-4 ${amountColorClass}`}>
                                {isPositive ? "+" : "-"}PKR {item.amount.toLocaleString()}
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant="outline" className="text-xs capitalize font-medium border-slate-200 text-slate-600">
                                  {item.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right py-4">
                                {isOwner && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Delete this transaction?\n\n${item.description}\n-PKR ${item.amount.toLocaleString()}`)) {
                                        deleteTransactionMutation.mutate(item._id);
                                      }
                                    }}
                                    disabled={deleteTransactionMutation.isPending}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </motion.div>

          {/* ============================================ */}
          {/* SECTION: PENDING BILLS */}
          {/* ============================================ */}
          {pendingExpenses.length > 0 && (
            <motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto">
              <div className={`${COLORS.glass} rounded-[2rem] p-8 mb-8`}>
                 <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-bold text-[#0F172A]">Pending Liabilities</h2>
                  <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-200">
                    Total Due: PKR {pendingTotal.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingExpenses.map((expense) => (
                    <motion.div 
                      key={expense._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col justify-between h-full ${
                        expense.status === "overdue"
                          ? "bg-red-50/60 border-red-200"
                          : "bg-amber-50/60 border-amber-200"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-[#0F172A]">{expense.title}</h4>
                          {getStatusBadge(expense.status)}
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" /> {expense.vendorName}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Due: {new Date(expense.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-black/5 mt-2">
                        <span className="text-lg font-serif font-bold text-[#0F172A]">PKR {expense.amount.toLocaleString()}</span>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => markAsPaidMutation.mutate(expense._id)} disabled={markAsPaidMutation.isPending} className="bg-[#0F172A] hover:bg-[#1E293B] h-8 rounded-full text-xs">
                            Pay
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={() => deleteExpenseMutation.mutate(expense._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* SECTION: OWNER ANALYTICS (Refined) */}
          {/* ============================================ */}
          {showAnalytics && financeData && (
            <motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto space-y-8">
              
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-1 bg-[#D97706] rounded-full" />
                <div>
                  <h3 className="font-serif text-3xl font-bold text-[#0F172A]">Owner Analytics</h3>
                  <p className="text-sm text-slate-500 uppercase tracking-widest font-medium">Confidential Data</p>
                </div>
              </div>

              {/* KPI ORBS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Total Collected", value: `PKR ${(totalIncome / 1000).toFixed(0)}K`, sub: `${collectionRate}% rate`, icon: TrendingUp, color: "text-emerald-600" },
                  { title: "Teacher Liabilities", value: `PKR ${(totalTeacherLiabilities / 1000).toFixed(0)}K`, sub: `${teacherPayroll.length} teachers`, icon: GraduationCap, color: "text-amber-600" },
                  { title: "Total Expenses", value: `PKR ${(totalExpenses / 1000).toFixed(0)}K`, sub: "Operational", icon: TrendingDown, color: "text-red-500" },
                  { title: "Net Position", value: `PKR ${(ownerNetRevenue / 1000).toFixed(0)}K`, sub: "Take-home", icon: Wallet, color: ownerNetRevenue > 0 ? "text-[#0F172A]" : "text-red-600" },
                ].map((kpi, i) => (
                  <MagneticWrapper key={i}>
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className={`${COLORS.glass} rounded-3xl p-6 h-full flex flex-col justify-between group hover:border-[#D97706]/50 transition-colors cursor-default`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-[#0F172A]/5 text-[#0F172A] group-hover:bg-[#D97706] group-hover:text-white transition-colors">
                          <kpi.icon className="h-5 w-5" />
                        </div>
                        {kpi.title === "Net Position" && (
                           <InfoTooltip>
                              <TooltipTrigger><HelpCircle className="h-4 w-4 text-slate-400 hover:text-[#D97706]" /></TooltipTrigger>
                              <TooltipContent>Chemistry + Pool - Expenses</TooltipContent>
                           </InfoTooltip>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{kpi.title}</p>
                        <h3 className={`text-2xl font-serif font-bold ${kpi.color}`}>{kpi.value}</h3>
                        <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wide">{kpi.sub}</p>
                      </div>
                    </motion.div>
                  </MagneticWrapper>
                ))}
              </div>

              {/* Warning for Loss */}
              {ownerNetRevenue < 0 && (
                <div className="p-6 rounded-2xl bg-red-50/80 border border-red-200 flex items-start gap-4 backdrop-blur-sm">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-1 shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-900 text-lg">⚠️ Monthly Deficit Detected</h4>
                    <p className="text-red-700 text-sm mt-1">Operational expenses have exceeded total revenue for this period. Immediate review recommended.</p>
                  </div>
                </div>
              )}

              {/* Teacher Payroll */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <TeacherPayrollTable
                  teachers={teacherPayroll}
                  filter={teacherFilter}
                  onFilterChange={setTeacherFilter}
                  onPay={handlePayTeacher}
                  isPaying={processPaymentMutation.isPending}
                />
              </motion.div>

            </motion.div>
          )}

          {/* Payment Receipt Modal */}
          <PaymentReceipt
            isOpen={isReceiptOpen}
            onClose={() => setIsReceiptOpen(false)}
            voucherData={voucherData}
          />
        </motion.div>
      </DashboardLayout>
    </TooltipProvider>
  );
};

export default Finance;
