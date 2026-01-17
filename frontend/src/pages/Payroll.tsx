import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  AlertCircle,
  Loader2,
  Eye,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Payroll() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  // Redirect non-owners
  if (user?.role !== "OWNER") {
    return (
      <DashboardLayout title="Payroll">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only the Owner can access the Payroll dashboard.
          </p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch payroll dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["payroll-dashboard"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/payroll/dashboard`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch payroll data");
      return res.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`${API_BASE_URL}/payroll/approve/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payout Approved!",
        description: data.message,
      });
      setSelectedRequest(null);
      setActionType(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["payroll-dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`${API_BASE_URL}/payroll/reject/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: notes }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The payout request has been rejected.",
      });
      setSelectedRequest(null);
      setActionType(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["payroll-dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dashboard = dashboardData?.data || {
    pendingRequests: [],
    pendingTotal: 0,
    monthlyApproved: { total: 0, count: 0 },
    teachersWithBalances: [],
    totalTeacherLiability: 0,
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Payroll Management">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payroll Management">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Requests
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {dashboard.pendingRequests.length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold text-red-600">
                    Rs. {dashboard.pendingTotal.toLocaleString()}
                  </p>
                </div>
                <Banknote className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    This Month Paid
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    Rs. {dashboard.monthlyApproved.total.toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Liability
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    Rs. {dashboard.totalTeacherLiability.toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Payout Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>No pending payout requests!</p>
                <p className="text-sm">All teacher payouts have been processed.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    <TableHead>Request ID</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.pendingRequests.map((request: any) => (
                    <TableRow key={request._id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {request.requestId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.teacherName}
                      </TableCell>
                      <TableCell className="capitalize">
                        {request.teacherId?.subject || "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        Rs. {request.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        Rs.{" "}
                        {(
                          request.teacherId?.balance?.verified || 0
                        ).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(request.requestDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Teachers with Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Teachers with Outstanding Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.teachersWithBalances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No outstanding teacher balances</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboard.teachersWithBalances.map((teacher: any) => (
                  <div
                    key={teacher._id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/teachers/${teacher._id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{teacher.name}</span>
                      <Badge className="capitalize">{teacher.subject}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Verified Balance
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        Rs. {(teacher.balance?.verified || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
          setNotes("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Payout" : "Reject Payout"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Approve Rs. ${selectedRequest?.amount.toLocaleString()} payout to ${selectedRequest?.teacherName}?`
                : `Reject payout request from ${selectedRequest?.teacherName}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === "approve" && (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ This will:
                </p>
                <ul className="text-sm text-green-600 dark:text-green-400 list-disc list-inside mt-2">
                  <li>Deduct Rs. {selectedRequest?.amount.toLocaleString()} from teacher's balance</li>
                  <li>Record as SALARY expense in transactions</li>
                  <li>Split expense among partners based on configuration</li>
                </ul>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionType === "approve" ? "Notes (optional)" : "Reason for rejection"}
              </label>
              <Textarea
                placeholder={actionType === "approve" ? "Any notes..." : "Please provide a reason..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            {actionType === "approve" ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => approveMutation.mutate(selectedRequest._id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Payout
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate(selectedRequest._id)}
                disabled={rejectMutation.isPending || !notes}
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Request
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
