import { useState, useMemo } from "react";
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
  Edit,
  Trash2,
  UserPlus,
  Search,
  Loader2,
  DollarSign,
  Receipt,
  CheckCircle,
  Printer,
  UserMinus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentApi, sessionApi, classApi, timetableApi, teacherApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
// Import CRUD Modals
import { ViewEditStudentModal } from "@/components/dashboard/ViewEditStudentModal";
import { WithdrawStudentDialog } from "@/components/dashboard/WithdrawStudentDialog";
// Import PDF Receipt System (replaces react-to-print)
import { usePDFReceipt } from "@/hooks/usePDFReceipt";
import { API_BASE_URL } from "@/utils/apiConfig";

// Helper function to get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const resolveStudentPhotoSrc = (student: any): string | null => {
  const photo = student?.imageUrl || student?.photo;
  if (!photo) return null;
  if (
    typeof photo === "string" &&
    (photo.startsWith("http") || photo.startsWith("data:") || photo.startsWith("blob:"))
  ) {
    return photo;
  }
  return `${API_BASE_URL}${photo}`;
};

// TASK 3: Helper to get subject name from string or object
const getSubjectName = (subject: any): string => {
  try {
    if (typeof subject === "string") return subject;
    if (typeof subject === "object" && subject?.name) return subject.name;
    return "";
  } catch (e) {
    console.warn("Error getting subject name:", e);
    return "";
  }
};

