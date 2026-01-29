/**
 * Teacher Profile Page - Premium Design
 * Mirrors the StudentProfile layout with:
 * - Financial Header Cards (Earnings, Balance, Liability)
 * - Left Column: Bio (Name, Subject, Contact, Joining Date)
 * - Right Column: Classes being taught + Student count
 * - Bottom: Payout History (like Fee History)
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, User, Loader2, Send, Crown, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

// Modular Components
import {
  TeacherBioCard,
  TeacherClassesCard,
  TeacherEarningsCards,
  TeacherPayoutHistory,
} from "@/components/teachers";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TeacherProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Payout request state (for teacher self-request)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  // Process Payout state (for owner to pay teacher)
  const [processPayoutDialogOpen, setProcessPayoutDialogOpen] = useState(false);
  const [processPayoutAmount, setProcessPayoutAmount] = useState("");
  const [processPayoutNotes, setProcessPayoutNotes] = useState("");

  // Fetch teacher details (now includes debtToOwner for partners)
  const { data: teacherData, isLoading: teacherLoading } = useQuery({
    queryKey: ["teacher", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/teachers/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch teacher");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch teacher revenue/earnings
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["teacher-revenue", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/teachers/${id}/revenue`, {
        credentials: "include",
      });
      if (!res.ok) return { data: { totalRevenue: 0, teacherShare: 0 } };
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch existing payout requests to check for pending
  const { data: payoutRequestsData } = useQuery({
    queryKey: ["teacher-payouts", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/payroll/my-requests/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: !!id,
  });

  // Payout request mutation (teacher self-request)
  const payoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch(`${API_BASE_URL}/payroll/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teacherId: id, amount }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit request");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request Submitted!",
        description: data.message,
      });
      setPayoutDialogOpen(false);
      setPayoutAmount("");
      queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-payouts", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Process Payout mutation (owner pays teacher directly)
  const processPayoutMutation = useMutation({
    mutationFn: async ({
      amount,
      notes,
    }: {
      amount: number;
      notes: string;
    }) => {
      const res = await fetch(`${API_BASE_URL}/finance/teacher-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ teacherId: id, amount, notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to process payout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payout Processed!",
        description: data.message,
      });
      setProcessPayoutDialogOpen(false);
      setProcessPayoutAmount("");
      setProcessPayoutNotes("");
      queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      queryClient.invalidateQueries({ queryKey: ["teacher-payouts", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Payout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const teacher = teacherData?.data;
  const revenue = revenueData?.data || { totalRevenue: 0, teacherShare: 0 };
  const payoutRequests = payoutRequestsData?.data || [];
  const teacherBalance = teacher?.balance?.verified || 0;
  const pendingBalance = teacher?.balance?.pending || 0;
  const hasPendingRequest = payoutRequests.some(
    (r: any) => r.status === "PENDING",
  );

  // Determine if teacher is a Partner (gets 100%)
  const isPartner =
    teacher?.name?.toLowerCase().includes("waqar") ||
    teacher?.name?.toLowerCase().includes("zahid") ||
    teacher?.name?.toLowerCase().includes("saud");

  // Check if current user is Owner (can process payouts)
  const isOwner = user?.role === "OWNER";

  // Get debtToOwner from teacher data (populated from User model)
  const debtToOwner = teacher?.debtToOwner || 0;

  // Calculate total earned (their share)
  const totalEarned = isPartner
    ? revenue.totalRevenue || 0
    : revenue.teacherShare || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-700">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading State
  if (teacherLoading) {
    return (
      <DashboardLayout title="Teacher Profile">
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-1" />
            <Skeleton className="h-64 col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Not Found State
  if (!teacher) {
    return (
      <DashboardLayout title="Teacher Profile">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <User className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Teacher Not Found</h2>
          <Button onClick={() => navigate("/teachers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teachers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Teacher Profile">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/teachers")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {teacher.name}
                </h1>
                {isPartner && (
                  <Badge className="bg-yellow-100 text-yellow-700 gap-1">
                    <Crown className="h-3 w-3" />
                    Partner
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground capitalize">
                {teacher.subject} Teacher
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(teacher.status)}
            {!isPartner && teacherBalance > 0 && !hasPendingRequest && (
              <Button
                onClick={() => setPayoutDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="mr-2 h-4 w-4" />
                Request Payout
              </Button>
            )}
            {/* Owner can process payouts for Staff teachers with pending balance */}
            {isOwner && !isPartner && pendingBalance > 0 && (
              <Button
                onClick={() => setProcessPayoutDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Banknote className="mr-2 h-4 w-4" />
                Process Payout
              </Button>
            )}
          </div>
        </div>

        {/* Financial Header Cards */}
        <TeacherEarningsCards
          teacher={teacher}
          totalEarned={totalEarned}
          debtToOwner={debtToOwner}
          isPartner={isPartner}
        />

        {/* Main Content Grid - Bio + Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal Information */}
          <TeacherBioCard teacher={teacher} isPartner={isPartner} />

          {/* Right Column: Teaching Details */}
          <TeacherClassesCard
            teacherId={id!}
            teacherSubject={teacher.subject}
          />
        </div>

        {/* Payout History (like Fee History in StudentProfile) */}
        <TeacherPayoutHistory teacherId={id!} />
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Cash Payout</DialogTitle>
            <DialogDescription>
              Available Balance: Rs. {teacherBalance.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (PKR)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                max={teacherBalance}
              />
              {Number(payoutAmount) > teacherBalance && (
                <p className="text-xs text-red-500">
                  Amount cannot exceed available balance
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                ℹ️ Your request will be sent to the Owner for approval. Once
                approved, you can collect your cash.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => payoutMutation.mutate(Number(payoutAmount))}
              disabled={
                !payoutAmount ||
                Number(payoutAmount) <= 0 ||
                Number(payoutAmount) > teacherBalance ||
                payoutMutation.isPending
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {payoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Payout Dialog (Owner Only) */}
      <Dialog
        open={processPayoutDialogOpen}
        onOpenChange={setProcessPayoutDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Teacher Payout</DialogTitle>
            <DialogDescription>
              Pay {teacher.name}'s pending commission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Pending Balance: Rs. {pendingBalance.toLocaleString()}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                This is the commission owed to this teacher from student
                admissions.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payout Amount (PKR)</label>
              <Input
                type="number"
                placeholder="Enter amount to pay"
                value={processPayoutAmount}
                onChange={(e) => setProcessPayoutAmount(e.target.value)}
                max={pendingBalance}
              />
              {Number(processPayoutAmount) > pendingBalance && (
                <p className="text-xs text-red-500">
                  Amount cannot exceed pending balance
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                type="text"
                placeholder="e.g., Cash payment, Bank transfer"
                value={processPayoutNotes}
                onChange={(e) => setProcessPayoutNotes(e.target.value)}
              />
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                ℹ️ This will deduct from the teacher's pending balance and
                record an expense transaction.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessPayoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                processPayoutMutation.mutate({
                  amount: Number(processPayoutAmount),
                  notes: processPayoutNotes,
                })
              }
              disabled={
                !processPayoutAmount ||
                Number(processPayoutAmount) <= 0 ||
                Number(processPayoutAmount) > pendingBalance ||
                processPayoutMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processPayoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Banknote className="mr-2 h-4 w-4" />
                  Process Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
