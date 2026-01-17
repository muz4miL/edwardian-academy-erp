/**
 * Partner Settlement Hub - Financial Sovereignty Module
 *
 * This page allows Sir Waqar (OWNER) to:
 * 1. View total receivables from each partner
 * 2. See expense history with partner debt status
 * 3. Record cash repayments from partners
 * 4. Track settlement history
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Loader2,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Banknote,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface PartnerStats {
  partnerId: string;
  partnerName: string;
  debtToOwner: number;
  unpaidTotal: number;
  paidTotal: number;
  unpaidCount: number;
  paidCount: number;
  unpaidExpenses: Array<{
    expenseId: string;
    title: string;
    amount: number;
    date: string;
  }>;
}

interface SettlementOverview {
  totalReceivable: number;
  partners: {
    zahid?: PartnerStats;
    saud?: PartnerStats;
  };
  recentSettlements: Array<{
    _id: string;
    partnerName: string;
    amount: number;
    date: string;
    method: string;
  }>;
}

interface ExpenseWithDebt {
  _id: string;
  title: string;
  amount: number;
  category: string;
  expenseDate: string;
  paidByType: string;
  shares: Array<{
    partnerName: string;
    partnerKey: string;
    amount: number;
    status: string;
    paidAt?: string;
  }>;
  debtSummary: {
    totalUnpaid: number;
    totalPaid: number;
    unpaidPartners: string[];
    paidPartners: string[];
  };
}

export default function PartnerSettlement() {
  const queryClient = useQueryClient();
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [repaymentAmount, setRepaymentAmount] = useState<string>("");
  const [repaymentNotes, setRepaymentNotes] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch settlement overview
  const { data: overview, isLoading: overviewLoading } = useQuery<{
    data: SettlementOverview;
  }>({
    queryKey: ["settlements", "overview"],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/expenses/settlements/overview`,
      );
      if (!res.ok) throw new Error("Failed to fetch settlement overview");
      return res.json();
    },
    staleTime: 1000 * 30, // Cache for 30 seconds
  });

  // Fetch expenses paid by Waqar
  const { data: expensesData, isLoading: expensesLoading } = useQuery<{
    data: ExpenseWithDebt[];
  }>({
    queryKey: ["expenses", "partner-debts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/expenses/partner-debts`);
      if (!res.ok) throw new Error("Failed to fetch partner debts");
      return res.json();
    },
  });

  // Record repayment mutation
  const recordRepaymentMutation = useMutation({
    mutationFn: async (data: {
      partnerId: string;
      amount: number;
      notes?: string;
    }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/expenses/settlements/record`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error("Failed to record repayment");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(
        `✅ Recorded PKR ${data.data.settlement.amount.toLocaleString()} from ${data.data.settlement.partner}`,
      );
      setIsDialogOpen(false);
      setRepaymentAmount("");
      setRepaymentNotes("");
      setSelectedPartner("");
    },
    onError: () => {
      toast.error("❌ Failed to record repayment. Please try again.");
    },
  });

  const handleRecordRepayment = () => {
    if (!selectedPartner || !repaymentAmount) {
      toast.error("Please select a partner and enter an amount");
      return;
    }

    const amount = parseFloat(repaymentAmount);
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    recordRepaymentMutation.mutate({
      partnerId: selectedPartner,
      amount,
      notes: repaymentNotes,
    });
  };

  const overviewData = overview?.data;
  const expenses = expensesData?.data || [];

  // Get partner list for dropdown
  const partners = overviewData?.partners || {};
  const partnerList = Object.entries(partners).map(([key, stats]) => ({
    id: stats?.partnerId || key,
    name: stats?.partnerName || key,
    debt: stats?.unpaidTotal || 0,
  }));

  return (
    <DashboardLayout title="Partner Settlement">
      <HeaderBanner
        title="💰 Partner Settlement Hub"
        subtitle="Manage inter-partner debts and record cash repayments"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 h-10 px-6">
              <Banknote className="mr-2 h-4 w-4" />
              Record Repayment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-600" />
                Record Cash Repayment
              </DialogTitle>
              <DialogDescription>
                Record cash received from a partner to settle their debt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Partner</Label>
                <Select
                  value={selectedPartner}
                  onValueChange={setSelectedPartner}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerList.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} (Owes: PKR{" "}
                        {partner.debt.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount Received (PKR)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="e.g., Cash payment for January expenses"
                  value={repaymentNotes}
                  onChange={(e) => setRepaymentNotes(e.target.value)}
                />
              </div>
              <Button
                onClick={handleRecordRepayment}
                disabled={recordRepaymentMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {recordRepaymentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm Repayment
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </HeaderBanner>

      {overviewLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading settlement data...
          </span>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Receivable */}
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Total Receivable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  PKR {(overviewData?.totalReceivable || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From all partners combined
                </p>
              </CardContent>
            </Card>

            {/* Dr. Zahid's Debt */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Dr. Zahid Owes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  PKR {(partners.zahid?.unpaidTotal || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {partners.zahid?.unpaidCount || 0} unpaid
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {partners.zahid?.paidCount || 0} settled
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Sir Saud's Debt */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sir Saud Owes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-600">
                  PKR {(partners.saud?.unpaidTotal || 0).toLocaleString()}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {partners.saud?.unpaidCount || 0} unpaid
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {partners.saud?.paidCount || 0} settled
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense History with Partner Debts */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-600" />
                Expenses Paid by Sir Waqar (Out-of-Pocket)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No out-of-pocket expenses found.</p>
                  <p className="text-sm">
                    When Sir Waqar pays for expenses, they'll appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Expense</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Partner Shares</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(expense.expenseDate).toLocaleDateString(
                            "en-PK",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{expense.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {expense.category}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          PKR {expense.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {expense.shares
                              ?.filter((s) => s.partnerKey !== "waqar")
                              .map((share, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      share.status === "PAID"
                                        ? "bg-green-500"
                                        : "bg-amber-500"
                                    }`}
                                  />
                                  <span>{share.partnerName}</span>
                                  <span className="text-muted-foreground">
                                    PKR {share.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {expense.debtSummary.totalUnpaid > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700">
                              <Clock className="h-3 w-3 mr-1" />
                              PKR{" "}
                              {expense.debtSummary.totalUnpaid.toLocaleString()}{" "}
                              pending
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Fully Settled
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Settlements */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-green-600" />
                Recent Settlements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overviewData?.recentSettlements &&
              overviewData.recentSettlements.length > 0 ? (
                <div className="space-y-3">
                  {overviewData.recentSettlements.map((settlement) => (
                    <div
                      key={settlement._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <ArrowDownRight className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800">
                            {settlement.partnerName}
                          </p>
                          <p className="text-xs text-green-600">
                            {new Date(settlement.date).toLocaleDateString(
                              "en-PK",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-700">
                          +PKR {settlement.amount.toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {settlement.method}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No settlements recorded yet.</p>
                  <p className="text-sm">Record a repayment to see it here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
