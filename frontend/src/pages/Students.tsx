import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Search,
  Download,
  Loader2,
  DollarSign,
  Receipt,
  CheckCircle,
  Printer,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentApi, sessionApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
// Import CRUD Modals
import { ViewEditStudentModal } from "@/components/dashboard/ViewEditStudentModal";
import { DeleteStudentDialog } from "@/components/dashboard/DeleteStudentDialog";
// Import PDF Receipt System (replaces react-to-print)
import { usePDFReceipt } from "@/hooks/usePDFReceipt";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Helper function to get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// TASK 3: Helper to get subject name from string or object
const getSubjectName = (subject: any): string => {
  if (typeof subject === "string") return subject;
  if (typeof subject === "object" && subject.name) return subject.name;
  return "";
};

const Students = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // PDF Receipt Hook (replaces react-to-print)
  const { isPrinting, generatePDF } = usePDFReceipt();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  // TASK 4: Peshawar Session Filter
  const [sessionFilter, setSessionFilter] = useState("all");

  // Modal states
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [viewEditMode, setViewEditMode] = useState<"view" | "edit">("view");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Fee Collection Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeStudent, setFeeStudent] = useState<any | null>(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeMonth, setFeeMonth] = useState("");
  const [feeSubject, setFeeSubject] = useState("");
  const [feeSuccess, setFeeSuccess] = useState<any | null>(null);

  // TASK 4: Fetch all sessions for filter dropdown
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionApi.getAll(),
  });

  const sessions = sessionsData?.data || [];

  // Fetch students with React Query - include session filter
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "students",
      {
        class: classFilter,
        group: groupFilter,
        search: searchTerm,
        session: sessionFilter,
      },
    ],
    queryFn: () =>
      studentApi.getAll({
        class: classFilter !== "all" ? classFilter : undefined,
        group: groupFilter !== "all" ? groupFilter : undefined,
        search: searchTerm || undefined,
        sessionRef: sessionFilter !== "all" ? sessionFilter : undefined,
      }),
  });

  const students = data?.data || [];

  // Delete mutation
  const deleteStudentMutation = useMutation({
    mutationFn: studentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student Deleted", {
        description: "Student record has been removed successfully",
        duration: 3000,
      });
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: (error: any) => {
      toast.error("Delete Failed", {
        description: error.message || "Failed to delete student",
        duration: 4000,
      });
    },
  });

  // Fee Collection mutation
  const collectFeeMutation = useMutation({
    mutationFn: async ({
      studentId,
      amount,
      month,
      subject,
    }: {
      studentId: string;
      amount: number;
      month: string;
      subject: string;
    }) => {
      const res = await fetch(
        `${API_BASE_URL}/students/${studentId}/collect-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, month, subject }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to collect fee");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setFeeSuccess(data.data);
    },
    onError: (error: any) => {
      toast.error("Fee Collection Failed", {
        description: error.message || "Failed to collect fee",
        duration: 4000,
      });
    },
  });

  // Generate month options (current month + next 11 months)
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      months.push(monthStr);
    }
    return months;
  };

  // Handlers
  const handleView = (student: any) => {
    // Navigate to full Student Profile page
    navigate(`/students/${student._id}`);
  };

  const handleQuickView = (student: any) => {
    // Quick modal view (for backward compatibility)
    setSelectedStudent(student);
    setViewEditMode("view");
    setIsViewEditModalOpen(true);
  };

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setViewEditMode("edit");
    setIsViewEditModalOpen(true);
  };

  const handleDelete = (student: any) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedStudent?._id) {
      deleteStudentMutation.mutate(selectedStudent._id);
    }
  };

  // Fee collection handler
  const handleCollectFee = (student: any) => {
    setFeeStudent(student);
    setFeeAmount("");
    setFeeMonth(getMonthOptions()[0]);
    setFeeSubject(student.subjects?.[0] || "");
    setFeeSuccess(null);
    setIsFeeModalOpen(true);
  };

  const submitFeeCollection = () => {
    if (!feeStudent || !feeAmount || !feeMonth) return;
    collectFeeMutation.mutate({
      studentId: feeStudent._id,
      amount: parseFloat(feeAmount),
      month: feeMonth,
      subject: feeSubject,
    });
  };

  const closeFeeModal = () => {
    setIsFeeModalOpen(false);
    setFeeStudent(null);
    setFeeSuccess(null);
  };

  return (
    <DashboardLayout title="Students">
      <HeaderBanner
        title="Student Management"
        subtitle={`Total Students: ${students.length} | Active: ${students.filter((s: any) => s.status === "active").length}`}
      >
        <Button
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={() => navigate("/admissions")}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </HeaderBanner>

      {/* Filters - All in one row */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Session Filter - Integrated */}
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((session: any) => (
                <SelectItem key={session._id} value={session._id}>
                  {session.sessionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="9th Grade">9th Grade</SelectItem>
              <SelectItem value="10th Grade">10th Grade</SelectItem>
              <SelectItem value="11th Grade">11th Grade</SelectItem>
              <SelectItem value="12th Grade">12th Grade</SelectItem>
              <SelectItem value="MDCAT Prep">MDCAT Prep</SelectItem>
              <SelectItem value="ECAT Prep">ECAT Prep</SelectItem>
            </SelectContent>
          </Select>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-[170px] bg-background">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="Pre-Medical">Pre-Medical</SelectItem>
              <SelectItem value="Pre-Engineering">Pre-Engineering</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading students...
            </span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-12">
            <p className="text-destructive font-semibold">
              Error loading students
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {(error as any)?.message || "Failed to fetch students"}
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <p className="text-muted-foreground font-semibold">
              No students found
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {sessionFilter !== "all"
                ? "No students in this session. Try selecting 'All Sessions'."
                : "Add your first student to get started"}
            </p>
            <Button className="mt-4" onClick={() => navigate("/admissions")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add First Student
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Class</TableHead>
                <TableHead className="font-semibold">Group</TableHead>
                <TableHead className="font-semibold">Subjects</TableHead>
                <TableHead className="font-semibold text-center">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-center">
                  Fee Status
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student: any) => {
                const initials = getInitials(student.studentName || "NA");
                const subjects = student.subjects || [];

                return (
                  <TableRow key={student._id} className="hover:bg-secondary/50">
                    <TableCell className="font-medium font-mono text-xs text-muted-foreground">
                      {student.studentId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white font-bold text-sm shadow-md">
                          <span className="flex items-center justify-center">
                            {initials}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {student.studentName}
                          </p>
                          {student.fatherName === "To be updated" ? (
                            <p className="text-[11px] italic text-slate-400">
                              {student.fatherName}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {student.fatherName}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.class}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {student.group}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* TASK 3: Enterprise Subject Pills - Handles both string and object format */}
                      <div className="flex flex-wrap gap-1.5">
                        {subjects.length > 0 ? (
                          <>
                            {subjects
                              .slice(0, 2)
                              .map((subject: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-700"
                                >
                                  {getSubjectName(subject)}
                                </span>
                              ))}
                            {subjects.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 border border-sky-200 text-sky-700">
                                +{subjects.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No subjects
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="inline-flex items-center justify-center"
                        style={{
                          filter:
                            student.status === "active"
                              ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))"
                              : "drop-shadow(0 0 8px rgba(148, 163, 184, 0.2))",
                        }}
                      >
                        <StatusBadge status={student.status} />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="inline-flex items-center justify-center"
                        style={{
                          filter:
                            student.feeStatus === "paid"
                              ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.3))"
                              : student.feeStatus === "partial"
                                ? "drop-shadow(0 0 8px rgba(234, 179, 8, 0.3))"
                                : "drop-shadow(0 0 8px rgba(217, 119, 6, 0.3))",
                        }}
                      >
                        <StatusBadge status={student.feeStatus} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-purple-50 hover:text-purple-600"
                          onClick={() => generatePDF(student._id, "reprint")}
                          disabled={isPrinting}
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-green-50 hover:text-green-600"
                          onClick={() => handleCollectFee(student)}
                          title="Collect Fee"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-sky-50 hover:text-sky-600"
                          onClick={() => handleView(student)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleEdit(student)}
                          title="Edit Student"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(student)}
                          disabled={deleteStudentMutation.isPending}
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* CRUD Modals */}
      <ViewEditStudentModal
        open={isViewEditModalOpen}
        onOpenChange={setIsViewEditModalOpen}
        student={selectedStudent}
        mode={viewEditMode}
      />

      <DeleteStudentDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        studentName={selectedStudent?.studentName || ""}
        studentId={selectedStudent?.studentId || ""}
        isDeleting={deleteStudentMutation.isPending}
      />

      {/* Fee Collection Modal */}
      <Dialog
        open={isFeeModalOpen}
        onOpenChange={(open) => !open && closeFeeModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Collect Fee
            </DialogTitle>
            <DialogDescription>
              {feeStudent &&
                `Collecting fee for ${feeStudent.studentName} (${feeStudent.studentId})`}
            </DialogDescription>
          </DialogHeader>

          {feeSuccess ? (
            // Success state
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-700">
                  Fee Collected Successfully!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Receipt #{feeSuccess.receiptNumber}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Amount
                  </span>
                  <span className="font-semibold">
                    Rs. {feeSuccess.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Month</span>
                  <span className="font-medium">{feeSuccess.month}</span>
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Split Breakdown:
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">
                      Teacher Share (
                      {feeSuccess.splitBreakdown?.teacherPercentage}%)
                    </span>
                    <span className="font-medium">
                      Rs.{" "}
                      {feeSuccess.splitBreakdown?.teacherAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-purple-600">
                      Academy Share (
                      {feeSuccess.splitBreakdown?.academyPercentage}%)
                    </span>
                    <span className="font-medium">
                      Rs.{" "}
                      {feeSuccess.splitBreakdown?.academyAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeFeeModal} className="w-full">
                  <Receipt className="mr-2 h-4 w-4" />
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // Collection form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feeMonth">Month</Label>
                <Select value={feeMonth} onValueChange={setFeeMonth}>
                  <SelectTrigger id="feeMonth">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {feeStudent?.subjects?.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="feeSubject">Subject</Label>
                  <Select value={feeSubject} onValueChange={setFeeSubject}>
                    <SelectTrigger id="feeSubject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeStudent.subjects.map((subj: string) => (
                        <SelectItem key={subj} value={subj}>
                          {subj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="feeAmount">Amount (Rs.)</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  placeholder="Enter fee amount"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  min={0}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Fee will be automatically split:
                </p>
                <ul className="mt-1 text-blue-600 dark:text-blue-400 text-xs space-y-0.5">
                  <li>• 70% → Teacher's Unverified Balance</li>
                  <li>• 30% → Academy's Unverified Balance</li>
                </ul>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeFeeModal}>
                  Cancel
                </Button>
                <Button
                  onClick={submitFeeCollection}
                  disabled={
                    !feeAmount ||
                    parseFloat(feeAmount) <= 0 ||
                    collectFeeMutation.isPending
                  }
                >
                  {collectFeeMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Collect Fee
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Receipt is now generated programmatically - no hidden DOM template needed */}
    </DashboardLayout>
  );
};

export default Students;
