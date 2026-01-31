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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
const SUBJECT_COLORS: Record<
  string,
  { gradient: string; icon: string; glow: string; border?: string }
> = {
  Biology: {
    gradient: "from-emerald-500/20 via-emerald-500/10 to-teal-500/5",
    icon: "🧬",
    glow: "shadow-emerald-500/20",
    border: "group-hover:border-emerald-500/50",
  },
  Physics: {
    gradient: "from-amber-500/10 via-amber-500/5 to-yellow-500/5",
    icon: "⚛️",
    glow: "shadow-amber-500/10",
    border: "group-hover:border-amber-500/50",
  },
  Chemistry: {
    gradient: "from-amber-500/10 via-amber-500/5 to-orange-500/5",
    icon: "🧪",
    glow: "shadow-amber-500/10",
    border: "group-hover:border-amber-500/50",
  },
  Mathematics: {
    gradient: "from-yellow-500/10 via-yellow-500/5 to-pink-500/5",
    icon: "📐",
    glow: "shadow-yellow-500/10",
    border: "group-hover:border-yellow-500/50",
  },
  English: {
    gradient: "from-cyan-500/10 via-cyan-500/5 to-blue-500/5",
    icon: "📚",
    glow: "shadow-cyan-500/10",
    border: "group-hover:border-cyan-500/50",
  },
};

// Motion Variants
const waterfall = {
  initial: { y: 40, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 40,
      damping: 15,
      mass: 1,
    },
  },
};

const ripple = {
  whileHover: { scale: 1.01, transition: { type: "spring" as const, stiffness: 400, damping: 10 } },
  whileTap: { scale: 0.99 },
};

