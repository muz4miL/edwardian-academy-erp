import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  CreditCard,
  Receipt,
  Printer,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DigitalIDCard } from "@/components/student/DigitalIDCard";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch student details
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/students/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch student");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch fee history for this student
  const { data: feeHistoryData, isLoading: feeLoading } = useQuery({
    queryKey: ["student-fees", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/students/${id}/fee-history`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch fee history");
      return res.json();
    },
    enabled: !!id,
  });

  const student = studentData?.data;
  const feeRecords = feeHistoryData?.data || [];

  // Calculate totals
  const totalPaid = feeRecords.reduce(
    (sum: number, r: any) => sum + (r.amount || 0),
    0,
  );
  const balance = (student?.totalFee || 0) - (student?.paidAmount || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
      case "graduated":
        return <Badge className="bg-blue-100 text-blue-700">Graduated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFeeStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="h-3 w-3" />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 gap-1">
            <Clock className="h-3 w-3" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-red-100 text-red-700 gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (studentLoading) {
    return (
      <DashboardLayout title="Student Profile">
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

  if (!student) {
    return (
      <DashboardLayout title="Student Profile">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Student Not Found</h2>
          <Button onClick={() => navigate("/students")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Profile">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/students")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {student.studentName}
              </h1>
              <p className="text-muted-foreground">
                Student ID: {student.studentId || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(student.status)}
            {getFeeStatusBadge(student.feeStatus)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Avatar */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                  <span className="text-3xl font-bold text-primary">
                    {student.studentName?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Father's Name
                    </p>
                    <p className="font-medium">{student.fatherName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Parent Cell</p>
                    <p className="font-medium">{student.parentCell}</p>
                  </div>
                </div>

                {student.studentCell && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Student Cell
                      </p>
                      <p className="font-medium">{student.studentCell}</p>
                    </div>
                  </div>
                )}

                {student.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-sm break-all">
                        {student.email}
                      </p>
                    </div>
                  </div>
                )}

                {student.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium text-sm">{student.address}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Admission Date
                    </p>
                    <p className="font-medium">
                      {new Date(student.admissionDate).toLocaleDateString(
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
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Classes & Fee Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                Enrollment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Class & Group */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Class
                  </p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                    {student.class}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Group
                  </p>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    {student.group}
                  </p>
                </div>
              </div>

              {/* Subjects */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Enrolled Subjects
                </p>
                <div className="flex flex-wrap gap-2">
                  {student.subjects?.length > 0 ? (
                    student.subjects.map((subj: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="px-3 py-1.5 text-sm bg-secondary"
                      >
                        {typeof subj === "string" ? subj : subj.name}
                        {subj.fee && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            Rs. {subj.fee?.toLocaleString()}
                          </span>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No subjects enrolled
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Financial Summary
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="text-xl font-bold text-foreground">
                      Rs. {student.totalFee?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Paid Amount
                    </p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      Rs. {student.paidAmount?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg text-center">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Balance
                    </p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">
                      Rs. {balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee History Table - Matching the ledger format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" />
              Fee History (Ledger)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feeLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : feeRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No fee payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-yellow-400/80 hover:bg-yellow-400">
                      <TableHead className="font-bold text-gray-900">
                        S.No
                      </TableHead>
                      <TableHead className="font-bold text-gray-900">
                        R.No
                      </TableHead>
                      <TableHead className="font-bold text-gray-900">
                        Date
                      </TableHead>
                      <TableHead className="font-bold text-gray-900">
                        Month
                      </TableHead>
                      <TableHead className="font-bold text-gray-900">
                        Subject
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 text-right">
                        Fee
                      </TableHead>
                      <TableHead className="font-bold text-gray-900">
                        Status
                      </TableHead>
                      <TableHead className="font-bold text-gray-900">
                        Collected By
                      </TableHead>
                      <TableHead className="font-bold text-gray-900 text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeRecords.map((record: any, index: number) => (
                      <TableRow
                        key={record._id}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.receiptNumber?.slice(-4) || "—"}
                        </TableCell>
                        <TableCell>
                          {new Date(record.createdAt).toLocaleDateString(
                            "en-PK",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            },
                          )}
                        </TableCell>
                        <TableCell>{record.month}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-100">
                            {record.subject || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          Rs. {record.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.collectedByName || "Staff"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
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
    </DashboardLayout>
  );
}
