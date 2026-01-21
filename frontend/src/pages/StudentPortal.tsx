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
import { Label } from "@/components/ui/label";
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
  Hourglass,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
        },
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

  // Handle refresh status
  const handleRefreshStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/student-portal/me`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.student);
        if (data.student.studentStatus === "Active") {
          toast.success("Your account has been approved!");
        } else {
          toast.info("Still pending approval");
        }
      }
    } catch (error) {
      toast.error("Failed to refresh status");
    }
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
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
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
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black relative overflow-hidden">
        {/* Subtle Background Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

        {/* Animated Glow Orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Login Card */}
        {/* Royal Glass Card */}
        <Card className="w-full max-w-md mx-4 bg-slate-900/40 backdrop-blur-xl border border-yellow-500/30 shadow-2xl shadow-yellow-900/20 relative z-10">
          <CardHeader className="space-y-4 text-center pt-8 pb-6">
            {/* Logo with Drop Shadow */}
            <div className="mx-auto">
              <img
                src="/logo.png"
                alt="Edwardian Academy Logo"
                className="h-24 w-24 object-contain mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              />
            </div>

            {/* Metallic Gold Title - Serif */}
            <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200">
              Edwardian Academy Student Portal
            </h1>

            {/* Script Subtitle */}
            <p className="text-lg italic font-serif text-yellow-100/60">
              Access Your Learning Dashboard
            </p>
          </CardHeader>

          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-yellow-100/80 flex items-center gap-2 font-medium"
                >
                  <User className="w-4 h-4 text-yellow-400/70" />
                  Student ID / Barcode ID
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your ID"
                  value={loginForm.username}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username: e.target.value })
                  }
                  required
                  disabled={loginMutation.isPending}
                  className="bg-blue-950/50 border-yellow-500/20 text-yellow-50 placeholder:text-yellow-100/30 focus:border-yellow-400 focus:ring-yellow-400/20 h-12"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-yellow-100/80 flex items-center gap-2 font-medium"
                >
                  <Lock className="w-4 h-4 text-yellow-400/70" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  required
                  disabled={loginMutation.isPending}
                  className="bg-blue-950/50 border-yellow-500/20 text-yellow-50 placeholder:text-yellow-100/30 focus:border-yellow-400 focus:ring-yellow-400/20 h-12"
                />
              </div>

              {/* Solid Gold Button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500 text-yellow-950 font-bold border-t border-yellow-300 shadow-lg shadow-yellow-600/30 transition-all duration-300"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <GraduationCap className="mr-2 h-5 w-5" />
                    Access Portal
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-yellow-100/40 italic mb-3">
                Your Journey to Excellence Starts Here
              </p>
              <p className="text-sm text-yellow-100/60">
                Don't have an account?{" "}
                <a
                  href="/register"
                  className="text-yellow-400 hover:text-yellow-300 underline"
                >
                  Register here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // VERIFICATION PENDING SCREEN - "The Digital Waiting Room"
  if (isLoggedIn && profile && profile.studentStatus !== "Active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black relative overflow-hidden">
        {/* Subtle Background Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

        {/* Animated Glow Orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Verification Pending Card */}
        <Card className="w-full max-w-2xl mx-4 bg-slate-900/40 backdrop-blur-xl border border-yellow-500/30 shadow-2xl shadow-yellow-900/20 relative z-10">
          <CardHeader className="space-y-6 text-center pt-10 pb-8">
            {/* Animated Hourglass Icon */}
            <div className="mx-auto">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 flex items-center justify-center mx-auto relative">
                <Hourglass className="h-16 w-16 text-yellow-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-ping"></div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200">
                Verification Pending
              </h1>
              <p className="text-xl italic font-serif text-yellow-100/60">
                Your Journey Awaits Approval
              </p>
            </div>
          </CardHeader>

          <CardContent className="pb-10 px-8">
            {/* Student Info */}
            <div className="bg-blue-950/30 border border-yellow-500/20 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center border-2 border-yellow-500/30">
                  <User className="h-8 w-8 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-yellow-100">
                    {profile.studentName || profile.name}
                  </h3>
                  <p className="text-sm text-yellow-100/60">
                    ID: {profile.barcodeId || profile.studentId}
                  </p>
                </div>
              </div>

              {profile.class && (
                <div className="flex items-center gap-2 text-sm text-yellow-100/70">
                  <GraduationCap className="h-4 w-4" />
                  <span>
                    Applied for: {profile.class} - {profile.group}
                  </span>
                </div>
              )}
            </div>

            {/* Message */}
            <div className="text-center space-y-4 mb-8">
              <p className="text-lg text-yellow-100/80 leading-relaxed">
                Your admission application is currently under review by our
                administration team.
              </p>
              <p className="text-yellow-100/60">
                Please wait for administration approval. You will be notified
                once your account is activated.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mt-4">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-yellow-100/70">
                  Status:{" "}
                  <span className="font-semibold text-yellow-400">
                    Pending Approval
                  </span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleRefreshStatus}
                className="flex-1 h-12 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500 text-yellow-950 font-bold border-t border-yellow-300 shadow-lg shadow-yellow-600/30 transition-all duration-300"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Refresh Status
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex-1 h-12 border-yellow-500/30 text-yellow-100 hover:bg-yellow-500/10 hover:text-yellow-50"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-yellow-100/40 italic">
                For any queries, please contact the administration office
              </p>
            </div>
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
              <p className="text-xs text-gray-500">
                {profile?.class} ({profile?.group})
              </p>
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
                  <h3 className="font-bold text-lg text-gray-900">
                    {profile?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    ID: {profile?.barcodeId || profile?.studentId}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {profile?.class} - {profile?.group}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Status */}
          <Card
            className={`border-0 shadow-sm ${
              profile?.feeStatus === "paid"
                ? "bg-emerald-50"
                : profile?.feeStatus === "partial"
                  ? "bg-amber-50"
                  : "bg-red-50"
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    profile?.feeStatus === "paid"
                      ? "bg-emerald-100"
                      : profile?.feeStatus === "partial"
                        ? "bg-amber-100"
                        : "bg-red-100"
                  }`}
                >
                  <CreditCard
                    className={`h-8 w-8 ${
                      profile?.feeStatus === "paid"
                        ? "text-emerald-600"
                        : profile?.feeStatus === "partial"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    Fee Status
                  </h3>
                  <p
                    className={`font-semibold ${
                      profile?.feeStatus === "paid"
                        ? "text-emerald-600"
                        : profile?.feeStatus === "partial"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
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
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeSubject === null
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
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  activeSubject === subject.name
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
                <h3 className="font-semibold text-gray-600 mb-1">
                  No Videos Yet
                </h3>
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
      <Dialog
        open={!!selectedVideo}
        onOpenChange={() => setSelectedVideo(null)}
      >
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
