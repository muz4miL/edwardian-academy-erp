/**
 * Student Portal - LMS Module
 * 
 * Student-facing dashboard for viewing subjects, videos, and fee status.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    GraduationCap,
    BookOpen,
    Play,
    Clock,
    CreditCard,
    User,
    LogOut,
    Loader2,
    Video,
    Eye,
    Lock,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface StudentProfile {
    _id: string;
    studentId: string;
    barcodeId: string;
    name: string;
    fatherName: string;
    class: string;
    group: string;
    subjects: Array<{ name: string; fee: number }>;
    photo?: string;
    email?: string;
    feeStatus: string;
    totalFee: number;
    paidAmount: number;
    balance: number;
    studentStatus: string;
    session?: { name: string; startDate: string; endDate: string };
}

interface VideoItem {
    _id: string;
    title: string;
    description?: string;
    url: string;
    thumbnail?: string;
    provider: string;
    duration?: number;
    subjectName: string;
    teacherName?: string;
    viewCount: number;
    formattedDuration?: string;
}

export default function StudentPortal() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [token, setToken] = useState<string | null>(null);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
    const [activeSubject, setActiveSubject] = useState<string | null>(null);

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async (data: typeof loginForm) => {
            const res = await fetch(`${API_BASE_URL}/api/student-portal/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Login failed");
            return result;
        },
        onSuccess: (data) => {
            setIsLoggedIn(true);
            setToken(data.token);
            setProfile(data.student);
            toast.success(data.message);
        },
        onError: (error: any) => {
            toast.error(error.message || "Login failed");
        },
    });

    // Fetch videos (only when logged in)
    const { data: videosData, isLoading: videosLoading } = useQuery({
        queryKey: ["student-videos", activeSubject, token],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (activeSubject) params.append("subject", activeSubject);

            const res = await fetch(
                `${API_BASE_URL}/api/student-portal/videos?${params}`,
                {
                    credentials: "include",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (!res.ok) throw new Error("Failed to fetch videos");
            return res.json();
        },
        enabled: isLoggedIn && !!token,
    });

    const videos: VideoItem[] = videosData?.data || [];
    const videosBySubject = videosData?.bySubject || {};

    // Record video view
    const viewMutation = useMutation({
        mutationFn: async (videoId: string) => {
            await fetch(`${API_BASE_URL}/api/student-portal/videos/${videoId}/view`, {
                method: "POST",
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            });
        },
    });

    // Handle login form submit
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginForm.username || !loginForm.password) {
            toast.error("Please enter username and password");
            return;
        }
        loginMutation.mutate(loginForm);
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/student-portal/logout`, {
                method: "POST",
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch {
            // Ignore errors
        }
        setIsLoggedIn(false);
        setToken(null);
        setProfile(null);
        setLoginForm({ username: "", password: "" });
    };

    // Handle video play
    const handlePlayVideo = (video: VideoItem) => {
        setSelectedVideo(video);
        viewMutation.mutate(video._id);
    };

    // Get video embed URL
    const getEmbedUrl = (video: VideoItem) => {
        if (video.provider === "youtube") {
            // Extract YouTube video ID
            const match = video.url.match(
                /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
            );
            if (match) {
                return `https://www.youtube.com/embed/${match[1]}`;
            }
        }
        return video.url;
    };

    // LOGIN SCREEN
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur">
                    <CardHeader className="text-center pb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <GraduationCap className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl">Student Portal</CardTitle>
                        <CardDescription>
                            Login to access your courses and videos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <Input
                                    placeholder="Barcode ID or Student ID"
                                    value={loginForm.username}
                                    onChange={(e) =>
                                        setLoginForm({ ...loginForm, username: e.target.value })
                                    }
                                    className="h-12"
                                />
                            </div>
                            <div>
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={loginForm.password}
                                    onChange={(e) =>
                                        setLoginForm({ ...loginForm, password: e.target.value })
                                    }
                                    className="h-12"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loginMutation.isPending}
                                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            >
                                {loginMutation.isPending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "Login"
                                )}
                            </Button>
                        </form>
                        <p className="text-center text-sm text-gray-500 mt-6">
                            Don't have an account?{" "}
                            <a href="/register" className="text-indigo-600 hover:underline">
                                Register here
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // DASHBOARD SCREEN
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">Edwardian Academy</h1>
                            <p className="text-xs text-gray-500">Student Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-medium text-gray-900">{profile?.name}</p>
                            <p className="text-xs text-gray-500">{profile?.class} ({profile?.group})</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Profile Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Student Info */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                {profile?.photo ? (
                                    <img
                                        src={profile.photo}
                                        alt={profile.name}
                                        className="h-16 w-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <User className="h-8 w-8 text-indigo-600" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{profile?.name}</h3>
                                    <p className="text-sm text-gray-500">ID: {profile?.barcodeId || profile?.studentId}</p>
                                    <Badge variant="secondary" className="mt-1">
                                        {profile?.class} - {profile?.group}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fee Status */}
                    <Card className={`border-0 shadow-sm ${profile?.feeStatus === "paid"
                            ? "bg-emerald-50"
                            : profile?.feeStatus === "partial"
                                ? "bg-amber-50"
                                : "bg-red-50"
                        }`}>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${profile?.feeStatus === "paid"
                                        ? "bg-emerald-100"
                                        : profile?.feeStatus === "partial"
                                            ? "bg-amber-100"
                                            : "bg-red-100"
                                    }`}>
                                    <CreditCard className={`h-8 w-8 ${profile?.feeStatus === "paid"
                                            ? "text-emerald-600"
                                            : profile?.feeStatus === "partial"
                                                ? "text-amber-600"
                                                : "text-red-600"
                                        }`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Fee Status</h3>
                                    <p className={`font-semibold ${profile?.feeStatus === "paid"
                                            ? "text-emerald-600"
                                            : profile?.feeStatus === "partial"
                                                ? "text-amber-600"
                                                : "text-red-600"
                                        }`}>
                                        {profile?.feeStatus?.toUpperCase()}
                                    </p>
                                    {(profile?.balance || 0) > 0 && (
                                        <p className="text-sm text-gray-600">
                                            Balance: PKR {profile?.balance.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Session Info */}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Clock className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Session</h3>
                                    <p className="text-sm text-gray-600">
                                        {profile?.session?.name || "Current Session"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {profile?.subjects?.length || 0} Subjects Enrolled
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* My Subjects */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-600" />
                        My Subjects
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => setActiveSubject(null)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${activeSubject === null
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 bg-white hover:border-indigo-200"
                                }`}
                        >
                            <p className="font-semibold text-gray-900">All Videos</p>
                            <p className="text-sm text-gray-500">{videos.length} videos</p>
                        </button>
                        {profile?.subjects?.map((subject) => (
                            <button
                                key={subject.name}
                                onClick={() => setActiveSubject(subject.name)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${activeSubject === subject.name
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-gray-200 bg-white hover:border-indigo-200"
                                    }`}
                            >
                                <p className="font-semibold text-gray-900">{subject.name}</p>
                                <p className="text-sm text-gray-500">
                                    {videosBySubject[subject.name]?.length || 0} videos
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Video Library */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Video className="h-5 w-5 text-indigo-600" />
                        Video Library
                    </h2>

                    {videosLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : videos.length === 0 ? (
                        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
                            <CardContent className="py-12 text-center">
                                <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="font-semibold text-gray-600 mb-1">No Videos Yet</h3>
                                <p className="text-sm text-gray-500">
                                    Videos for your subjects will appear here
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.map((video) => (
                                <Card
                                    key={video._id}
                                    className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => handlePlayVideo(video)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-video bg-gray-900">
                                        {video.thumbnail ? (
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Play className="h-12 w-12 text-white/50" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                                                <Play className="h-6 w-6 text-indigo-600 ml-1" />
                                            </div>
                                        </div>
                                        {video.formattedDuration && (
                                            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                                {video.formattedDuration}
                                            </span>
                                        )}
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
                                            {video.title}
                                        </h3>
                                        <div className="flex items-center justify-between text-sm text-gray-500">
                                            <Badge variant="secondary" className="text-xs">
                                                {video.subjectName}
                                            </Badge>
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3.5 w-3.5" />
                                                {video.viewCount}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Video Player Modal */}
            <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-2xl">
                    <div className="aspect-video bg-black">
                        {selectedVideo && (
                            <iframe
                                src={getEmbedUrl(selectedVideo)}
                                title={selectedVideo.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                    <div className="p-6">
                        <h3 className="font-bold text-xl text-gray-900 mb-2">
                            {selectedVideo?.title}
                        </h3>
                        {selectedVideo?.description && (
                            <p className="text-gray-600">{selectedVideo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-4">
                            <Badge variant="secondary">{selectedVideo?.subjectName}</Badge>
                            {selectedVideo?.teacherName && (
                                <span className="text-sm text-gray-500">
                                    By {selectedVideo.teacherName}
                                </span>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
