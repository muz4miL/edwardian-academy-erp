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
import { cn } from "@/lib/utils";
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
                    {profile.name}
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

  // DASHBOARD SCREEN - "The Premium LMS Experience"
  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg tracking-tight text-white">Edwardian Academy</h1>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Student Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-semibold text-white">{profile?.name}</p>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
                  {profile?.class} • {profile?.group}
                </p>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10 relative z-10">
        {/* Welcome Section */}
        <section className="mb-12">
          <h2 className="text-4xl font-serif font-bold text-white mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{profile?.name.split(' ')[0]}</span>.
          </h2>
          <p className="text-slate-400 text-lg">Continue your learning journey today.</p>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Quick Profile */}
          <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 flex items-center gap-6 backdrop-blur-md hover:bg-white/[0.05] transition-colors">
            <div className="h-20 w-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <User className="h-10 w-10 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Student ID</p>
              <h3 className="text-2xl font-mono font-bold text-white">
                {profile?.barcodeId || profile?.studentId}
              </h3>
              <p className="text-sm text-slate-400 mt-1">{profile?.class}</p>
            </div>
          </div>

          {/* Fee Status */}
          <div className={cn(
            "rounded-[2rem] p-8 flex items-center gap-6 backdrop-blur-md border transition-all duration-500",
            profile?.feeStatus === "paid"
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}>
            <div className={cn(
              "h-20 w-20 rounded-2xl flex items-center justify-center border",
              profile?.feeStatus === "paid"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            )}>
              <CreditCard className={cn(
                "h-10 w-10",
                profile?.feeStatus === "paid" ? "text-emerald-400" : "text-red-400"
              )} />
            </div>
            <div>
              <p className={cn(
                "text-xs font-bold uppercase tracking-widest mb-1",
                profile?.feeStatus === "paid" ? "text-emerald-400" : "text-red-400"
              )}>Financial Status</p>
              <h3 className="text-2xl font-bold text-white capitalize">
                {profile?.feeStatus}
              </h3>
              {(profile?.balance || 0) > 0 ? (
                <p className="text-sm text-red-400/80 mt-1 font-medium italic">
                  Outstanding: PKR {profile?.balance.toLocaleString()}
                </p>
              ) : (
                <p className="text-sm text-emerald-400/80 mt-1 font-medium">All dues cleared</p>
              )}
            </div>
          </div>

          {/* Session Progress */}
          <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 flex items-center gap-6 backdrop-blur-md">
            <div className="h-20 w-20 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
              <Clock className="h-10 w-10 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Active Session</p>
              <h3 className="text-2xl font-bold text-white">
                {profile?.session?.name || "Academic '26"}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {profile?.subjects?.length || 0} Subjects Enrolled
              </p>
            </div>
          </div>
        </div>

        {/* Browser Section */}
        <div className="flex flex-col gap-12">
          {/* Subject Navigation */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6 px-2 flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-indigo-500" />
              Course Categories
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
              <button
                onClick={() => setActiveSubject(null)}
                className={cn(
                  "px-8 py-4 rounded-2xl whitespace-nowrap font-semibold transition-all duration-300 border",
                  activeSubject === null
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20 translate-y-[-2px]"
                    : "bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.07] hover:border-white/10"
                )}
              >
                All Courses
              </button>
              {profile?.subjects?.map((subject) => (
                <button
                  key={subject.name}
                  onClick={() => setActiveSubject(subject.name)}
                  className={cn(
                    "px-8 py-4 rounded-2xl whitespace-nowrap font-semibold transition-all duration-300 border",
                    activeSubject === subject.name
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20 translate-y-[-2px]"
                      : "bg-white/[0.03] text-slate-400 border-white/5 hover:bg-white/[0.07] hover:border-white/10"
                  )}
                >
                  {subject.name}
                </button>
              ))}
            </div>
          </div>

          {/* Video Library */}
          <div>
            <div className="flex items-center justify-between mb-8 px-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Video className="h-6 w-6 text-indigo-500" />
                Lecture Library
                {activeSubject && <span className="text-slate-500 font-normal ml-2">in {activeSubject}</span>}
              </h3>
              <Badge variant="outline" className="bg-indigo-500/5 text-indigo-400 border-indigo-500/20 px-4 py-1.5 rounded-full">
                {videos.length} Lectures Available
              </Badge>
            </div>

            {videosLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                <p className="text-slate-500 font-medium italic">Streaming data from server...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem] py-24 text-center">
                <Video className="h-20 w-20 text-slate-800 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-400 mb-2">No Content Found</h3>
                <p className="text-slate-600 max-w-sm mx-auto">
                  There are currently no recorded lectures for this category. Please check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {videos.map((video) => (
                  <div
                    key={video._id}
                    className="group relative bg-[#13161c] border border-white/5 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-500 hover:translate-y-[-8px] hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer"
                    onClick={() => handlePlayVideo(video)}
                  >
                    {/* Thumbnail Wrapper */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                          <Play className="h-12 w-12 text-white/20" />
                        </div>
                      )}

                      {/* Durations Badge */}
                      {video.formattedDuration && (
                        <span className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 rounded-lg border border-white/10">
                          {video.formattedDuration}
                        </span>
                      )}

                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                          <Play className="h-6 w-6 text-white translate-x-0.5" fill="currentColor" />
                        </div>
                      </div>

                      {/* Subject Tag */}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                          {video.subjectName}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-2 text-slate-400">
                          <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center">
                            <User className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-medium">By Faculty Member</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-bold">{video.viewCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modern Video Modal */}
      <Dialog
        open={!!selectedVideo}
        onOpenChange={() => setSelectedVideo(null)}
      >
        <DialogContent className="max-w-6xl p-0 bg-black border-white/10 overflow-hidden rounded-[2rem] shadow-2xl shadow-indigo-500/10">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Player Area */}
            <div className="flex-[2] aspect-video lg:aspect-auto h-full min-h-[400px]">
              {selectedVideo && (
                <iframe
                  src={getEmbedUrl(selectedVideo)}
                  title={selectedVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            {/* Sidebar Info */}
            <div className="flex-1 p-8 lg:border-l border-white/5 bg-[#0d1015] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-400 mb-6">
                  <span className="px-3 py-1 rounded bg-indigo-500/10 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                    {selectedVideo?.subjectName}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-slate-700" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Lecture Content</span>
                </div>

                <h3 className="text-2xl font-serif font-bold text-white mb-4 line-clamp-3 leading-tight">
                  {selectedVideo?.title}
                </h3>

                {selectedVideo?.description && (
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                    {selectedVideo.description}
                  </p>
                )}

                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <User className="h-5 w-5 text-indigo-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Instructor</p>
                      <p className="text-sm font-bold text-white">{selectedVideo?.teacherName || "Academy Expert"}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                    <Eye className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Class Reach</p>
                      <p className="text-sm font-bold text-white">{selectedVideo?.viewCount} Total Views</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <Button
                  onClick={() => setSelectedVideo(null)}
                  className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
                >
                  Close Theater View
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

