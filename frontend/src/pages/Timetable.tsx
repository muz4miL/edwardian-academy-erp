import { useState } from "react";
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
import { Clock, Plus, Loader2, Edit, Trash2, MapPin, Search, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableApi, classApi, teacherApi } from "@/lib/api";
import { toast } from "sonner";

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time slots for the grid
const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
];

// Subject options
const SUBJECTS = ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'English'];

// TASK 1: Subject-specific pastel colors
const getSubjectStyles = (subject: string) => {
  const subjectLower = subject?.toLowerCase() || '';

  if (subjectLower.includes('biology')) {
    return {
      bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
      border: 'border-emerald-300',
      text: 'text-emerald-800',
      subtext: 'text-emerald-600',
    };
  }
  if (subjectLower.includes('physics')) {
    return {
      bg: 'bg-gradient-to-br from-amber-100 to-amber-200',
      border: 'border-amber-300',
      text: 'text-sky-800',
      subtext: 'text-amber-600',
    };
  }
  if (subjectLower.includes('math')) {
    return {
      bg: 'bg-gradient-to-br from-purple-100 to-purple-200',
      border: 'border-purple-300',
      text: 'text-purple-800',
      subtext: 'text-purple-600',
    };
  }
  if (subjectLower.includes('english')) {
    return {
      bg: 'bg-gradient-to-br from-rose-100 to-rose-200',
      border: 'border-rose-300',
      text: 'text-rose-800',
      subtext: 'text-rose-600',
    };
  }
  if (subjectLower.includes('chemistry')) {
    return {
      bg: 'bg-gradient-to-br from-amber-100 to-amber-200',
      border: 'border-amber-300',
      text: 'text-amber-800',
      subtext: 'text-amber-600',
    };
  }
  // Default sky blue
  return {
    bg: 'bg-gradient-to-br from-slate-100 to-slate-200',
    border: 'border-slate-300',
    text: 'text-slate-800',
    subtext: 'text-slate-600',
  };
};

