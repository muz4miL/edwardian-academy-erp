/**
 * Student Classroom - Netflix-Style Video Learning Portal
 * Students view lecture videos assigned to their class
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    Video,
    Play,
    Eye,
    Loader2,
    GraduationCap,
    BookOpen,
    ArrowLeft,
    X,
    Clock,
    User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Lecture {
    _id: string;
    title: string;
    youtubeId: string;
    description: string;
    classRef: {
        _id: string,
        name?: string,
        className?: string,
        classTitle?: string,
        grade?: string,
        section?: string,
    };
    teacherRef: {
        fullName: string;
    };
    subject: string;
    viewCount: number;
    thumbnailUrl: string;
    createdAt: string;
}

interface StudentClassroomProps {
    studentId: string;
    studentName?: string;
    onBack?: () => void;
}

export default function StudentClassroom({
    studentId,
    studentName,
    onBack,
}: StudentClassroomProps) {
    const navigate = useNavigate();
    const [playerModalOpen, setPlayerModalOpen] = useState(false);
    const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

    // Fetch student's classroom lectures
    const { data: lecturesData, isLoading, error } = useQuery({
        queryKey: ["classroom-lectures", studentId],
        queryFn: async () => {
            const res = await fetch(
                `${API_BASE_URL}/lectures/my-classroom?studentId=${studentId}`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error("Failed to fetch lectures");
            return res.json();
        },
        enabled: !!studentId,
    });

    // Increment view count
    const viewMutation = useMutation({
        mutationFn: async (lectureId: string) => {
            const res = await fetch(`${API_BASE_URL}/lectures/${lectureId}/view`, {
                method: "POST",
                credentials: "include",
            });
            return res.json();
        },
    });

    const lectures: Lecture[] = lecturesData?.data || [];
    const groupedLectures: Record<string, Lecture[]> = lecturesData?.grouped || {};
    const className = lecturesData?.className || "My Classroom";

    const openPlayer = (lecture: Lecture) => {
        setSelectedLecture(lecture);
        setPlayerModalOpen(true);
        viewMutation.mutate(lecture._id);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("en-PK", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack || (() => navigate(-1))}
                                className="text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                                    <GraduationCap className="h-6 w-6 text-primary" />
                                    {className}
                                </h1>
                                {studentName && (
                                    <p className="text-sm text-slate-400">Welcome, {studentName}</p>
                                )}
                            </div>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                            {lectures.length} Lectures
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-slate-400">Loading your classroom...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <Video className="h-16 w-16 mx-auto text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Unable to Load Classroom
                        </h3>
                        <p className="text-slate-400">Please try again later</p>
                    </div>
                ) : lectures.length === 0 ? (
                    <div className="text-center py-20">
                        <Video className="h-20 w-20 mx-auto text-slate-600 mb-4" />
                        <h3 className="text-2xl font-semibold text-white mb-2">
                            No Lectures Available Yet
                        </h3>
                        <p className="text-slate-400 max-w-md mx-auto">
                            Your teachers haven't uploaded any video lectures for your class yet.
                            Check back soon!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(groupedLectures).map(([subject, subjectLectures]) => (
                            <div key={subject}>
                                {/* Subject Header */}
                                <div className="flex items-center gap-3 mb-5">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                    <h2 className="text-xl font-bold text-white">{subject}</h2>
                                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                                        {subjectLectures.length} videos
                                    </Badge>
                                </div>

                                {/* Horizontal Scroll Container */}
                                <div className="relative -mx-4 px-4">
                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                        {subjectLectures.map((lecture) => (
                                            <div
                                                key={lecture._id}
                                                className="flex-shrink-0 w-72 sm:w-80"
                                            >
                                                <Card
                                                    className="bg-slate-800/50 border-slate-700/50 overflow-hidden hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
                                                    onClick={() => openPlayer(lecture)}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="relative aspect-video bg-slate-900">
                                                        <img
                                                            src={lecture.thumbnailUrl}
                                                            alt={lecture.title}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src =
                                                                    "https://via.placeholder.com/320x180/1e293b/64748b?text=Video";
                                                            }}
                                                        />
                                                        {/* Play overlay */}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="h-16 w-16 rounded-full bg-red-600 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
                                                                <Play
                                                                    className="h-8 w-8 text-white ml-1"
                                                                    fill="currentColor"
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* View count */}
                                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                            <Eye className="h-3 w-3" />
                                                            {lecture.viewCount || 0}
                                                        </div>
                                                    </div>

                                                    <CardContent className="p-4">
                                                        <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                                                            {lecture.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                                            <User className="h-3 w-3" />
                                                            <span className="truncate">
                                                                {lecture.teacherRef?.fullName || "Teacher"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatDate(lecture.createdAt)}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            <Dialog open={playerModalOpen} onOpenChange={setPlayerModalOpen}>
                <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-slate-700">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 z-10 bg-black/60 hover:bg-black/80 text-white rounded-full"
                            onClick={() => setPlayerModalOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        {selectedLecture && (
                            <div className="aspect-video">
                                <iframe
                                    src={`https://www.youtube.com/embed/${selectedLecture.youtubeId}?rel=0&modestbranding=1&autoplay=1`}
                                    title={selectedLecture.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>
                        )}
                    </div>
                    {selectedLecture && (
                        <div className="p-5 bg-slate-900 border-t border-slate-700">
                            <h3 className="font-bold text-xl text-white mb-2">
                                {selectedLecture.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                <Badge className="bg-primary/20 text-primary border-0">
                                    {selectedLecture.subject}
                                </Badge>
                                <span className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {selectedLecture.teacherRef?.fullName}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye className="h-4 w-4" />
                                    {selectedLecture.viewCount} views
                                </span>
                            </div>
                            {selectedLecture.description && (
                                <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                                    {selectedLecture.description}
                                </p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
