// Classes.tsx - Production Grade Academic Session Integration
// Features: Query Key Factories, Strict Typing, Optimistic UI, Session-Aware Architecture
// FIXED: Smart Lookup for Academic Sessions using settingsApi.sessionPrices as Single Source of Truth
import { useState, useCallback, useMemo } from "react";
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
  Filter,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { classApi, settingsApi, teacherApi, sessionApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// TYPES & INTERFACES (Strict Contract)
// ============================================================================
interface SubjectWithFee {
  name: string;
  fee: number;
}

interface SubjectTeacherMap {
  subject: string;
  teacherId: string;
  teacherName: string;
}

// Session price from Configuration (settingsApi) - SINGLE SOURCE OF TRUTH
interface SessionPrice {
  sessionId: string;
  sessionName: string;
  price: number;
  isActive?: boolean;
}

interface AcademicSession {
  _id: string;
  sessionId?: string;
  name: string;
  sessionName?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  status?: "active" | "upcoming" | "completed";
  description?: string;
  durationDays?: number;
}

interface Teacher {
  _id: string;
  name: string;
  subject?: string;
  status: "active" | "inactive";
}

interface ClassInstance {
  _id: string;
  classId: string;
  classTitle: string;
  className?: string;
  gradeLevel: string;
  group: string;
  shift?: string;
  status: "active" | "inactive";
  session: string | AcademicSession; // Populated or ID
  assignedTeacher?: string | Teacher;
  teacherName?: string;
  subjects: (string | SubjectWithFee)[];
  subjectTeachers?: SubjectTeacherMap[];
  days: string[];
  startTime: string;
  endTime: string;
  roomNumber?: string;
  studentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ClassFilters {
  status: string;
  search: string;
  session: string;
}

// 🔧 Fixed: Added optional `_id` for edit mode
interface ClassPayload {
  _id?: string; // ← Added for edit mutations
  session: string;
  classTitle: string;
  gradeLevel: string;
  group: string;
  shift?: string;
  subjects: { name: string; fee: number }[];
  subjectTeachers: SubjectTeacherMap[];
  status: string;
  assignedTeacher?: string;
  teacherName?: string;
  days: string[];
  startTime: string;
  endTime: string;
  roomNumber: string;
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const GROUP_OPTIONS = [
  "Pre-Medical",
  "Pre-Engineering",
  "Computer Science",
  "Arts",
] as const;

const SHIFT_OPTIONS = [
  "Morning",
  "Evening",
  "Weekend",
  "Batch A",
  "Batch B",
  "Batch C",
] as const;

const GRADE_LEVEL_OPTIONS = [
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "MDCAT Prep",
  "ECAT Prep",
  "Tuition Classes",
] as const;

const DAYS_OF_WEEK = [
  { value: "Mon", label: "Mon", full: "Monday" },
  { value: "Tue", label: "Tue", full: "Tuesday" },
  { value: "Wed", label: "Wed", full: "Wednesday" },
  { value: "Thu", label: "Thu", full: "Thursday" },
  { value: "Fri", label: "Fri", full: "Friday" },
  { value: "Sat", label: "Sat", full: "Saturday" },
  { value: "Sun", label: "Sun", full: "Sunday" },
] as const;

const PARTNER_NAMES = ["waqar", "zahid", "saud"];

// ============================================================================
// QUERY KEY FACTORIES (Enterprise Pattern)
// ============================================================================
const queryKeys = {
  classes: {
    all: ["classes"] as const,
    lists: () => [...queryKeys.classes.all, "list"] as const,
    list: (filters: ClassFilters) =>
      [...queryKeys.classes.lists(), filters] as const,
    details: () => [...queryKeys.classes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.classes.details(), id] as const,
  },
  sessions: {
    all: ["sessions"] as const,
    active: () => [...queryKeys.sessions.all, "active"] as const,
  },
  teachers: {
    all: ["teachers"] as const,
    active: () => [...queryKeys.teachers.all, "active"] as const,
  },
  settings: {
    all: ["settings"] as const,
    subjects: () => [...queryKeys.settings.all, "subjects"] as const,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS - SMART SESSION LOOKUP
// ============================================================================

/**
 * Extract the session ID from a session field (handles both string ID and populated object)
 */
const extractSessionId = (
  session: AcademicSession | string | undefined,
): string | null => {
  if (!session) return null;
  if (typeof session === "string") return session;
  // Handle populated object - could have _id or sessionId
  return session._id || session.sessionId || null;
};

/**
 * Normalize ID for comparison - MongoDB ObjectIds can be compared as strings
 */
const normalizeId = (id: string | undefined | null): string => {
  if (!id) return "";
  return String(id).trim();
};

const isPartnerTeacher = (name: string): boolean =>
  PARTNER_NAMES.some((partner) => name.toLowerCase().includes(partner));

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function Classes() {
  const queryClient = useQueryClient();

  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const [filters, setFilters] = useState<ClassFilters>({
    status: "all",
    search: "",
    session: "all",
  });

  const [modalState, setModalState] = useState<{
    type: "add" | "edit" | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    classInstance: ClassInstance | null;
  }>({ isOpen: false, classInstance: null });

  // Form State
  const [formData, setFormData] = useState<Partial<ClassPayload>>({
    session: "",
    classTitle: "",
    gradeLevel: "",
    group: "",
    shift: "",
    subjects: [],
    subjectTeachers: [],
    status: "active",
    assignedTeacher: "",
    days: [],
    startTime: "16:00",
    endTime: "18:00",
    roomNumber: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ==========================================================================
  // DATA FETCHING (React Query v5 Patterns)
  // ==========================================================================

  // ✅ SETTINGS API - Single Source of Truth for Session Names & Prices
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: queryKeys.settings.subjects(),
    queryFn: async () => {
      const response = await settingsApi.get();
      console.log("📊 Settings loaded:", {
        sessionPricesCount: response.data?.sessionPrices?.length || 0,
        sessionPrices: response.data?.sessionPrices,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ✅ EXTRACT sessionPrices from Settings - This is THE source of truth for Display
  const sessionPrices: SessionPrice[] = useMemo(() => {
    return (settingsData?.sessionPrices || []).map((sp: any) => ({
      sessionId: sp.sessionId || sp._id,
      sessionName: sp.sessionName || sp.name || "Unknown Session",
      price: sp.price || 0,
      isActive: sp.isActive ?? true,
    }));
  }, [settingsData]);

  // ✅ Sessions API - For dropdown population and status info
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: queryKeys.sessions.active(),
    queryFn: async (): Promise<AcademicSession[]> => {
      try {
        const response = await sessionApi.getAll();
        const sessions = response.data || [];
        console.log("🔥 Sessions API loaded:", sessions.length, "sessions");
        return sessions.map((session: any) => ({
          _id: session._id,
          sessionId: session.sessionId || session._id,
          name: session.sessionName || session.name,
          sessionName: session.sessionName || session.name,
          description: session.description,
          isActive: session.status === "active",
          startDate: session.startDate,
          endDate: session.endDate,
          status: session.status,
          durationDays: session.durationDays,
        }));
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const sessions = sessionsData || [];

  // ✅ Merge sessions from both sources for dropdown
  // Prefer sessionPrices for names, sessions API for status
  const mergedSessions = useMemo(() => {
    const merged: AcademicSession[] = [];
    const seenIds = new Set<string>();

    // Add sessions from Sessions API (has status info)
    sessions.forEach((s) => {
      const id = s._id || s.sessionId;
      if (id && !seenIds.has(id)) {
        // Check if we have a better name from sessionPrices
        const priceEntry = sessionPrices.find((sp) => sp.sessionId === id);
        merged.push({
          ...s,
          name: priceEntry?.sessionName || s.sessionName || s.name,
          sessionName: priceEntry?.sessionName || s.sessionName || s.name,
        });
        seenIds.add(id);
      }
    });

    // Add any sessions from sessionPrices not in Sessions API
    sessionPrices.forEach((sp) => {
      if (!seenIds.has(sp.sessionId)) {
        merged.push({
          _id: sp.sessionId,
          sessionId: sp.sessionId,
          name: sp.sessionName,
          sessionName: sp.sessionName,
          isActive: sp.isActive,
          status: sp.isActive ? "active" : "completed",
        });
        seenIds.add(sp.sessionId);
      }
    });

    return merged;
  }, [sessions, sessionPrices]);

  const { data: teachersData, isLoading: isTeachersLoading } = useQuery({
    queryKey: queryKeys.teachers.active(),
    queryFn: async (): Promise<Teacher[]> => {
      const response = await teacherApi.getAll();
      return response.data || [];
    },
  });

  const teachers = teachersData || [];

  const subjectOptions = useMemo(() => {
    const fees = settingsData?.defaultSubjectFees || [];
    return fees.map((subject: any) => ({
      id: subject.name,
      label: subject.name,
      defaultFee: subject.fee || 0,
    }));
  }, [settingsData]);

  const {
    data: classesData,
    isLoading: isClassesLoading,
    isError: isClassesError,
    error: classesError,
  } = useQuery({
    queryKey: queryKeys.classes.list(filters),
    queryFn: async (): Promise<ClassInstance[]> => {
      const params: Record<string, string> = {};
      if (filters.status !== "all") params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.session !== "all") params.session = filters.session;
      const response = await classApi.getAll(params);
      return response.data || [];
    },
    placeholderData: (previousData) => previousData,
  });

  const classes = classesData || [];

  // ==========================================================================
  // MUTATIONS (Optimistic Updates)
  // ==========================================================================
  const createMutation = useMutation({
    mutationFn: (payload: ClassPayload) => classApi.create(payload),
    onMutate: async (newClass) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.classes.lists() });
      const previousClasses = queryClient.getQueryData(
        queryKeys.classes.lists(),
      );

      queryClient.setQueryData(
        queryKeys.classes.list(filters),
        (old: ClassInstance[] = []) => [
          ...old,
          {
            ...newClass,
            _id: `temp-${Date.now()}`,
            classId: "PENDING",
            studentCount: 0,
          } as ClassInstance,
        ],
      );

      return { previousClasses };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.lists() });
      toast.success("Class Created", {
        description: `${data.data.classTitle} linked to session successfully.`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      handleCloseModal();
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousClasses) {
        queryClient.setQueryData(
          queryKeys.classes.lists(),
          context.previousClasses,
        );
      }
      toast.error("Creation Failed", {
        description: error.message || "Could not create class instance.",
        icon: <XCircle className="h-4 w-4" />,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClassPayload> }) =>
      classApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.lists() });
      toast.success("Class Updated", {
        description: `${data.data.classTitle} has been updated.`,
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error("Update Failed", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.lists() });
      toast.success("Class Deleted", {
        description: "The class has been permanently removed.",
      });
      setDeleteDialog({ isOpen: false, classInstance: null });
    },
    onError: (error: any) => {
      toast.error("Deletion Failed", { description: error.message });
    },
  });

  // ==========================================================================
  // FORM HANDLING
  // ==========================================================================
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.session) errors.session = "Academic Session is required";
    if (!formData.classTitle?.trim())
      errors.classTitle = "Class Title is required";
    if (!formData.gradeLevel) errors.gradeLevel = "Grade Level is required";
    if (!formData.group) errors.group = "Group is required";
    if (!formData.days?.length)
      errors.days = "At least one day must be selected";
    if (!formData.startTime) errors.schedule = "Start time is required";
    if (!formData.endTime) errors.schedule = "End time is required";

    const unassignedSubjects = (formData.subjects || []).filter((s: any) => {
      const subjectName = typeof s === "string" ? s : s.name;
      return !(formData.subjectTeachers || []).find(
        (st: SubjectTeacherMap) => st.subject === subjectName && st.teacherId,
      );
    });

    if (unassignedSubjects.length > 0) {
      errors.subjects = `${unassignedSubjects.length} subject(s) need teacher assignment`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = useCallback(() => {
    setFormData({
      session: "",
      classTitle: "",
      gradeLevel: "",
      group: "",
      shift: "",
      subjects: [],
      subjectTeachers: [],
      status: "active",
      assignedTeacher: "",
      days: [],
      startTime: "16:00",
      endTime: "18:00",
      roomNumber: "",
    });
    setFormErrors({});
  }, []);

  const populateFormForEdit = useCallback((classDoc: ClassInstance) => {
    setFormData({
      _id: classDoc._id, // ✅ Preserve _id for edit
      session:
        typeof classDoc.session === "string"
          ? classDoc.session
          : classDoc.session?._id || "",
      classTitle: classDoc.classTitle || "",
      gradeLevel: classDoc.gradeLevel || classDoc.className || "",
      group: classDoc.group || "",
      shift: classDoc.shift || "",
      subjects: (classDoc.subjects || []).map((s: any) =>
        typeof s === "string" ? { name: s, fee: 0 } : s,
      ),
      subjectTeachers: (classDoc.subjectTeachers || []).map((st: any) => ({
        subject: st.subject,
        teacherId: st.teacherId?._id || st.teacherId || "",
        teacherName: st.teacherName || "",
      })),
      status: classDoc.status || "active",
      assignedTeacher:
        typeof classDoc.assignedTeacher === "string"
          ? classDoc.assignedTeacher
          : classDoc.assignedTeacher?._id || "",
      days: classDoc.days || [],
      startTime: classDoc.startTime || "16:00",
      endTime: classDoc.endTime || "18:00",
      roomNumber: classDoc.roomNumber || "",
    });
    setFormErrors({});
  }, []);

  const handleOpenAdd = () => {
    resetForm();
    setModalState({ type: "add", isOpen: true });
  };

  const handleOpenEdit = (classDoc: ClassInstance) => {
    populateFormForEdit(classDoc);
    setModalState({ type: "edit", isOpen: true });
  };

  const handleCloseModal = () => {
    setModalState({ type: null, isOpen: false });
    resetForm();
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Validation Error", {
        description: "Please fix the highlighted fields.",
      });
      return;
    }

    const selectedTeacher = teachers.find(
      (t) => t._id === formData.assignedTeacher,
    );
    const payload: ClassPayload = {
      _id: formData._id, // ✅ Included for edit
      session: formData.session!,
      classTitle: formData.classTitle!,
      gradeLevel: formData.gradeLevel!,
      group: formData.group!,
      shift: formData.shift || undefined,
      subjects: (formData.subjects || []).map((s: any) => ({
        name: typeof s === "string" ? s : s.name,
        fee: 0,
      })),
      subjectTeachers: (formData.subjectTeachers || []).filter(
        (st) => st.teacherId,
      ),
      status: formData.status || "active",
      assignedTeacher: formData.assignedTeacher || undefined,
      teacherName: selectedTeacher?.name,
      days: formData.days || [],
      startTime: formData.startTime || "16:00",
      endTime: formData.endTime || "18:00",
      roomNumber: formData.roomNumber || "TBD",
    };

    if (modalState.type === "edit" && formData._id) {
      updateMutation.mutate({ id: formData._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ==========================================================================
  // SUBJECT & TEACHER HANDLERS
  // ==========================================================================
  const handleSubjectToggle = (subjectId: string) => {
    setFormData((prev) => {
      const currentSubjects = prev.subjects || [];
      const exists = currentSubjects.find(
        (s: any) => (typeof s === "string" ? s : s.name) === subjectId,
      );
      if (exists) {
        return {
          ...prev,
          subjects: currentSubjects.filter(
            (s: any) => (typeof s === "string" ? s : s.name) !== subjectId,
          ),
          subjectTeachers: (prev.subjectTeachers || []).filter(
            (st) => st.subject !== subjectId,
          ),
        };
      } else {
        return {
          ...prev,
          subjects: [...currentSubjects, { name: subjectId, fee: 0 }],
        };
      }
    });
  };

  const handleSubjectTeacherChange = (
    subjectName: string,
    teacherId: string,
  ) => {
    const teacher = teachers.find((t) => t._id === teacherId);
    setFormData((prev) => {
      const currentMappings = prev.subjectTeachers || [];
      const existingIndex = currentMappings.findIndex(
        (st) => st.subject === subjectName,
      );
      if (existingIndex >= 0) {
        const updated = [...currentMappings];
        updated[existingIndex] = {
          subject: subjectName,
          teacherId,
          teacherName: teacher?.name || "",
        };
        return { ...prev, subjectTeachers: updated };
      }
      return {
        ...prev,
        subjectTeachers: [
          ...currentMappings,
          {
            subject: subjectName,
            teacherId,
            teacherName: teacher?.name || "",
          },
        ],
      };
    });
  };

  const getSubjectTeacherId = (subjectName: string): string =>
    formData.subjectTeachers?.find((st) => st.subject === subjectName)
      ?.teacherId || "";

  const getTeachersForSubject = (subjectName: string) =>
    teachers.filter(
      (t) =>
        t.status === "active" &&
        t.subject?.toLowerCase() === subjectName.toLowerCase(),
    );

  const isSubjectSelected = (subjectId: string) =>
    formData.subjects?.some(
      (s: any) => (typeof s === "string" ? s : s.name) === subjectId,
    );

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days?.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...(prev.days || []), day],
    }));
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  /**
   * SMART SESSION LOOKUP - Uses multiple data sources for reliability
   * Priority: 1. Sessions API (most reliable), 2. sessionPrices, 3. Populated object
   */
  const getSessionInfo = useCallback(
    (
      session: ClassInstance["session"],
    ): { id: string | null; name: string; found: boolean; status?: string } => {
      const sessionId = extractSessionId(session);

      if (!sessionId) {
        return { id: null, name: "Unlinked", found: false };
      }

      const normalizedId = normalizeId(sessionId);

      // Priority 1: Look up in Sessions API data (mergedSessions has the best data)
      const fromSessions = mergedSessions.find(
        (s) =>
          normalizeId(s._id) === normalizedId ||
          normalizeId(s.sessionId) === normalizedId,
      );

      if (fromSessions) {
        return {
          id: sessionId,
          name:
            fromSessions.sessionName || fromSessions.name || "Unnamed Session",
          found: true,
          status: fromSessions.status,
        };
      }

      // Priority 2: Look up in sessionPrices from Settings
      const fromPrices = sessionPrices.find(
        (sp) => normalizeId(sp.sessionId) === normalizedId,
      );

      if (fromPrices) {
        return {
          id: sessionId,
          name: fromPrices.sessionName || "Unnamed Session",
          found: true,
        };
      }

      // Priority 3: If session is a populated object with name, use it
      if (typeof session === "object" && session !== null) {
        const name = session.sessionName || session.name;
        if (name && name !== "Unknown") {
          return { id: sessionId, name, found: true, status: session.status };
        }
      }

      // Final fallback
      return { id: sessionId, name: "Unknown", found: false };
    },
    [mergedSessions, sessionPrices],
  );

  const stats = useMemo(
    () => ({
      total: classes.length,
      active: classes.filter((c) => c.status === "active").length,
      students: classes.reduce((sum, c) => sum + (c.studentCount || 0), 0),
      linked: classes.filter((c) => getSessionInfo(c.session).found).length,
    }),
    [classes, getSessionInfo],
  );

  const getSubjectDisplay = (classDoc: ClassInstance) => {
    const subs = classDoc.subjects || [];
    return subs.slice(0, 2).map((s: any) => ({
      name: typeof s === "string" ? s : s.name,
    }));
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <DashboardLayout title="Classes">
      {/* Header */}
      <HeaderBanner
        title="Class Management"
        subtitle={`${stats.total} Classes • ${stats.active} Active • ${stats.students} Students Enrolled`}
      >
        <Button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-primary/90 gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </HeaderBanner>

      {/* Stats Grid */}
      <div className="grid gap-4 mt-6 md:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Total Classes"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.students}
          color="green"
        />
        <StatCard
          icon={GraduationCap}
          label="Active Classes"
          value={stats.active}
          color="amber"
        />
        <StatCard
          icon={Building2}
          label="Linked to Sessions"
          value={stats.linked}
          color="indigo"
        />
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, grade, or ID..."
              className="pl-9"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>
          <Select
            value={filters.session}
            onValueChange={(val) =>
              setFilters((prev) => ({ ...prev, session: val }))
            }
          >
            <SelectTrigger className="w-[220px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Sessions</SelectItem>
              {mergedSessions.map((session) => {
                const sessionId = session._id || session.sessionId;
                if (!sessionId) return null;
                return (
                  <SelectItem key={sessionId} value={sessionId}>
                    {session.sessionName || session.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(val) =>
              setFilters((prev) => ({ ...prev, status: val }))
            }
          >
            <SelectTrigger className="w-[140px]">
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

      {/* Data Table */}
      <div className="mt-6 rounded-xl border bg-card shadow-sm overflow-hidden">
        {isClassesLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isClassesError ? (
          <ErrorState
            error={classesError}
            onRetry={() =>
              queryClient.invalidateQueries({
                queryKey: queryKeys.classes.lists(),
              })
            }
          />
        ) : classes.length === 0 ? (
          <EmptyState onAdd={handleOpenAdd} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Class Details</TableHead>
                <TableHead>Academic Session</TableHead>
                <TableHead>Group / Schedule</TableHead>
                <TableHead>Subjects & Teachers</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {classes.map((classDoc, index) => {
                  // ✅ SMART LOOKUP: Get session name using sessionPrices as source of truth
                  const sessionInfo = getSessionInfo(classDoc.session);

                  return (
                    <motion.tr
                      key={classDoc._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">
                            {classDoc.classTitle}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                              {classDoc.classId}
                            </span>
                            <span>•</span>
                            <span>{classDoc.gradeLevel}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* ✅ FIXED: Smart Session Display using lookup - Clean UI without redundant status */}
                        {sessionInfo.found ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Building2 className="h-3 w-3 mr-1.5" />
                            {sessionInfo.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {sessionInfo.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 w-fit">
                            {classDoc.group}
                          </span>
                          {classDoc.shift && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {classDoc.shift} • {classDoc.days?.join(", ")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-1">
                            {getSubjectDisplay(classDoc).map((s) => (
                              <span
                                key={s.name}
                                className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                              >
                                {s.name}
                              </span>
                            ))}
                            {(classDoc.subjects || []).length > 2 && (
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                                +{(classDoc.subjects || []).length - 2}
                              </span>
                            )}
                          </div>
                          {(classDoc.subjectTeachers || []).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {classDoc.subjectTeachers?.length} teachers
                              assigned
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-bold text-primary">
                            {classDoc.studentCount || 0}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Enrolled
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(classDoc)}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                classInstance: classDoc,
                              })
                            }
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalState.isOpen}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                {modalState.type === "add" ? (
                  <Plus className="h-5 w-5 text-primary" />
                ) : (
                  <Edit className="h-5 w-5 text-primary" />
                )}
              </div>
              {modalState.type === "add" ? "Create New Class" : "Edit Class"}
            </DialogTitle>
            <DialogDescription>
              {modalState.type === "add"
                ? "Configure a new class instance linked to an academic session."
                : "Update the class configuration and assignments."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Session Selection - Highlighted Section */}
            <div
              className={cn(
                "space-y-3 p-4 rounded-xl border-2 transition-colors",
                formErrors.session
                  ? "border-red-200 bg-red-50/50"
                  : "border-indigo-100 bg-indigo-50/30",
              )}
            >
              <div className="flex items-center gap-2">
                <Building2
                  className={cn(
                    "h-5 w-5",
                    formErrors.session ? "text-red-500" : "text-indigo-600",
                  )}
                />
                <Label
                  className={cn(
                    "font-semibold",
                    formErrors.session ? "text-red-700" : "text-indigo-700",
                  )}
                >
                  Academic Session *
                </Label>
              </div>
              <Select
                value={formData.session || ""}
                onValueChange={(val) => {
                  setFormData((prev) => ({ ...prev, session: val }));
                  if (formErrors.session) {
                    setFormErrors((prev) => ({ ...prev, session: "" }));
                  }
                }}
              >
                <SelectTrigger
                  className={cn(
                    "bg-white",
                    formErrors.session && "border-red-300 focus:ring-red-200",
                  )}
                >
                  <SelectValue placeholder="Select Academic Session (e.g., MDCAT 2026)" />
                </SelectTrigger>
                <SelectContent>
                  {isSessionsLoading && isSettingsLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Loading sessions...
                    </div>
                  ) : mergedSessions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No sessions found. Create sessions first.
                    </div>
                  ) : (
                    mergedSessions.map((session) => {
                      const sessionId = session._id || session.sessionId;
                      if (!sessionId) return null;
                      return (
                        <SelectItem key={sessionId} value={sessionId}>
                          {session.sessionName || session.name}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {formErrors.session && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.session}
                </p>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-2">
              <Label className="font-medium">Class Title *</Label>
              <Input
                placeholder="e.g., 10th Medical Batch A"
                value={formData.classTitle || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    classTitle: e.target.value,
                  }))
                }
                className={cn(formErrors.classTitle && "border-red-300")}
              />
              {formErrors.classTitle && (
                <p className="text-xs text-red-600">{formErrors.classTitle}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grade Level *</Label>
                <Select
                  value={formData.gradeLevel || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, gradeLevel: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Group *</Label>
                <Select
                  value={formData.group || ""}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, group: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4 p-4 bg-blue-50/30 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="h-4 w-4" />
                <Label className="font-semibold">
                  Schedule Configuration *
                </Label>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Class Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        formData.days?.includes(day.value)
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300",
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {formErrors.days && (
                  <p className="text-xs text-red-600">{formErrors.days}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={formData.startTime || "16:00"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={formData.endTime || "18:00"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Room</Label>
                  <Input
                    placeholder="e.g., 101"
                    value={formData.roomNumber || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        roomNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              {formErrors.schedule && (
                <p className="text-xs text-red-600">{formErrors.schedule}</p>
              )}
            </div>

            {/* Form Master */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Class In-Charge (Form Master)
              </Label>
              <Select
                value={formData.assignedTeacher || ""}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, assignedTeacher: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select form master (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter((t) => t.status === "active")
                    .map((teacher) => (
                      <SelectItem key={teacher._id} value={teacher._id}>
                        <div className="flex items-center gap-2">
                          <span>{teacher.name}</span>
                          {isPartnerTeacher(teacher.name) && (
                            <Crown className="h-3 w-3 text-amber-500" />
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            ({teacher.subject || "General"})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subjects with Teachers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subjects & Teachers *
                </Label>
                {formData.subjects && formData.subjects.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {formData.subjects.length} selected
                  </span>
                )}
              </div>
              {isSettingsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subjects...
                </div>
              ) : subjectOptions.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/30">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No subjects configured
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add subjects in Configuration → Subjects & Pricing
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {subjectOptions.map((subject) => {
                    const isSelected = isSubjectSelected(subject.id);
                    const availableTeachers = getTeachersForSubject(subject.id);
                    const selectedTeacherId = getSubjectTeacherId(subject.id);
                    const hasError =
                      formErrors.subjects && isSelected && !selectedTeacherId;

                    return (
                      <div
                        key={subject.id}
                        className={cn(
                          "rounded-lg border transition-all duration-200",
                          isSelected
                            ? "border-sky-500 bg-sky-50/50 shadow-sm"
                            : "border-border hover:border-sky-200 bg-card",
                          hasError && "border-red-300 bg-red-50/30",
                        )}
                      >
                        <div
                          onClick={() => handleSubjectToggle(subject.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                              isSelected
                                ? "bg-sky-500 border-sky-500"
                                : "border-slate-300 bg-white",
                            )}
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
                          <span
                            className={cn(
                              "text-sm font-medium flex-1",
                              isSelected ? "text-sky-900" : "text-foreground",
                            )}
                          >
                            {subject.label}
                          </span>
                          {isSelected && availableTeachers.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {availableTeachers.length} teachers
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="px-3 pb-3 pt-0">
                            <div className="flex items-center gap-2 pl-8">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <Select
                                value={selectedTeacherId}
                                onValueChange={(val) =>
                                  handleSubjectTeacherChange(subject.id, val)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "flex-1 h-9 bg-white",
                                    !selectedTeacherId &&
                                      "border-amber-300 text-amber-700",
                                  )}
                                >
                                  <SelectValue
                                    placeholder={`Assign ${subject.label} teacher...`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTeachers.length > 0 ? (
                                    availableTeachers.map((teacher) => (
                                      <SelectItem
                                        key={teacher._id}
                                        value={teacher._id}
                                      >
                                        <div className="flex items-center gap-2">
                                          {teacher.name}
                                          {isPartnerTeacher(teacher.name) && (
                                            <Crown className="h-3 w-3 text-amber-500" />
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                      <p>
                                        No {subject.label} teachers available
                                      </p>
                                      <p className="text-xs mt-1">
                                        Add in Teachers section
                                      </p>
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            {!selectedTeacherId &&
                              availableTeachers.length > 0 && (
                                <p className="text-xs text-amber-600 mt-1 pl-8 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Teacher assignment required
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {formErrors.subjects && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.subjects}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="flex justify-center pt-2">
              <div className="space-y-2 w-48">
                <Label className="text-center block text-sm">
                  Class Status
                </Label>
                <Select
                  value={formData.status || "active"}
                  onValueChange={(val: "active" | "inactive") =>
                    setFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        Inactive
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white min-w-[120px]"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : modalState.type === "add" ? (
                "Create Class"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ isOpen: false, classInstance: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Class Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteDialog.classInstance?.classTitle}
              </span>
              ? This will permanently remove the class and all associated
              enrollment data.
              <br />
              <br />
              <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                ID: {deleteDialog.classInstance?.classId}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteDialog.classInstance?._id) {
                  deleteMutation.mutate(deleteDialog.classInstance._id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleteMutation.isPending ? (
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
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "blue" | "green" | "amber" | "indigo" | "red";
}) {
  const colorClasses = {
    blue: "bg-sky-100 text-sky-600",
    green: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    indigo: "bg-indigo-100 text-indigo-600",
    red: "bg-red-100 text-red-600",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            colorClasses[color],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <BookOpen className="h-8 w-8 opacity-50" />
      </div>
      <p className="text-lg font-medium mb-2">No classes found</p>
      <p className="text-sm text-center max-w-sm mb-6">
        Get started by creating your first class and linking it to an academic
        session.
      </p>
      <Button onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" />
        Add First Class
      </Button>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-destructive">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <p className="text-lg font-medium mb-2">Failed to load classes</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {error?.message ||
          "An unexpected error occurred while fetching the class list."}
      </p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <Loader2 className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