const Timetable = () => {
  const queryClient = useQueryClient();

  // TASK 2: Speed-Search filter state
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  // Form states
  const [formClassId, setFormClassId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formRoom, setFormRoom] = useState("");

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

  // Create mutation
  const createEntryMutation = useMutation({
    mutationFn: timetableApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      toast.success("Entry Created", { description: "Timetable entry added successfully." });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create entry", { description: error.message });
    },
  });

  // Update mutation
  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => timetableApi.update(id, data),
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

  // Delete mutation
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
    if (!formClassId || !formTeacherId || !formSubject || !formDay || !formStartTime || !formEndTime) {
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

  // Group entries by day for grid view
  const getEntriesForDayAndTime = (day: string, timeSlot: string) => {
    return entries.filter((entry: any) => {
      return entry.day === day && entry.startTime === timeSlot;
    });
  };

  // Get class display name
  const getClassDisplay = (entry: any) => {
    if (entry.classId && typeof entry.classId === 'object') {
      return `${entry.classId.className} - ${entry.classId.section}`;
    }
    return 'Unknown Class';
  };

  // Get teacher display name
  const getTeacherDisplay = (entry: any) => {
    if (entry.teacherId && typeof entry.teacherId === 'object') {
      return entry.teacherId.name;
    }
    return 'Unknown Teacher';
  };

  // TASK 2: Check if entry matches search term
  const isEntryHighlighted = (entry: any) => {
    if (!searchTerm.trim()) return true; // No search = all highlighted

    const term = searchTerm.toLowerCase();
    const teacherName = getTeacherDisplay(entry).toLowerCase();
    const className = getClassDisplay(entry).toLowerCase();
    const subject = (entry.subject || '').toLowerCase();

    return teacherName.includes(term) || className.includes(term) || subject.includes(term);
  };

  return (
    <DashboardLayout title="Timetable">
      <HeaderBanner
        title="Weekly Timetable"
        subtitle={`Total Entries: ${entries.length}`}
      >
        <Button
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          style={{ borderRadius: "0.75rem" }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </HeaderBanner>

      {/* TASK 2: Speed-Search Filter */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by teacher, class, or subject..."
            className="pl-9 bg-card border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-muted-foreground">
            Highlighting: <span className="font-semibold text-amber-600">"{searchTerm}"</span>
          </p>
        )}
      </div>

      {/* Subject Color Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Subject Colors:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-100 to-emerald-200 border border-emerald-300"></div>
          <span>Biology</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300"></div>
          <span>Physics</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300"></div>
          <span>Mathematics</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-rose-100 to-rose-200 border border-rose-300"></div>
          <span>English</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300"></div>
          <span>Chemistry</span>
        </div>
      </div>

      {/* Weekly Grid View */}
      <div className="mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="min-w-[1000px] rounded-xl border border-border bg-card overflow-hidden">
            {/* Grid Header - Days */}
            <div className="grid grid-cols-7 bg-gradient-to-r from-amber-600 to-yellow-500 text-white">
              <div className="p-3 text-center font-semibold border-r border-amber-500">
                <Clock className="h-4 w-4 mx-auto mb-1" />
                Time
              </div>
              {DAYS.map((day) => (
                <div key={day} className="p-3 text-center font-semibold border-r border-amber-500 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Time Slots Rows */}
            {TIME_SLOTS.map((timeSlot, idx) => (
              <div
                key={timeSlot}
                className={`grid grid-cols-7 border-b border-border last:border-b-0 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}`}
              >
                {/* Time Column */}
                <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border bg-slate-100 dark:bg-slate-800">
                  {timeSlot}
                </div>

                {/* Day Columns */}
                {DAYS.map((day) => {
                  const dayEntries = getEntriesForDayAndTime(day, timeSlot);

                  return (
                    <div key={`${day}-${timeSlot}`} className="p-1 min-h-[90px] border-r border-border last:border-r-0">
                      {dayEntries.map((entry: any) => {
                        const styles = getSubjectStyles(entry.subject);
                        const isHighlighted = isEntryHighlighted(entry);

                        return (
                          <div
                            key={entry._id}
                            className={`group relative rounded-lg p-2.5 mb-1 cursor-pointer border transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${styles.bg} ${styles.border} ${!isHighlighted ? 'opacity-30' : ''
                              }`}
                            onClick={() => handleEdit(entry)}
                          >
                            {/* Subject - Bold */}
                            <div className={`font-bold text-sm truncate ${styles.text}`}>
                              {entry.subject}
                            </div>

                            {/* Class */}
                            <div className={`text-xs truncate mt-0.5 ${styles.subtext}`}>
                              {getClassDisplay(entry)}
                            </div>

                            {/* Teacher - Secondary */}
                            <div className={`text-xs truncate flex items-center gap-1 mt-0.5 ${styles.subtext} opacity-75`}>
                              <User className="h-3 w-3" />
                              {getTeacherDisplay(entry)}
                            </div>

                            {/* Room with Location Icon */}
                            {entry.room && (
                              <div className={`text-[10px] flex items-center gap-0.5 mt-1 ${styles.subtext} opacity-60`}>
                                <MapPin className="h-2.5 w-2.5" />
                                {entry.room}
                              </div>
                            )}

                            {/* Time Range */}
                            <div className={`text-[10px] mt-1 ${styles.subtext} opacity-60`}>
                              {entry.startTime} - {entry.endTime}
                            </div>

                            {/* Delete button on hover */}
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

      {/* Add Entry Modal */}
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
              Schedule a class for a specific day and time.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.className} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teacher *</Label>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={formSubject} onValueChange={setFormSubject}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
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
                    {TIME_SLOTS.map((time) => (
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
                placeholder="e.g., Room 101"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={createEntryMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white hover:bg-sky-700"
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

      {/* Edit Entry Modal */}
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

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={formClassId} onValueChange={setFormClassId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls: any) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.className} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teacher *</Label>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={formSubject} onValueChange={setFormSubject}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
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
                    {TIME_SLOTS.map((time) => (
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
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateEntryMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white hover:bg-sky-700"
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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timetable Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this scheduled class? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntryMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedEntry?._id) deleteEntryMutation.mutate(selectedEntry._id);
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
    </DashboardLayout>
  );
};

export default Timetable;