// Spotlight effect component - Warm Gold Glow
const Spotlight = ({ mouseX, mouseY }: { mouseX: any; mouseY: any }) => {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 transition duration-300"
      style={{
        background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(180, 83, 9, 0.1), transparent 40%)`,
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
      const res = await fetch(`${API_BASE_URL}/api/student-portal/schedule`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
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

      const res = await fetch(`${API_BASE_URL}/api/exams/class/${classId}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch exams");
      return res.json();
    },
    enabled: isLoggedIn && !!token && !!profile?.classRef,
  });

  const exams = examsData?.data || [];
  const upcomingExams = exams.filter(
    (e: any) => new Date() <= new Date(e.endTime),
  );
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
    } catch {}
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
      <div className="min-h-screen flex items-center justify-center bg-brand-primary liquid-mesh relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brand-gold/5 -skew-x-12 transform origin-top-right backdrop-blur-3xl" />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand-navy/30 rounded-full blur-3xl" 
        />

        <motion.div
          {...waterfall}
          className="w-full max-w-md mx-4 relative z-10"
        >
          <div className="glass-ethereal rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/10">
            <div className="bg-brand-gold h-2 opacity-80" />
            <div className="p-10 md:p-12">
              <div className="text-center space-y-4 mb-10">
                <motion.div 
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className="mx-auto w-20 h-20 rounded-[2rem] bg-brand-primary flex items-center justify-center shadow-2xl border border-white/10"
                >
                  <img src="/logo.png" alt="Logo" className="h-12 w-12 brightness-0 invert" />
                </motion.div>
                <div>
                  <h1 className="text-4xl font-serif font-black text-white tracking-tight leading-tight">
                    Welcome Back
                  </h1>
                  <p className="text-slate-400 font-medium mt-2">Sign in to your Student Portal</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2"
                  >
                    Student / Barcode ID
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="e.g. EA-2024-001"
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, username: e.target.value })
                      }
                      required
                      disabled={loginMutation.isPending}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:ring-brand-gold h-14 pl-12 rounded-2xl transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2"
                  >
                    Portal Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm({ ...loginForm, password: e.target.value })
                      }
                      required
                      disabled={loginMutation.isPending}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 focus:ring-brand-gold h-14 pl-12 rounded-2xl transition-all font-bold"
                    />
                  </div>
                </div>

                <motion.div {...ripple}>
                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full h-16 bg-brand-gold hover:bg-brand-gold/90 text-white text-lg font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-brand-gold/20"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Access Portal"
                    )}
                  </Button>
                </motion.div>
              </form>

              <div className="text-center mt-10 border-t border-white/5 pt-8">
                <p className="text-sm text-slate-500 font-medium">
                  New student?{" "}
                  <a
                    href="/register"
                    className="text-brand-gold font-bold hover:underline transition-all ml-1"
                  >
                    Register Online
                  </a>
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.4em] mt-8">
            Institutional Access Only • Protected by Edwardian Security
          </p>
        </motion.div>
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
      <div className="min-h-screen flex items-center justify-center bg-brand-primary liquid-mesh relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brand-gold/5 -skew-x-12 transform origin-top-right backdrop-blur-3xl" />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand-navy/30 rounded-full blur-3xl" 
        />

        <motion.div
          {...waterfall}
          className="w-full max-w-2xl mx-4 relative z-10"
        >
          <div className="glass-ethereal rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden border-white/10">
            <div className="bg-brand-gold h-2 opacity-80" />
            <div className="p-10 md:p-12">
              <div className="text-center space-y-8">
                <div className="mx-auto w-24 h-24 rounded-[2rem] bg-brand-primary/50 border border-brand-gold/30 flex items-center justify-center relative group">
                  <div className="absolute inset-0 rounded-[2rem] bg-brand-gold/10 animate-ping group-hover:animate-none transition-all" />
                  <Hourglass className="h-10 w-10 text-brand-gold animate-pulse" />
                </div>

                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight leading-tight">
                    Verification <span className="text-brand-gold">Pending</span>
                  </h1>
                  <p className="text-slate-400 text-lg font-medium max-w-md mx-auto">
                    Your institutional access is being processed by the Office of Admissions.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                      <User className="h-8 w-8 text-brand-gold" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-serif font-bold text-white">
                        {profile.name}
                      </h3>
                      <p className="text-brand-gold/70 font-mono text-sm tracking-widest mt-1">
                        ID: {profile.barcodeId || profile.studentId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div {...ripple}>
                    <Button
                      onClick={handleRefreshStatus}
                      className="w-full h-16 bg-brand-gold hover:bg-brand-gold/90 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-brand-gold/20"
                    >
                      <RefreshCw className="mr-3 h-5 w-5" />
                      Check Status
                    </Button>
                  </motion.div>
                  <motion.div {...ripple}>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full h-16 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Sign Out
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.4em] mt-8">
            Admissions Department • Edwardian Academy Executive Office
          </p>
        </motion.div>
      </div>
    );
  }

  // Calculate fee percentage
  const feePercentage = profile
    ? Math.round((profile.paidAmount / profile.totalFee) * 100)
    : 0;

  // MAIN DASHBOARD - LUXURY ACADEMIC AESTHETIC
  return (
    <div
      className="min-h-screen bg-brand-primary text-white relative overflow-hidden font-sans selection:bg-brand-gold/30"
      onMouseMove={handleMouseMove}
    >
      {/* Liquid Mesh Background */}
      <div className="fixed inset-0 liquid-mesh opacity-40" />
      <div className="fixed inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />

      {/* Spotlight Effect */}
      <Spotlight mouseX={smoothMouseX} mouseY={smoothMouseY} />

      {/* Glass Header with Gold Border */}
      <header className="sticky top-0 z-50 glass-ethereal border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="p-2 rounded-xl bg-brand-primary border border-white/10 shadow-2xl">
              <img
                src="/logo.png"
                alt="Edwardian Academy"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">
                Student Portal
              </p>
              <p className="text-xs text-slate-400 font-serif italic">Institutional Access</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-8 mr-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Status</span>
                <span className="text-sm font-bold text-brand-gold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                  Verified Student
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 hover:bg-white/5 h-14 px-4 rounded-2xl border border-transparent hover:border-white/10 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-gold flex items-center justify-center shadow-lg shadow-brand-gold/20">
                    <span className="text-brand-primary text-base font-black">
                      {profile?.name?.charAt(0) || "S"}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-white leading-none">
                      {profile?.name}
                    </p>
                    <p className="text-[10px] text-brand-gold/70 font-mono tracking-wider mt-1">
                      {profile?.barcodeId || profile?.studentId}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-brand-primary/95 backdrop-blur-2xl border-white/10 rounded-2xl p-2 shadow-2xl"
              >
                <DropdownMenuLabel className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-2">
                  Academy Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem className="text-slate-200 focus:bg-brand-gold/10 focus:text-brand-gold rounded-xl py-3 cursor-pointer">
                  <User className="mr-3 h-4 w-4" />
                  <span className="font-bold">Institutional Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-200 focus:bg-brand-gold/10 focus:text-brand-gold rounded-xl py-3 cursor-pointer">
                  <CreditCard className="mr-3 h-4 w-4" />
                  <span className="font-bold">Fee Status: {profile?.feeStatus}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-xl py-3 cursor-pointer"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-bold">Secure Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-10 relative z-10">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Hero Section - Span 8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-8"
          >
            <Card className="h-full glass-ethereal border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden rounded-[3rem]">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold opacity-50" />
              <CardContent className="p-10 md:p-14 h-full flex flex-col justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-brand-gold/10 border border-brand-gold/20">
                      <Sparkles className="h-4 w-4 text-brand-gold" />
                    </div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">
                      {getGreeting()}
                    </span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-serif font-black mb-6 tracking-tight leading-[1.1]">
                    <span className="text-white">Welcome, </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-brand-gold/80 to-brand-gold shadow-sm">
                      {profile?.name?.split(" ")[0] || "Scholar"}
                    </span>
                    <span className="text-brand-gold">.</span>
                  </h2>
                  <p className="text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
                    Your portal to excellence is ready. Continue your academic journey with the Edwardian Academy's elite curriculum.
                  </p>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/10 group">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-brand-gold transition-colors">
                        Current Enrollment
                      </p>
                      <p className="text-2xl font-serif font-bold text-white">
                        {profile?.class} <span className="text-brand-gold mx-2">•</span> {profile?.group}
                      </p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/10 group">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover:text-brand-gold transition-colors">
                        Active Courses
                      </p>
                      <p className="text-2xl font-serif font-bold text-white">
                        {profile?.subjects?.length || 0} Professional Subjects
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Class Card - Dynamic from Schedule API */}
                <div className="mt-10 bg-brand-gold/10 border border-brand-gold/20 rounded-[2rem] p-8 transition-all hover:bg-brand-gold/15 group">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-brand-gold flex items-center justify-center shadow-xl shadow-brand-gold/20">
                      <Clock className="h-8 w-8 text-brand-primary" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-1">
                        Up Next in Your Schedule
                      </p>
                      {nextClass ? (
                        <div>
                          <p className="text-2xl font-serif font-bold text-white">
                            {nextClass.dayFull}
                            {nextClass.isToday && (
                              <span className="ml-3 px-3 py-1 bg-brand-gold text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                                Today
                              </span>
                            )}
                          </p>
                          <p className="text-slate-400 font-medium mt-1">
                            {nextClass.startTime} — {nextClass.endTime} <span className="mx-2 opacity-30">|</span> {nextClass.roomNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="text-2xl font-serif font-bold text-slate-500">
                          No upcoming sessions scheduled
                        </p>
                      )}
                    </div>
                    <Button className="bg-brand-gold hover:bg-brand-gold/90 text-brand-primary font-black uppercase tracking-widest h-14 px-8 rounded-2xl shadow-lg shadow-brand-gold/20">
                      View Timetable
                    </Button>
                  </div>
                </div>
              </CardContent>

              {/* Background Watermark */}
              <div className="absolute -bottom-20 -right-20 opacity-[0.03] pointer-events-none rotate-12">
                <GraduationCap className="h-96 w-96 text-white" />
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
              <Card className="glass-ethereal border-white/10 rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Financial Standing
                    </h3>
                    {profile?.feeStatus === "paid" ? (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cleared</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20">
                        <Clock className="h-4 w-4 text-brand-gold" />
                        <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">Pending</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                      <p className="text-4xl font-serif font-black text-white">
                        {feePercentage}%
                      </p>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paid</p>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { value: feePercentage },
                            { value: 100 - feePercentage },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={75}
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell
                            fill={
                              profile?.feeStatus === "paid"
                                ? "#10b981"
                                : "#B45309"
                            }
                            className="drop-shadow-[0_0_10px_rgba(180,83,9,0.3)]"
                          />
                          <Cell fill="rgba(255,255,255,0.05)" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-center space-y-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Account Balance</p>
                      <p className="text-2xl font-serif font-bold text-white">
                        PKR {profile?.balance?.toLocaleString() || 0}
                      </p>
                    </div>
                    {profile?.feeStatus !== "paid" && (
                      <Button className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-xl">
                        View Statement
                      </Button>
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
              <Card className="glass-ethereal border-white/10 rounded-[2rem] overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-brand-gold/10">
                      <TrendingUp className="h-4 w-4 text-brand-gold" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Learning Velocity
                    </h3>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-end mb-3">
                        <span className="text-xs font-bold text-slate-400">
                          Lectures Completed
                        </span>
                        <span className="text-xl font-serif font-bold text-white">
                          {videos.length} <span className="text-xs text-slate-500 font-sans">/ 100</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(videos.length * 10, 100)}%` }}
                          className="h-full bg-gradient-to-r from-brand-gold to-brand-gold/60 rounded-full shadow-[0_0_15px_rgba(180,83,9,0.4)]"
                        />
                      </div>
                    </div>

                    <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-2xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mb-1">
                            Current Tier
                          </p>
                          <p className="text-2xl font-serif font-bold text-white">
                            Executive Scholar
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-brand-gold/20 border border-brand-gold/30 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-brand-gold" />
                        </div>
                      </div>
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
              <Card className="glass-ethereal border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <FileQuestion className="h-4 w-4 text-red-400" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      Examination Hall
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {upcomingExams.length === 0 ? (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                        <p className="text-xs text-slate-500 font-serif italic">
                          No examinations currently scheduled.
                        </p>
                      </div>
                    ) : (
                      upcomingExams.map((exam: any) => {
                        const isLive =
                          new Date() >= new Date(exam.startTime) &&
                          new Date() <= new Date(exam.endTime);
                        const hasSubmitted = !!exam.mySubmission;

                        return (
                          <div
                            key={exam._id}
                            className={cn(
                              "bg-white/5 border transition-all rounded-2xl p-5 hover:bg-white/10 group",
                              hasSubmitted
                                ? "border-emerald-500/20"
                                : isLive
                                  ? "border-brand-gold/40 bg-brand-gold/5"
                                  : "border-white/10",
                            )}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="text-lg font-serif font-bold text-white group-hover:text-brand-gold transition-colors">
                                  {exam.title}
                                </p>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                                  {exam.subject}
                                </p>
                              </div>
                              {hasSubmitted ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-3 h-6">
                                  ✓ Result
                                </Badge>
                              ) : isLive ? (
                                <Badge className="bg-brand-gold text-brand-primary text-[10px] font-black uppercase tracking-widest px-3 h-6 animate-pulse">
                                  Live Now
                                </Badge>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-6 font-black uppercase tracking-widest">
                              <Calendar className="h-3 w-3 text-brand-gold" />
                              {new Date(exam.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>

                            {/* Show Score for Completed Exams */}
                            {hasSubmitted ? (
                              <div className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                                        Grade {exam.mySubmission.grade}
                                      </p>
                                      <p className="text-sm font-serif font-bold text-white">
                                        {exam.mySubmission.score} / {exam.mySubmission.totalMarks}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-serif font-bold text-emerald-400">{exam.mySubmission.percentage}%</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  if (isLive) {
                                    window.open(
                                      `/exam/${exam._id}`,
                                      "_blank",
                                      "width=1200,height=800,menubar=no,toolbar=no,location=no",
                                    );
                                  } else {
                                    toast.info("Institutional Guard", {
                                      description: `This examination will be accessible on ${new Date(exam.startTime).toLocaleString()}.`,
                                    });
                                  }
                                }}
                                className={cn(
                                  "w-full h-12 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl shadow-lg",
                                  isLive
                                    ? "bg-brand-gold hover:bg-brand-gold/90 text-brand-primary shadow-brand-gold/20"
                                    : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5",
                                )}
                              >
                                {isLive ? "Begin Examination" : "Locked by Office"}
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
          <div className="md:col-span-12 mt-4">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-serif font-black text-white flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/20">
                  <Calendar className="h-6 w-6 text-brand-gold" />
                </div>
                Academic <span className="text-brand-gold">Schedule</span>
              </h3>
              <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Week of Excellence</p>
            </div>

            <Card className="glass-ethereal border-white/10 rounded-[3rem] overflow-hidden">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => {
                      const daySchedule = schedule.find(
                        (s: any) => s.day === day,
                      );
                      const isScheduled = !!daySchedule;
                      const today = [
                        "Sun",
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                      ][new Date().getDay()];
                      const isToday = day === today;

                      return (
                        <div
                          key={day}
                          className={cn(
                            "relative rounded-3xl p-6 transition-all duration-500 min-h-[160px] group",
                            isScheduled
                              ? "bg-brand-gold/10 border border-brand-gold/20 shadow-xl shadow-brand-gold/5"
                              : "bg-white/5 border border-white/5 opacity-50 hover:opacity-100",
                            isToday && "ring-2 ring-brand-gold ring-offset-4 ring-offset-brand-primary scale-105 z-10",
                          )}
                        >
                          {/* Day Header */}
                          <div
                            className={cn(
                              "text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center justify-between",
                              isScheduled ? "text-brand-gold" : "text-slate-500",
                            )}
                          >
                            {day}
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                            )}
                          </div>

                          {isScheduled ? (
                            <div className="space-y-4">
                              <div>
                                <p className="text-lg font-serif font-bold text-white leading-none">
                                  {daySchedule.startTime}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">
                                  Start Time
                                </p>
                              </div>
                              
                              <div className="pt-4 border-t border-brand-gold/10">
                                <p className="text-sm font-bold text-brand-gold/80 flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  Room {daySchedule.roomNumber}
                                </p>
                                {daySchedule.subjects?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {daySchedule.subjects
                                      .slice(0, 2)
                                      .map((subj: string) => (
                                        <span
                                          key={subj}
                                          className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-brand-gold/20 text-brand-gold rounded-lg"
                                        >
                                          {subj}
                                        </span>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-24 opacity-20 group-hover:opacity-40 transition-opacity">
                              <Sparkles className="h-8 w-8 text-slate-500 mb-2" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Self Study
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Cards - Full Width */}
          <div className="md:col-span-12 mt-12">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-serif font-black text-white flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/20">
                  <BookOpen className="h-6 w-6 text-brand-gold" />
                </div>
                Your <span className="text-brand-gold">Curriculum</span>
              </h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Subjects</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <Card
                  className={cn(
                    "glass-ethereal border transition-all duration-500 rounded-[2rem] overflow-hidden group",
                    activeSubject === null
                      ? "border-brand-gold/50 shadow-2xl shadow-brand-gold/10 bg-brand-gold/5"
                      : "border-white/10 hover:border-white/20",
                  )}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center group-hover:bg-brand-gold transition-colors duration-500">
                        <span className="text-3xl group-hover:scale-110 transition-transform">📚</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="font-black bg-white/5 text-white border-white/10 px-3 h-6 uppercase tracking-widest text-[10px]"
                      >
                        {videos.length} Lectures
                      </Badge>
                    </div>
                    <h4 className="font-serif font-bold text-2xl text-white mb-2 group-hover:text-brand-gold transition-colors">
                      Full Library
                    </h4>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Complete Academic Content</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Subject Cards */}
              {profile?.subjects?.map((subject, index) => {
                const colors =
                  SUBJECT_COLORS[subject.name] || SUBJECT_COLORS.Mathematics;
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
                    <Card
                      className={cn(
                        "glass-ethereal border transition-all duration-500 rounded-[2rem] overflow-hidden",
                        activeSubject === subject.name
                          ? "border-brand-gold/50 shadow-2xl shadow-brand-gold/10 bg-brand-gold/5"
                          : "border-white/10 hover:border-white/20",
                        colors.glow,
                      )}
                    >
                      <CardContent className="p-8 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-brand-gold transition-colors duration-500">
                            <span className="text-3xl group-hover:scale-110 transition-transform">{colors.icon}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="font-black bg-white/5 text-white border-white/10 px-3 h-6 uppercase tracking-widest text-[10px]"
                          >
                            {videosBySubject[subject.name]?.length || 0} Lectures
                          </Badge>
                        </div>
                        <h4 className="font-serif font-bold text-2xl text-white mb-2 relative z-10 group-hover:text-brand-gold transition-colors">
                          {subject.name}
                        </h4>
                        <p className="text-xs text-brand-gold font-black uppercase tracking-widest relative z-10">
                          Tuition Fee Paid
                        </p>

                        {/* Watermark Icon */}
                        <div className="absolute -bottom-6 -right-6 opacity-[0.05] group-hover:opacity-10 transition-opacity pointer-events-none">
                          <span className="text-9xl">{colors.icon}</span>
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
              <Badge
                variant="outline"
                className="bg-amber-500/5 text-amber-400 border-amber-500/20 px-4 py-1.5 rounded-full font-mono"
              >
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
                    No new lectures available for{" "}
                    {activeSubject || "your subjects"} right now.
                  </p>

                  {/* Next Session Countdown */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-xl p-6 inline-block">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-2">
                      Next Live Session
                    </p>
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
                              <Play
                                className="h-6 w-6 text-white transtone-x-0.5"
                                fill="currentColor"
                              />
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
                            <span className="text-xs font-mono">
                              {video.viewCount}
                            </span>
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
                      <p className="text-[10px] font-bold text-stone-500 uppercase">
                        Instructor
                      </p>
                      <p className="text-sm font-bold text-white">
                        {selectedVideo?.teacherName || "Academy Expert"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    <Eye className="h-4 w-4 text-yellow-400" />
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase">
                        Views
                      </p>
                      <p className="text-sm font-bold text-white font-mono">
                        {selectedVideo?.viewCount}
                      </p>
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
