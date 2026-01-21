/**
 * Gatekeeper - Smart Gate Scanner Module
 * 
 * Physical security interface for barcode scanning at entry points.
 * Hardware: Barcode scanner that types digits rapidly without pressing Enter.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Shield,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Search,
    User,
    Clock,
    CreditCard,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface ScanResult {
    success: boolean;
    status: "success" | "defaulter" | "partial" | "blocked" | "unknown" | "error";
    message: string;
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
    };
    scannedAt?: string;
}

// Debounce hook for rapid input detection
function useDebounce(callback: (value: string) => void, delay: number) {
    const timeoutRef = useRef<NodeJS.Timeout>();
    const lastInputTimeRef = useRef<number>(0);
    const inputBufferRef = useRef<string>("");

    return useCallback((value: string) => {
        const now = Date.now();
        const timeSinceLastInput = now - lastInputTimeRef.current;

        // If input is coming rapidly (< 50ms between keystrokes), it's likely a scanner
        if (timeSinceLastInput < 50) {
            inputBufferRef.current = value;
        } else {
            inputBufferRef.current = value;
        }

        lastInputTimeRef.current = now;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            // Auto-trigger if 8+ characters (barcode length)
            if (inputBufferRef.current.length >= 8) {
                callback(inputBufferRef.current);
            }
        }, delay);
    }, [callback, delay]);
}

export default function Gatekeeper() {
    const [scanInput, setScanInput] = useState("");
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isIdle, setIsIdle] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount and after each scan
    useEffect(() => {
        inputRef.current?.focus();
    }, [scanResult]);

    // Auto-clear result after 10 seconds
    useEffect(() => {
        if (scanResult && scanResult.status !== "error") {
            const timer = setTimeout(() => {
                handleReset();
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [scanResult]);

    // Scan mutation
    const scanMutation = useMutation({
        mutationFn: async (barcodeId: string) => {
            const res = await fetch(`${API_BASE_URL}/api/gatekeeper/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ barcodeId }),
            });
            return res.json();
        },
        onSuccess: (data) => {
            setScanResult(data);
            setIsIdle(false);
            setScanInput("");
        },
        onError: () => {
            setScanResult({
                success: false,
                status: "error",
                message: "Connection error. Try again.",
            });
            setIsIdle(false);
        },
    });

    // Handle scan trigger
    const handleScan = useCallback((value: string) => {
        if (value.trim().length >= 3) {
            scanMutation.mutate(value.trim());
        }
    }, [scanMutation]);

    // Debounced input handler (500ms delay, auto-triggers on 8+ chars)
    const debouncedScan = useDebounce(handleScan, 500);

    // Manual verify button
    const handleManualVerify = () => {
        if (scanInput.trim().length >= 3) {
            handleScan(scanInput.trim());
        }
    };

    // Reset to idle state
    const handleReset = () => {
        setScanResult(null);
        setScanInput("");
        setIsIdle(true);
        inputRef.current?.focus();
    };

    // Get status styling
    const getStatusStyles = () => {
        if (!scanResult) return {};

        switch (scanResult.status) {
            case "success":
                return {
                    bg: "bg-gradient-to-br from-emerald-500 to-green-600",
                    icon: CheckCircle2,
                    iconColor: "text-white",
                    textColor: "text-white",
                };
            case "partial":
                return {
                    bg: "bg-gradient-to-br from-amber-500 to-orange-600",
                    icon: AlertTriangle,
                    iconColor: "text-white",
                    textColor: "text-white",
                };
            case "defaulter":
                return {
                    bg: "bg-gradient-to-br from-red-500 to-rose-600",
                    icon: AlertTriangle,
                    iconColor: "text-white",
                    textColor: "text-white",
                };
            case "blocked":
            case "unknown":
            case "error":
                return {
                    bg: "bg-gradient-to-br from-red-600 to-red-800",
                    icon: XCircle,
                    iconColor: "text-white",
                    textColor: "text-white",
                };
            default:
                return {
                    bg: "bg-gray-100",
                    icon: Shield,
                    iconColor: "text-gray-600",
                    textColor: "text-gray-800",
                };
        }
    };

    const styles = getStatusStyles();
    const StatusIcon = styles.icon || Shield;

    return (
        <DashboardLayout title="Gatekeeper">
            <div className="min-h-[calc(100vh-120px)] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">🚪 Smart Gate</h1>
                        <p className="text-gray-500">Security verification scanner</p>
                    </div>
                    <Button variant="outline" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                </div>

                {/* Main Scanner Area */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    {isIdle ? (
                        /* IDLE STATE - Ready to Scan */
                        <div className="w-full max-w-2xl text-center">
                            <div className="mb-8">
                                <div className="h-32 w-32 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 animate-pulse">
                                    <Shield className="h-16 w-16 text-gray-400" />
                                </div>
                                <h2 className="text-4xl font-bold text-gray-800 mb-2">Ready to Scan</h2>
                                <p className="text-gray-500 text-lg">
                                    Scan student ID card or enter barcode manually
                                </p>
                            </div>

                            {/* Scanner Input */}
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Waiting for barcode scan..."
                                    value={scanInput}
                                    onChange={(e) => {
                                        setScanInput(e.target.value);
                                        debouncedScan(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleManualVerify();
                                        }
                                    }}
                                    className="h-16 pl-14 text-2xl font-mono tracking-wider bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                    autoFocus
                                />
                            </div>

                            <Button
                                onClick={handleManualVerify}
                                disabled={scanInput.length < 3 || scanMutation.isPending}
                                className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700"
                            >
                                {scanMutation.isPending ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <Shield className="h-5 w-5 mr-2" />
                                )}
                                VERIFY
                            </Button>
                        </div>
                    ) : (
                        /* RESULT STATE - Show Verification Result */
                        <div
                            className={cn(
                                "w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-500",
                                styles.bg
                            )}
                        >
                            {/* Result Header */}
                            <div className="p-8 text-center">
                                <StatusIcon className={cn("h-20 w-20 mx-auto mb-4", styles.iconColor)} />
                                <h2 className={cn("text-3xl font-bold mb-2", styles.textColor)}>
                                    {scanResult?.message}
                                </h2>
                                {scanResult?.scannedAt && (
                                    <p className={cn("text-sm opacity-80", styles.textColor)}>
                                        <Clock className="h-4 w-4 inline mr-1" />
                                        {new Date(scanResult.scannedAt).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>

                            {/* Student Details */}
                            {scanResult?.student && (
                                <div className="bg-white p-8">
                                    <div className="flex items-start gap-6">
                                        {/* Photo */}
                                        <div className="flex-shrink-0">
                                            {scanResult.student.photo ? (
                                                <img
                                                    src={scanResult.student.photo}
                                                    alt={scanResult.student.name}
                                                    className="h-32 w-32 rounded-2xl object-cover border-4 border-gray-200"
                                                />
                                            ) : (
                                                <div className="h-32 w-32 rounded-2xl bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                                                    <User className="h-16 w-16 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <h3 className="text-3xl font-bold text-gray-900 mb-1">
                                                {scanResult.student.name}
                                            </h3>
                                            <p className="text-gray-500 text-lg mb-4">
                                                S/O {scanResult.student.fatherName}
                                            </p>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-500">Class</p>
                                                    <p className="text-lg font-semibold text-gray-800">
                                                        {scanResult.student.class} ({scanResult.student.group})
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Student ID</p>
                                                    <p className="text-lg font-semibold text-gray-800 font-mono">
                                                        {scanResult.student.barcodeId || scanResult.student.studentId}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fee Status Card */}
                                        <div className={cn(
                                            "flex-shrink-0 p-6 rounded-2xl text-center min-w-[180px]",
                                            scanResult.student.feeStatus === "paid"
                                                ? "bg-emerald-50 border-2 border-emerald-200"
                                                : scanResult.student.feeStatus === "partial"
                                                    ? "bg-amber-50 border-2 border-amber-200"
                                                    : "bg-red-50 border-2 border-red-200"
                                        )}>
                                            <CreditCard className={cn(
                                                "h-8 w-8 mx-auto mb-2",
                                                scanResult.student.feeStatus === "paid"
                                                    ? "text-emerald-600"
                                                    : scanResult.student.feeStatus === "partial"
                                                        ? "text-amber-600"
                                                        : "text-red-600"
                                            )} />
                                            <p className={cn(
                                                "text-lg font-bold uppercase",
                                                scanResult.student.feeStatus === "paid"
                                                    ? "text-emerald-700"
                                                    : scanResult.student.feeStatus === "partial"
                                                        ? "text-amber-700"
                                                        : "text-red-700"
                                            )}>
                                                {scanResult.student.feeStatus === "paid"
                                                    ? "FEES PAID"
                                                    : scanResult.student.feeStatus === "partial"
                                                        ? "PARTIAL"
                                                        : "PENDING"}
                                            </p>
                                            {scanResult.student.balance > 0 && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Balance: PKR {scanResult.student.balance.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-8 flex justify-center">
                                        <Button
                                            onClick={handleReset}
                                            size="lg"
                                            className="h-14 px-12 text-lg bg-gray-900 hover:bg-gray-800"
                                        >
                                            <RefreshCw className="h-5 w-5 mr-2" />
                                            Scan Next
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Error State - No Student Data */}
                            {!scanResult?.student && (
                                <div className="bg-white/10 p-8 text-center">
                                    <Button
                                        onClick={handleReset}
                                        size="lg"
                                        variant="outline"
                                        className="h-14 px-12 text-lg border-white/30 text-white hover:bg-white/10"
                                    >
                                        <RefreshCw className="h-5 w-5 mr-2" />
                                        Try Again
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Instructions */}
                <div className="mt-8 text-center text-gray-400 text-sm">
                    <p>Scanner auto-detects rapid input • Press Enter for manual verification</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
