/**
 * Pending Approvals Page
 *
 * Admin interface for reviewing and approving pending student registrations.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  UserX,
  Clock,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  Users,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface PendingStudent {
  _id: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  parentCell: string;
  email?: string;
  class: string;
  group: string;
  subjects?: Array<{ name: string; fee: number }>;
  totalFee: number;
  cnic?: string;
  createdAt: string;
  classRef?: string;
}

interface ClassInstance {
  _id: string;
  classTitle: string;
  gradeLevel: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export default function PendingApprovals() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [studentToReject, setStudentToReject] = useState<PendingStudent | null>(
    null,
  );
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [studentToApprove, setStudentToApprove] =
    useState<PendingStudent | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);

  // Fetch pending registrations
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-registrations"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/pending`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pending registrations");
      return res.json();
    },
  });

  // Fetch active classes for assignment
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ["active-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/classes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  const pendingStudents: PendingStudent[] = data?.data || [];
  const activeClasses: ClassInstance[] = classesData?.data || [];

  // Filter by search
  const filteredStudents = pendingStudents.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentCell.includes(searchQuery) ||
      s.class.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });

      // Show credentials modal to admin
      setGeneratedCredentials(data.data);
      setCredentialsDialogOpen(true);

      setSelectedStudent(null);
      setApproveDialogOpen(false);
      setStudentToApprove(null);
      setSelectedClassId("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve registration");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`${API_BASE_URL}/api/public/reject/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
      toast.success(data.message);
      setRejectDialogOpen(false);
      setStudentToReject(null);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject registration");
    },
  });

  const handleReject = () => {
    if (studentToReject) {
      rejectMutation.mutate({ id: studentToReject._id, reason: rejectReason });
    }
  };

  const handleApprove = () => {
    if (studentToApprove && selectedClassId) {
      approveMutation.mutate({
        id: studentToApprove._id,
        classId: selectedClassId,
      });
    } else {
      toast.error("Please select a class");
    }
  };

  const openApproveDialog = (student: PendingStudent) => {
    setStudentToApprove(student);
    // Pre-select the class student requested if it exists
    if (student.classRef) {
      setSelectedClassId(student.classRef);
    } else {
      setSelectedClassId("");
    }
    setApproveDialogOpen(true);
  };

  return (
    <DashboardLayout title="Pending Approvals">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Pending Approvals
          </h1>
          <p className="text-gray-500 mt-1">
            Review and approve online registrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-4 py-2 text-lg">
            <Clock className="h-4 w-4 mr-2" />
            {pendingStudents.length} Pending
          </Badge>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, phone, or class..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-white border-gray-200 rounded-xl max-w-md"
        />
      </div>

      {/* Pending List */}
      <Card className="border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {pendingStudents.length === 0
                  ? "No Pending Approvals"
                  : "No matches found"}
              </h3>
              <p className="text-sm text-gray-500">
                {pendingStudents.length === 0
                  ? "All registrations have been processed"
                  : "Try a different search term"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                  <TableHead className="font-semibold text-gray-700 py-4">
                    Student
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Contact
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Class
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Fee
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    Applied
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow
                    key={student._id}
                    className="hover:bg-gray-50/60 transition-colors border-b border-gray-100"
                  >
                    {/* Student Info */}
                    <TableCell className="py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {student.studentName}
                        </p>
                        <p className="text-sm text-gray-500">
                          S/O {student.fatherName}
                        </p>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="text-sm">
                        <p className="flex items-center gap-1 text-gray-700">
                          <Phone className="h-3.5 w-3.5" />
                          {student.parentCell}
                        </p>
                        {student.email && (
                          <p className="flex items-center gap-1 text-gray-500">
                            <Mail className="h-3.5 w-3.5" />
                            {student.email}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Class */}
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {student.class} ({student.group})
                      </Badge>
                    </TableCell>

                    {/* Fee */}
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        PKR {student.totalFee?.toLocaleString() || 0}
                      </span>
                    </TableCell>

                    {/* Applied Date */}
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {new Date(student.createdAt).toLocaleDateString(
                          "en-PK",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <div className="inline-flex items-center gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Approve */}
                        <Button
                          size="sm"
                          onClick={() => openApproveDialog(student)}
                          className="bg-emerald-600 hover:bg-emerald-700 h-8"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>

                        {/* Reject */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setStudentToReject(student);
                            setRejectDialogOpen(true);
                          }}
                          className="h-8"
                        >
                          <UserX className="h-4 w-4" />
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

      {/* View Details Dialog */}
      <Dialog
        open={!!selectedStudent}
        onOpenChange={() => setSelectedStudent(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-indigo-600" />
              Application Details
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Student Name</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.studentName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Father's Name</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.fatherName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.parentCell}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">CNIC</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.cnic || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Class</p>
                  <p className="font-medium text-gray-900">
                    {selectedStudent.class} ({selectedStudent.group})
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total Fee</p>
                  <p className="font-medium text-gray-900">
                    PKR {selectedStudent.totalFee?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {selectedStudent.subjects &&
                selectedStudent.subjects.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Subjects</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.subjects.map((s) => (
                        <Badge key={s.name} variant="secondary">
                          {s.name} (PKR {s.fee})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    openApproveDialog(selectedStudent);
                    setSelectedStudent(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve & Assign Class
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setStudentToReject(selectedStudent);
                    setSelectedStudent(null);
                    setRejectDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Reject Application
            </DialogTitle>
            <DialogDescription>
              Rejecting application for: {studentToReject?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setStudentToReject(null);
                  setRejectReason("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="flex-1"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize Admission Dialog - "The Assignment" */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <GraduationCap className="h-5 w-5" />
              Finalize Admission
            </DialogTitle>
            <DialogDescription>
              Approve and assign batch for: {studentToApprove?.studentName}
            </DialogDescription>
          </DialogHeader>
          {studentToApprove && (
            <div className="space-y-6 py-4">
              {/* Student Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Student:</span>
                  <span className="font-medium text-gray-900">
                    {studentToApprove.studentName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Father's Name:</span>
                  <span className="font-medium text-gray-900">
                    {studentToApprove.fatherName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Requested Class:</span>
                  <span className="font-medium text-gray-900">
                    {studentToApprove.class} ({studentToApprove.group})
                  </span>
                </div>
              </div>

              {/* Class Assignment Dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Assign Batch/Class
                </label>
                {classesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : (
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
                )}
                <p className="text-xs text-gray-500 mt-1">
                  You can change the class from what the student originally
                  requested
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setApproveDialogOpen(false);
                    setStudentToApprove(null);
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

      {/* Credentials Generated Modal - "The Handover" */}
      <Dialog
        open={credentialsDialogOpen}
        onOpenChange={setCredentialsDialogOpen}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
              Student Admitted Successfully!
            </DialogTitle>
            <DialogDescription>
              Login credentials have been generated. Share these with the
              student.
            </DialogDescription>
          </DialogHeader>
          {generatedCredentials && (
            <div className="space-y-6 py-4">
              {/* Student Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {generatedCredentials.studentName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      S/O {generatedCredentials.fatherName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {generatedCredentials.parentCell}
                </div>
              </div>

              {/* Credentials Box */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-6">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  🔑 Login Credentials
                </h4>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Student ID / Username
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-lg font-bold text-indigo-600">
                        {generatedCredentials.credentials.username}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            generatedCredentials.credentials.username,
                          );
                          toast.success("Username copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Password
                    </label>
                    <div className="flex items-center justify-between mt-1">
                      <code className="text-lg font-bold text-purple-600">
                        {generatedCredentials.credentials.password}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            generatedCredentials.credentials.password,
                          );
                          toast.success("Password copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy All Button */}
              <Button
                onClick={() => {
                  const text = `Edwardian Academy - Login Credentials\n\nStudent: ${generatedCredentials.studentName}\nUsername: ${generatedCredentials.credentials.username}\nPassword: ${generatedCredentials.credentials.password}\n\nLogin at: ${window.location.origin}/student-portal`;
                  navigator.clipboard.writeText(text);
                  toast.success("All credentials copied to clipboard!");
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                📋 Copy All (WhatsApp Ready)
              </Button>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Important:</strong> Share these credentials with
                  the student/parent via WhatsApp or in person. The student
                  cannot login without these.
                </p>
              </div>

              {/* Close Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setCredentialsDialogOpen(false);
                  setGeneratedCredentials(null);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
