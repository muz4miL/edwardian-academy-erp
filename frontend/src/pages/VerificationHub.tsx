/**
 * Front Desk Verification Hub
 *
 * Quick lookup and verification tool for operators.
 * Search students by ID, name, or phone and handle credential distribution.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  User,
  Phone,
  GraduationCap,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  Loader2,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Edit,
  Save,
  Users,
  FileText,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
// Import Print Receipt System
import { usePrintReceipt } from "@/hooks/usePrintReceipt";
import ReceiptTemplate from "@/components/print/ReceiptTemplate";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface Student {
  _id: string;
  studentId: string;
  barcodeId?: string;
  studentName: string;
  fatherName: string;
  parentCell: string;
  email?: string;
  class: string;
  group: string;
  studentStatus: string;
  classRef?: string;
  createdAt: string;
  plainPassword?: string; // Readable password stored in DB for Front Desk display
}

interface ClassInstance {
  _id: string;
  classTitle: string;
  gradeLevel: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export default function VerificationHub() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [editStudentId, setEditStudentId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Print Receipt Hook
  const { printRef, printData, isPrinting, printReceipt } = usePrintReceipt();

  // Fetch all students (pending and active) - Refetch on mount and provide manual refresh
  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["all-students-lookup"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/students`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    refetchOnMount: "always", // Always refetch when component mounts
  });

  // Fetch active classes for assignment
  const { data: classesData } = useQuery({
    queryKey: ["active-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/classes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  const allStudents: Student[] = studentsData?.data || [];
  const activeClasses: ClassInstance[] = classesData?.data || [];

  // Filter students based on tab and search query
  const pendingStudents = allStudents.filter(
    (s) => s.studentStatus === "Pending",
  );
  const activeStudents = allStudents.filter(
    (s) => s.studentStatus === "Active",
  );

  const getFilteredStudents = () => {
    const baseList = activeTab === "pending" ? pendingStudents : activeStudents;

    if (!searchQuery) return baseList;

    const searchLower = searchQuery.toLowerCase();
    const searchUpper = searchQuery.toUpperCase();
    return baseList.filter(
      (s) =>
        s.studentId?.toUpperCase().includes(searchUpper) ||
        s.barcodeId?.toUpperCase().includes(searchUpper) ||
        s.studentName.toLowerCase().includes(searchLower) ||
        s.parentCell
          .replace(/\D/g, "")
          .includes(searchQuery.replace(/\D/g, "")) ||
        s.fatherName.toLowerCase().includes(searchLower),
    );
  };

  const filteredStudents = getFilteredStudents();

  // Select student from table
  const handleSelectStudent = (student: Student) => {
    setFoundStudent(student);
    setShowPassword(false);
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/public/approve/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ classId }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: async (data) => {
      // Immediately refetch the student list to update table
      await refetchStudents();

      // Show credentials modal
      setGeneratedCredentials(data.data);
      setCredentialsDialogOpen(true);

      setApproveDialogOpen(false);
      setSelectedClassId("");

      // Update foundStudent with the new Active status data
      if (data.data) {
        setFoundStudent(data.data);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve student");
    },
  });

  const handleApprove = () => {
    if (foundStudent && selectedClassId) {
      approveMutation.mutate({
        id: foundStudent._id,
        classId: selectedClassId,
      });
    } else {
      toast.error("Please select a class");
    }
  };

  const openApproveDialog = () => {
    if (foundStudent?.classRef) {
      setSelectedClassId(foundStudent.classRef);
    }
    setApproveDialogOpen(true);
  };

  // Edit credentials mutation
  const updateCredentialsMutation = useMutation({
    mutationFn: async ({
      id,
      studentId,
      password,
    }: {
      id: string;
      studentId?: string;
      password?: string;
    }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/public/update-credentials/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ studentId, password }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update credentials");
      }
      return res.json();
    },
    onSuccess: async (data, variables) => {
      // Invalidate and refetch student list
      queryClient.invalidateQueries({ queryKey: ["all-students-lookup"] });
      await refetchStudents();

      // Update the detail view with fresh data (includes new plainPassword)
      if (data.data) {
        setFoundStudent(data.data);
      }

      setEditDialogOpen(false);
      setEditStudentId("");
      setEditPassword("");
      toast.success("Credentials updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update credentials");
    },
  });

  const openEditDialog = () => {
    if (foundStudent) {
      setEditStudentId(foundStudent.barcodeId || foundStudent.studentId || "");
      setEditPassword("");
      setEditDialogOpen(true);
    }
  };

  const handleSaveCredentials = () => {
    if (!foundStudent) return;

    // Validate numeric ID
    if (editStudentId && !/^\d+$/.test(editStudentId)) {
      toast.error("Student ID must be numeric only");
      return;
    }

    updateCredentialsMutation.mutate({
      id: foundStudent._id,
      studentId: editStudentId || undefined,
      password: editPassword || undefined,
    });
  };

  // Get password for display - uses plainPassword from database (persistent)
  // Falls back to formula only for legacy students without plainPassword
  const getDisplayPassword = (student: Student) => {
    // Use stored plainPassword if available
    if (student.plainPassword) {
      return student.plainPassword;
    }
    // Fallback: generate using formula (for legacy students)
    const phoneDigits = student.parentCell.replace(/\D/g, "").slice(-4);
    const namePart = student.studentName
      .replace(/\s/g, "")
      .toLowerCase()
      .slice(0, 4);
    return `${namePart}${phoneDigits}`;
  };

  const copyCredentials = (username: string, password: string) => {
    const text = `Edwardian Academy - Login Credentials\n\nStudent: ${foundStudent?.studentName}\nUsername: ${username}\nPassword: ${password}\n\nLogin at: ${window.location.origin}/student-portal`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied to clipboard!");
  };

  return (
    <DashboardLayout title="Front Desk">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
            Front Desk Verification Hub
          </h1>
          <p className="text-gray-500">
            Quick student lookup and credential management
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetchStudents();
            toast.success("Student data refreshed");
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "pending" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("pending");
            setFoundStudent(null);
          }}
          className={`flex items-center gap-2 ${activeTab === "pending" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
        >
          <FileText className="h-4 w-4" />
          Pending Applications
          {pendingStudents.length > 0 && (
            <Badge className="ml-1 bg-white/20 text-white">
              {pendingStudents.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === "active" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("active");
            setFoundStudent(null);
          }}
          className={`flex items-center gap-2 ${activeTab === "active" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
        >
          <Users className="h-4 w-4" />
          Active Students
          <Badge variant="secondary" className="ml-1">
            {activeStudents.length}
          </Badge>
        </Button>
      </div>

      {/* Search Bar - Large and Prominent */}
      <Card className="border-2 border-indigo-200 shadow-lg mb-6">
        <CardContent className="pt-6 pb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
            <Input
              placeholder="Search by Application ID, Student Name, Father's Name, or Phone Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-14 text-lg border-2 border-gray-200 focus:border-indigo-500 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {foundStudent ? (
        // Detail View - 2 Column Layout
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <CardTitle className="text-2xl">
                    {foundStudent.studentName}
                  </CardTitle>
                  <Badge
                    className={`text-sm px-3 py-1 ${foundStudent.studentStatus === "Active"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : "bg-amber-100 text-amber-700 border-amber-300"
                      }`}
                  >
                    {foundStudent.studentStatus === "Active" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-1" />
                        Pending Verification
                      </>
                    )}
                  </Badge>
                </div>
                <code className="text-sm bg-gray-100 px-3 py-1.5 rounded border">
                  {foundStudent.barcodeId || foundStudent.studentId}
                </code>
              </div>
              <Button
                variant="outline"
                onClick={() => setFoundStudent(null)}
                size="sm"
              >
                ← Back to List
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* 2-Column Detail Grid */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Left Column: Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Student Name
                    </label>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {foundStudent.studentName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Father's Name
                    </label>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {foundStudent.fatherName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Parent Contact
                    </label>
                    <p className="text-base font-medium text-gray-900 mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-indigo-600" />
                      {foundStudent.parentCell}
                    </p>
                  </div>
                  {foundStudent.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {foundStudent.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Application Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Application Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Requested Batch
                    </label>
                    <p className="text-base font-medium text-gray-900 mt-1 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                      {foundStudent.class || "Not Assigned"}
                      {foundStudent.group ? ` - ${foundStudent.group}` : ""}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Application Date
                    </label>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {foundStudent.createdAt &&
                        !isNaN(new Date(foundStudent.createdAt).getTime())
                        ? new Date(foundStudent.createdAt).toLocaleDateString(
                          "en-PK",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Application ID
                    </label>
                    <p className="text-base font-mono font-medium text-gray-900 mt-1">
                      {foundStudent.studentId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Section for Active Students */}
            {foundStudent.studentStatus === "Active" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Login Credentials
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                      Username
                    </label>
                    <div className="flex items-center justify-between">
                      <code className="text-base font-bold text-indigo-600">
                        {foundStudent.barcodeId || foundStudent.studentId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            foundStudent.barcodeId || foundStudent.studentId,
                          );
                          toast.success("Username copied!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                      Password
                    </label>
                    <div className="flex items-center justify-between">
                      {showPassword ? (
                        <code className="text-base font-bold text-purple-600">
                          {getDisplayPassword(foundStudent)}
                        </code>
                      ) : (
                        <span className="text-base font-bold text-gray-400">
                          ••••••••
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        {showPassword && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                getDisplayPassword(foundStudent),
                              );
                              toast.success("Password copied!");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    copyCredentials(
                      foundStudent.barcodeId || foundStudent.studentId,
                      getDisplayPassword(foundStudent),
                    )
                  }
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                >
                  📋 Copy All (WhatsApp Ready)
                </Button>
                <Button
                  variant="outline"
                  onClick={openEditDialog}
                  className="w-full mt-2"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Credentials
                </Button>
              </div>
            )}
          </CardContent>

          {/* Footer Action Bar - For Pending Students */}
          {foundStudent.studentStatus === "Pending" && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-t-2 border-emerald-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Ready to Verify?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Finalize this admission and generate login credentials
                  </p>
                </div>
                <Button
                  onClick={openApproveDialog}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 px-8"
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  Finalize & Generate Credentials
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        // Table View - Applicant Inbox
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center justify-between">
              <span className="text-xl">
                {searchQuery
                  ? "Search Results"
                  : activeTab === "pending"
                    ? "Pending Applications"
                    : "Active Students"}
              </span>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {filteredStudents.length}{" "}
                {activeTab === "pending"
                  ? filteredStudents.length === 1
                    ? "Application"
                    : "Applications"
                  : filteredStudents.length === 1
                    ? "Student"
                    : "Students"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchQuery
                    ? "No matches found"
                    : activeTab === "pending"
                      ? "No pending applications"
                      : "No active students"}
                </h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? `No students found matching "${searchQuery}"`
                    : activeTab === "pending"
                      ? "All applications have been processed"
                      : "No students have been admitted yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="font-semibold">
                      {activeTab === "active" ? "Student ID" : "App ID"}
                    </TableHead>
                    <TableHead className="font-semibold">
                      Student Name
                    </TableHead>
                    <TableHead className="font-semibold">
                      Father's Name
                    </TableHead>
                    <TableHead className="font-semibold">
                      {activeTab === "active"
                        ? "Class/Batch"
                        : "Requested Batch"}
                    </TableHead>
                    <TableHead className="font-semibold">
                      {activeTab === "active" ? "Phone" : "Applied Date"}
                    </TableHead>
                    <TableHead className="font-semibold text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student._id}
                      className="hover:bg-indigo-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectStudent(student)}
                    >
                      <TableCell className="font-mono text-sm font-bold">
                        {activeTab === "active"
                          ? student.barcodeId || student.studentId
                          : student.studentId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {student.fatherName}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {student.class}
                          {student.group ? ` - ${student.group}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {activeTab === "active"
                          ? student.parentCell
                          : student.createdAt &&
                            !isNaN(new Date(student.createdAt).getTime())
                            ? new Date(student.createdAt).toLocaleDateString(
                              "en-PK",
                              {
                                day: "2-digit",
                                month: "short",
                              },
                            )
                            : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectStudent(student);
                          }}
                        >
                          {activeTab === "active" ? "View" : "Review"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finalize Admission Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <GraduationCap className="h-5 w-5" />
              Finalize Admission
            </DialogTitle>
            <DialogDescription>
              Approve and assign batch for: {foundStudent?.studentName}
            </DialogDescription>
          </DialogHeader>
          {foundStudent && (
            <div className="space-y-6 py-4">
              {/* Student Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Student:</span>
                  <span className="font-medium text-gray-900">
                    {foundStudent.studentName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Father's Name:</span>
                  <span className="font-medium text-gray-900">
                    {foundStudent.fatherName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Requested Class:</span>
                  <span className="font-medium text-gray-900">
                    {foundStudent.class} ({foundStudent.group})
                  </span>
                </div>
              </div>

              {/* Class Assignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Assign Batch/Class
                </label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                >
                  <SelectTrigger className="h-11 bg-white border-gray-200 rounded-xl">
                    <SelectValue placeholder="Select a class/batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClasses.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No active classes available
                      </div>
                    ) : (
                      activeClasses.map((classItem) => (
                        <SelectItem key={classItem._id} value={classItem._id}>
                          {classItem.classTitle} - {classItem.gradeLevel} (
                          {classItem.days.join(", ")} • {classItem.startTime})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  You can change the class from what the student originally
                  requested
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setApproveDialogOpen(false);
                    setSelectedClassId("");
                  }}
                  className="flex-1"
                  disabled={approveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || !selectedClassId}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirm & Activate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Premium Credentials Card Modal */}
      <Dialog
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          {generatedCredentials && (
            <div className="flex flex-col">
              {/* Premium Header - Gold/Green */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5 text-center">
                <div className="mx-auto w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 ring-4 ring-white/30">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Admission Confirmed
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  Student credentials generated
                </p>
              </div>

              {/* Student Profile Strip */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {generatedCredentials.studentName?.charAt(0)?.toUpperCase() ||
                    "S"}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {generatedCredentials.studentName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    S/O {generatedCredentials.fatherName} •{" "}
                    {generatedCredentials.class || "Assigned"}
                  </p>
                </div>
              </div>

              {/* Credentials - Glass Card */}
              <div className="px-6 py-5">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-full bg-amber-400/20 flex items-center justify-center">
                      <span className="text-amber-400 text-sm">🔑</span>
                    </div>
                    <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">
                      Login Credentials
                    </span>
                  </div>

                  {/* Username */}
                  <div className="mb-4">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">
                      Student ID
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-xl font-mono font-bold text-white tracking-wide">
                        {generatedCredentials.credentials?.username ||
                          generatedCredentials.barcodeId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            generatedCredentials.credentials?.username ||
                            generatedCredentials.barcodeId,
                          );
                          toast.success("Copied!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-xl font-mono font-bold text-emerald-400 tracking-wide">
                        {generatedCredentials.credentials?.password || "—"}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            generatedCredentials.credentials?.password || "",
                          );
                          toast.success("Copied!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 pb-5 flex gap-3">
                <Button
                  onClick={() => {
                    const text = `*Edwardian Academy*\n\n🎓 Student: ${generatedCredentials.studentName}\n👤 Username: ${generatedCredentials.credentials?.username || generatedCredentials.barcodeId}\n🔐 Password: ${generatedCredentials.credentials?.password}\n\n🌐 Login: ${window.location.origin}/student-portal`;
                    navigator.clipboard.writeText(text);
                    toast.success("Copied for WhatsApp!");
                  }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-11"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy for WhatsApp
                </Button>
                <Button
                  onClick={() => {
                    if (generatedCredentials._id) {
                      printReceipt(generatedCredentials._id, "verification");
                    }
                  }}
                  disabled={isPrinting}
                  className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 h-11"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  🖨️ Print Admission Slip
                </Button>
              </div>

              {/* Footer */}
              <div className="bg-amber-50 border-t border-amber-100 px-6 py-3">
                <p className="text-xs text-amber-700 text-center">
                  ⚠️ Share credentials with parent via WhatsApp or in-person
                </p>
              </div>

              {/* Done Button */}
              <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCredentialsDialogOpen(false);
                    setGeneratedCredentials(null);
                    setFoundStudent(null); // Reset to show updated list
                  }}
                  className="flex-1 h-11"
                >
                  Done
                </Button>
                <Button
                  onClick={() => {
                    if (generatedCredentials?._id) {
                      printReceipt(generatedCredentials._id, "verification");
                    }
                  }}
                  disabled={isPrinting}
                  className="flex-1 h-11 bg-sky-600 hover:bg-sky-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  🖨️ Print Admission Slip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Credentials Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Edit className="h-5 w-5" />
              Edit Credentials
            </DialogTitle>
            <DialogDescription>
              Update Student ID (numeric only) or password for:{" "}
              {foundStudent?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Student ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Student ID (Numeric Only)
              </label>
              <Input
                type="text"
                placeholder="e.g., 260001"
                value={editStudentId}
                onChange={(e) => {
                  // Only allow numeric input
                  const value = e.target.value.replace(/\D/g, "");
                  setEditStudentId(value);
                }}
                className="h-11 font-mono text-lg"
              />
              <p className="text-xs text-gray-500">
                Leave unchanged to keep current ID:{" "}
                {foundStudent?.barcodeId || foundStudent?.studentId}
              </p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                New Password (Optional)
              </label>
              <Input
                type="text"
                placeholder="Enter new password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-gray-500">
                Leave empty to keep current password
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditStudentId("");
                  setEditPassword("");
                }}
                className="flex-1"
                disabled={updateCredentialsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCredentials}
                disabled={
                  updateCredentialsMutation.isPending ||
                  (!editStudentId && !editPassword)
                }
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                {updateCredentialsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden Receipt Template for Printing */}
      <div style={{ display: "none" }}>
        {printData && (
          <ReceiptTemplate
            ref={printRef}
            student={printData.student}
            receiptConfig={printData.receiptConfig}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
