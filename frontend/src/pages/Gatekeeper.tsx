/**
 * SMART GATE SCANNER - Full-Screen Security Terminal
 *
 * Professional gate security interface for barcode scanning at entry points.
 * Designed for readability from 5+ feet away with instant audio/visual feedback.
 *
 * Features:
 * - Full-screen immersive mode (no sidebar distractions)
 * - Sub-200ms response time
 * - Audio feedback (success chime / denial buzzer)
 * - Massive text readable from distance
 * - Supports numeric IDs (260001, 260002...)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  User,
  Scan,
  Volume2,
  VolumeX,
  Fingerprint,
  ArrowLeft,
  Clock,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ==================== TYPES ====================
interface EnrolledClass {
  classId: string;
  classTitle: string;
  subject: string;
  teacherName: string;
  days: string[];
  startTime: string;
  endTime: string;
  roomNumber?: string;
}

interface ScanResult {
  success: boolean;
  status:
    | "success"
    | "defaulter"
    | "partial"
    | "blocked"
    | "unknown"
    | "error"
    | "too_early"
    | "too_late"
    | "no_class_today";
  message: string;
  reason?: string; 
  student?: {
    _id: string;
    studentId: string;
    barcodeId: string;
    name: string;
    fatherName: string;
    class: string;
    group: string;
    photo?: string;
    feeStatus: string;
    balance: number;
    studentStatus: string;
  };
  currentSession?: {
    subject: string;
    teacher: string;
    startTime: string;
    endTime: string;
    room?: string;
  };
  scannedAt?: string;
}

type TerminalState = "standby" | "scanning" | "success" | "denied" | "warning";

// ==================== AUDIO FEEDBACK ====================
const createBeep = (
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
) => {
  try {
    const audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + duration,
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.log("Audio not available");
  }
};

const playSuccessSound = () => {
  // Pleasant two-tone chime for ALLOWED
  createBeep(880, 0.12);
  setTimeout(() => createBeep(1320, 0.18), 80);
};

const playDeniedSound = () => {
  // Deep buzzer for DENIED
  createBeep(150, 0.5, "square");
};

const playWarningSound = () => {
  // Alert tone for partial/warning states
  createBeep(440, 0.15, "triangle");
  setTimeout(() => createBeep(440, 0.15, "triangle"), 180);
};

// ==================== DEBOUNCE HOOK ====================
function useRapidInput(callback: (value: string) => void, delay: number = 150) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastInputTimeRef = useRef<number>(0);

  return useCallback(
    (value: string) => {
      const now = Date.now();
      lastInputTimeRef.current = now;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        // Auto-trigger for 6+ digit numeric IDs (260001 format)
        if (value.length >= 6 && /^\d+$/.test(value)) {
          callback(value);
        }
      }, delay);
    },
    [callback, delay],
  );
}

// ==================== MAIN COMPONENT ====================
export default function Gatekeeper() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanInput, setScanInput] = useState("");
  const [terminalState, setTerminalState] = useState<TerminalState>("standby");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(true);

  // Cleanup on unmount - prevent state updates after navigation
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep input focused at all times
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && terminalState === "standby") {
        inputRef.current.focus();
      }
    };
    focusInput();
    const interval = setInterval(focusInput, 500);
    document.addEventListener("click", focusInput);
    return () => {
      clearInterval(interval);
      document.removeEventListener("click", focusInput);
    };
  }, [terminalState]);

  // Auto-reset to standby after result display
  useEffect(() => {
    if (terminalState !== "standby" && terminalState !== "scanning") {
      const timeout = setTimeout(() => {
        resetTerminal();
      }, 5000); // 5 seconds display time
      return () => clearTimeout(timeout);
    }
  }, [terminalState]);

  // API Mutation with mount check
  const scanMutation = useMutation({
    mutationFn: async (barcode: string) => {
      if (isMounted) setTerminalState("scanning");
      console.log(`🔍 Sending scan request for: "${barcode}"`);

      const response = await fetch(`${API_BASE_URL}/api/gatekeeper/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // CRITICAL: Send auth cookie
        body: JSON.stringify({ barcode }),
      });

      // Parse response even if not ok (to get error message)
      const data = await response.json();
      console.log(`📡 Gate response:`, data);

      // Return data regardless of status - we handle it in onSuccess
      return data;
    },
    onSuccess: (data: ScanResult) => {
      if (!isMounted) return; // Prevent state updates if unmounted

      setScanResult(data);

      if (data.status === "success") {
        setTerminalState("success");
        if (soundEnabled) playSuccessSound();
      } else if (data.status === "partial") {
        setTerminalState("warning");
        if (soundEnabled) playWarningSound();
      } else if (
        data.status === "too_early" ||
        data.reason?.includes("TOO EARLY") ||
        data.reason?.includes("OFF SCHEDULE")
      ) {
        // Handle schedule-based rejection with amber/orange state
        setTerminalState("warning"); // Use warning state for amber styling
        if (soundEnabled) playWarningSound();
      } else {
        setTerminalState("denied");
        if (soundEnabled) playDeniedSound();
      }
      setScanInput("");
    },
    onError: (error: any) => {
      if (!isMounted) return; // Prevent state updates if unmounted

      console.error(`❌ Scan error:`, error);

      setScanResult({
        success: false,
        status: "error",
        message: error?.message || "Network error - check connection",
      });
      setTerminalState("denied");
      if (soundEnabled) playDeniedSound();
      setScanInput("");
    },
  });

  const debouncedScan = useRapidInput((value: string) => {
    if (value.length >= 6 && isMounted) {
      scanMutation.mutate(value);
    }
  }, 150);

  const handleManualSubmit = () => {
    if (scanInput.length >= 5 && isMounted) {
      scanMutation.mutate(scanInput);
    }
  };

  const resetTerminal = () => {
    if (!isMounted) return; // Prevent state updates if unmounted
    setTerminalState("standby");
    setScanResult(null);
    setScanInput("");
    setTimeout(() => {
      if (isMounted && inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // ==================== RENDER STATES ====================

  // STANDBY STATE - Dark theme with pulsing shield
  if (terminalState === "standby" || terminalState === "scanning") {
    return (
      <div
        className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors mr-2"
              title="Go Back"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-6 w-6 text-slate-400 hover:text-white" />
            </button>
            <Shield className="h-8 w-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white tracking-wider">
              SMART GATE
            </span>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm font-semibold rounded-full border border-cyan-500/30">
              SECURITY TERMINAL
            </span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSoundEnabled(!soundEnabled);
              }}
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {soundEnabled ? (
                <Volume2 className="h-6 w-6 text-cyan-400" />
              ) : (
                <VolumeX className="h-6 w-6 text-slate-500" />
              )}
            </button>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold text-white">
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
              <p className="text-sm text-slate-400">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {/* Pulsing Shield */}
          <div
            className={cn(
              "relative mb-12",
              terminalState === "scanning" && "animate-pulse",
            )}
          >
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            <div
              className={cn(
                "relative h-48 w-48 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-slate-700 to-slate-800",
                "border-4 border-cyan-500/30",
                "shadow-[0_0_60px_rgba(34,211,238,0.3)]",
                terminalState === "standby" &&
                  "animate-[pulse_3s_ease-in-out_infinite]",
              )}
            >
              {terminalState === "scanning" ? (
                <Scan className="h-24 w-24 text-cyan-400 animate-pulse" />
              ) : (
                <Fingerprint className="h-24 w-24 text-cyan-400" />
              )}
            </div>
          </div>

          {/* Status Text */}
          <h1
            className={cn(
              "text-6xl font-black mb-4 tracking-wider",
              terminalState === "scanning"
                ? "text-cyan-400 animate-pulse"
                : "text-white",
            )}
          >
            {terminalState === "scanning" ? "SCANNING..." : "READY TO SCAN"}
          </h1>
          <p className="text-2xl text-slate-400 mb-12">
            {terminalState === "scanning"
              ? "Verifying credentials..."
              : "Present student ID card to barcode scanner"}
          </p>

          {/* Scanner Input */}
          <div className="w-full max-w-2xl">
            <div className="relative">
              <Scan className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500" />
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={scanInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setScanInput(value);
                  debouncedScan(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualSubmit();
                }}
                placeholder="Scan or enter Student ID..."
                className={cn(
                  "w-full h-24 pl-20 pr-6 text-4xl font-mono tracking-[0.3em]",
                  "bg-slate-800/80 border-2 border-slate-600",
                  "rounded-2xl text-white placeholder-slate-500",
                  "focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20",
                  "transition-all duration-200",
                )}
                autoComplete="off"
                autoFocus
              />
              {scanInput && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <span className="text-lg text-slate-500 font-mono">
                    {scanInput.length} digits
                  </span>
                </div>
              )}
            </div>
            <p className="text-center text-slate-500 mt-6 text-xl">
              Auto-scan on barcode input • Press Enter for manual verify
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-slate-500 text-lg">Edwardian Academy</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500">System Online</span>
          </div>
          <span className="text-slate-500">Smart Gate v2.0</span>
        </div>
      </div>
    );
  }

  // SUCCESS STATE - Full-Screen Green Welcome
  if (terminalState === "success" && scanResult?.student) {
    const defaultPhoto = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + scanResult.student.studentId;
    
    return (
      <div
        className="fixed inset-0 z-50 bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-600 flex flex-col cursor-pointer overflow-hidden font-sans"
        onClick={resetTerminal}
      >
        <div className="absolute inset-0 bg-white/30 animate-[ping_0.4s_ease-out_forwards] opacity-0" />

        <div className="relative flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Visual Confirmation */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="mb-10 animate-[bounceIn_0.5s_ease-out]">
                <div className="h-32 w-32 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
                  <ShieldCheck className="h-20 w-20 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-4 bg-white/20 rounded-[3rem] blur-2xl group-hover:bg-white/30 transition-all duration-500" />
                <img
                  src={scanResult.student.photo || defaultPhoto}
                  alt={scanResult.student.name}
                  className="relative h-80 w-80 rounded-[2.5rem] object-cover border-8 border-white shadow-[0_40px_80px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-500"
                />
                <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-2xl bg-emerald-400 border-4 border-white flex items-center justify-center shadow-xl animate-[bounce_2s_infinite]">
                  <Fingerprint className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            {/* Right: Details Card */}
            <div className="lg:col-span-7 space-y-8 text-white">
              <div>
                <h1 className="text-[10rem] font-black leading-none tracking-tighter drop-shadow-2xl">✓</h1>
                <h2 className="text-7xl font-black tracking-tight mb-2">
                  {scanResult.student.name.toUpperCase()}
                </h2>
                <p className="text-3xl font-medium text-white/80 italic">
                  S/O {scanResult.student.fatherName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-200 mb-2">Current Class</p>
                  <p className="text-4xl font-bold">{scanResult.student.class}</p>
                  <p className="text-xl text-white/60 mt-1">{scanResult.student.group}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-200 mb-2">Student ID</p>
                  <p className="text-4xl font-mono font-black tracking-wider">{scanResult.student.studentId}</p>
                  <p className="text-xl text-white/60 mt-1">Verified</p>
                </div>
              </div>

              {/* Intelligent Schedule Highlight */}
              {scanResult.currentSession ? (
                <div className="bg-emerald-400/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-emerald-300/50 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                    <BookOpen className="h-20 w-20 rotate-12" />
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-full bg-emerald-400 text-emerald-900 text-[10px] font-black uppercase tracking-widest animate-pulse">
                          Live Session
                        </div>
                        <span className="text-white/60 text-lg font-mono">{scanResult.currentSession.startTime} - {scanResult.currentSession.endTime}</span>
                      </div>
                      <h3 className="text-5xl font-black tracking-tight">{scanResult.currentSession.subject}</h3>
                      <p className="text-2xl font-bold flex items-center gap-3 text-emerald-100">
                        <User className="h-6 w-6" /> {scanResult.currentSession.teacher}
                      </p>
                    </div>
                    {scanResult.currentSession.room && (
                      <div className="text-right">
                        <p className="text-sm font-black uppercase tracking-widest text-white/60">Room</p>
                        <p className="text-6xl font-black text-emerald-300">{scanResult.currentSession.room}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                  <p className="text-xl font-medium text-white/60 flex items-center gap-3">
                    <Clock className="h-6 w-6" /> No session scheduled for this time.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-2xl font-medium text-white/60 uppercase tracking-widest">Fee Status: <span className="text-emerald-300 font-black">CLEARED</span></p>
              </div>
            </div>
          </div>

          <p className="absolute bottom-10 text-2xl text-white/40 font-mono tracking-widest">
            {new Date().toLocaleTimeString()} • TAP ANYWHERE TO RESET
          </p>
        </div>
      </div>
    );
  }

  // WARNING STATE - Amber for Partial Payment (Still Allowed) OR TOO EARLY (Schedule-based)
  if (terminalState === "warning" && scanResult?.student) {
    const isTooEarly =
      scanResult.status === "too_early" ||
      scanResult.reason?.includes("TOO EARLY") ||
      scanResult.reason?.includes("OFF SCHEDULE");
    
    const defaultPhoto = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + scanResult.student.studentId;

    return (
      <div
        className="fixed inset-0 z-50 bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600 flex flex-col cursor-pointer overflow-hidden font-sans"
        onClick={resetTerminal}
      >
        <div className="absolute inset-0 bg-white/20 animate-[ping_0.4s_ease-out_forwards] opacity-0" />

        <div className="relative flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Photo */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="mb-10 animate-[bounceIn_0.5s_ease-out]">
                <div className="h-32 w-32 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
                  <ShieldAlert className="h-20 w-20 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div className="relative">
                <img
                  src={scanResult.student.photo || defaultPhoto}
                  alt={scanResult.student.name}
                  className="h-80 w-80 rounded-[2.5rem] object-cover border-8 border-white/50 shadow-2xl"
                />
              </div>
            </div>

            {/* Right: Details */}
            <div className="lg:col-span-7 space-y-8 text-white">
              <div>
                <h1 className="text-8xl font-black tracking-tight drop-shadow-2xl">
                  {isTooEarly ? "⏰ TOO EARLY" : "⚠ ALLOWED"}
                </h1>
                <h2 className="text-5xl font-black mt-4">
                  {scanResult.student.name.toUpperCase()}
                </h2>
                <p className="text-3xl text-white/80 mt-2 font-medium">
                  {isTooEarly ? "CLASS NOT STARTED YET" : "PARTIAL FEE - BALANCE DUE"}
                </p>
              </div>

              {isTooEarly ? (
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                  <p className="text-2xl font-medium text-white/90 mb-4">
                    Please wait until your scheduled class time.
                  </p>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/40 w-1/3 animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/30 shadow-2xl">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-white/60 mb-2">Outstanding Balance</p>
                  <p className="text-7xl font-black tracking-tighter">
                    PKR {scanResult.student.balance?.toLocaleString() || "0"}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="bg-white/10 rounded-2xl px-6 py-4 border border-white/10">
                  <p className="text-xs font-black uppercase tracking-widest text-white/50">ID</p>
                  <p className="text-2xl font-mono font-bold">{scanResult.student.studentId}</p>
                </div>
                <div className="bg-white/10 rounded-2xl px-6 py-4 border border-white/10">
                  <p className="text-xs font-black uppercase tracking-widest text-white/50">Class</p>
                  <p className="text-2xl font-bold">{scanResult.student.class}</p>
                </div>
              </div>
            </div>
          </div>

          <p className="absolute bottom-10 text-2xl text-white/40 font-mono tracking-widest">
            TAP ANYWHERE TO RESET
          </p>
        </div>
      </div>
    );
  }

  // DENIED STATE - Full-Screen Red Access Denied
  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-red-700 via-red-600 to-rose-700 flex flex-col cursor-pointer overflow-hidden font-sans"
      onClick={resetTerminal}
    >
      <div className="absolute inset-0 bg-white/20 animate-[ping_0.4s_ease-out_forwards] opacity-0" />

      <div className="relative flex-1 flex flex-col items-center justify-center p-8">
        <div className="mb-10 animate-[bounceIn_0.5s_ease-out]">
          <div className="h-40 w-40 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
            <ShieldX className="h-24 w-24 text-white drop-shadow-lg" />
          </div>
        </div>

        <h1 className="text-[10rem] font-black text-white leading-none tracking-tighter drop-shadow-2xl mb-4">✕</h1>
        
        <div className="bg-white/15 backdrop-blur-xl rounded-[3rem] px-16 py-12 border-2 border-white/20 shadow-2xl text-center max-w-4xl">
          <p className="text-6xl font-black text-white uppercase tracking-tight mb-6">
            {scanResult?.status === "unknown" && "UNKNOWN STUDENT"}
            {scanResult?.status === "defaulter" && "FEES PENDING"}
            {scanResult?.status === "blocked" && "ACCOUNT BLOCKED"}
            {scanResult?.status === "no_class_today" && "NO CLASS TODAY"}
            {scanResult?.status === "too_late" && "CLASS ENDED"}
            {scanResult?.status === "error" && "SCAN ERROR"}
            {!scanResult?.status && "VERIFICATION FAILED"}
          </p>
          <p className="text-3xl text-white/80 font-medium leading-relaxed italic">
            "{scanResult?.message || "Please contact the Front Desk for assistance."}"
          </p>
        </div>

        {scanResult?.student && (
          <div className="mt-12 flex items-center gap-10 bg-black/20 rounded-[2.5rem] p-8 border border-white/10 backdrop-blur-md">
            <img
              src={scanResult.student.photo || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + scanResult.student.studentId}
              alt={scanResult.student.name}
              className="h-32 w-32 rounded-3xl object-cover border-4 border-white/30 grayscale opacity-60"
            />
            <div className="text-left space-y-2">
              <h2 className="text-4xl font-black text-white/90 uppercase tracking-tight">
                {scanResult.student.name}
              </h2>
              <p className="text-2xl text-white/60 font-medium">
                ID: {scanResult.student.studentId} • {scanResult.student.class}
              </p>
              {scanResult.student.balance > 0 && (
                <p className="text-3xl font-black text-red-300 mt-2">
                  DUE: PKR {scanResult.student.balance.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-10 flex flex-col items-center gap-4">
          <p className="text-2xl text-white/40 font-mono tracking-[0.3em] uppercase">
            Contact Security • Tap to Retry
          </p>
          <div className="h-1.5 w-40 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/30 w-full animate-[pulse_2s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
