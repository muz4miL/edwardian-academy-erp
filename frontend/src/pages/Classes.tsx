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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Users,
  User,
  Calendar,
  Clock,
  Crown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classApi, settingsApi, teacherApi } from "@/lib/api";
import { toast } from "sonner";

// Group options (Academic streams - matches backend enum)
const groupOptions = [
  "Pre-Medical",
  "Pre-Engineering",
  "Computer Science",
  "Arts",
];

// Shift options (Optional timing categories - matches backend enum)
const shiftOptions = [
  "Morning",
  "Evening",
  "Weekend",
  "Batch A",
  "Batch B",
  "Batch C",
];

// Grade level options (enum from backend)
const gradeLevelOptions = [
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "MDCAT Prep",
  "ECAT Prep",
  "Tuition Classes",
];

// Days of week for schedule
const daysOfWeek = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
  { value: "Sun", label: "Sun" },
];

// Type for subject with fee
interface SubjectWithFee {
  name: string;
  fee: number;
}

// Type for subject-teacher mapping
interface SubjectTeacherMap {
  subject: string;
  teacherId: string;
  teacherName: string;
}

const Classes = () => {
  const queryClient = useQueryClient();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Form states - Class Instance fields
  const [formClassTitle, setFormClassTitle] = useState("");
  const [formGradeLevel, setFormGradeLevel] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formShift, setFormShift] = useState("");
  const [formSubjects, setFormSubjects] = useState<SubjectWithFee[]>([]);
  const [formSubjectTeachers, setFormSubjectTeachers] = useState<
    SubjectTeacherMap[]
  >([]);
  const [formStatus, setFormStatus] = useState("active");
  const [formAssignedTeacher, setFormAssignedTeacher] = useState(""); // Class In-Charge (Form Master)

  // Schedule fields
  const [formDays, setFormDays] = useState<string[]>([]);
  const [formStartTime, setFormStartTime] = useState("16:00");
  const [formEndTime, setFormEndTime] = useState("18:00");
  const [formRoomNumber, setFormRoomNumber] = useState("");

  // Fetch teachers for dropdown
  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.getAll(),
  });

  const teachers = teachersData?.data || [];

  // Partner teacher names (auto-set to partner mode)
  const partnerNames = ["waqar", "zahid", "saud"];

  // TASK 3: Fetch global subject fees from Settings (Configuration)
  const {
    data: settingsData,
    refetch: refetchSettings,
    isLoading: isLoadingSettings,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: "always", // Refetch every time component mounts
  });

  // 🔍 COMPREHENSIVE DEBUG LOGGING
  console.log("🔍 === SETTINGS DATA DEBUG ===");
  console.log("Full settingsData object:", settingsData);
  console.log("settingsData.data:", settingsData?.data);
  console.log(
    "settingsData.data.defaultSubjectFees:",
    settingsData?.data?.defaultSubjectFees,
  );
  console.log("Is Loading Settings?", isLoadingSettings);
  console.log("=================================");

  const globalSubjectFees = settingsData?.data?.defaultSubjectFees || [];

  // Transform global subjects to subject options format
  const subjectOptions = globalSubjectFees.map((subject: any) => ({
    id: subject.name,
    label: subject.name,
    defaultFee: subject.fee,
  }));

  // Debug log
  console.log("📚 Global Subject Fees loaded:", {
    count: globalSubjectFees.length,
    subjects: globalSubjectFees,
    subjectOptions: subjectOptions,
  });

  // Fetch classes
  const { data, isLoading, isError } = useQuery({
    queryKey: ["classes", { status: statusFilter, search: searchTerm }],
    queryFn: () =>
      classApi.getAll({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchTerm || undefined,
      }),
  });

  const classes = data?.data || [];

  // Create mutation
  const createClassMutation = useMutation({
    mutationFn: classApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class Instance Created", {
        description: `"${data.data.classTitle}" has been created and added to timetable.`,
      });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      // Handle schedule conflict error (409)
      if (error.message?.includes("Schedule Conflict")) {
        toast.error("Schedule Conflict!", {
          description: error.message,
          duration: 6000,
        });
      } else {
        toast.error("Failed to create class", { description: error.message });
      }
    },
  });

  // Update mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      classApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class Instance Updated", {
        description: `"${data.data.classTitle}" has been updated.`,
      });
      resetForm();
      setIsEditModalOpen(false);
      setSelectedClass(null);
    },
    onError: (error: any) => {
      // Handle schedule conflict error (409)
      if (error.message?.includes("Schedule Conflict")) {
        toast.error("Schedule Conflict!", {
          description: error.message,
          duration: 6000,
        });
      } else {
        toast.error("Failed to update class", { description: error.message });
      }
    },
  });

  // Delete mutation
  const deleteClassMutation = useMutation({
    mutationFn: classApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class Deleted", {
        description: "Class has been removed successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedClass(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete class", { description: error.message });
    },
  });

  // Reset form
  const resetForm = () => {
    setFormClassTitle("");
    setFormGradeLevel("");
    setFormGroup("");
    setFormShift("");
    setFormSubjects([]);
    setFormSubjectTeachers([]);
    setFormStatus("active");
    setFormAssignedTeacher("");
    // Schedule fields
    setFormDays([]);
    setFormStartTime("16:00");
    setFormEndTime("18:00");
    setFormRoomNumber("");
  };

  // Populate form for edit
  const populateFormForEdit = (classDoc: any) => {
    setFormClassTitle(classDoc.classTitle || "");
    setFormGradeLevel(classDoc.gradeLevel || classDoc.className || "");
    setFormGroup(classDoc.group || "");
    setFormShift(classDoc.shift || "");
    // Handle both old (string[]) and new (SubjectWithFee[]) format
    const subjects = (classDoc.subjects || []).map((s: any) => {
      if (typeof s === "string") {
        return { name: s, fee: 0 };
      }
      return { name: s.name, fee: 0 };
    });
    setFormSubjects(subjects);
    // Load subject-teacher mappings
    const subjectTeachers = (classDoc.subjectTeachers || []).map((st: any) => ({
      subject: st.subject,
      teacherId: st.teacherId?._id || st.teacherId || "",
      teacherName: st.teacherName || "",
    }));
    setFormSubjectTeachers(subjectTeachers);
    setFormStatus(classDoc.status || "active");
    setFormAssignedTeacher(
      classDoc.assignedTeacher?._id || classDoc.assignedTeacher || "",
    );
    // Schedule fields
    setFormDays(classDoc.days || []);
    setFormStartTime(classDoc.startTime || "16:00");
    setFormEndTime(classDoc.endTime || "18:00");
    setFormRoomNumber(classDoc.roomNumber || "");
  };

  // Handlers
  const handleEdit = (classDoc: any) => {
    setSelectedClass(classDoc);
    populateFormForEdit(classDoc);
    setIsEditModalOpen(true);
  };

  const handleDelete = (classDoc: any) => {
    setSelectedClass(classDoc);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = () => {
    // Validate required fields
    if (!formClassTitle || !formGradeLevel || !formGroup) {
      toast.error("Missing required fields", {
        description: "Please fill in Class Title, Grade Level, and Group.",
      });
      return;
    }

    if (!formDays.length || !formStartTime || !formEndTime) {
      toast.error("Missing schedule", {
        description: "Please select days and set start/end times.",
      });
      return;
    }

    // Validate that all selected subjects have a teacher assigned
    const subjectsWithoutTeacher = formSubjects.filter(
      (s) =>
        !formSubjectTeachers.find(
          (st) => st.subject === s.name && st.teacherId,
        ),
    );
    if (subjectsWithoutTeacher.length > 0) {
      toast.error("Missing subject teachers", {
        description: `Please assign teachers for: ${subjectsWithoutTeacher.map((s) => s.name).join(", ")}`,
      });
      return;
    }

    // Get teacher name for denormalization (Class In-Charge)
    const selectedTeacher = teachers.find(
      (t: any) => t._id === formAssignedTeacher,
    );

    // Send only subject names (fees looked up from Master Pricing at invoice time)
    const subjectNames = formSubjects.map((s) => ({ name: s.name, fee: 0 }));

    createClassMutation.mutate({
      classTitle: formClassTitle,
      gradeLevel: formGradeLevel,
      group: formGroup,
      shift: formShift || undefined,
      subjects: subjectNames,
      subjectTeachers: formSubjectTeachers.filter((st) => st.teacherId), // Only send valid mappings
      status: formStatus,
      assignedTeacher: formAssignedTeacher || undefined,
      teacherName: selectedTeacher?.name || undefined,
      // Schedule fields
      days: formDays,
      startTime: formStartTime,
      endTime: formEndTime,
      roomNumber: formRoomNumber || "TBD",
    });
  };

  const handleSubmitEdit = () => {
    if (!selectedClass?._id) return;

    // Validate that all selected subjects have a teacher assigned
    const subjectsWithoutTeacher = formSubjects.filter(
      (s) =>
        !formSubjectTeachers.find(
          (st) => st.subject === s.name && st.teacherId,
        ),
    );
    if (subjectsWithoutTeacher.length > 0) {
      toast.error("Missing subject teachers", {
        description: `Please assign teachers for: ${subjectsWithoutTeacher.map((s) => s.name).join(", ")}`,
      });
      return;
    }

    // Get teacher name for denormalization (Class In-Charge)
    const selectedTeacher = teachers.find(
      (t: any) => t._id === formAssignedTeacher,
    );

    // Send only subject names (fees looked up from Master Pricing at invoice time)
    const subjectNames = formSubjects.map((s) => ({ name: s.name, fee: 0 }));

    updateClassMutation.mutate({
      id: selectedClass._id,
      data: {
        classTitle: formClassTitle,
        gradeLevel: formGradeLevel,
        group: formGroup,
        shift: formShift || undefined,
        subjects: subjectNames,
        subjectTeachers: formSubjectTeachers.filter((st) => st.teacherId), // Only send valid mappings
        status: formStatus,
        assignedTeacher: formAssignedTeacher || undefined,
        teacherName: selectedTeacher?.name || undefined,
        // Schedule fields
        days: formDays,
        startTime: formStartTime,
        endTime: formEndTime,
        roomNumber: formRoomNumber || "TBD",
      },
    });
  };

  // Handle teacher selection (simplified - no revenue mode UI)
  const handleTeacherChange = (teacherId: string) => {
    setFormAssignedTeacher(teacherId);
  };

  // Toggle subject selection - also manages subject-teacher mapping
  const handleSubjectToggle = (subjectId: string) => {
    const exists = formSubjects.find((s) => s.name === subjectId);
    if (exists) {
      // Remove subject and its teacher mapping
      setFormSubjects((prev) => prev.filter((s) => s.name !== subjectId));
      setFormSubjectTeachers((prev) =>
        prev.filter((st) => st.subject !== subjectId),
      );
    } else {
      // Add subject
      setFormSubjects((prev) => [
        ...prev,
        {
          name: subjectId,
          fee: 0, // Fee looked up from Master Pricing at invoice time
        },
      ]);
    }
  };

  // Handle subject-specific teacher selection
  const handleSubjectTeacherChange = (
    subjectName: string,
    teacherId: string,
  ) => {
    const selectedTeacher = teachers.find((t: any) => t._id === teacherId);
    setFormSubjectTeachers((prev) => {
      const existing = prev.find((st) => st.subject === subjectName);
      if (existing) {
        // Update existing mapping
        return prev.map((st) =>
          st.subject === subjectName
            ? { ...st, teacherId, teacherName: selectedTeacher?.name || "" }
            : st,
        );
      } else {
        // Add new mapping
        return [
          ...prev,
          {
            subject: subjectName,
            teacherId,
            teacherName: selectedTeacher?.name || "",
          },
        ];
      }
    });
  };

  // Get teacher ID for a specific subject
  const getSubjectTeacherId = (subjectName: string): string => {
    return (
      formSubjectTeachers.find((st) => st.subject === subjectName)?.teacherId ||
      ""
    );
  };

  // Get teachers filtered by subject (for dropdown)
  const getTeachersForSubject = (subjectName: string) => {
    const subjectLower = subjectName.toLowerCase();
    return teachers.filter((t: any) => {
      const teacherSubject = (t.subject || "").toLowerCase();
      return t.status === "active" && teacherSubject === subjectLower;
    });
  };

  // Check if subject is selected
  const isSubjectSelected = (subjectId: string) => {
    return formSubjects.some((s) => s.name === subjectId);
  };

  // Calculate stats
  const activeClasses = classes.filter(
    (c: any) => c.status === "active",
  ).length;
  const totalStudents = classes.reduce(
    (sum: number, c: any) => sum + (c.studentCount || 0),
    0,
  );

  // Helper to display subjects in table (names only)
  const getSubjectDisplay = (classDoc: any) => {
    const subjects = classDoc.subjects || [];
    return subjects.slice(0, 2).map((s: any) => {
      const name = typeof s === "string" ? s : s.name;
      return { name };
    });
  };

  return (
    <DashboardLayout title="Classes">
      <HeaderBanner
        title="Class Management"
        subtitle={`Total Classes: ${classes.length} | Active: ${activeClasses}`}
      >
        <Button
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          style={{ borderRadius: "0.75rem" }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </HeaderBanner>

      {/* Stats Cards */}
      <div className="grid gap-4 mt-6 md:grid-cols-3">
        <div
          className="rounded-xl border border-border bg-card p-4 card-shadow"
          style={{ borderRadius: "0.75rem" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
              <BookOpen className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {classes.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Classes</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border border-border bg-card p-4 card-shadow"
          style={{ borderRadius: "0.75rem" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalStudents}
              </p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl border border-border bg-card p-4 card-shadow"
          style={{ borderRadius: "0.75rem" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {activeClasses}
              </p>
              <p className="text-sm text-muted-foreground">Active Classes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4 card-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center p-12 text-destructive">
            Error loading classes. Please try again.
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-50" />
            <p>No classes found. Add your first class!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Class</TableHead>
                <TableHead className="font-semibold">Group / Shift</TableHead>
                <TableHead className="font-semibold">Subjects</TableHead>
                <TableHead className="font-semibold text-center">
                  Students
                </TableHead>
                <TableHead className="font-semibold text-center">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classDoc: any) => {
                const subjectDisplays = getSubjectDisplay(classDoc);
                const totalFee =
                  (classDoc.subjects || []).reduce((s: number, sub: any) => {
                    if (typeof sub === "object" && sub.fee) return s + sub.fee;
                    return s;
                  }, 0) ||
                  classDoc.baseFee ||
                  0;

                return (
                  <TableRow
                    key={classDoc._id}
                    className="hover:bg-secondary/50"
                  >
                    <TableCell>
                      <span className="font-mono text-sm text-sky-600 font-semibold">
                        {classDoc.classId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {classDoc.classTitle ||
                            `${classDoc.gradeLevel} - ${classDoc.group}${classDoc.shift ? ` (${classDoc.shift})` : ""}`}
                        </span>
                        {classDoc.gradeLevel && (
                          <span className="text-xs text-muted-foreground">
                            {classDoc.gradeLevel}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                          {classDoc.group}
                        </span>
                        {classDoc.shift && (
                          <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                            {classDoc.shift}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subjectDisplays.map((subject: any) => (
                          <span
                            key={subject.name}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs capitalize"
                          >
                            {subject.name}
                          </span>
                        ))}
                        {(classDoc.subjects || []).length > 2 && (
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                            +{classDoc.subjects.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {/* TASK 2: Student Count */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-sky-600">
                          {classDoc.studentCount || 0}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          enrolled
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        status={
                          classDoc.status === "active" ? "active" : "inactive"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleEdit(classDoc)}
                          title="Edit Class"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(classDoc)}
                          disabled={deleteClassMutation.isPending}
                          title="Delete Class"
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

      {/* Add Class Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-sky-100 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-sky-600" />
              </div>
              Add New Class
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new class with individual subject pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Class Title - Primary Identifier */}
            <div className="space-y-2">
              <Label className="font-semibold">
                Class Title *{" "}
                <span className="text-xs text-muted-foreground">
                  (Unique identifier)
                </span>
              </Label>
              <Input
                placeholder="e.g., 10th Medical Batch A"
                value={formClassTitle}
                onChange={(e) => setFormClassTitle(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade Level *</Label>
                <Select
                  value={formGradeLevel}
                  onValueChange={setFormGradeLevel}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevelOptions.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group *</Label>
                <Select value={formGroup} onValueChange={setFormGroup}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
              <Label className="font-semibold text-blue-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule *
              </Label>

              {/* Days Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Select Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        if (formDays.includes(day.value)) {
                          setFormDays(formDays.filter((d) => d !== day.value));
                        } else {
                          setFormDays([...formDays, day.value]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formDays.includes(day.value)
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Room</Label>
                  <Input
                    placeholder="e.g., Room 1"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Assigned Professor (Class In-Charge / Form Master) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Class In-Charge (Form Master)
              </Label>
              <Select
                value={formAssignedTeacher}
                onValueChange={handleTeacherChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select form master (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter((t: any) => t.status === "active")
                    .map((teacher: any) => (
                      <SelectItem key={teacher._id} value={teacher._id}>
                        <span className="flex items-center gap-2">
                          {teacher.name}
                          {partnerNames.some((name) =>
                            teacher.name?.toLowerCase().includes(name),
                          ) && <Crown className="h-3 w-3 text-yellow-500" />}
                          <span className="text-xs text-muted-foreground capitalize">
                            ({teacher.subject})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                For administrative purposes. Subject-wise teachers are assigned
                below.
              </p>
            </div>

            {/* Subjects Selection with Teacher Assignment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subjects
                </Label>
                {formSubjects.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formSubjects.length} subject
                    {formSubjects.length !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>

              {/* Subject Checkboxes with Teacher Dropdown */}
              {subjectOptions.length > 0 ? (
                <div className="space-y-2">
                  {subjectOptions.map((subject) => {
                    const isSelected = isSubjectSelected(subject.id);
                    const availableTeachers = getTeachersForSubject(subject.id);
                    const selectedTeacherId = getSubjectTeacherId(subject.id);

                    return (
                      <div
                        key={subject.id}
                        className={`rounded-lg border transition-all ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/50"
                            : "border-border hover:border-sky-300"
                        }`}
                      >
                        {/* Subject Checkbox Row */}
                        <div
                          onClick={() => handleSubjectToggle(subject.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            )}
                          </div>

                          {/* Subject Name */}
                          <span
                            className={`text-sm font-medium flex-1 ${
                              isSelected ? "text-sky-700" : "text-foreground"
                            }`}
                          >
                            {subject.label}
                          </span>

                          {/* Teacher count indicator */}
                          {isSelected && (
                            <span className="text-xs text-muted-foreground">
                              {availableTeachers.length} teacher
                              {availableTeachers.length !== 1 ? "s" : ""}{" "}
                              available
                            </span>
                          )}
                        </div>

                        {/* Teacher Dropdown (shown when subject is selected) */}
                        {isSelected && (
                          <div className="px-3 pb-3 pt-0">
                            <div className="flex items-center gap-2 pl-8">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <Select
                                value={selectedTeacherId}
                                onValueChange={(value) =>
                                  handleSubjectTeacherChange(subject.id, value)
                                }
                              >
                                <SelectTrigger className="flex-1 h-9 bg-white">
                                  <SelectValue
                                    placeholder={`Select ${subject.label} Teacher`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTeachers.length > 0 ? (
                                    availableTeachers.map((teacher: any) => (
                                      <SelectItem
                                        key={teacher._id}
                                        value={teacher._id}
                                      >
                                        <span className="flex items-center gap-2">
                                          {teacher.name}
                                          {partnerNames.some((name) =>
                                            teacher.name
                                              ?.toLowerCase()
                                              .includes(name),
                                          ) && (
                                            <Crown className="h-3 w-3 text-yellow-500" />
                                          )}
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                      No {subject.label} teachers found.
                                      <br />
                                      <span className="text-xs">
                                        Add one in Teachers section.
                                      </span>
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            {!selectedTeacherId &&
                              availableTeachers.length > 0 && (
                                <p className="text-xs text-amber-600 mt-1 pl-8">
                                  ⚠️ Please assign a teacher for {subject.label}
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No subjects configured</p>
                  <p className="text-xs">
                    Add subjects in Configuration → Subjects & Pricing
                  </p>
                </div>
              )}

              {/* Empty State */}
              {subjectOptions.length > 0 && formSubjects.length === 0 && (
                <p className="text-xs text-amber-600 text-center">
                  Please select at least one subject
                </p>
              )}
            </div>

            {/* Status Selection */}
            <div className="flex justify-center">
              <div className="space-y-2 w-64">
                <Label className="text-center block">Class Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={createClassMutation.isPending}
              className="bg-sky-600 text-white hover:bg-sky-700"
              style={{ borderRadius: "0.75rem" }}
            >
              {createClassMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Class"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-sky-100 p-2 rounded-lg">
                <Edit className="h-5 w-5 text-sky-600" />
              </div>
              Edit Class
              {selectedClass?.classId && (
                <span className="ml-2 px-3 py-1 rounded-full bg-sky-600 text-white text-sm font-mono">
                  {selectedClass.classId}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update class information and subject pricing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Class Title - Primary Identifier */}
            <div className="space-y-2">
              <Label className="font-semibold">
                Class Title *{" "}
                <span className="text-xs text-muted-foreground">
                  (Unique identifier)
                </span>
              </Label>
              <Input
                placeholder="e.g., 10th Medical Batch A"
                value={formClassTitle}
                onChange={(e) => setFormClassTitle(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade Level *</Label>
                <Select
                  value={formGradeLevel}
                  onValueChange={setFormGradeLevel}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevelOptions.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group *</Label>
                <Select value={formGroup} onValueChange={setFormGroup}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
              <Label className="font-semibold text-blue-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule *
              </Label>

              {/* Days Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Select Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        if (formDays.includes(day.value)) {
                          setFormDays(formDays.filter((d) => d !== day.value));
                        } else {
                          setFormDays([...formDays, day.value]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formDays.includes(day.value)
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:border-blue-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Room</Label>
                  <Input
                    placeholder="e.g., Room 1"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Assigned Professor (Class In-Charge / Form Master) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Class In-Charge (Form Master)
              </Label>
              <Select
                value={formAssignedTeacher}
                onValueChange={handleTeacherChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select form master (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter((t: any) => t.status === "active")
                    .map((teacher: any) => (
                      <SelectItem key={teacher._id} value={teacher._id}>
                        <span className="flex items-center gap-2">
                          {teacher.name}
                          {partnerNames.some((name) =>
                            teacher.name?.toLowerCase().includes(name),
                          ) && <Crown className="h-3 w-3 text-yellow-500" />}
                          <span className="text-xs text-muted-foreground capitalize">
                            ({teacher.subject})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                For administrative purposes. Subject-wise teachers are assigned
                below.
              </p>
            </div>

            {/* Subjects Selection with Teacher Assignment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subjects
                </Label>
                {formSubjects.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formSubjects.length} subject
                    {formSubjects.length !== 1 ? "s" : ""} selected
                  </span>
                )}
              </div>

              {/* Subject Checkboxes with Teacher Dropdown */}
              {subjectOptions.length > 0 ? (
                <div className="space-y-2">
                  {subjectOptions.map((subject) => {
                    const isSelected = isSubjectSelected(subject.id);
                    const availableTeachers = getTeachersForSubject(subject.id);
                    const selectedTeacherId = getSubjectTeacherId(subject.id);

                    return (
                      <div
                        key={subject.id}
                        className={`rounded-lg border transition-all ${
                          isSelected
                            ? "border-sky-500 bg-sky-50/50"
                            : "border-border hover:border-sky-300"
                        }`}
                      >
                        {/* Subject Checkbox Row */}
                        <div
                          onClick={() => handleSubjectToggle(subject.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            )}
                          </div>

                          {/* Subject Name */}
                          <span
                            className={`text-sm font-medium flex-1 ${
                              isSelected ? "text-sky-700" : "text-foreground"
                            }`}
                          >
                            {subject.label}
                          </span>

                          {/* Teacher count indicator */}
                          {isSelected && (
                            <span className="text-xs text-muted-foreground">
                              {availableTeachers.length} teacher
                              {availableTeachers.length !== 1 ? "s" : ""}{" "}
                              available
                            </span>
                          )}
                        </div>

                        {/* Teacher Dropdown (shown when subject is selected) */}
                        {isSelected && (
                          <div className="px-3 pb-3 pt-0">
                            <div className="flex items-center gap-2 pl-8">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <Select
                                value={selectedTeacherId}
                                onValueChange={(value) =>
                                  handleSubjectTeacherChange(subject.id, value)
                                }
                              >
                                <SelectTrigger className="flex-1 h-9 bg-white">
                                  <SelectValue
                                    placeholder={`Select ${subject.label} Teacher`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTeachers.length > 0 ? (
                                    availableTeachers.map((teacher: any) => (
                                      <SelectItem
                                        key={teacher._id}
                                        value={teacher._id}
                                      >
                                        <span className="flex items-center gap-2">
                                          {teacher.name}
                                          {partnerNames.some((name) =>
                                            teacher.name
                                              ?.toLowerCase()
                                              .includes(name),
                                          ) && (
                                            <Crown className="h-3 w-3 text-yellow-500" />
                                          )}
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                      No {subject.label} teachers found.
                                      <br />
                                      <span className="text-xs">
                                        Add one in Teachers section.
                                      </span>
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            {!selectedTeacherId &&
                              availableTeachers.length > 0 && (
                                <p className="text-xs text-amber-600 mt-1 pl-8">
                                  ⚠️ Please assign a teacher for {subject.label}
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No subjects configured</p>
                  <p className="text-xs">
                    Add subjects in Configuration → Subjects & Pricing
                  </p>
                </div>
              )}

              {/* Empty State */}
              {subjectOptions.length > 0 && formSubjects.length === 0 && (
                <p className="text-xs text-amber-600 text-center">
                  Please select at least one subject
                </p>
              )}
            </div>

            {/* Status Selection */}
            <div className="flex justify-center">
              <div className="space-y-2 w-64">
                <Label className="text-center block">Class Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateClassMutation.isPending}
              className="bg-sky-600 text-white hover:bg-sky-700"
              style={{ borderRadius: "0.75rem" }}
            >
              {updateClassMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete Class Record?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-bold text-sky-600">
                {selectedClass?.className} - {selectedClass?.section}
              </span>{" "}
              <span className="font-mono text-sm text-muted-foreground">
                ({selectedClass?.classId})
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteClassMutation.isPending}
              className="border-border"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedClass?._id) {
                  deleteClassMutation.mutate(selectedClass._id);
                }
              }}
              disabled={deleteClassMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClassMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Class"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Classes;