const Students = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // PDF Receipt Hook (replaces react-to-print)
  const { isPrinting, generatePDF } = usePDFReceipt();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  // Subject filter replaces the old Group filter — it's what operators actually
  // search by (e.g. "who is enrolled for Botany?"). Values are subject names.
  const [subjectFilter, setSubjectFilter] = useState("all");

  // TASK 4: Peshawar Session Filter
  const [sessionFilter, setSessionFilter] = useState("all");

  // Time Slot Filter
  const [timeFilter, setTimeFilter] = useState("all");

  // Teacher Filter
  const [teacherFilter, setTeacherFilter] = useState("all");

  // Fee Status Filter
  const [feeStatusFilter, setFeeStatusFilter] = useState("all");

  // Modal states
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [viewEditMode, setViewEditMode] = useState<"view" | "edit">("view");
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isStudentQuickActionsOpen, setIsStudentQuickActionsOpen] = useState(false);
  const [quickActionStudent, setQuickActionStudent] = useState<any | null>(null);

  // Fee Collection Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeStudent, setFeeStudent] = useState<any | null>(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeMonth, setFeeMonth] = useState("");
  const [feeSuccess, setFeeSuccess] = useState<any | null>(null);

  // TASK 4: Fetch all sessions for filter dropdown
  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionApi.getAll(),
  });

  const sessions = sessionsData?.data || [];

  // Fetch all classes for dynamic class filter dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes-filter"],
    queryFn: () => classApi.getAll(),
  });

  const classes = classesData?.data || [];

  // Fetch timetable entries for time slot filter
  const { data: timetableData } = useQuery({
    queryKey: ["timetable-slots"],
    queryFn: () => timetableApi.getAll(),
    retry: 1,
  });

  // Fetch all teachers for teacher filter dropdown
  const { data: teachersData } = useQuery({
    queryKey: ["teachers-filter"],
    queryFn: () => teacherApi.getAll(),
  });

  const teachers = teachersData?.data || [];

  // Extract unique, sorted time slots from timetable entries
  const timeSlots = useMemo(() => {
    const entries = timetableData?.data || [];
    const uniqueTimes = [...new Set(entries.map((e: any) => e.startTime).filter(Boolean))] as string[];
    // Sort chronologically by converting to minutes
    return uniqueTimes.sort((a, b) => {
      const toMin = (t: string) => {
        const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1]);
        const min = parseInt(m[2]);
        const p = m[3].toUpperCase();
        if (p === "PM" && h !== 12) h += 12;
        if (p === "AM" && h === 12) h = 0;
        return h * 60 + min;
      };
      return toMin(a) - toMin(b);
    });
  }, [timetableData]);

  // Build the list of subjects for the dropdown. We union two sources so
  // nothing ever goes missing: (1) subjects declared on every class doc, and
  // (2) each teacher's own `subject` field. Names are normalised to title case
  // for display but passed back verbatim (case-insensitive match on server).
  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    (classes as any[]).forEach((cls) => {
      (cls?.subjects || []).forEach((s: any) => {
        const name = typeof s === "string" ? s : s?.name;
        if (name && String(name).trim()) set.add(String(name).trim());
      });
      (cls?.subjectTeachers || []).forEach((st: any) => {
        if (st?.subject) set.add(String(st.subject).trim());
      });
    });
    (teachers as any[]).forEach((t) => {
      if (t?.subject) set.add(String(t.subject).trim());
    });
    const list = Array.from(set);
    // Normalise capitalisation for display.
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return list;
  }, [classes, teachers]);

  // Fetch students with React Query — only when at least one filter is active.
  // Every filter works independently (and correctly in combination) on the server.
  const hasActiveFilter =
    searchTerm.trim() !== "" ||
    classFilter !== "all" ||
    subjectFilter !== "all" ||
    sessionFilter !== "all" ||
    timeFilter !== "all" ||
    teacherFilter !== "all" ||
    feeStatusFilter !== "all";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "students",
      {
        class: classFilter,
        subject: subjectFilter,
        search: searchTerm,
        session: sessionFilter,
        time: timeFilter,
        teacher: teacherFilter,
        feeStatus: feeStatusFilter,
      },
    ],
    queryFn: () =>
      studentApi.getAll({
        class: classFilter !== "all" ? classFilter : undefined,
        subject: subjectFilter !== "all" ? subjectFilter : undefined,
        search: searchTerm || undefined,
        sessionRef: sessionFilter !== "all" ? sessionFilter : undefined,
        time: timeFilter !== "all" ? timeFilter : undefined,
        teacher: teacherFilter !== "all" ? teacherFilter : undefined,
        feeStatus: feeStatusFilter !== "all" ? feeStatusFilter : undefined,
      }),
    enabled: hasActiveFilter,
  });

  const students = hasActiveFilter ? (data?.data || []) : [];

  // Withdraw mutation (soft delete with optional refund)
  const withdrawStudentMutation = useMutation({
    mutationFn: ({ id, refundAmount, refundReason }: { id: string; refundAmount?: number; refundReason?: string }) =>
      studentApi.withdraw(id, { refundAmount, refundReason }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      const refundMsg = data?.data?.refundAmount
        ? ` — Refund of PKR ${Number(data.data.refundAmount).toLocaleString()} processed`
        : "";
      toast.success("Student Withdrawn", {
        description: `Student has been withdrawn successfully${refundMsg}`,
        duration: 4000,
      });
      setIsWithdrawDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: (error: any) => {
      toast.error("Withdrawal Failed", {
        description: error.message || "Failed to withdraw student",
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
    }: {
      studentId: string;
      amount: number;
      month: string;
    }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/students/${studentId}/collect-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount, month }),
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setFeeSuccess(data.data);
    },
    onError: (error: any) => {
      toast.error("Fee Collection Failed", {
        description: error.message || "Failed to collect fee",
        duration: 4000,
      });
    },
  });

  // Handlers
  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setViewEditMode("edit");
    setIsViewEditModalOpen(true);
  };

  const openStudentQuickActions = (student: any) => {
    setQuickActionStudent(student);
    setIsStudentQuickActionsOpen(true);
  };

  const handleWithdraw = (student: any) => {
    setSelectedStudent(student);
    setIsWithdrawDialogOpen(true);
  };

  const confirmWithdraw = (refundAmount?: number, refundReason?: string) => {
    if (selectedStudent?._id) {
      withdrawStudentMutation.mutate({ id: selectedStudent._id, refundAmount, refundReason });
    }
  };

  // Fee collection handler
  const handleCollectFee = (student: any) => {
    if (!student || !student._id) {
      toast.error("Invalid Student", {
        description: "Student data is missing. Please refresh and try again.",
      });
      return;
    }
    setFeeStudent(student);
    setFeeAmount("");
    setFeeMonth(new Date().toLocaleString("default", { month: "long", year: "numeric" }));
    setFeeSuccess(null);
    setIsFeeModalOpen(true);
  };

  const submitFeeCollection = () => {
    if (!feeStudent || !feeStudent._id) {
      toast.error("Invalid Student", { description: "Student information is missing." });
      return;
    }
    if (!feeAmount || parseFloat(feeAmount) <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid fee amount greater than 0." });
      return;
    }
    if (!feeMonth) {
      toast.error("Missing Month", { description: "Please select a month for this fee collection." });
      return;
    }
    collectFeeMutation.mutate({
      studentId: feeStudent._id,
      amount: parseFloat(feeAmount),
      month: feeMonth,
    });
  };

  const closeFeeModal = () => {
    setIsFeeModalOpen(false);
    setFeeStudent(null);
    setFeeSuccess(null);
    setFeeAmount("");
    setFeeMonth("");
  };

  return (
    <DashboardLayout title="Students">
      <HeaderBanner
        title="Student Management"
        subtitle={hasActiveFilter ? `Total Students: ${students.length} | Active: ${students.filter((s: any) => s.status === "active").length}` : "Use filters to find students"}
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

          {/* Teacher Filter - First */}
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-[170px] bg-background">
              <SelectValue placeholder="All Teachers" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map((t: any) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Session Filter */}
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
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls: any) => (
                <SelectItem key={cls._id} value={cls._id}>
                  {cls.classTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subject Filter (replaces the old Group filter) */}
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub.charAt(0).toUpperCase() + sub.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time Slot Filter */}
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="All Time Slots" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Time Slots</SelectItem>
              {timeSlots.map((slot: string) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Fee Status Filter */}
          <Select value={feeStatusFilter} onValueChange={setFeeStatusFilter}>
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="All Fee Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Fee Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Students Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-shadow overflow-hidden">
        {!hasActiveFilter ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-semibold text-lg">
              Select a filter to view students
            </p>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
              Use the filters above to find students by teacher, session, class, subject, time slot, fee status, or search by name.
            </p>
          </div>
        ) : isLoading ? (
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
              No students match the selected filters. Try adjusting your criteria.
            </p>
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
              {students && students.length > 0 ? (
                students.map((student: any) => {
                  try {
                    const initials = getInitials(student?.studentName || "NA");
                    const photoSrc = resolveStudentPhotoSrc(student);
                    const subjects = student?.subjects || [];

                    return (
                      <TableRow
                        key={student?._id || Math.random()}
                        className="hover:bg-secondary/50"
                      >
                        <TableCell className="font-medium font-mono text-xs text-muted-foreground">
                          {student.studentId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => openStudentQuickActions(student)}
                              className="h-10 w-10 shrink-0 rounded-full overflow-hidden shadow-md border border-slate-200"
                              title="Open profile/report actions"
                            >
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={student?.studentName || "Student"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-sky-500 text-white font-bold text-sm">
                                  {initials}
                                </div>
                              )}
                            </button>
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
                              onClick={() =>
                                generatePDF(student._id, "reprint")
                              }
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
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => handleEdit(student)}
                              title="Edit Student"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {student.studentStatus !== "Withdrawn" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-amber-50 hover:text-amber-600"
                                onClick={() => handleWithdraw(student)}
                                disabled={withdrawStudentMutation.isPending}
                                title="Withdraw Student"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  } catch (error) {
                    console.error(
                      "Error rendering student row:",
                      student,
                      error,
                    );
                    return null;
                  }
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <p className="text-muted-foreground">
                      No students to display
                    </p>
                  </TableCell>
                </TableRow>
              )}
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

      <WithdrawStudentDialog
        open={isWithdrawDialogOpen}
        onOpenChange={setIsWithdrawDialogOpen}
        onConfirm={confirmWithdraw}
        studentName={selectedStudent?.studentName || ""}
        studentId={selectedStudent?.studentId || ""}
        studentDbId={selectedStudent?._id || ""}
        paidAmount={selectedStudent?.paidAmount || 0}
        isProcessing={withdrawStudentMutation.isPending}
      />

      {/* Quick actions from student photo click */}
      <Dialog
        open={isStudentQuickActionsOpen}
        onOpenChange={setIsStudentQuickActionsOpen}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Open Student View</DialogTitle>
            <DialogDescription>
              Choose where to open this student.
            </DialogDescription>
          </DialogHeader>
          {quickActionStudent && (
            <div className="rounded-lg border p-3 bg-slate-50 text-sm">
              <p className="font-semibold">{quickActionStudent.studentName}</p>
              <p className="text-muted-foreground">
                ID: {quickActionStudent.studentId || "N/A"}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                if (!quickActionStudent?._id) return;
                setIsStudentQuickActionsOpen(false);
                navigate(`/students/${quickActionStudent._id}`);
              }}
            >
              Open Student Profile
            </Button>
            <Button
              onClick={() => {
                if (!quickActionStudent?._id) return;
                setIsStudentQuickActionsOpen(false);
                navigate(`/reports?tab=student&studentId=${quickActionStudent._id}`);
              }}
            >
              Open Student Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee Collection Modal — Perfected */}
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
              {feeStudent
                ? `Collecting fee for ${feeStudent?.studentName || "Student"} (${feeStudent?.studentId || "N/A"})`
                : "Loading student information..."}
            </DialogDescription>
          </DialogHeader>

          {feeSuccess ? (
            /* ========== SUCCESS STATE ========== */
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircle className="h-20 w-20 text-green-500 mb-3" />
                <h3 className="text-xl font-bold text-green-700">Fee Collected!</h3>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Amount Collected</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">
                    Rs. {feeSuccess?.feeRecord?.amount?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Collection Month</span>
                  <span className="font-semibold text-foreground">
                    {feeSuccess?.feeRecord?.month || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Receipt</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {feeSuccess?.feeRecord?.receiptNumber || "N/A"}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={closeFeeModal} className="w-full bg-green-600 hover:bg-green-700">
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* ========== COLLECTION FORM ========== */
            <div className="space-y-4">
              {/* Student Financial Summary */}
              {feeStudent && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Fee</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        Rs. {Number(feeStudent.totalFee || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Paid Amount</p>
                      <p className="font-semibold text-green-700 dark:text-green-300">
                        Rs. {Number(feeStudent.paidAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-muted-foreground mb-1">Remaining Balance</p>
                      <p className="font-bold text-lg text-purple-700 dark:text-purple-300">
                        Rs. {Math.max(0, Number(feeStudent.totalFee || 0) - Number(feeStudent.paidAmount || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collection Month — Read-only, auto-set to current month */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Collection Month</Label>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">{feeMonth}</span>
                  <span className="ml-auto text-xs text-muted-foreground">(Current Month)</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="feeAmount">Amount (Rs.)</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  placeholder="Enter fee amount"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  min={0}
                  max={feeStudent ? Math.max(0, (feeStudent.totalFee || 0) - (feeStudent.paidAmount || 0)) : undefined}
                />
                {feeAmount && feeStudent && parseFloat(feeAmount) > Math.max(0, (feeStudent.totalFee || 0) - (feeStudent.paidAmount || 0)) && (
                  <p className="text-xs text-red-600 font-medium">
                    Amount exceeds remaining balance of Rs. {Math.max(0, (feeStudent.totalFee || 0) - (feeStudent.paidAmount || 0)).toLocaleString()}
                  </p>
                )}
              </div>

              {/* 70/30 Split Note */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                <p className="text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Fee will be automatically split:
                </p>
                <ul className="mt-1 text-blue-600 dark:text-blue-400 text-xs space-y-0.5">
                  <li>• 70% → Teacher's Unverified Balance</li>
                  <li>• 30% → Academy's Unverified Balance</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeFeeModal}>
                  Cancel
                </Button>
                <Button
                  onClick={submitFeeCollection}
                  disabled={
                    !feeAmount ||
                    parseFloat(feeAmount) <= 0 ||
                    (feeStudent && parseFloat(feeAmount) > Math.max(0, (feeStudent.totalFee || 0) - (feeStudent.paidAmount || 0))) ||
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
