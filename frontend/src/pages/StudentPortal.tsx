/**
 * Student Portal - "Luxury Academic" Premium Edition
 * 
 * Prestigious Gold/Bronze Theme with Warm Glass Aesthetic
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Moon,
  Sun,
  ShieldCheck,
  TrendingUp,
  Calendar,
  Sparkles,
  Timer,
  ArrowRight,
  FileQuestion,
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
  classRef?: any;
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

// Subject color mapping with gradients
const SUBJECT_COLORS: Record<string, { gradient: string; icon: string; glow: string; border?: string }> = {
  Biology: {
    gradient: "from-emerald-500/20 via-emerald-500/10 to-teal-500/5",
    icon: "🧬",
    glow: "shadow-emerald-500/20",
    border: "group-hover:border-emerald-500/50"
  },
  Physics: {
    gradient: "from-amber-500/10 via-amber-500/5 to-yellow-500/5",
    icon: "⚛️",
    glow: "shadow-amber-500/10",
    border: "group-hover:border-amber-500/50"
  },
  Chemistry: {
    gradient: "from-amber-500/10 via-amber-500/5 to-orange-500/5",
    icon: "🧪",
    glow: "shadow-amber-500/10",
    border: "group-hover:border-amber-500/50"
  },
  Mathematics: {
    gradient: "from-yellow-500/10 via-yellow-500/5 to-pink-500/5",
    icon: "📐",
    glow: "shadow-yellow-500/10",
    border: "group-hover:border-yellow-500/50"
  },
  English: {
    gradient: "from-cyan-500/10 via-cyan-500/5 to-blue-500/5",
    icon: "📚",
    glow: "shadow-cyan-500/10",
    border: "group-hover:border-cyan-500/50"
  },
};

// Spotlight effect component - Warm Gold Glow
const Spotlight = ({ mouseX, mouseY }: { mouseX: any; mouseY: any }) => {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 transition duration-300"
      style={{
        background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(212, 175, 55, 0.12), transparent 40%)`,
      }}
    />
  );
};

export function StudentPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Mouse position for spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 100, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

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

  // Fetch videos
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

  // Fetch student schedule/timetable
  const { data: scheduleData } = useQuery({
    queryKey: ["student-schedule", token],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/student-portal/schedule`,
        {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return res.json();
    },
    enabled: isLoggedIn && !!token,
  });

  const schedule = scheduleData?.data?.schedule || [];
  const nextClass = scheduleData?.data?.nextClass;

  // Fetch exams for student's class
  const { data: examsData } = useQuery({
    queryKey: ["student-exams", profile?.classRef, token],
    queryFn: async () => {
      const classId = profile?.classRef?._id || profile?.classRef;
      if (!classId) return { data: [] };

      const res = await fetch(
        `${API_BASE_URL}/api/exams/class/${classId}`,
        {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch exams");
      return res.json();
    },
    enabled: isLoggedIn && !!token && !!profile?.classRef,
  });

  const exams = examsData?.data || [];
  const upcomingExams = exams.filter((e: any) => new Date() <= new Date(e.endTime));
  const pastExams = exams.filter((e: any) => new Date() > new Date(e.endTime));

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

  // Handle login
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
    } catch { }
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
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-stone-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

        <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <Card className="w-full max-w-md mx-4 bg-stone-900/40 backdrop-blur-xl border border-yellow-500/30 shadow-2xl shadow-yellow-900/20 relative z-10">
          <CardContent className="pt-8 pb-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg mb-4">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                <p className="text-stone-400">Sign in to your student portal</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-stone-300 text-sm font-medium">
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
                    className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-stone-300 text-sm font-medium">
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
                    className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-11 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold shadow-lg shadow-amber-500/30 transition-all duration-300"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-stone-400">
                  Don't have an account?{" "}
                  <a href="/register" className="text-amber-400 hover:text-indigo-300 underline">
                    Register here
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // LOADING STATE
  if (isLoggedIn && !profile) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  // VERIFICATION PENDING SCREEN
  if (isLoggedIn && profile && profile.studentStatus !== "Active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-stone-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

        <Card className="w-full max-w-2xl mx-4 bg-stone-900/40 backdrop-blur-xl border border-yellow-500/30 shadow-2xl relative z-10">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 flex items-center justify-center relative">
                <Hourglass className="h-12 w-12 text-yellow-400 animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-ping"></div>
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Verification Pending</h1>
                <p className="text-stone-400">Your account is awaiting approval</p>
              </div>

              <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                    <p className="text-sm text-stone-400 font-mono">
                      ID: {profile.barcodeId || profile.studentId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRefreshStatus}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-900"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="flex-1 border-stone-700 text-stone-300 hover:bg-stone-800"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate fee percentage
  const feePercentage = profile ? Math.round((profile.paidAmount / profile.totalFee) * 100) : 0;

  // MAIN DASHBOARD - LUXURY ACADEMIC AESTHETIC
  return (
    <div
      className="min-h-screen bg-[#0c0a09] text-white relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Rich Warm Void Background with Gold Radial Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(212,175,55,0.15),rgba(255,255,255,0))]" />

      {/* Spotlight Effect */}
      <Spotlight mouseX={smoothMouseX} mouseY={smoothMouseY} />

      {/* Glass Header with Gold Border */}
      <header className="sticky top-0 z-50 bg-stone-900/40 backdrop-blur-xl border-b border-amber-500/20">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <img
              src="/logo.png"
              alt="Edwardian Academy"
              className="h-12 w-auto object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-widest">Student Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                    <span className="text-stone-900 text-sm font-bold">
                      {profile?.name?.charAt(0) || "S"}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-white">{profile?.name}</p>
                    <p className="text-xs text-stone-400 font-mono">
                      {profile?.barcodeId || profile?.studentId}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-stone-900/95 backdrop-blur-xl border-amber-500/20">
                <DropdownMenuLabel className="text-white">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-amber-500/20" />
                <DropdownMenuItem className="text-stone-300 focus:bg-amber-500/10 focus:text-white">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-stone-300 focus:bg-amber-500/10 focus:text-white">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Fee Status: {profile?.feeStatus}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-amber-500/20" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-500/10 focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-8 relative z-10">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Hero Section - Span 8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-8"
          >
            <Card className="h-full bg-stone-900/40 backdrop-blur-xl border border-amber-500/20 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.1)] relative overflow-hidden">
              <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                      {getGreeting()}
                    </span>
                  </div>
                  <h2 className="text-5xl font-bold mb-3 leading-tight font-serif">
                    <span className="text-white">Welcome back, </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500">
                      {profile?.name?.split(" ")[0] || "Student"}
                    </span>
                    .
                  </h2>
                  <p className="text-lg text-stone-400 mb-8">
                    Continue your learning journey today.
                  </p>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1">Class & Group</p>
                      <p className="text-xl font-bold font-mono text-white">
                        {profile?.class} • {profile?.group}
                      </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1">Subjects</p>
                      <p className="text-xl font-bold font-mono text-white">
                        {profile?.subjects?.length || 0} Enrolled
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Class Card - Dynamic from Schedule API */}
                <div className="mt-6 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Next Class</p>
                      {nextClass ? (
                        <div>
                          <p className="text-lg font-bold text-white">
                            {nextClass.dayFull}{nextClass.isToday && <span className="ml-2 text-xs text-amber-400">(Today!)</span>}
                          </p>
                          <p className="text-sm text-stone-400">
                            {nextClass.startTime} - {nextClass.endTime} • {nextClass.roomNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="text-lg font-medium text-stone-400">No upcoming class</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Background Watermark */}
              <div className="absolute bottom-0 right-0 opacity-5 pointer-events-none">
                <GraduationCap className="h-64 w-64 text-white" />
              </div>
            </Card>
          </motion.div>

          {/* Stats Column - Span 4 */}
          <div className="md:col-span-4 space-y-6">
            {/* Finance Widget with Glowing Shield */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-stone-900/40 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                      Financial Status
                    </h3>
                    {profile?.feeStatus === "paid" && (
                      <ShieldCheck className="h-5 w-5 text-emerald-400 animate-pulse drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                    )}
                  </div>

                  <div className="flex items-center justify-center mb-4">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={[
                            { value: feePercentage },
                            { value: 100 - feePercentage },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          <Cell fill={profile?.feeStatus === "paid" ? "#10b981" : "#f59e0b"} />
                          <Cell fill="#1e293b" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-center">
                    <p className="text-4xl font-bold font-mono text-white mb-1">
                      {feePercentage}%
                    </p>
                    <p className="text-sm text-emerald-400 font-mono uppercase tracking-wider">
                      {profile?.feeStatus}
                    </p>
                    {(profile?.balance || 0) > 0 && (
                      <p className="text-xs text-red-400 mt-2 font-medium">
                        PKR {profile?.balance.toLocaleString()} remaining
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Progress Widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-stone-900/40 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="h-4 w-4 text-yellow-400" />
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                      Progress
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-stone-400">Videos Watched</span>
                        <span className="text-sm font-bold font-mono text-white">
                          {videos.length}
                        </span>
                      </div>
                      <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-pink-500"
                          style={{ width: `${Math.min(videos.length * 10, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/10 to-pink-500/5 border border-yellow-500/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-1">Total Content</p>
                      <p className="text-3xl font-bold font-mono text-white">
                        {videos.length}
                      </p>
                      <p className="text-xs text-stone-400">Lectures Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Exams Widget */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-stone-900/40 backdrop-blur-xl border border-amber-500/20 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.1)]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileQuestion className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                      Upcoming Exams
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {upcomingExams.length === 0 ? (
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center">
                        <p className="text-xs text-stone-500">No exams scheduled currently.</p>
                      </div>
                    ) : (
                      upcomingExams.map((exam: any) => {
                        const isLive = new Date() >= new Date(exam.startTime) && new Date() <= new Date(exam.endTime);
                        const hasSubmitted = !!exam.mySubmission;
                        
                        return (
                          <div
                            key={exam._id}
                            className={cn(
                              "bg-white/5 border transition-all rounded-xl p-4",
                              hasSubmitted 
                                ? "border-emerald-500/30 bg-emerald-500/5" 
                                : isLive 
                                  ? "border-amber-500/30 bg-amber-500/5" 
                                  : "border-white/5"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-bold text-white">{exam.title}</p>
                                <p className="text-[10px] text-stone-400 uppercase tracking-wider">{exam.subject}</p>
                              </div>
                              {hasSubmitted ? (
                                <Badge className="bg-emerald-500 text-white text-[10px] font-bold h-5">
                                  ✓ Completed
                                </Badge>
                              ) : isLive ? (
                                <Badge className="bg-amber-500 text-stone-900 text-[10px] font-bold h-5">LIVE</Badge>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-stone-500 mb-3 font-mono">
                              <Calendar className="h-3 w-3" />
                              {new Date(exam.startTime).toLocaleDateString()}
                            </div>

                            {/* Show Score for Completed Exams */}
                            {hasSubmitted ? (
                              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-emerald-400">
                                        Score: {exam.mySubmission.score}/{exam.mySubmission.totalMarks}
                                      </p>
                                      <p className="text-[10px] text-emerald-400/70">
                                        {exam.mySubmission.percentage}% • Grade {exam.mySubmission.grade}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge 
                                    className={cn(
                                      "text-[10px] font-bold",
                                      exam.mySubmission.isPassed 
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                                    )}
                                  >
                                    {exam.mySubmission.isPassed ? "PASSED" : "FAILED"}
                                  </Badge>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  if (isLive) {
                                    window.open(`/exam/${exam._id}`, "_blank", "width=1200,height=800,menubar=no,toolbar=no,location=no");
                                  } else {
                                    toast.info("Exam starting soon", {
                                      description: `This exam is scheduled for ${new Date(exam.startTime).toLocaleString()}.`
                                    });
                                  }
                                }}
                                className={cn(
                                  "w-full h-9 text-xs font-bold transition-all",
                                  isLive
                                    ? "bg-amber-500 hover:bg-amber-600 text-stone-900"
                                    : "bg-stone-800 text-stone-400 cursor-not-allowed"
                                )}
                              >
                                {isLive ? "Enter Exam Room" : "Locked"}
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Weekly Timetable - Full Width */}
          <div className="md:col-span-12">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                Weekly Schedule
              </h3>
            </div>

            <Card className="bg-stone-900/40 backdrop-blur-xl border border-amber-500/20 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.1)] mb-8">
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const daySchedule = schedule.find((s: any) => s.day === day);
                    const isScheduled = !!daySchedule;
                    const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
                    const isToday = day === today;

                    return (
                      <div
                        key={day}
                        className={cn(
                          "relative rounded-xl p-4 transition-all duration-300 min-h-[120px]",
                          isScheduled
                            ? "bg-gradient-to-br from-amber-500/15 to-yellow-500/5 border border-amber-500/30 shadow-lg shadow-amber-500/10"
                            : "bg-stone-800/30 border border-stone-700/30",
                          isToday && "ring-2 ring-amber-500/50"
                        )}
                      >
                        {/* Day Header */}
                        <div className={cn(
                          "text-xs font-bold uppercase tracking-widest mb-2",
                          isScheduled ? "text-amber-400" : "text-stone-500"
                        )}>
                          {day}
                          {isToday && (
                            <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-stone-900 rounded text-[10px] font-bold">
                              Today
                            </span>
                          )}
                        </div>

                        {isScheduled ? (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-white">
                              {daySchedule.startTime} - {daySchedule.endTime}
                            </p>
                            <p className="text-xs text-amber-300/80">
                              {daySchedule.roomNumber}
                            </p>
                            {daySchedule.subjects?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {daySchedule.subjects.slice(0, 2).map((subj: string) => (
                                  <span key={subj} className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white rounded">
                                    {subj}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-16 opacity-40">
                            <span className="text-2xl">😴</span>
                            <span className="text-[10px] text-stone-500 mt-1">Rest Day</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Cards - Full Width */}
          <div className="md:col-span-12">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                Your Subjects
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* All Courses Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSubject(null)}
                className="cursor-pointer"
              >
                <Card className={cn(
                  "bg-stone-900/40 backdrop-blur-xl border transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
                  activeSubject === null
                    ? "border-amber-500/50 shadow-lg shadow-amber-500/20"
                    : "border-white/10 hover:border-white/20"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/5 flex items-center justify-center border border-amber-500/20">
                        <span className="text-2xl">📚</span>
                      </div>
                      <Badge variant="secondary" className="font-mono bg-white/5 text-white border-white/10">
                        {videos.length}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-lg text-white mb-1">
                      All Courses
                    </h4>
                    <p className="text-sm text-stone-400">Complete Library</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Subject Cards */}
              {profile?.subjects?.map((subject, index) => {
                const colors = SUBJECT_COLORS[subject.name] || SUBJECT_COLORS.Mathematics;
                return (
                  <motion.div
                    key={subject.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSubject(subject.name)}
                    className="cursor-pointer group"
                  >
                    <Card className={cn(
                      "backdrop-blur-xl border transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] bg-stone-900/40",
                      `bg-gradient-to-br ${colors.gradient}`,
                      activeSubject === subject.name
                        ? "border-amber-500/50 shadow-lg shadow-amber-500/20"
                        : "border-white/10 hover:border-white/20",
                      colors.glow,
                      colors.border
                    )}>
                      <CardContent className="p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <span className="text-2xl">{colors.icon}</span>
                          </div>
                          <Badge variant="secondary" className="font-mono bg-white/10 text-white border-white/20">
                            {videosBySubject[subject.name]?.length || 0}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-lg text-white mb-1 relative z-10">
                          {subject.name}
                        </h4>
                        <p className="text-sm text-stone-300 font-mono relative z-10">
                          PKR {subject.fee.toLocaleString()}
                        </p>

                        {/* Watermark Icon */}
                        <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                          <span className="text-8xl">{colors.icon}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Video Library - Full Width */}
          <div className="md:col-span-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-amber-500" />
                Lecture Library
                {activeSubject && (
                  <span className="text-stone-500 font-normal ml-2">
                    • {activeSubject}
                  </span>
                )}
              </h3>
              <Badge variant="outline" className="bg-amber-500/5 text-amber-400 border-amber-500/20 px-4 py-1.5 rounded-full font-mono">
                {videos.length} Available
              </Badge>
            </div>

            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-stone-800/50 rounded-xl mb-4" />
                    <div className="h-4 bg-stone-800/50 rounded mb-2" />
                    <div className="h-3 bg-stone-800/50 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : videos.length === 0 ? (
              // Smart Empty State with Countdown
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-stone-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center"
              >
                <div className="max-w-md mx-auto">
                  <div className="mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/20">
                      <Timer className="h-16 w-16 text-amber-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">
                    You're All Caught Up! 🎉
                  </h3>
                  <p className="text-stone-400 mb-6">
                    No new lectures available for {activeSubject || "your subjects"} right now.
                  </p>

                  {/* Next Session Countdown */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-xl p-6 inline-block">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">Next Live Session</p>
                    <p className="text-2xl font-bold text-white mb-1">
                      {profile?.session?.name || "Coming Soon"}
                    </p>
                    <Button
                      variant="ghost"
                      className="mt-3 text-amber-400 hover:text-indigo-300 hover:bg-amber-500/10"
                    >
                      Prepare Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {videos.map((video, index) => (
                  <motion.div
                    key={video._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlayVideo(video)}
                    className="cursor-pointer"
                  >
                    <Card className="overflow-hidden bg-stone-900/40 backdrop-blur-xl border border-white/10 hover:border-amber-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-stone-900 overflow-hidden group">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-white/20" />
                          </div>
                        )}

                        {/* Duration Badge */}
                        {video.formattedDuration && (
                          <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-bold text-white px-2 py-1 rounded border border-white/10">
                            {video.formattedDuration}
                          </span>
                        )}

                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/50">
                              <Play className="h-6 w-6 text-white transtone-x-0.5" fill="currentColor" />
                            </div>
                          </div>
                        </div>

                        {/* Subject Tag */}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 rounded bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                            {video.subjectName}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <CardContent className="p-4">
                        <h4 className="font-bold text-sm text-white mb-2 line-clamp-2 leading-snug">
                          {video.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-stone-400">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="text-xs font-mono">{video.viewCount}</span>
                          </div>
                          {video.teacherName && (
                            <span className="text-xs text-stone-400 truncate">
                              {video.teacherName}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Video Player Modal */}
      <Dialog
        open={!!selectedVideo}
        onOpenChange={() => setSelectedVideo(null)}
      >
        <DialogContent className="max-w-6xl p-0 bg-black border-white/10 overflow-hidden rounded-3xl shadow-2xl">
          <div className="flex flex-col lg:flex-row h-full">
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

            <div className="flex-1 p-8 lg:border-l border-white/5 bg-stone-950 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 mb-6">
                  <span className="px-3 py-1 rounded bg-amber-500/10 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20">
                    {selectedVideo?.subjectName}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4 line-clamp-3 leading-tight">
                  {selectedVideo?.title}
                </h3>

                {selectedVideo?.description && (
                  <p className="text-stone-400 text-sm leading-relaxed mb-6">
                    {selectedVideo.description}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    <User className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase">Instructor</p>
                      <p className="text-sm font-bold text-white">{selectedVideo?.teacherName || "Academy Expert"}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    <Eye className="h-4 w-4 text-yellow-400" />
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase">Views</p>
                      <p className="text-sm font-bold text-white font-mono">{selectedVideo?.viewCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <Button
                  onClick={() => setSelectedVideo(null)}
                  className="w-full h-12 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold transition-all"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StudentPortal;
