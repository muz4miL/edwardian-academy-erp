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
  DollarSign,
  Users,
  Crown,
  User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classApi, settingsApi, teacherApi } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

// Section options
const sectionOptions = [
  "Medical",
  "Engineering",
  "Morning",
  "Evening",
  "Weekend",
];

// Class name options
const classNameOptions = [
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "MDCAT Prep",
  "ECAT Prep",
];

// Type for subject with fee
interface SubjectWithFee {
  name: string;
  fee: number;
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

  // Form states
  const [formClassName, setFormClassName] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formSubjects, setFormSubjects] = useState<SubjectWithFee[]>([]);
  const [formBaseFee, setFormBaseFee] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formAssignedTeacher, setFormAssignedTeacher] = useState("");
  const [formRevenueMode, setFormRevenueMode] = useState<
    "standard" | "partner"
  >("standard");

  // Fetch teachers for dropdown
  const { data: teachersData } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.getAll(),
  });

  const teachers = teachersData?.data || [];

  // Partner teacher names (auto-set to partner mode)
  const partnerNames = ["waqar", "zahid", "saud"];

  // TASK 3: Fetch global subject fees from Settings
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  const globalSubjectFees = settingsData?.data?.defaultSubjectFees || [];

  // Transform global subjects to subject options format
  const subjectOptions = globalSubjectFees.map((subject: any) => ({
    id: subject.name,
    label: subject.name,
    defaultFee: subject.fee,
  }));

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
      toast.success("Class Created", {
        description: `${data.data.className} - ${data.data.section} has been created successfully.`,
      });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create class", { description: error.message });
    },
  });

  // Update mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      classApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class Updated", {
        description: `${data.data.className} - ${data.data.section} has been updated successfully.`,
      });
      resetForm();
      setIsEditModalOpen(false);
      setSelectedClass(null);
    },
    onError: (error: any) => {
      toast.error("Failed to update class", { description: error.message });
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
    setFormClassName("");
    setFormSection("");
    setFormSubjects([]);
    setFormBaseFee("");
    setFormStatus("active");
    setFormAssignedTeacher("");
    setFormRevenueMode("standard");
  };

  // Populate form for edit
  const populateFormForEdit = (classDoc: any) => {
    setFormClassName(classDoc.className || "");
    setFormSection(classDoc.section || "");
    // Handle both old (string[]) and new (SubjectWithFee[]) format
    const subjects = (classDoc.subjects || []).map((s: any) => {
      if (typeof s === "string") {
        return { name: s, fee: classDoc.baseFee || 0 };
      }
      return { name: s.name, fee: s.fee || 0 };
    });
    setFormSubjects(subjects);
    setFormBaseFee(String(classDoc.baseFee || ""));
    setFormStatus(classDoc.status || "active");
    setFormAssignedTeacher(classDoc.assignedTeacher || "");
    setFormRevenueMode(classDoc.revenueMode || "standard");
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
    if (!formClassName || !formSection) {
      toast.error("Missing required fields", {
        description: "Please fill in Class Name and Section.",
      });
      return;
    }

    // Get teacher name for denormalization
    const selectedTeacher = teachers.find(
      (t: any) => t._id === formAssignedTeacher,
    );

    createClassMutation.mutate({
      className: formClassName,
      section: formSection,
      subjects: formSubjects,
      baseFee: Number(formBaseFee) || 0,
      status: formStatus,
      assignedTeacher: formAssignedTeacher || undefined,
      teacherName: selectedTeacher?.name || undefined,
      revenueMode: formRevenueMode,
    });
  };

  const handleSubmitEdit = () => {
    if (!selectedClass?._id) return;

    // Get teacher name for denormalization
    const selectedTeacher = teachers.find(
      (t: any) => t._id === formAssignedTeacher,
    );

    updateClassMutation.mutate({
      id: selectedClass._id,
      data: {
        className: formClassName,
        section: formSection,
        subjects: formSubjects,
        baseFee: Number(formBaseFee) || 0,
        status: formStatus,
        assignedTeacher: formAssignedTeacher || undefined,
        teacherName: selectedTeacher?.name || undefined,
        revenueMode: formRevenueMode,
      },
    });
  };

  // Handle teacher selection - auto-set partner mode for partners
  const handleTeacherChange = (teacherId: string) => {
    setFormAssignedTeacher(teacherId);
    const selectedTeacher = teachers.find((t: any) => t._id === teacherId);
    if (selectedTeacher) {
      const isPartner = partnerNames.some((name) =>
        selectedTeacher.name?.toLowerCase().includes(name),
      );
      if (isPartner) {
        setFormRevenueMode("partner");
        toast.info(`${selectedTeacher.name} is a Partner`, {
          description: "Revenue mode automatically set to 100% Partner",
        });
      }
    }
  };

  // Toggle subject selection
  const handleSubjectToggle = (subjectId: string) => {
    const exists = formSubjects.find((s) => s.name === subjectId);
    if (exists) {
      setFormSubjects((prev) => prev.filter((s) => s.name !== subjectId));
    } else {
      const subjectOption = subjectOptions.find((s) => s.id === subjectId);
      setFormSubjects((prev) => [
        ...prev,
        {
          name: subjectId,
          fee: subjectOption?.defaultFee || Number(formBaseFee) || 0,
        },
      ]);
    }
  };

  // Update subject fee
  const handleSubjectFeeChange = (subjectName: string, fee: number) => {
    setFormSubjects((prev) =>
      prev.map((s) => (s.name === subjectName ? { ...s, fee } : s)),
    );
  };

  // Check if subject is selected
  const isSubjectSelected = (subjectId: string) => {
    return formSubjects.some((s) => s.name === subjectId);
  };

  // Get subject fee
  const getSubjectFee = (subjectId: string) => {
    const subject = formSubjects.find((s) => s.name === subjectId);
    return subject?.fee || 0;
  };

  // Calculate total subject fees
  const totalSubjectFees = formSubjects.reduce(
    (sum, s) => sum + (s.fee || 0),
    0,
  );

  // Calculate stats - TASK 2: Use real data from backend
  const activeClasses = classes.filter(
    (c: any) => c.status === "active",
  ).length;
  const totalStudents = classes.reduce(
    (sum: number, c: any) => sum + (c.studentCount || 0),
    0,
  );
  const totalRevenue = classes.reduce(
    (sum: number, c: any) => sum + (c.currentRevenue || 0),
    0,
  );

  // Helper to display subject fees in table
  const getSubjectDisplay = (classDoc: any) => {
    const subjects = classDoc.subjects || [];
    return subjects.slice(0, 2).map((s: any) => {
      const name = typeof s === "string" ? s : s.name;
      const fee = typeof s === "object" ? s.fee : null;
      return { name, fee };
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
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {totalRevenue.toLocaleString()}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  PKR
                </span>
              </p>
              <p className="text-sm text-muted-foreground">Revenue Collected</p>
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
                <TableHead className="font-semibold">Section</TableHead>
                <TableHead className="font-semibold">Subjects & Fees</TableHead>
                <TableHead className="font-semibold text-center">
                  Students
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Financial Status
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
                    <TableCell className="font-medium">
                      {classDoc.className}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                        {classDoc.section}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subjectDisplays.map((subject: any) => (
                          <span
                            key={subject.name}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs capitalize"
                          >
                            {subject.name}
                            {subject.fee !== null && (
                              <span className="ml-1 text-emerald-600 font-medium">
                                ({subject.fee.toLocaleString()})
                              </span>
                            )}
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
                    {/* TASK 3: Financial Status - Collected & Pending */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            Collected:
                          </span>
                          <span className="font-semibold text-green-600">
                            {(classDoc.currentRevenue || 0).toLocaleString()}{" "}
                            PKR
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            Pending:
                          </span>
                          <span className="font-semibold text-amber-600">
                            {(classDoc.totalPending || 0).toLocaleString()} PKR
                          </span>
                        </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Name *</Label>
                <Select value={formClassName} onValueChange={setFormClassName}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classNameOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section *</Label>
                <Select value={formSection} onValueChange={setFormSection}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionOptions.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned Professor */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned Professor
              </Label>
              <Select
                value={formAssignedTeacher}
                onValueChange={handleTeacherChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select professor" />
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
            </div>

            {/* Revenue Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formRevenueMode === "partner"
                    ? "100% goes to the Professor (Partner)"
                    : "70% Teacher / 30% Academy split"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${formRevenueMode === "standard" ? "font-semibold text-blue-600" : "text-muted-foreground"}`}
                >
                  Standard
                </span>
                <Switch
                  checked={formRevenueMode === "partner"}
                  onCheckedChange={(checked) =>
                    setFormRevenueMode(checked ? "partner" : "standard")
                  }
                  className="data-[state=checked]:bg-yellow-500"
                />
                <span
                  className={`text-sm flex items-center gap-1 ${formRevenueMode === "partner" ? "font-semibold text-yellow-600" : "text-muted-foreground"}`}
                >
                  <Crown className="h-3 w-3" />
                  Partner
                </span>
              </div>
            </div>

            {/* Subjects with Individual Fees */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Subjects & Pricing</Label>
                {formSubjects.length > 0 && (
                  <span className="text-sm font-semibold text-green-600">
                    Total: {totalSubjectFees.toLocaleString()} PKR
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {subjectOptions.map((subject) => {
                  const isSelected = isSubjectSelected(subject.id);
                  const currentFee = getSubjectFee(subject.id);

                  return (
                    <div
                      key={subject.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-sky-500 bg-sky-50"
                          : "border-border hover:border-sky-300"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-sky-500 border-sky-500"
                            : "border-slate-300"
                        }`}
                        onClick={() => handleSubjectToggle(subject.id)}
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
                        className={`flex-1 text-sm font-medium cursor-pointer ${
                          isSelected ? "text-sky-700" : "text-foreground"
                        }`}
                        onClick={() => handleSubjectToggle(subject.id)}
                      >
                        {subject.label}
                      </span>

                      {/* Fee Input */}
                      {isSelected && (
                        <div className="relative w-32">
                          <Input
                            type="number"
                            value={currentFee || ""}
                            onChange={(e) =>
                              handleSubjectFeeChange(
                                subject.id,
                                Number(e.target.value) || 0,
                              )
                            }
                            className="h-8 pr-12 text-right font-medium bg-white"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                            PKR
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Name *</Label>
                <Select value={formClassName} onValueChange={setFormClassName}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classNameOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section *</Label>
                <Select value={formSection} onValueChange={setFormSection}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionOptions.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assigned Professor */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned Professor
              </Label>
              <Select
                value={formAssignedTeacher}
                onValueChange={handleTeacherChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select professor" />
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
            </div>

            {/* Revenue Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formRevenueMode === "partner"
                    ? "100% goes to the Professor (Partner)"
                    : "70% Teacher / 30% Academy split"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${formRevenueMode === "standard" ? "font-semibold text-blue-600" : "text-muted-foreground"}`}
                >
                  Standard
                </span>
                <Switch
                  checked={formRevenueMode === "partner"}
                  onCheckedChange={(checked) =>
                    setFormRevenueMode(checked ? "partner" : "standard")
                  }
                  className="data-[state=checked]:bg-yellow-500"
                />
                <span
                  className={`text-sm flex items-center gap-1 ${formRevenueMode === "partner" ? "font-semibold text-yellow-600" : "text-muted-foreground"}`}
                >
                  <Crown className="h-3 w-3" />
                  Partner
                </span>
              </div>
            </div>

            {/* Subjects with Individual Fees */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Subjects & Pricing</Label>
                {formSubjects.length > 0 && (
                  <span className="text-sm font-semibold text-green-600">
                    Total: {totalSubjectFees.toLocaleString()} PKR
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {subjectOptions.map((subject) => {
                  const isSelected = isSubjectSelected(subject.id);
                  const currentFee = getSubjectFee(subject.id);

                  return (
                    <div
                      key={subject.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-sky-500 bg-sky-50"
                          : "border-border hover:border-sky-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-sky-500 border-sky-500"
                            : "border-slate-300"
                        }`}
                        onClick={() => handleSubjectToggle(subject.id)}
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
                      y
                      <span
                        className={`flex-1 text-sm font-medium cursor-pointer ${
                          isSelected ? "text-sky-700" : "text-foreground"
                        }`}
                        onClick={() => handleSubjectToggle(subject.id)}
                      >
                        {subject.label}
                      </span>
                      {isSelected && (
                        <div className="relative w-32">
                          <Input
                            type="number"
                            value={currentFee || ""}
                            onChange={(e) =>
                              handleSubjectFeeChange(
                                subject.id,
                                Number(e.target.value) || 0,
                              )
                            }
                            className="h-8 pr-12 text-right font-medium bg-white"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                            PKR
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
