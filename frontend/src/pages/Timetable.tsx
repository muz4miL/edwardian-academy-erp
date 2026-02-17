import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
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
  Clock,
  Plus,
  Loader2,
  Edit,
  Trash2,
  MapPin,
  Search,
  User,
  Zap,
  AlertTriangle,
  Trash,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableApi, classApi, teacherApi } from "@/lib/api";
import { toast } from "sonner";

// API base URL
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/api`;

// Days of the week
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Time slots for dropdowns (30-min intervals)
const TIME_SLOTS = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
];

// Reduced slots for grid display (1-hour intervals)
const GRID_TIME_SLOTS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

// Parse time string to minutes for comparison
const parseTimeToMinutes = (t: string): number => {
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1]) * 60 + parseInt(match24[2]);
  }
  return 0;
};

// Dynamic subject color palette — deterministic by subject name
const SUBJECT_COLOR_PALETTE = [
  {
    bg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
    border: "border-emerald-300",
    text: "text-emerald-800",
    subtext: "text-emerald-600",
  },
  {
    bg: "bg-gradient-to-br from-sky-100 to-sky-200",
    border: "border-sky-300",
    text: "text-sky-800",
    subtext: "text-sky-600",
  },
  {
    bg: "bg-gradient-to-br from-purple-100 to-purple-200",
    border: "border-purple-300",
    text: "text-purple-800",
    subtext: "text-purple-600",
  },
  {
    bg: "bg-gradient-to-br from-rose-100 to-rose-200",
    border: "border-rose-300",
    text: "text-rose-800",
    subtext: "text-rose-600",
  },
  {
    bg: "bg-gradient-to-br from-amber-100 to-amber-200",
    border: "border-amber-300",
    text: "text-amber-800",
    subtext: "text-amber-600",
  },
  {
    bg: "bg-gradient-to-br from-teal-100 to-teal-200",
    border: "border-teal-300",
    text: "text-teal-800",
    subtext: "text-teal-600",
  },
  {
    bg: "bg-gradient-to-br from-orange-100 to-orange-200",
    border: "border-orange-300",
    text: "text-orange-800",
    subtext: "text-orange-600",
  },
  {
    bg: "bg-gradient-to-br from-indigo-100 to-indigo-200",
    border: "border-indigo-300",
    text: "text-indigo-800",
    subtext: "text-indigo-600",
  },
  {
    bg: "bg-gradient-to-br from-pink-100 to-pink-200",
    border: "border-pink-300",
    text: "text-pink-800",
    subtext: "text-pink-600",
  },
  {
    bg: "bg-gradient-to-br from-cyan-100 to-cyan-200",
    border: "border-cyan-300",
    text: "text-cyan-800",
    subtext: "text-cyan-600",
  },
];

const getSubjectStyles = (subject: string) => {
  if (!subject) return SUBJECT_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLOR_PALETTE[Math.abs(hash) % SUBJECT_COLOR_PALETTE.length];
};

interface BulkEntry {
  subject: string;
  teacherId: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

const Timetable = () => {
  const queryClient = useQueryClient();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassId, setFilterClassId] = useState("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  // Form states
  const [formClassId, setFormClassId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formRoom, setFormRoom] = useState("");

  // Bulk generation states
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Fetch timetable entries
  const { data: timetableData, isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => timetableApi.getAll(),
  });

  // Fetch classes for dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", { status: "active" }],
    queryFn: () => classApi.getAll({ status: "active" }),
  });

  // Fetch teachers for dropdown
  const { data: teachersData } = useQuery({
    queryKey: ["teachers", { status: "active" }],
    queryFn: () => teacherApi.getAll({ status: "active" }),
  });

  const entries = timetableData?.data || [];
  const classes = classesData?.data || [];
  const teachers = teachersData?.data || [];

  // Filter entries by class
  const filteredEntries = useMemo(() => {
    if (filterClassId === "all") return entries;
    return entries.filter((entry: any) => {
      const entryClassId = entry.classId?._id || entry.classId;
      return entryClassId === filterClassId;
    });
  }, [entries, filterClassId]);

  // Get subjects available for the selected class in the form
  const selectedClassForForm = useMemo(
    () => classes.find((c: any) => c._id === formClassId),
    [classes, formClassId],
  );

  const formSubjects = useMemo(() => {
    if (!selectedClassForForm) return [];
    return (selectedClassForForm.subjects || []).map((s: any) =>
      typeof s === "string" ? s : s.name,
    );
  }, [selectedClassForForm]);

  // Get subject-teacher mapping for selected class
  const subjectTeacherMap = useMemo(() => {
    if (!selectedClassForForm?.subjectTeachers) return {};
    const map: Record<string, { teacherId: string; teacherName: string }> = {};
    for (const st of selectedClassForForm.subjectTeachers) {
      map[st.subject] = {
        teacherId: st.teacherId?.toString() || "",
        teacherName: st.teacherName || "",
      };
    }
    return map;
  }, [selectedClassForForm]);

  // Auto-select teacher when subject chosen (from subjectTeachers mapping)
  useEffect(() => {
    if (formSubject && subjectTeacherMap[formSubject]?.teacherId) {
      setFormTeacherId(subjectTeacherMap[formSubject].teacherId);
    }
  }, [formSubject, subjectTeacherMap]);

  // Collect all unique subjects from entries for legend
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    filteredEntries.forEach((e: any) => {
      if (e.subject) set.add(e.subject);
    });
    return Array.from(set).sort();
  }, [filteredEntries]);

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: timetableApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      toast.success("Entry Created", {
        description: "Timetable entry added successfully.",
      });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error.message?.includes("conflict")
          ? "Schedule Conflict"
          : "Failed to create entry",
        { description: error.message },
      );
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      timetableApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      toast.success("Entry Updated");
      resetForm();
      setIsEditModalOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast.error("Failed to update entry", { description: error.message });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: timetableApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      toast.success("Entry Deleted");
      setIsDeleteDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete entry", { description: error.message });
    },
  });

  // Reset form
  const resetForm = () => {
    setFormClassId("");
    setFormTeacherId("");
    setFormSubject("");
    setFormDay("");
    setFormStartTime("");
    setFormEndTime("");
    setFormRoom("");
  };

  // Populate form for edit
  const populateFormForEdit = (entry: any) => {
    setFormClassId(entry.classId?._id || entry.classId || "");
    setFormTeacherId(entry.teacherId?._id || entry.teacherId || "");
    setFormSubject(entry.subject || "");
    setFormDay(entry.day || "");
    setFormStartTime(entry.startTime || "");
    setFormEndTime(entry.endTime || "");
    setFormRoom(entry.room || "");
  };

  // Handlers
  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    populateFormForEdit(entry);
    setIsEditModalOpen(true);
  };

  const handleDelete = (entry: any) => {
    setSelectedEntry(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = () => {
    if (
      !formClassId ||
      !formTeacherId ||
      !formSubject ||
      !formDay ||
      !formStartTime ||
      !formEndTime
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    createEntryMutation.mutate({
      classId: formClassId,
      teacherId: formTeacherId,
      subject: formSubject,
      day: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      room: formRoom,
    });
  };

  const handleSubmitEdit = () => {
    if (!selectedEntry?._id) return;
    updateEntryMutation.mutate({
      id: selectedEntry._id,
      data: {
        classId: formClassId,
        teacherId: formTeacherId,
        subject: formSubject,
        day: formDay,
        startTime: formStartTime,
        endTime: formEndTime,
        room: formRoom,
      },
    });
  };

  // ========== BULK GENERATION ==========
  const selectedBulkClass = useMemo(
    () => classes.find((c: any) => c._id === bulkClassId),
    [classes, bulkClassId],
  );

  // Initialize bulk entries from class subjects + teachers
  useEffect(() => {
    if (!selectedBulkClass) {
      setBulkEntries([]);
      return;
    }

    const cls = selectedBulkClass;
    const subjectTeachers = cls.subjectTeachers || [];
    const subjects = (cls.subjects || []).map((s: any) =>
      typeof s === "string" ? s : s.name,
    );

    const dayMap: Record<string, string> = {
      Mon: "Monday",
      Tue: "Tuesday",
      Wed: "Wednesday",
      Thu: "Thursday",
      Fri: "Friday",
      Sat: "Saturday",
      Sun: "Sunday",
    };
    const days = (cls.days || []).map((d: string) => dayMap[d] || d);

    const newEntries: BulkEntry[] = [];
    for (const subjectName of subjects) {
      const stMapping = subjectTeachers.find(
        (st: any) => st.subject === subjectName,
      );
      const teacherId =
        stMapping?.teacherId || cls.assignedTeacher?._id || cls.assignedTeacher || "";
      const teacherName =
        stMapping?.teacherName || cls.teacherName || "";

      // One default entry per subject (first class day)
      if (days.length > 0) {
        newEntries.push({
          subject: subjectName,
          teacherId: teacherId?.toString() || "",
          teacherName,
          day: days[0],
          startTime: "",
          endTime: "",
          room: cls.roomNumber || "",
        });
      }
    }
    setBulkEntries(newEntries);
  }, [selectedBulkClass]);

  const addBulkRow = () => {
    setBulkEntries([
      ...bulkEntries,
      {
        subject: "",
        teacherId: "",
        teacherName: "",
        day: "",
        startTime: "",
        endTime: "",
        room: selectedBulkClass?.roomNumber || "",
      },
    ]);
  };

  const removeBulkRow = (idx: number) => {
    setBulkEntries(bulkEntries.filter((_, i) => i !== idx));
  };

  const updateBulkRow = (
    idx: number,
    field: keyof BulkEntry,
    value: string,
  ) => {
    const updated = [...bulkEntries];
    updated[idx] = { ...updated[idx], [field]: value };

    // Auto-populate teacher when subject changes
    if (field === "subject" && selectedBulkClass) {
      const stMapping = (selectedBulkClass.subjectTeachers || []).find(
        (st: any) => st.subject === value,
      );
      if (stMapping) {
        updated[idx].teacherId = stMapping.teacherId?.toString() || "";
        updated[idx].teacherName = stMapping.teacherName || "";
      }
    }
    setBulkEntries(updated);
  };

  const handleBulkGenerate = async () => {
    if (!bulkClassId || bulkEntries.length === 0) {
      toast.error("Please select a class and add entries");
      return;
    }
    for (let i = 0; i < bulkEntries.length; i++) {
      const e = bulkEntries[i];
      if (!e.subject || !e.teacherId || !e.day || !e.startTime || !e.endTime) {
        toast.error(`Row ${i + 1}: Please fill all required fields`);
        return;
      }
    }

    setBulkGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/timetable/bulk-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ classId: bulkClassId, entries: bulkEntries }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Generated ${data.count} entries`, {
          description: "Timetable entries created successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ["timetable"] });
        setIsBulkModalOpen(false);
        setBulkClassId("");
        setBulkEntries([]);
      } else if (data.conflicts) {
        const msgs = data.conflicts.map(
          (c: any) => `${c.entry.subject}: ${c.conflicts.join("; ")}`,
        );
        toast.error("Schedule Conflicts Detected", {
          description: msgs.join("\n"),
          duration: 8000,
        });
      } else {
        toast.error(data.message || "Failed to generate");
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleClearClassTimetable = async () => {
    if (filterClassId === "all") return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/timetable/clear-class/${filterClassId}`,
        { method: "DELETE", credentials: "include" },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Cleared ${data.deletedCount} entries`);
        queryClient.invalidateQueries({ queryKey: ["timetable"] });
      } else {
        toast.error(data.message || "Failed to clear");
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setIsClearDialogOpen(false);
  };

  // Grid helpers
  const getEntriesForDayAndSlot = (day: string, slotTime: string) => {
    const slotMins = parseTimeToMinutes(slotTime);
    const nextSlotMins = slotMins + 60;
    return filteredEntries.filter((entry: any) => {
      if (entry.day !== day) return false;
      const entryStart = parseTimeToMinutes(entry.startTime);
      return entryStart >= slotMins && entryStart < nextSlotMins;
    });
  };

  const getClassDisplay = (entry: any) => {
    if (entry.classId && typeof entry.classId === "object") {
      return (
        entry.classId.classTitle ||
        entry.classId.className ||
        entry.classId.gradeLevel ||
        "Unknown Class"
      );
    }
    return "Unknown Class";
  };

  const getTeacherDisplay = (entry: any) => {
    if (entry.teacherId && typeof entry.teacherId === "object") {
      return entry.teacherId.name;
    }
    return "Unknown Teacher";
  };

  const isEntryHighlighted = (entry: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      getTeacherDisplay(entry).toLowerCase().includes(term) ||
      getClassDisplay(entry).toLowerCase().includes(term) ||
      (entry.subject || "").toLowerCase().includes(term)
    );
  };

  // ========== FORM FIELDS (shared by Add & Edit modals) ==========
  const renderFormFields = () => {
    const classSubjects =
      formSubjects.length > 0
        ? formSubjects
        : (selectedClassForForm?.subjects || []).map((s: any) =>
            typeof s === "string" ? s : s.name,
          );

    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Class *</Label>
            <Select
              value={formClassId}
              onValueChange={(val) => {
                setFormClassId(val);
                setFormSubject("");
                setFormTeacherId("");
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls: any) => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.classTitle || cls.className} (
                    {cls.gradeLevel || cls.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={formSubject} onValueChange={setFormSubject}>
              <SelectTrigger className="bg-background">
                <SelectValue
                  placeholder={
                    formClassId ? "Select subject" : "Select class first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {classSubjects.map((subject: string) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
                {classSubjects.length === 0 && (
                  <SelectItem value="_none" disabled>
                    {formClassId
                      ? "No subjects in this class"
                      : "Select a class first"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Teacher *{" "}
              {subjectTeacherMap[formSubject] && (
                <span className="text-emerald-600 text-xs">(auto-matched)</span>
              )}
            </Label>
            <Select value={formTeacherId} onValueChange={setFormTeacherId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher: any) => (
                  <SelectItem key={teacher._id} value={teacher._id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Day *</Label>
            <Select value={formDay} onValueChange={setFormDay}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Time *</Label>
            <Select value={formStartTime} onValueChange={setFormStartTime}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>End Time *</Label>
            <Select value={formEndTime} onValueChange={setFormEndTime}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.filter(
                  (t) =>
                    !formStartTime ||
                    parseTimeToMinutes(t) > parseTimeToMinutes(formStartTime),
                ).map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Room (Optional)</Label>
          <Input
            placeholder="e.g., Room A1"
            value={formRoom}
            onChange={(e) => setFormRoom(e.target.value)}
            className="bg-background"
          />
        </div>
      </div>
    );
  };

  // ========== RENDER ==========
  return (
    <DashboardLayout title="Timetable">
      <HeaderBanner
        title="Weekly Timetable"
        subtitle={`Showing ${filteredEntries.length} of ${entries.length} entries`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-primary-foreground/80 text-primary hover:bg-primary-foreground"
            onClick={() => {
              setBulkClassId("");
              setBulkEntries([]);
              setIsBulkModalOpen(true);
            }}
            style={{ borderRadius: "0.75rem" }}
          >
            <Zap className="mr-2 h-4 w-4" />
            Bulk Generate
          </Button>
          <Button
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            style={{ borderRadius: "0.75rem" }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </HeaderBanner>

      {/* Filters Row */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="w-[260px]">
          <Select value={filterClassId} onValueChange={setFilterClassId}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls: any) => (
                <SelectItem key={cls._id} value={cls._id}>
                  {cls.classTitle || cls.className} (
                  {cls.gradeLevel || cls.section})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by teacher, class, or subject..."
            className="pl-9 bg-card border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {filterClassId !== "all" && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setIsClearDialogOpen(true)}
          >
            <Trash className="mr-1.5 h-3.5 w-3.5" />
            Clear Class Schedule
          </Button>
        )}
        {searchTerm && (
          <p className="text-sm text-muted-foreground">
            Highlighting:{" "}
            <span className="font-semibold text-amber-600">
              &quot;{searchTerm}&quot;
            </span>
          </p>
        )}
      </div>

      {/* Dynamic Subject Color Legend */}
      {allSubjects.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Subjects:</span>
          {allSubjects.map((subject) => {
            const styles = getSubjectStyles(subject);
            return (
              <div key={subject} className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded ${styles.bg} border ${styles.border}`}
                ></div>
                <span>{subject}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Grid View */}
      <div className="mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-card rounded-xl border border-border text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-semibold text-foreground mb-1">
              {filterClassId !== "all"
                ? "No schedule set for this class yet"
                : "No timetable entries yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {filterClassId !== "all"
                ? 'Use "Add Entry" or "Bulk Generate" to create the schedule.'
                : "Select a class and start building the timetable."}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setBulkClassId(filterClassId !== "all" ? filterClassId : "");
                setIsBulkModalOpen(true);
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Generate Timetable
            </Button>
          </div>
        ) : (
          <div className="min-w-[1000px] rounded-xl border border-border bg-card overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-7 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
              <div className="p-3 text-center font-semibold border-r border-amber-500">
                <Clock className="h-4 w-4 mx-auto mb-1" />
                Time
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center font-semibold border-r border-amber-500 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            {GRID_TIME_SLOTS.map((timeSlot, idx) => (
              <div
                key={timeSlot}
                className={`grid grid-cols-7 border-b border-border last:border-b-0 ${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}`}
              >
                <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border bg-slate-100 dark:bg-slate-800">
                  {timeSlot}
                </div>
                {DAYS.map((day) => {
                  const dayEntries = getEntriesForDayAndSlot(day, timeSlot);
                  return (
                    <div
                      key={`${day}-${timeSlot}`}
                      className="p-1 min-h-[90px] border-r border-border last:border-r-0"
                    >
                      {dayEntries.map((entry: any) => {
                        const styles = getSubjectStyles(entry.subject);
                        const highlighted = isEntryHighlighted(entry);
                        return (
                          <div
                            key={entry._id}
                            className={`group relative rounded-lg p-2.5 mb-1 cursor-pointer border transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${styles.bg} ${styles.border} ${!highlighted ? "opacity-30" : ""}`}
                            onClick={() => handleEdit(entry)}
                          >
                            <div
                              className={`font-bold text-sm truncate ${styles.text}`}
                            >
                              {entry.subject}
                            </div>
                            <div
                              className={`text-xs truncate mt-0.5 ${styles.subtext}`}
                            >
                              {getClassDisplay(entry)}
                            </div>
                            <div
                              className={`text-xs truncate flex items-center gap-1 mt-0.5 ${styles.subtext} opacity-75`}
                            >
                              <User className="h-3 w-3" />
                              {getTeacherDisplay(entry)}
                            </div>
                            {entry.room && (
                              <div
                                className={`text-[10px] flex items-center gap-0.5 mt-1 ${styles.subtext} opacity-60`}
                              >
                                <MapPin className="h-2.5 w-2.5" />
                                {entry.room}
                              </div>
                            )}
                            <div
                              className={`text-[10px] mt-1 ${styles.subtext} opacity-60`}
                            >
                              {entry.startTime} - {entry.endTime}
                            </div>
                            <button
                              className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${styles.text} hover:bg-white/50`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(entry);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== ADD ENTRY MODAL ========== */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-amber-600" />
              </div>
              Add Timetable Entry
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Schedule a class session. Subject &amp; teacher are auto-linked
              from class setup.
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={createEntryMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white hover:opacity-90"
              style={{ borderRadius: "0.75rem" }}
            >
              {createEntryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Entry"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== EDIT ENTRY MODAL ========== */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Edit className="h-5 w-5 text-amber-600" />
              </div>
              Edit Entry
              {selectedEntry?.entryId && (
                <span className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 text-white text-sm font-mono">
                  {selectedEntry.entryId}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateEntryMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white hover:opacity-90"
              style={{ borderRadius: "0.75rem" }}
            >
              {updateEntryMutation.isPending ? (
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

      {/* ========== DELETE CONFIRMATION ========== */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timetable Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this scheduled class? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntryMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedEntry?._id)
                  deleteEntryMutation.mutate(selectedEntry._id);
              }}
              disabled={deleteEntryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEntryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Entry"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== CLEAR CLASS SCHEDULE ========== */}
      <AlertDialog
        open={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear Entire Class Schedule?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete ALL timetable entries for the selected class. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleClearClassTimetable();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All Entries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========== BULK GENERATE MODAL ========== */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-amber-100 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              Bulk Generate Timetable
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select a class to auto-populate subjects &amp; teachers, then set
              days &amp; times for each.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Select Class</Label>
              <Select value={bulkClassId} onValueChange={setBulkClassId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose a class to generate timetable for" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.classTitle || cls.className} (
                      {cls.gradeLevel || cls.section})
                      {cls.subjects?.length
                        ? ` — ${cls.subjects.length} subjects`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class info summary */}
            {selectedBulkClass && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300">
                    {selectedBulkClass.classTitle}
                  </h4>
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                    {selectedBulkClass.gradeLevel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-amber-700 dark:text-amber-400">
                  <span>
                    Subjects:{" "}
                    {(selectedBulkClass.subjects || [])
                      .map((s: any) => s.name || s)
                      .join(", ")}
                  </span>
                  <span>|</span>
                  <span>
                    Days:{" "}
                    {(selectedBulkClass.days || []).join(", ") || "Not set"}
                  </span>
                  <span>|</span>
                  <span>
                    Room: {selectedBulkClass.roomNumber || "TBD"}
                  </span>
                </div>
              </div>
            )}

            {/* Bulk Entries */}
            {bulkEntries.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Schedule Entries ({bulkEntries.length})
                  </Label>
                  <Button variant="outline" size="sm" onClick={addBulkRow}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
                  </Button>
                </div>

                <div className="space-y-3">
                  {bulkEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border bg-background space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Entry {idx + 1}
                        </span>
                        <button
                          onClick={() => removeBulkRow(idx)}
                          className="text-destructive/70 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Subject *</Label>
                          <Select
                            value={entry.subject}
                            onValueChange={(v) =>
                              updateBulkRow(idx, "subject", v)
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {(selectedBulkClass?.subjects || []).map(
                                (s: any) => (
                                  <SelectItem
                                    key={s.name || s}
                                    value={s.name || s}
                                  >
                                    {s.name || s}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Teacher *</Label>
                          <Select
                            value={entry.teacherId}
                            onValueChange={(v) =>
                              updateBulkRow(idx, "teacherId", v)
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map((t: any) => (
                                <SelectItem key={t._id} value={t._id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Day *</Label>
                          <Select
                            value={entry.day}
                            onValueChange={(v) => updateBulkRow(idx, "day", v)}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Start Time *</Label>
                          <Select
                            value={entry.startTime}
                            onValueChange={(v) =>
                              updateBulkRow(idx, "startTime", v)
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Start" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">End Time *</Label>
                          <Select
                            value={entry.endTime}
                            onValueChange={(v) =>
                              updateBulkRow(idx, "endTime", v)
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="End" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.filter(
                                (t) =>
                                  !entry.startTime ||
                                  parseTimeToMinutes(t) >
                                    parseTimeToMinutes(entry.startTime),
                              ).map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Room</Label>
                          <Input
                            className="h-9 text-sm"
                            placeholder="Room"
                            value={entry.room}
                            onChange={(e) =>
                              updateBulkRow(idx, "room", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkGenerate}
              disabled={bulkGenerating || bulkEntries.length === 0}
              className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white hover:opacity-90"
              style={{ borderRadius: "0.75rem" }}
            >
              {bulkGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate {bulkEntries.length} Entries
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Timetable;
