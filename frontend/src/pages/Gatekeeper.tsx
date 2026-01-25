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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ==================== TYPES ====================
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
  reason?: string; // Detailed rejection reason (e.g., "TOO EARLY", "OFF SCHEDULE")
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
    totalFee: number;
    paidAmount: number;
    balance: number;
    studentStatus: string;
    session: string;
    classTime?: string;
    classDays?: string[];
  };
  scannedAt?: string;
  currentTime?: string; // Current time when scanned
  classStartTime?: string; // Expected class start time
  schedule?: {
    classStartTime?: string;
    classEndTime?: string;
    classDays?: string[];
    currentTime?: string;
    currentDay?: string;
  };
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
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
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
    return (
      <div
        className="fixed inset-0 z-50 bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-600 flex flex-col cursor-pointer"
        onClick={resetTerminal}
      >
        {/* Flash overlay animation */}
        <div className="absolute inset-0 bg-white/30 animate-[ping_0.4s_ease-out_forwards] opacity-0" />

        {/* Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-8">
          {/* Success Icon */}
          <div className="mb-10 animate-[bounceIn_0.5s_ease-out]">
            <div className="h-44 w-44 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
              <ShieldCheck className="h-28 w-28 text-white drop-shadow-lg" />
            </div>
          </div>

          {/* WELCOME Message */}
          <h1 className="text-8xl font-black text-white mb-8 tracking-wider drop-shadow-lg">
            ✓ WELCOME
          </h1>

          {/* Student Photo & Name */}
          <div className="flex items-center gap-10 mb-10">
            {scanResult.student.photo ? (
              <img
                src={scanResult.student.photo}
                alt={scanResult.student.name}
                className="h-36 w-36 rounded-full object-cover border-4 border-white shadow-2xl"
              />
            ) : (
              <div className="h-36 w-36 rounded-full bg-white/30 flex items-center justify-center border-4 border-white shadow-xl">
                <User className="h-20 w-20 text-white" />
              </div>
            )}
            <div className="text-left">
              <h2 className="text-6xl font-bold text-white drop-shadow-lg">
                {scanResult.student.name}
              </h2>
              <p className="text-2xl text-white/80 mt-2">
                S/O {scanResult.student.fatherName}
              </p>
            </div>
          </div>

          {/* Class & ID Info */}
          <div className="flex items-center gap-16 bg-white/10 rounded-3xl px-16 py-8 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-xl text-white/70 uppercase tracking-wider mb-1">
                Class
              </p>
              <p className="text-5xl font-bold text-white">
                {scanResult.student.class}
              </p>
              <p className="text-xl text-white/80 mt-1">
                {scanResult.student.group}
              </p>
            </div>
            <div className="w-px h-24 bg-white/30" />
            <div className="text-center">
              <p className="text-xl text-white/70 uppercase tracking-wider mb-1">
                Student ID
              </p>
              <p className="text-5xl font-mono font-bold text-white tracking-wider">
                {scanResult.student.studentId}
              </p>
            </div>
            <div className="w-px h-24 bg-white/30" />
            <div className="text-center">
              <p className="text-xl text-white/70 uppercase tracking-wider mb-1">
                Fee Status
              </p>
              <p className="text-5xl font-bold text-white">✓ CLEAR</p>
            </div>
          </div>

          {/* Timestamp */}
          <p className="mt-14 text-2xl text-white/60">
            {new Date().toLocaleTimeString()} • Tap anywhere to scan next
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

    return (
      <div
        className={`fixed inset-0 z-50 ${isTooEarly
          ? "bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600"
          : "bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600"
          } flex flex-col cursor-pointer`}
        onClick={resetTerminal}
      >
        <div className="absolute inset-0 bg-white/20 animate-[ping_0.4s_ease-out_forwards] opacity-0" />

        <div className="relative flex-1 flex flex-col items-center justify-center px-8">
          {/* Warning Icon */}
          <div className="mb-10 animate-[bounceIn_0.5s_ease-out]">
            <div className="h-44 w-44 rounded-full bg-white/20 flex items-center justify-center shadow-2xl">
              <ShieldAlert className="h-28 w-28 text-white drop-shadow-lg" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-7xl font-black text-white mb-4 tracking-wider drop-shadow-lg">
            {isTooEarly ? "⏰ TOO EARLY" : "⚠ ALLOWED"}
          </h1>
          <p className="text-4xl text-white/90 mb-10 font-semibold">
            {isTooEarly ? "CLASS NOT STARTED YET" : "PARTIAL FEE - BALANCE DUE"}
          </p>

          {/* Student Info */}
          <div className="flex items-center gap-8 mb-10">
            {scanResult.student.photo ? (
              <img
                src={scanResult.student.photo}
                alt={scanResult.student.name}
                className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-2xl"
              />
            ) : (
              <div className="h-32 w-32 rounded-full bg-white/30 flex items-center justify-center border-4 border-white">
                <User className="h-16 w-16 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-5xl font-bold text-white">
                {scanResult.student.name}
              </h2>
              <p className="text-2xl text-white/80 mt-1">
                {scanResult.student.class} • {scanResult.student.group}
              </p>
            </div>
          </div>

          {/* Schedule Info for TOO EARLY or Balance for Partial */}
          {isTooEarly && scanResult.schedule ? (
            <div className="bg-white/20 rounded-3xl px-16 py-8 backdrop-blur-sm">
              <p className="text-xl text-white/80 text-center mb-4 uppercase tracking-wider">
                Schedule Information
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-sm text-white/70 uppercase mb-1">
                    Current Time
                  </p>
                  <p className="text-4xl font-bold text-white font-mono">
                    {scanResult.schedule.currentTime || "N/A"}
                  </p>
                  <p className="text-lg text-white/60 mt-1">
                    {scanResult.schedule.currentDay || ""}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/70 uppercase mb-1">
                    Class Starts At
                  </p>
                  <p className="text-4xl font-bold text-emerald-300 font-mono">
                    {scanResult.schedule.classStartTime || "N/A"}
                  </p>
                  <p className="text-lg text-white/60 mt-1">
                    Days: {scanResult.schedule.classDays?.join(", ") || "N/A"}
                  </p>
                </div>
              </div>
              <p className="text-center text-white/80 mt-4 text-lg">
                Please wait until class time or check your schedule
              </p>
            </div>
          ) : (
            <div className="bg-white/20 rounded-3xl px-16 py-8 backdrop-blur-sm">
              <p className="text-xl text-white/80 text-center mb-2 uppercase tracking-wider">
                Outstanding Balance
              </p>
              <p className="text-6xl font-bold text-white text-center">
                PKR {scanResult.student.balance?.toLocaleString() || "0"}
              </p>
            </div>
          )}

          <p className="mt-12 text-2xl text-white/60">
            Tap anywhere to scan next
          </p>
        </div>
      </div>
    );
  }


  // DENIED STATE - Premium Glassmorphism Card on Gradient Background
  // Get denial reason text for display
  const getDenialReason = () => {
    switch (scanResult?.status) {
      case "unknown": return "STUDENT NOT FOUND";
      case "defaulter": return "FEES UNPAID";
      case "blocked": return "ACCOUNT BLOCKED / SUSPENDED";
      case "no_class_today": return "NO CLASS SCHEDULED TODAY";
      case "too_late": return "CLASS ALREADY ENDED";
      case "too_early": return "TOO EARLY FOR CLASS";
      case "error": return "VERIFICATION ERROR";
      default: return "ACCESS DENIED";
    }
  };

  // Generate initials from student name for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-red-600 via-red-700 to-red-900 flex flex-col items-center justify-center cursor-pointer"
      onClick={resetTerminal}
    >
      {/* Flash overlay */}
      <div className="absolute inset-0 bg-white/10 animate-[ping_0.3s_ease-out_forwards] opacity-0" />

      {/* Go Back Button - Absolute Top Left */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(-1);
        }}
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-medium transition-all z-10 border border-white/30"
      >
        <ArrowLeft className="h-5 w-5" />
        Go Back
      </button>

      {/* PREMIUM GLASSMORPHISM CARD - Responsive & Scrollable */}
      <div className="relative w-full max-w-xl mx-auto px-4 max-h-[90vh] overflow-y-auto py-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 animate-[fadeIn_0.4s_ease-out]">

          {/* Pulsing Shield Icon - Smaller */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <ShieldX className="h-9 w-9 sm:h-11 sm:w-11 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>

          {/* ACCESS DENIED Title */}
          <h1 className="text-4xl sm:text-5xl font-black text-red-600 text-center mb-3 tracking-tight">
            ✕ DENIED
          </h1>

          {/* Student Photo or Initials Avatar */}
          {scanResult?.student && (
            <div className="flex justify-center mb-4">
              {scanResult.student.photo ? (
                <img
                  src={scanResult.student.photo}
                  alt={scanResult.student.name}
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-red-500 shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center border-4 border-red-400 shadow-lg">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    {getInitials(scanResult.student.name)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Student Name & ID */}
          {scanResult?.student && (
            <div className="text-center mb-5 border-b border-gray-200 pb-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {scanResult.student.name}
              </h2>
              <p className="text-lg sm:text-xl font-mono font-semibold text-gray-700 tracking-wider">
                ID: {scanResult.student.studentId}
              </p>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                {scanResult.student.class} • {scanResult.student.group}
              </p>
            </div>
          )}

          {/* Denial Reason - Inside Card */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 sm:p-5 mb-4">
            <p className="text-xl sm:text-2xl font-bold text-red-600 text-center mb-2">
              {getDenialReason()}
            </p>
            <div className="bg-red-100 rounded-lg px-3 py-2">
              <p className="text-sm sm:text-base text-red-800 text-center font-medium">
                {scanResult?.message || "Unknown error - contact administrator"}
              </p>
            </div>
          </div>

          {/* Schedule Details for schedule-based denials */}
          {(scanResult?.status === "no_class_today" ||
            scanResult?.status === "too_late" ||
            scanResult?.status === "too_early") &&
            scanResult?.schedule && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-amber-900 text-center mb-3 uppercase tracking-wide">
                  Schedule Details
                </p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">Now</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 font-mono">
                      {scanResult.schedule.currentTime || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {scanResult.schedule.currentDay || ""}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">Class</p>
                    <p className="text-lg sm:text-xl font-bold text-amber-600 font-mono">
                      {scanResult.schedule.classStartTime || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {scanResult.schedule.classDays?.join(", ") || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Fee Balance for defaulters */}
          {scanResult?.status === "defaulter" && scanResult?.student && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-yellow-900 text-center mb-1 uppercase tracking-wide">
                Outstanding Balance
              </p>
              <p className="text-2xl sm:text-3xl font-black text-yellow-600 text-center">
                PKR {scanResult.student.balance?.toLocaleString() || "0"}
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                Total: {scanResult.student.totalFee?.toLocaleString()} •
                Paid: {scanResult.student.paidAmount?.toLocaleString()}
              </p>
            </div>
          )}

          {/* Action Instructions */}
          <div className="text-center pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Contact Front Desk • Tap anywhere to scan next
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date().toLocaleTimeString("en-PK", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
