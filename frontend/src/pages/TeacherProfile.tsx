import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  DollarSign,
  Users,
  TrendingUp,
  Percent,
  Wallet,
  Crown,
  Clock,
  Banknote,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function TeacherProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch teacher details
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

  // Fetch students assigned to this teacher
  // Method 1: By subject match
  // Method 2: By classes assigned to this teacher
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["teacher-students", id, teacherData?.data?.subject],
    queryFn: async () => {
      const teacher = teacherData?.data;
      if (!teacher) return { data: [], byClass: [], bySubject: [] };

      // Get students by subject match
      let subjectStudents: any[] = [];
      if (teacher.subject) {
        const subjectRes = await fetch(
          `${API_BASE_URL}/students?subject=${teacher.subject}`,
          { credentials: "include" },
        );
        if (subjectRes.ok) {
          const data = await subjectRes.json();
          subjectStudents = data.data || [];
        }
      }

      // Get classes assigned to this teacher
      const classesRes = await fetch(
        `${API_BASE_URL}/classes?assignedTeacher=${id}`,
        { credentials: "include" },
      );
      let classStudents: any[] = [];
      if (classesRes.ok) {
        const classData = await classesRes.json();
        const assignedClasses = classData.data || [];

        // Get students from each assigned class
        for (const cls of assignedClasses) {
          const classStudentsRes = await fetch(
            `${API_BASE_URL}/students?class=${encodeURIComponent(cls.name)}`,
            { credentials: "include" },
          );
          if (classStudentsRes.ok) {
            const classStudentData = await classStudentsRes.json();
            classStudents.push(...(classStudentData.data || []));
          }
        }
      }

      // Merge and deduplicate students
      const allStudents = [...subjectStudents, ...classStudents];
      const uniqueStudents = allStudents.filter(
        (student, index, self) =>
          index === self.findIndex((s) => s._id === student._id),
      );

      return {
        data: uniqueStudents,
        byClass: classStudents.length,
        bySubject: subjectStudents.length,
      };
    },
    enabled: !!teacherData?.data,
  });

  // Fetch fee records for this teacher
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["teacher-revenue", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/teachers/${id}/revenue`, {
        credentials: "include",
      });
      // If endpoint doesn't exist yet, return empty
      if (!res.ok)
        return { data: { totalRevenue: 0, teacherShare: 0, records: [] } };
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch teacher's payout requests
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

  // Payout request state
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Payout request mutation
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

  const teacher = teacherData?.data;
  const students = studentsData?.data || [];
  const revenue = revenueData?.data || {
    totalRevenue: 0,
    teacherShare: 0,
    records: [],
  };
  const payoutRequests = payoutRequestsData?.data || [];
  const teacherBalance = teacher?.balance?.verified || 0;
  const hasPendingRequest = payoutRequests.some(
    (r: any) => r.status === "PENDING",
  );

  // Determine if teacher is a Partner (gets 100%)
  const isPartner =
    teacher?.name?.toLowerCase().includes("waqar") ||
    teacher?.name?.toLowerCase().includes("zahid") ||
    teacher?.name?.toLowerCase().includes("saud");

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

  const getCompensationDisplay = () => {
    if (!teacher?.compensation) return "Not Set";
    const {
      type,
      teacherShare,
      academyShare,
      fixedSalary,
      baseSalary,
      profitShare,
    } = teacher.compensation;

    if (isPartner) {
      return (
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          <span className="font-bold text-yellow-600">
            100% Revenue (Partner)
          </span>
        </div>
      );
    }

    switch (type) {
      case "percentage":
        return `${teacherShare}% / ${academyShare}% Split`;
      case "fixed":
        return `PKR ${fixedSalary?.toLocaleString()} /month`;
      case "hybrid":
        return `PKR ${baseSalary?.toLocaleString()} + ${profitShare}% Bonus`;
      default:
        return "Not Set";
    }
  };

  if (teacherLoading) {
    return (
      <DashboardLayout title="Teacher Profile">
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-1" />
            <Skeleton className="h-64 col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
          {getStatusBadge(teacher.status)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teacher Information Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Avatar */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                    <span className="text-3xl font-bold text-primary">
                      {teacher.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  {isPartner && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center border-2 border-white">
                      <Crown className="h-4 w-4 text-yellow-800" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="font-medium capitalize">{teacher.subject}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{teacher.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Joining Date
                    </p>
                    <p className="font-medium">
                      {new Date(teacher.joiningDate).toLocaleDateString(
                        "en-PK",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Percent className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Compensation
                    </p>
                    <div className="font-medium">
                      {getCompensationDisplay()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue & Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue & Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {students.length}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg text-center">
                  <GraduationCap className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    Fee Paid
                  </p>
                  <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                    {students.filter((s: any) => s.feeStatus === "paid").length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                  <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Total Collected
                  </p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    Rs. {revenue.totalRevenue?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
                  <Wallet className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {isPartner ? "Your Share (100%)" : "Your Share"}
                  </p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    Rs. {revenue.teacherShare?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {/* Partner Notice */}
              {isPartner && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <Crown className="h-5 w-5" />
                    <span className="font-semibold">Partner Privilege</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    As a Partner/Owner, you receive 100% of all fee collections
                    for your classes. The standard 70/30 split does not apply to
                    you.
                  </p>
                </div>
              )}

              {/* Regular Teacher Split Info */}
              {!isPartner && teacher.compensation?.type === "percentage" && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Percent className="h-5 w-5" />
                    <span className="font-semibold">Revenue Split</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                      <p className="text-xs text-muted-foreground">
                        Your Share
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {teacher.compensation.teacherShare}%
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                      <p className="text-xs text-muted-foreground">
                        Academy Share
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {teacher.compensation.academyShare}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Balance & Payout Card - Only for non-partner teachers */}
        {!isPartner && (
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5 text-green-600" />
                Your Earnings Wallet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Verified Balance */}
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Available for Payout
                  </p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    Rs. {teacherBalance.toLocaleString()}
                  </p>
                </div>
                {/* Floating Balance */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg text-center">
                  <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Pending Verification
                  </p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    Rs. {(teacher?.balance?.floating || 0).toLocaleString()}
                  </p>
                </div>
                {/* Request Payout Button */}
                <div className="p-4 bg-primary/5 rounded-lg flex flex-col justify-center items-center">
                  {hasPendingRequest ? (
                    <div className="text-center">
                      <Badge className="bg-yellow-100 text-yellow-700 mb-2">
                        Pending Request
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Wait for approval
                      </p>
                    </div>
                  ) : teacherBalance > 0 ? (
                    <Button
                      onClick={() => setPayoutDialogOpen(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Request Cash Payout
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">
                      No balance available
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Payout Requests */}
              {payoutRequests.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">
                    Recent Requests
                  </h4>
                  <div className="space-y-2">
                    {payoutRequests.slice(0, 3).map((request: any) => (
                      <div
                        key={request._id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {request.status === "APPROVED" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : request.status === "REJECTED" ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm">
                            Rs. {request.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              request.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : request.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {request.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.requestDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Assigned Students ({students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No students enrolled in {teacher.subject} yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10">
                      <TableHead className="font-bold">S.No</TableHead>
                      <TableHead className="font-bold">Student Name</TableHead>
                      <TableHead className="font-bold">Father Name</TableHead>
                      <TableHead className="font-bold">Class</TableHead>
                      <TableHead className="font-bold">Contact</TableHead>
                      <TableHead className="font-bold text-right">
                        Fee
                      </TableHead>
                      <TableHead className="font-bold text-right">
                        Balance
                      </TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student: any, index: number) => (
                      <TableRow
                        key={student._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/students/${student._id}`)}
                      >
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {student.studentName}
                        </TableCell>
                        <TableCell>{student.fatherName}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell className="text-sm">
                          {student.parentCell}
                        </TableCell>
                        <TableCell className="text-right">
                          Rs. {student.totalFee?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              student.totalFee - student.paidAmount > 0
                                ? "text-red-600 font-medium"
                                : "text-green-600 font-medium"
                            }
                          >
                            Rs.{" "}
                            {(
                              student.totalFee - (student.paidAmount || 0)
                            ).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              student.feeStatus === "paid"
                                ? "bg-green-100 text-green-700"
                                : student.feeStatus === "partial"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }
                          >
                            {student.feeStatus}
                          </Badge>
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
    </DashboardLayout>
  );
}
