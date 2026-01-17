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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PaymentReceipt } from "@/components/finance/PaymentReceipt";
import { TeacherPayrollTable } from "@/components/finance/TeacherPayrollTable";
import { ExpenseTracker } from "@/components/finance/ExpenseTracker";

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Finance = () => {
  const queryClient = useQueryClient();

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  // Payment receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [voucherData, setVoucherData] = useState<any>(null);
  const [teacherFilter, setTeacherFilter] = useState<string>('all'); // Task 4: Teacher filter


  // Fetch real-time finance stats with error handling
  const { data: financeData, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['finance', 'stats'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/finance/stats/overview`);
      if (!response.ok) throw new Error('Failed to fetch finance stats');
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000,
    retry: 2,
  });

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/expenses?limit=10`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const result = await response.json();
      return result.data;
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: any) => {
      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });
      if (!response.ok) throw new Error('Failed to create expense');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense added successfully');
      // Reset form
      setExpenseTitle("");
      setExpenseCategory("");
      setExpenseAmount("");
    },
    onError: () => {
      toast.error('Failed to add expense');
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete expense');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  // Process teacher payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async ({ teacherId, amountPaid }: { teacherId: string; amountPaid: number }) => {
      const response = await fetch(`${API_BASE_URL}/api/teachers/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          amount: amountPaid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process payment');
      }

      return response.json();
    },
    onSuccess: (response) => {
      console.log('✅ Payout successful:', response);
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setVoucherData(response.data);
      setIsReceiptOpen(true);
      toast.success('Payment processed successfully!');
    },
    onError: (error: any) => {
      console.error('❌ Payout failed:', error);
      toast.error(error.message || 'Failed to process payment');
    },
  });

  const handleAddExpense = () => {
    if (!expenseTitle || !expenseCategory || !expenseAmount) {
      toast.error('Please fill all expense fields');
      return;
    }

    createExpenseMutation.mutate({
      title: expenseTitle,
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
    });
  };

  const handlePayTeacher = (teacher: any) => {
    console.log('🔍 Teacher object received:', JSON.stringify(teacher, null, 2));

    if (teacher.earnedAmount <= 0) {
      toast.error('No payment due for this teacher');
      return;
    }

    const payload = {
      teacherId: teacher._id || teacher.teacherId || teacher.id,
      amountPaid: teacher.earnedAmount,
    };

    console.log('💰 Payout Request Payload:', JSON.stringify(payload, null, 2));
    console.log('📋 Payload Details - teacherId:', payload.teacherId, 'amount:', payload.amountPaid);

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
          <p className="text-lg font-medium text-foreground">Failed to load finance data</p>
          <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['finance'] })}>
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
    { name: 'Net Profit', value: Math.max(0, netProfit || 0), color: '#3b82f6' }, // Blue
    { name: 'Teacher Payouts', value: totalTeacherLiabilities || 0, color: '#10b981' }, // Green
    { name: 'Expenses', value: totalExpenses || 0, color: '#ef4444' }, // Red
  ];

  // Only include non-zero values in chart
  const chartData = rawChartData.filter(item => item.value > 0);
  const hasChartData = chartData.length > 0;

  const COLORS = ['#3b82f6', '#10b981', '#ef4444'];

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
                <button className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">Total amount owed to teachers based on collected fees from their students. This is calculated using their compensation model (70/30 split, fixed salary, or hybrid).</p>
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
                <p className="text-sm">Net Profit = Total Collected - (Teacher Payouts + Operational Expenses). This is the academy's final profit after all costs.</p>
              </TooltipContent>
            </InfoTooltip>
          </div>
        </div>

        {/* Warning for Negative Profit */}
        {netProfit < 0 && (
          <div className="mt-4 rounded-lg border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">⚠️ Warning: Monthly Loss Detected</h4>
              <p className="text-sm text-red-700 mt-1">
                Your monthly expenses and teacher payouts (PKR {(totalTeacherLiabilities + totalExpenses).toLocaleString()}) exceed the collected revenue (PKR {totalIncome.toLocaleString()}).
                Consider reviewing operational costs or improving fee collection.
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
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
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
              <p className="text-sm text-muted-foreground">Total Revenue Collected</p>
              <p className="text-3xl font-bold text-foreground">
                PKR {totalIncome.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-success/20 bg-success-light p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-success" />
                    <span className="text-sm font-medium text-success">Teacher Payouts</span>
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
                    <span className="text-sm font-medium text-destructive">Expenses</span>
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
                    <span className="text-sm font-medium text-primary">Net Profit</span>
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
      </DashboardLayout >
    </TooltipProvider >
  );
};

export default Finance;
