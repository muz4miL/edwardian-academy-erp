import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  Plus,
  Banknote,
  Loader2,
  TrendingUp,
  TrendingDown,
  Receipt,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeacherPaymentPDF } from "@/hooks/useTeacherPaymentPDF";

interface TeacherFinanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: {
    _id: string;
    name: string;
    subject: string;
    balance?: {
      floating?: number;
      verified?: number;
      pending?: number;
    };
    totalPaid?: number;
  } | null;
}

interface WalletTransaction {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  createdAt: string;
  voucherId?: string;
}

// API Base URL
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

export const TeacherFinanceModal = ({
  open,
  onOpenChange,
  teacher,
}: TeacherFinanceModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generateVoucherPDF, isGenerating } = useTeacherPaymentPDF();

  // Form State
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [debitAmount, setDebitAmount] = useState("");
  const [debitDescription, setDebitDescription] = useState("");

  // Local state for real-time UI updates
  const [localBalance, setLocalBalance] = useState(0);
  const [localTotalPaid, setLocalTotalPaid] = useState(0);

  // Sync local state with teacher prop when it changes
  useEffect(() => {
    if (teacher) {
      setLocalBalance(teacher.balance?.pending || 0);
      setLocalTotalPaid(teacher.totalPaid || 0);
    }
  }, [teacher, teacher?.balance?.pending, teacher?.totalPaid]);

  // Fetch wallet transactions
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ["teacher-wallet", teacher?._id],
    queryFn: async () => {
      if (!teacher?._id) return { success: true, data: [] };
      const response = await fetch(
        `${API_BASE_URL}/teachers/${teacher._id}/wallet`,
        {
          credentials: "include",
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data;
    },
    enabled: open && !!teacher?._id,
  });

  const transactions: WalletTransaction[] = transactionsData?.data || [];

  // Use local state for real-time balance display
  const payableBalance = localBalance;

  // Credit mutation (Add Payable)
  const creditMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      const response = await fetch(
        `${API_BASE_URL}/teachers/${teacher?._id}/wallet/credit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        },
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      // Update local state immediately for real-time UI
      const addedAmount = Number(creditAmount);
      setLocalBalance((prev) => prev + addedAmount);

      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({
        queryKey: ["teacher-wallet", teacher?._id],
      });
      toast({
        title: "✅ Amount Added",
        description: `PKR ${creditAmount} has been added to ${teacher?.name}'s wallet.`,
        className: "bg-green-50 border-green-200",
      });
      setCreditAmount("");
      setCreditDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Failed",
        description: error.message || "Could not add amount.",
        variant: "destructive",
      });
    },
  });

  // Debit mutation (Release Payment)
  const debitMutation = useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      const response = await fetch(
        `${API_BASE_URL}/teachers/${teacher?._id}/wallet/debit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        },
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: async (data) => {
      const paidAmount = Number(debitAmount);
      const newBalance = data.newBalance || 0;

      // Update local state immediately for real-time UI
      setLocalBalance(newBalance);
      setLocalTotalPaid((prev) => prev + paidAmount);

      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({
        queryKey: ["teacher-wallet", teacher?._id],
      });

      toast({
        title: "✅ Payment Released",
        description: `PKR ${debitAmount} has been paid to ${teacher?.name}.`,
        className: "bg-green-50 border-green-200",
      });

      // Generate and open PDF voucher in new tab
      if (teacher) {
        await generateVoucherPDF({
          voucherId: data.voucherId || `TP-${Date.now()}`,
          teacherName: teacher.name,
          subject: teacher.subject,
          amountPaid: paidAmount,
          remainingBalance: newBalance,
          paymentDate: new Date().toISOString(),
          description: debitDescription || "Salary Payment",
        });
      }

      setDebitAmount("");
      setDebitDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ Payment Failed",
        description: error.message || "Could not process payment.",
        variant: "destructive",
      });
    },
  });

  const handleCredit = () => {
    const amount = Number(creditAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "⚠️ Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }
    if (!creditDescription.trim()) {
      toast({
        title: "⚠️ Missing Description",
        description: "Please provide a reason/month for this amount.",
        variant: "destructive",
      });
      return;
    }
    creditMutation.mutate({ amount, description: creditDescription });
  };

  const handleDebit = () => {
    const amount = Number(debitAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "⚠️ Invalid Amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }
    if (amount > payableBalance) {
      toast({
        title: "⚠️ Insufficient Balance",
        description: `Cannot pay more than available balance (PKR ${payableBalance.toLocaleString()}).`,
        variant: "destructive",
      });
      return;
    }
    debitMutation.mutate({
      amount,
      description: debitDescription || "Salary Payment",
    });
  };

  const formatCurrency = (amount: number) => {
    return `PKR ${amount.toLocaleString()}`;
  };

  if (!teacher) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  {teacher.name}'s Wallet
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Manage payables and release payments
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Balance Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <p className="text-sm text-muted-foreground mb-1">
              Current Payable Balance
            </p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(payableBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Total Paid: {formatCurrency(localTotalPaid)}
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="credit" className="flex-1 mt-4">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="credit" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Payable
              </TabsTrigger>
              <TabsTrigger value="debit" className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Release Payment
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Add Payable Tab */}
            <TabsContent value="credit" className="space-y-4 mt-0">
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    Credit Teacher's Wallet
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="credit-amount">Amount (PKR)</Label>
                    <Input
                      id="credit-amount"
                      type="number"
                      placeholder="e.g. 50000"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credit-desc">Description / Month</Label>
                    <Input
                      id="credit-desc"
                      type="text"
                      placeholder="e.g. Salary for February 2026"
                      value={creditDescription}
                      onChange={(e) => setCreditDescription(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <Button
                    onClick={handleCredit}
                    disabled={creditMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {creditMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Wallet
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Release Payment Tab */}
            <TabsContent value="debit" className="space-y-4 mt-0">
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-orange-600 mb-3">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium text-sm">Pay Teacher</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="debit-amount">Amount to Pay (PKR)</Label>
                    <Input
                      id="debit-amount"
                      type="number"
                      placeholder="e.g. 30000"
                      value={debitAmount}
                      onChange={(e) => setDebitAmount(e.target.value)}
                      max={payableBalance}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {formatCurrency(payableBalance)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debit-desc">Description (Optional)</Label>
                    <Input
                      id="debit-desc"
                      type="text"
                      placeholder="e.g. Partial salary payment"
                      value={debitDescription}
                      onChange={(e) => setDebitDescription(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <Button
                    onClick={handleDebit}
                    disabled={
                      debitMutation.isPending ||
                      isGenerating ||
                      payableBalance <= 0
                    }
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {debitMutation.isPending || isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isGenerating
                          ? "Generating Receipt..."
                          : "Processing..."}
                      </>
                    ) : (
                      <>
                        <Receipt className="mr-2 h-4 w-4" />
                        Pay Now & Print Receipt
                      </>
                    )}
                  </Button>
                  {payableBalance <= 0 && (
                    <p className="text-xs text-center text-muted-foreground">
                      No balance available to pay
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-0">
              <div className="bg-secondary/30 rounded-lg p-4 border border-border max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <History className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    Transaction History
                  </span>
                </div>
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No transactions yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              tx.type === "credit"
                                ? "bg-green-100 text-green-600"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {tx.type === "credit" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {tx.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-semibold ${
                            tx.type === "credit"
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}{" "}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeacherFinanceModal;
