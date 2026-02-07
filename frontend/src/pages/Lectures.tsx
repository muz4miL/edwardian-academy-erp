/**
 * Lectures Dashboard - Teacher Video Management
 * Teachers can upload, manage, and organize YouTube lecture videos
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Video,
    Plus,
    Trash2,
    Pencil,
    Play,
    Eye,
    Loader2,
    Youtube,
    BookOpen,
    GraduationCap,
    Lock,
    Unlock,
    ExternalLink,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Lecture {
    _id: string;
    title: string;
    youtubeUrl: string;
    youtubeId: string;
    description: string;
    classRef: {
        _id: string;
        name?: string;
        className?: string;
        classTitle?: string;
        grade?: string;
        section?: string;
        group?: string;
        gradeLevel?: string;
    };
    teacherRef: {
        _id: string;
        fullName: string;
    };
    subject: string;
    gradeLevel: string;
    isLocked: boolean;
    viewCount: number;
    thumbnailUrl: string;
    createdAt: string;
}

interface ClassOption {
    _id: string;
    name: string;
    grade?: string;
}

// Common subjects for dropdown
const SUBJECT_OPTIONS = [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
    "English",
    "Urdu",
    "Computer Science",
    "Islamiat",
    "Pakistan Studies",
    "General Science",
    "Other",
];

// Grade level options (matching Class model enum)
const GRADE_LEVEL_OPTIONS = [
    "9th Grade",
    "10th Grade",
    "11th Grade",
    "12th Grade",
    "MDCAT Prep",
    "ECAT Prep",
    "Tuition Classes",
];

export default function Lectures() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Modal states
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [playerModalOpen, setPlayerModalOpen] = useState(false);
    const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

    // Form states
    const [formTitle, setFormTitle] = useState("");
    const [formUrl, setFormUrl] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formClass, setFormClass] = useState("");
    const [formSubject, setFormSubject] = useState("");
    const [formGradeLevel, setFormGradeLevel] = useState("");
    const [formIsLocked, setFormIsLocked] = useState(false);

    // Preview states
    const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);
    const [previewValid, setPreviewValid] = useState<boolean | null>(null);
    const [validating, setValidating] = useState(false);

    // Fetch lectures based on user role
    const { data: lecturesData, isLoading } = useQuery({
        queryKey: ["lectures", user?.role],
        queryFn: async () => {
            let endpoint = "";
            
            // Role-based endpoint selection
            if (user?.role === "OWNER") {
                // OWNER: Get all lectures (God Mode)
                endpoint = `${API_BASE_URL}/lectures`;
            } else {
                // TEACHER/STAFF/PARTNER: View all lectures (but can't edit)
                endpoint = `${API_BASE_URL}/lectures/my-lectures`;
            }
            
            const res = await fetch(endpoint, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch lectures");
            return res.json();
        },
    });

    // Fetch classes for dropdown - RAW DATA (No Filters!)
    const { data: classesData } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/classes`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        },
    });

    // Fetch master subjects from config
    const { data: configData } = useQuery({
        queryKey: ["config"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/config`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch configuration");
            return res.json();
        },
    });

    const lectures: Lecture[] = lecturesData?.data || [];
    const allRawClasses = classesData?.data || [];
    console.log("🔥 DEBUG CLASSES:", allRawClasses); // Debug log
    console.log("📊 Class count:", allRawClasses.length);
    const configSubjects: string[] = configData?.data?.defaultSubjectFees?.map((s: any) => s.name) || [];

    // Combine config subjects with fallbacks if config is empty
    const subjects = configSubjects.length > 0 ? configSubjects : SUBJECT_OPTIONS;

    // Validate YouTube URL
    const validateUrl = async (url: string) => {
        if (!url.trim()) {
            setPreviewThumbnail(null);
            setPreviewValid(null);
            return;
        }

        setValidating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/lectures/validate-url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (data.valid) {
                setPreviewThumbnail(data.thumbnailUrl);
                setPreviewValid(true);
            } else {
                setPreviewThumbnail(null);
                setPreviewValid(false);
            }
        } catch {
            setPreviewValid(false);
            setPreviewThumbnail(null);
        }
        setValidating(false);
    };

    // Debounce URL validation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formUrl) validateUrl(formUrl);
        }, 500);
        return () => clearTimeout(timer);
    }, [formUrl]);

    // Create lecture mutation
    const createMutation = useMutation({
        mutationFn: async (lectureData: any) => {
            const res = await fetch(`${API_BASE_URL}/lectures`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(lectureData),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to create lecture");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["lectures"] });
            toast.success("Lecture Created", { description: data.message });
            setAddModalOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error("Failed to Create Lecture", { description: error.message });
        },
    });

    // Update lecture mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, lectureData }: { id: string; lectureData: any }) => {
            const res = await fetch(`${API_BASE_URL}/lectures/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(lectureData),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update lecture");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["lectures"] });
            toast.success("Lecture Updated", { description: data.message });
            setEditModalOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast.error("Failed to Update Lecture", { description: error.message });
        },
    });

    // Delete lecture mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE_URL}/lectures/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to delete lecture");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["lectures"] });
            toast.success("Lecture Deleted", { description: data.message });
            setDeleteConfirmOpen(false);
            setSelectedLecture(null);
        },
        onError: (error: any) => {
            toast.error("Failed to Delete Lecture", { description: error.message });
        },
    });

    const resetForm = () => {
        setFormTitle("");
        setFormUrl("");
        setFormDescription("");
        setFormClass("");
        setFormSubject("");
        setFormGradeLevel("");
        setFormIsLocked(false);
        setPreviewThumbnail(null);
        setPreviewValid(null);
        setSelectedLecture(null);
    };

    const handleAddLecture = () => {
        if (!formTitle || !formUrl || !formClass || !formSubject || !formGradeLevel) {
            toast.error("Missing Fields", {
                description: "Please fill in all required fields",
            });
            return;
        }
        if (!previewValid) {
            toast.error("Invalid URL", {
                description: "Please provide a valid YouTube URL",
            });
            return;
        }

        createMutation.mutate({
            title: formTitle,
            youtubeUrl: formUrl,
            description: formDescription,
            classRef: formClass,
            subject: formSubject,
            gradeLevel: formGradeLevel,
            isLocked: formIsLocked,
        });
    };

    const handleEditLecture = () => {
        if (!selectedLecture || !formTitle || !formClass || !formSubject || !formGradeLevel) {
            toast.error("Missing Fields", {
                description: "Please fill in required fields",
            });
            return;
        }

        updateMutation.mutate({
            id: selectedLecture._id,
            lectureData: {
                title: formTitle,
                youtubeUrl: formUrl,
                description: formDescription,
                classRef: formClass,
                subject: formSubject,
                gradeLevel: formGradeLevel,
                isLocked: formIsLocked,
            },
        });
    };

    const openEditModal = (lecture: Lecture) => {
        setSelectedLecture(lecture);
        setFormTitle(lecture.title);
        setFormUrl(lecture.youtubeUrl);
        setFormDescription(lecture.description);
        setFormClass(lecture.classRef._id);
        setFormSubject(lecture.subject);
        setFormGradeLevel(lecture.gradeLevel);
        setFormIsLocked(lecture.isLocked);
        setPreviewThumbnail(lecture.thumbnailUrl);
        setPreviewValid(true);
        setEditModalOpen(true);
    };

    const openPlayerModal = (lecture: Lecture) => {
        setSelectedLecture(lecture);
        setPlayerModalOpen(true);
    };

    const handleIncrementView = async (lectureId: string) => {
        try {
            await fetch(`${API_BASE_URL}/lectures/${lectureId}/view`, {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Failed to increment view count:", error);
        }
    };

    // Group lectures by subject for display
    const groupedLectures = lectures.reduce((acc, lecture) => {
        const subject = lecture.subject || "General";
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(lecture);
        return acc;
    }, {} as Record<string, Lecture[]>);

    return (
        <DashboardLayout title="Lectures">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Video className="h-6 w-6 text-primary" />
                            Video Lectures
                        </h1>
                        <p className="text-muted-foreground">
                            {user?.role === "OWNER"
                                ? "🎥 All lectures (Waqar's Dashboard)"
                                : "🎥 View all lectures (Contact Waqar for changes)"}
                        </p>
                    </div>
                    {user?.role === "OWNER" && (
                        <Button
                            onClick={() => {
                                resetForm();
                                setAddModalOpen(true);
                            }}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Lecture
                        </Button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Video className="h-8 w-8 text-red-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {user?.role === "TEACHER" ? "Available Lectures" : "Total Lectures"}
                                    </p>
                                    <p className="text-2xl font-bold">{lectures.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <BookOpen className="h-8 w-8 text-blue-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Subjects</p>
                                    <p className="text-2xl font-bold">{Object.keys(groupedLectures).length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Eye className="h-8 w-8 text-green-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Views</p>
                                    <p className="text-2xl font-bold">
                                        {lectures.reduce((sum, l) => sum + (l.viewCount || 0), 0)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <Lock className="h-8 w-8 text-amber-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Locked</p>
                                    <p className="text-2xl font-bold">
                                        {lectures.filter((l) => l.isLocked).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lectures Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : lectures.length === 0 ? (
                    <Card className="py-16">
                        <div className="text-center">
                            <Youtube className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Lectures Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Start building your video library by adding YouTube lectures
                            </p>
                            <Button onClick={() => setAddModalOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Your First Lecture
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedLectures).map(([subject, subjectLectures]) => (
                            <div key={subject}>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                    {subject}
                                    <Badge variant="secondary" className="ml-2">
                                        {subjectLectures.length}
                                    </Badge>
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {subjectLectures.map((lecture) => (
                                        <Card
                                            key={lecture._id}
                                            className="overflow-hidden hover:shadow-lg transition-shadow group"
                                        >
                                            {/* Thumbnail */}
                                            <div
                                                className="relative aspect-video bg-gray-100 cursor-pointer"
                                                onClick={() => openPlayerModal(lecture)}
                                            >
                                                <img
                                                    src={lecture.thumbnailUrl}
                                                    alt={lecture.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            "https://via.placeholder.com/320x180?text=No+Thumbnail";
                                                    }}
                                                />
                                                {/* Play overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center">
                                                        <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
                                                    </div>
                                                </div>
                                                {/* Locked badge */}
                                                {lecture.isLocked && (
                                                    <div className="absolute top-2 right-2">
                                                        <Badge className="bg-amber-500 text-white gap-1">
                                                            <Lock className="h-3 w-3" />
                                                            Locked
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <CardContent className="p-4">
                                                <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                                                    {lecture.title}
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                                                    <Eye className="h-3 w-3" />
                                                    <span>{lecture.viewCount || 0} views</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => openEditModal(lecture)}
                                                    >
                                                        <Pencil className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            setSelectedLecture(lecture);
                                                            setDeleteConfirmOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Lecture Modal */}
<Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
  <DialogContent className="max-w-5xl w-[90vw] h-[90vh] overflow-hidden">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Youtube className="h-5 w-5 text-red-600" />
        Add New Lecture
      </DialogTitle>
      <DialogDescription>
        Paste a YouTube link to add a video lecture
      </DialogDescription>
    </DialogHeader>
    
    <div className="flex h-[calc(100%-6rem)] overflow-hidden">
      {/* Left side - Video preview */}
      <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
        <div className="space-y-4">
          {/* YouTube URL with Preview */}
          <div className="space-y-2">
            <Label>YouTube URL *</Label>
            <div className="relative">
              <Input
                placeholder="https://youtu.be/... or youtube.com/watch?v=..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className={
                  previewValid === false
                    ? "border-red-500"
                    : previewValid === true
                    ? "border-green-500"
                    : ""
                }
              />
              {validating && (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />
              )}
            </div>
            {previewValid === false && (
              <p className="text-xs text-red-500">Invalid YouTube URL</p>
            )}
          </div>
          
          {/* Thumbnail Preview - FIXED SIZE */}
          <div className="relative w-full h-[300px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {previewThumbnail ? (
              <>
                <img
                  src={previewThumbnail}
                  alt="Video Preview"
                  className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Center Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                </div>
              </>
            ) : (
              /* Placeholder when no valid URL is entered */
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Video className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm font-medium">Enter YouTube URL to see preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side - Form fields */}
      <div className="w-1/2 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              placeholder="e.g., Physics Chapter 1 - Kinematics"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {allRawClasses.length > 0 ? (
                    allRawClasses.map((cls: any) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.classTitle || cls.className || cls.name || `Class ${cls._id}`}
                        {cls.section ? ` - ${cls.section}` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">
                      No classes found (Count: {allRawClasses.length})
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Grade Level *</Label>
              <Select value={formGradeLevel} onValueChange={setFormGradeLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
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
              <Label>Subject *</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Brief description of the lecture content..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLocked"
              checked={formIsLocked}
              onChange={(e) => setFormIsLocked(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isLocked" className="cursor-pointer">
              Lock this lecture (hidden from students)
            </Label>
          </div>
        </div>
      </div>
    </div>
    
    <DialogFooter className="border-t pt-6 mt-4">
      <Button variant="outline" onClick={() => setAddModalOpen(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleAddLecture}
        disabled={createMutation.isPending || !previewValid}
        className="gap-2"
      >
        {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        <Video className="h-4 w-4" />
        Add Lecture
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Edit Lecture Modal */}
<Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
  <DialogContent className="max-w-5xl w-[90vw] h-[90vh] overflow-hidden">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Pencil className="h-5 w-5" />
        Edit Lecture
      </DialogTitle>
      <DialogDescription>Update lecture details</DialogDescription>
    </DialogHeader>
    
    <div className="flex h-[calc(100%-6rem)] overflow-hidden">
      {/* Left side - Video preview */}
      <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
        <div className="space-y-4">
          {previewThumbnail && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={previewThumbnail}
                alt="Video preview"
                className="w-full aspect-video object-cover"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>YouTube URL</Label>
            <Input
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Right side - Form fields */}
      <div className="w-1/2 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={formClass} onValueChange={setFormClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allRawClasses.length > 0 ? (
                    allRawClasses.map((cls: any) => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.classTitle || cls.className || cls.name || `Class ${cls._id}`}
                        {cls.section ? ` - ${cls.section}` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">
                      No classes found (Count: {allRawClasses.length})
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Grade Level *</Label>
              <Select value={formGradeLevel} onValueChange={setFormGradeLevel}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Subject *</Label>
              <Select value={formSubject} onValueChange={setFormSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsLocked"
              checked={formIsLocked}
              onChange={(e) => setFormIsLocked(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="editIsLocked" className="cursor-pointer">
              Lock this lecture
            </Label>
          </div>
        </div>
      </div>
    </div>
    
    <DialogFooter className="border-t pt-6 mt-4">
      <Button variant="outline" onClick={() => setEditModalOpen(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleEditLecture}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

            {/* Secure Video Player Modal */}
            <VideoPlayerModal
                lecture={selectedLecture}
                isOpen={playerModalOpen}
                onClose={() => setPlayerModalOpen(false)}
                onIncrementView={handleIncrementView}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Lecture?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedLecture?.title}"? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => selectedLecture && deleteMutation.mutate(selectedLecture._id)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
