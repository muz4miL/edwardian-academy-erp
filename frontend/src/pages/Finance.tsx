import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  HandCoins,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";

// API Base URL - Auto-detect Codespaces
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};
const API_BASE_URL = getApiBaseUrl();

// Types
interface PendingClosing {
  _id: string;
  partnerId: {
    _id: string;
    fullName: string;
    username: string;
  };
  totalAmount: number;
  partnerShare: number;
  handoverAmount: number;
  status: string;
  notes: string;
  createdAt: string;
}

interface PartnerDashboardData {
  totalCashInDrawer: number;
  calculatedShare: number;
  suggestedHandover: number;
  expenseDebt: number;
  pendingClosings: PendingClosing[];
  walletBalance: {
    floating: number;
    verified: number;
  };
}

// Partner View Component
const PartnerView = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [handoverAmount, setHandoverAmount] = useState("");

  // Fetch partner dashboard data
  const { data: dashboardData, isLoading } = useQuery<PartnerDashboardData>({
    queryKey: ["partner-dashboard"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/finance/partner-dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Close day mutation
  const closeDayMutation = useMutation({
    mutationFn: async (handover: number) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/finance/daily-closing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          handoverAmount: handover,
          notes: `Daily closing - Handing PKR ${handover.toLocaleString()} to owner`,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to close day");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Day closed successfully! Awaiting owner verification.");
      setShowCloseModal(false);
      setHandoverAmount("");
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to close day");
    },
  });

  const handleCloseDay = () => {
    if (!dashboardData) return;
    setHandoverAmount(dashboardData.suggestedHandover.toString());
    setShowCloseModal(true);
  };

  const confirmCloseDay = () => {
    const amount = parseFloat(handoverAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (dashboardData && amount > dashboardData.totalCashInDrawer) {
      toast.error("Handover amount cannot exceed total cash");
      return;
    }
    closeDayMutation.mutate(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Cash in Drawer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Cash in Drawer
                </CardTitle>
                <Wallet className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                PKR {dashboardData.totalCashInDrawer.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Today's collections</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Calculated Share */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Your Calculated Share
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                PKR {dashboardData.calculatedShare.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Your retention for today</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense Debt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Expense Debt Owed
                </CardTitle>
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                PKR {dashboardData.expenseDebt.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Amount owed to owner</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Close Day Action */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Daily Closing
          </CardTitle>
          <CardDescription>
            Close your day and hand over cash to the owner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Total Collection:</span>
                  <div className="font-semibold text-lg mt-1">
                    PKR {dashboardData.totalCashInDrawer.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">Your Share:</span>
                  <div className="font-semibold text-lg mt-1">
                    PKR {dashboardData.calculatedShare.toLocaleString()}
                  </div>
                </div>
                <div className="col-span-2 border-t pt-3">
                  <span className="text-slate-600">Suggested Handover:</span>
                  <div className="font-bold text-2xl mt-1 text-green-600">
                    PKR {dashboardData.suggestedHandover.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            <Button
              onClick={handleCloseDay}
              disabled={dashboardData.totalCashInDrawer === 0}
              className="w-full"
              size="lg"
            >
              <Receipt className="mr-2 h-4 w-4" />
              Close Day & Submit Handover
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Closings */}
      {dashboardData.pendingClosings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Verifications
            </CardTitle>
            <CardDescription>
              Closings awaiting owner verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.pendingClosings.map((closing) => (
                <div
                  key={closing._id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-orange-50"
                >
                  <div>
                    <div className="font-medium">
                      PKR {closing.handoverAmount.toLocaleString()} handed over
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(closing.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Pending Verification
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Day Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Your Day</DialogTitle>
            <DialogDescription>
              Enter the amount you are physically handing to the owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Amount Handing to Owner (PKR)
              </label>
              <Input
                type="number"
                value={handoverAmount}
                onChange={(e) => setHandoverAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-lg"
              />
              <p className="text-xs text-slate-500">
                Suggested: PKR {dashboardData.suggestedHandover.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> The difference between your total collection
                and this handover amount will be retained by you as your share.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCloseDay} disabled={closeDayMutation.isPending}>
              {closeDayMutation.isPending ? "Processing..." : "Confirm Closing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Owner View Component
const OwnerView = () => {
  const queryClient = useQueryClient();
  const [debtAmount, setDebtAmount] = useState<{ [key: string]: string }>({});

  // Fetch pending closings
  const { data: pendingClosings = [], isLoading: loadingClosings } = useQuery<
    PendingClosing[]
  >({
    queryKey: ["pending-closings"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/finance/pending-closings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch pending closings");
      const result = await response.json();
      return result.data || [];
    },
    refetchInterval: 10000,
  });

  // Fetch all partners with debt
  const { data: partners = [] } = useQuery({
    queryKey: ["partners-debt"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch partners");
      const result = await response.json();
      return result.data.filter((u: any) => u.role === "PARTNER");
    },
  });

  // Verify closing mutation
  const verifyMutation = useMutation({
    mutationFn: async (closingId: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/finance/verify-closing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ closingId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify closing");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Closing verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["pending-closings"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to verify closing");
    },
  });

  // Clear debt mutation
  const clearDebtMutation = useMutation({
    mutationFn: async ({ partnerId, amount }: { partnerId: string; amount: number }) => {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/finance/clear-debt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId, amount }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clear debt");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Debt cleared successfully!");
      queryClient.invalidateQueries({ queryKey: ["partners-debt"] });
      setDebtAmount({});
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clear debt");
    },
  });

  const handleVerify = (closingId: string) => {
    if (confirm("Confirm receipt of cash from partner?")) {
      verifyMutation.mutate(closingId);
    }
  };

  const handleClearDebt = (partnerId: string) => {
    const amount = parseFloat(debtAmount[partnerId] || "0");
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (confirm(`Clear debt of PKR ${amount.toLocaleString()}?`)) {
      clearDebtMutation.mutate({ partnerId, amount });
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Closings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Pending Verifications
          </CardTitle>
          <CardDescription>
            Partner closings awaiting your verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingClosings ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : pendingClosings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No pending verifications
            </div>
          ) : (
            <div className="space-y-3">
              {pendingClosings.map((closing) => (
                <div
                  key={closing._id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {closing.partnerId.fullName}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Total: PKR {closing.totalAmount.toLocaleString()} • Handing: PKR{" "}
                      {closing.handoverAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(closing.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleVerify(closing._id)}
                    disabled={verifyMutation.isPending}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Receipt
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner Debt Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            Expense Debt Tracker
          </CardTitle>
          <CardDescription>
            Track and clear partner expense debts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Expense Debt</TableHead>
                <TableHead>Amount to Clear</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner: any) => (
                  <TableRow key={partner._id}>
                    <TableCell className="font-medium">{partner.fullName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (partner.expenseDebt || 0) > 0 ? "destructive" : "secondary"
                        }
                      >
                        PKR {(partner.expenseDebt || 0).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={debtAmount[partner._id] || ""}
                        onChange={(e) =>
                          setDebtAmount({
                            ...debtAmount,
                            [partner._id]: e.target.value,
                          })
                        }
                        placeholder="Amount"
                        className="w-32"
                        disabled={(partner.expenseDebt || 0) === 0}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleClearDebt(partner._id)}
                        disabled={
                          clearDebtMutation.isPending ||
                          (partner.expenseDebt || 0) === 0
                        }
                        size="sm"
                        variant="outline"
                      >
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Finance Component
const Finance = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Finance Dashboard</h1>
            <p className="text-slate-600 mt-1">
              {user?.role === "OWNER"
                ? "Manage partner closings and debt tracking"
                : "Track your collections and close your day"}
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-4 py-2">
            {user?.role === "OWNER" ? "Owner View" : "Partner View"}
          </Badge>
        </div>

        {user?.role === "OWNER" ? <OwnerView /> : <PartnerView />}
      </div>
    </DashboardLayout>
  );
};

export default Finance;
