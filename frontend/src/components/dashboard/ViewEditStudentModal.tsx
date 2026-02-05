import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  DollarSign,
  Loader2,
  Eye,
  Edit,
  BookOpen,
  Phone,
} from "lucide-react";
import { studentApi } from "@/lib/api";
import { toast } from "sonner";

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};
const API_BASE_URL = getApiBaseUrl();

interface ViewEditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: any | null;
  mode: "view" | "edit";
}

interface ClassInstance {
  _id: string;
  classTitle: string;
  gradeLevel: string;
  group: string;
  days: string[];
  startTime: string;
  endTime: string;
}

// Subject options
const premedSubjects = [
  { id: "biology", label: "Biology" },
  { id: "chemistry", label: "Chemistry" },
  { id: "physics", label: "Physics" },
  { id: "english", label: "English" },
];

const preengSubjects = [
  { id: "physics", label: "Physics" },
  { id: "chemistry", label: "Chemistry" },
  { id: "math", label: "Mathematics" },
  { id: "english", label: "English" },
];

export const ViewEditStudentModal = ({
  open,
  onOpenChange,
  student,
  mode: initialMode,
}: ViewEditStudentModalProps) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);

  // Form State - Personal
  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(""); // NEW: For class dropdown
  const [group, setGroup] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [parentCell, setParentCell] = useState("");
  const [studentCell, setStudentCell] = useState("");
  const [address, setAddress] = useState("");
  const [admissionDate, setAdmissionDate] = useState("");

  // Form State - Financial
  const [totalFee, setTotalFee] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [balance, setBalance] = useState(0);

  // Fetch active classes for the dropdown
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ["active-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/classes`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
    enabled: open, // Only fetch when modal is open
  });

  const activeClasses: ClassInstance[] = classesData?.data || [];

  // TASK 3: Real-time Status Preview - calculate live as user types
  const calculatePreviewStatus = (): "paid" | "partial" | "pending" => {
    const total = Number(totalFee) || 0;
    const paid = Number(paidAmount) || 0;

    // Mirror exact backend logic
    if (total === 0 || paid === 0) {
      return "pending";
    } else if (total > 0 && paid >= total) {
      return "paid";
    } else if (total > 0 && paid > 0) {
      return "partial";
    }
    return "pending";
  };

  const previewStatus = calculatePreviewStatus();

  // Get available subjects based on group
  const availableSubjects =
    group === "Pre-Medical"
      ? premedSubjects
      : group === "Pre-Engineering"
        ? preengSubjects
        : [];

  // Populate form when student data changes
  useEffect(() => {
    if (student && open) {
      setStudentName(student.studentName || "");
      setFatherName(student.fatherName || "");
      setStudentClass(student.class || "");
      setGroup(student.group || "");

      // BUGFIX: Handle classRef - could be a populated object or just a string ID
      // If it's an object with _id, use that. If it's a string, use it directly.
      if (student.classRef) {
        const classId =
          typeof student.classRef === "object"
            ? student.classRef._id
            : student.classRef;
        setSelectedClassId(classId || "");
      } else {
        setSelectedClassId("");
      }

      // BUGFIX: Handle subjects as objects {name, fee} or strings
      const subjectNames = (student.subjects || []).map((s: any) =>
        typeof s === "string" ? s.toLowerCase() : s.name.toLowerCase(),
      );
      setSubjects(subjectNames);

      setParentCell(student.parentCell || "");
      setStudentCell(student.studentCell || "");
      setAddress(student.address || "");
      setAdmissionDate(
        student.admissionDate ? student.admissionDate.split("T")[0] : "",
      );
      setTotalFee(String(student.totalFee || ""));
      setPaidAmount(String(student.paidAmount || ""));
    }
  }, [student, open]);

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Auto-calculate balance when fees change
  useEffect(() => {
    const total = Number(totalFee) || 0;
    const paid = Number(paidAmount) || 0;
    setBalance(total - paid);
  }, [totalFee, paidAmount]);

  // Handle subject toggle
  const handleSubjectToggle = (subjectId: string) => {
    if (mode === "view") return;
    setSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((s) => s !== subjectId)
        : [...prev, subjectId],
    );
  };

  // Update mutation
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      studentApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] }); // Update class revenue stats
      queryClient.invalidateQueries({ queryKey: ["finance"] }); // Update finance dashboard
      toast.success(`${data.data.studentName} has been updated successfully.`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Could not update student.");
    },
  });

  const handleSave = () => {
    if (!student?._id) return;

    // Transform subjects array: ensure we send objects with {name, fee}
    const subjectsWithFees = subjects.map((subjectName: string) => {
      // Try to find the fee from the original student subjects
      const originalSubject = (student.subjects || []).find((s: any) => {
        const sName = typeof s === "string" ? s : s?.name;
        return sName?.toLowerCase() === subjectName.toLowerCase();
      });

      const fee =
        typeof originalSubject === "object" ? originalSubject?.fee || 0 : 0;

      return {
        name: subjectName,
        fee: fee,
      };
    });

    const studentData = {
      studentName,
      fatherName,
      class: studentClass,
      classRef: selectedClassId || undefined, // Include the class reference ID
      group,
      subjects: subjectsWithFees, // Send objects with {name, fee} instead of just strings
      parentCell,
      studentCell: studentCell || undefined,
      address: address || undefined,
      admissionDate,
      totalFee: Number(totalFee) || 0,
      paidAmount: Number(paidAmount) || 0,
    };

    console.log("Saving student with data:", studentData);
    updateStudentMutation.mutate({ id: student._id, data: studentData });
  };

  const isReadOnly = mode === "view";

  // Helper to check if value is placeholder
  const isPlaceholder = (value: string) => value === "To be updated";

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // View Mode Data Row Component
  const DataRow = ({
    label,
    value,
    isPlaceholderValue = false,
  }: {
    label: string;
    value: string;
    isPlaceholderValue?: boolean;
  }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`font-medium ${isPlaceholderValue ? "italic text-slate-400 text-sm" : "text-foreground"}`}
      >
        {value || "—"}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-card border-border text-foreground max-h-[90vh] overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-sky-500 scrollbar-track-slate-100 dark:scrollbar-track-slate-800">
        {/* TASK 2: Hero Header with Student ID - moved left to clear X button */}
        <div className="relative bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
          {/* Student ID Pill - Top Right with margin for X button */}
          {student?.studentId && (
            <div className="absolute top-4 right-12">
              <span className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 text-white font-mono text-base font-bold tracking-wide shadow-lg shadow-sky-500/25">
                {student.studentId}
              </span>
            </div>
          )}

          {/* Title & Description */}
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 dark:bg-sky-900/50 p-2.5 rounded-xl">
              {mode === "view" ? (
                <Eye className="h-5 w-5 text-sky-600" />
              ) : (
                <Edit className="h-5 w-5 text-sky-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {mode === "view" ? "Student Details" : "Edit Student"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {mode === "view"
                  ? "View student information and fee details"
                  : "Update student information and fee details"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* TASK 3: View Mode - Clean Data Display Rows */}
          {isReadOnly ? (
            <>
              {/* Personal Information - View Mode */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Personal Information
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4">
                  <DataRow label="Student Name" value={studentName} />
                  <DataRow
                    label="Father's Name"
                    value={fatherName}
                    isPlaceholderValue={isPlaceholder(fatherName)}
                  />
                  <DataRow label="Class" value={studentClass} />
                  <DataRow label="Group" value={group} />
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-sm text-muted-foreground">
                      Admission Date
                    </span>
                    <span className="font-medium text-foreground">
                      {formatDate(admissionDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information - View Mode */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Contact Information
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 px-4">
                  <DataRow label="Parent Cell No." value={parentCell} />
                  <DataRow
                    label="Student Cell No."
                    value={studentCell || "Not provided"}
                  />
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-sm text-muted-foreground">
                      Address
                    </span>
                    <span className="font-medium text-foreground text-right max-w-[250px] truncate">
                      {address || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subjects - View Mode */}
              {student?.subjects && student.subjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Enrolled Subjects
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.subjects.map((subject: any, index: number) => {
                      const subjectName =
                        typeof subject === "string" ? subject : subject.name;
                      return (
                        <span
                          key={index}
                          className="px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-sm font-medium border border-sky-200 dark:border-sky-800"
                        >
                          {subjectName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TASK 2: Financial Panel - View Mode (Horizontal 3-col) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Financial Summary
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Monthly Fee */}
                  <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Monthly Fee
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {Number(totalFee).toLocaleString() || "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">PKR</p>
                  </div>
                  {/* Paid Amount */}
                  <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Paid Amount
                    </p>
                    <p className="text-xl font-bold text-emerald-600">
                      {Number(paidAmount).toLocaleString() || "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">PKR</p>
                  </div>
                  {/* Balance - Color-coded background */}
                  <div
                    className={`rounded-xl border p-4 text-center ${
                      balance > 0
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Balance
                    </p>
                    <p
                      className={`text-xl font-bold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      {balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">PKR</p>
                  </div>
                </div>

                {/* Fee Status Badge */}
                {student?.feeStatus && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="text-sm text-muted-foreground">
                      Status:
                    </span>
                    <span
                      className={`
                                            px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                                            ${student.feeStatus === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
                                            ${student.feeStatus === "partial" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : ""}
                                            ${student.feeStatus === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}
                                        `}
                    >
                      {student.feeStatus}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode - Form Inputs */}
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-sky-600" />
                  <Label className="text-base font-medium">
                    Personal Information
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentName">Student Name</Label>
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input
                      id="fatherName"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className={`bg-background ${isPlaceholder(fatherName) ? "italic text-slate-400" : ""}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Class / Batch</Label>
                    {classesLoading ? (
                      <div className="flex items-center justify-center h-10 bg-background rounded-md border">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                      </div>
                    ) : (
                      <Select
                        value={selectedClassId}
                        onValueChange={(value) => {
                          setSelectedClassId(value);
                          // Also update the class display name for saving
                          const selectedClass = activeClasses.find(
                            (c) => c._id === value,
                          );
                          if (selectedClass) {
                            setStudentClass(selectedClass.classTitle);
                            setGroup(selectedClass.group || group);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select class/batch" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {activeClasses.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              No classes available
                            </div>
                          ) : (
                            activeClasses.map((classItem) => (
                              <SelectItem
                                key={classItem._id}
                                value={classItem._id}
                              >
                                {classItem.classTitle} ({classItem.gradeLevel})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">Group</Label>
                    <Select value={group} onValueChange={setGroup}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="Pre-Medical">Pre-Medical</SelectItem>
                        <SelectItem value="Pre-Engineering">
                          Pre-Engineering
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionDate">Admission Date</Label>
                    <Input
                      id="admissionDate"
                      type="date"
                      value={admissionDate}
                      onChange={(e) => setAdmissionDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-sky-600" />
                  <Label className="text-base font-medium">
                    Contact Information
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentCell">Parent Cell No.</Label>
                    <Input
                      id="parentCell"
                      value={parentCell}
                      onChange={(e) => setParentCell(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentCell">Student Cell No.</Label>
                    <Input
                      id="studentCell"
                      value={studentCell}
                      onChange={(e) => setStudentCell(e.target.value)}
                      placeholder="Optional"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Optional"
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Section */}
              {availableSubjects.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <Label className="text-base font-medium">Subjects</Label>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {availableSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:border-sky-500/50 transition-colors bg-card"
                        onClick={() => handleSubjectToggle(subject.id)}
                      >
                        <Checkbox
                          id={subject.id}
                          checked={subjects.includes(subject.id)}
                          className="text-sky-600"
                        />
                        <Label
                          htmlFor={subject.id}
                          className="font-normal text-sm cursor-pointer"
                        >
                          {subject.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TASK 2: Financial Panel - Edit Mode (Horizontal 3-col) */}
              <div className="space-y-4 bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-200 dark:border-sky-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-sky-600" />
                  <Label className="text-base font-medium">
                    Financial Details
                  </Label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="totalFee"
                      className="text-sm text-muted-foreground"
                    >
                      Monthly Fee (PKR)
                    </Label>
                    <Input
                      id="totalFee"
                      type="number"
                      value={totalFee}
                      onChange={(e) => setTotalFee(e.target.value)}
                      placeholder="0"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="paidAmount"
                      className="text-sm text-muted-foreground"
                    >
                      Paid Amount (PKR)
                    </Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Balance (PKR)
                    </Label>
                    <div
                      className={`h-10 flex items-center justify-center rounded-md border font-bold text-lg ${
                        balance > 0
                          ? "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800"
                          : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800"
                      }`}
                    >
                      {balance.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* TASK 3: Real-time Fee Status Preview Badge */}
                <div className="flex items-center gap-2 pt-3 border-t border-sky-200 dark:border-sky-800">
                  <span className="text-sm text-muted-foreground">
                    Status Preview:
                  </span>
                  <span
                    className={`
                                        px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200
                                        ${previewStatus === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
                                        ${previewStatus === "partial" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : ""}
                                        ${previewStatus === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""}
                                    `}
                  >
                    {previewStatus}
                  </span>
                  <span className="text-xs text-muted-foreground italic">
                    (Live preview)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {mode === "view" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => setMode("edit")}
                className="bg-sky-600 text-white hover:bg-sky-700"
                style={{ borderRadius: "0.75rem" }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Student
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  mode === "edit" && student
                    ? setMode("view")
                    : onOpenChange(false)
                }
                disabled={updateStudentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateStudentMutation.isPending}
                className="bg-sky-600 text-white hover:bg-sky-700"
                style={{ borderRadius: "0.75rem" }}
              >
                {updateStudentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
