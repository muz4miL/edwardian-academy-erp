/**
 * ExamRoom.tsx - Student Exam Taking Interface
 * 
 * Features:
 * - Sticky countdown timer with auto-submit at 00:00
 * - LocalStorage persistence for WiFi crash protection
 * - Tab switch detection for anti-cheat
 * - Luxury Academic Gold Theme
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Send,
    Loader2,
    Trophy,
    XCircle,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = "http://localhost:5000";

interface Question {
    questionText: string;
    options: string[];
}

interface ExamData {
    _id: string;
    examId: string;
    title: string;
    subject: string;
    durationMinutes: number;
    questions: Question[];
    instructions?: string;
}

interface ExamResult {
    score: number;
    totalMarks: number;
    percentage: number;
    grade?: string;
    isPassed?: boolean;
    message?: string;
}

const ExamRoom = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();

    // State
    const [exam, setExam] = useState<ExamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [startedAt, setStartedAt] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<ExamResult | null>(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);

    // Refs
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const hasSubmitted = useRef(false);

    // LocalStorage key for this exam
    const storageKey = `exam_progress_${examId}`;

    // Get token from cookie or localStorage
    const getToken = () => {
        // Try to get from cookie
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "studentToken") return value;
        }
        return localStorage.getItem("studentToken") || "";
    };

    // Load exam data
    const loadExam = useCallback(async () => {
        try {
            setLoading(true);
            const token = getToken();

            const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/take`, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.message || "Failed to load exam");
                return;
            }

            const examData = data.data;
            setExam(examData);

            // Check for saved progress in localStorage
            const savedProgress = localStorage.getItem(storageKey);
            if (savedProgress) {
                try {
                    const progress = JSON.parse(savedProgress);
                    if (progress.examId === examId) {
                        setAnswers(progress.answers);
                        setStartedAt(progress.startedAt);
                        setTabSwitchCount(progress.tabSwitchCount || 0);

                        // Calculate remaining time
                        const elapsed = Math.floor(
                            (Date.now() - new Date(progress.startedAt).getTime()) / 1000
                        );
                        const remaining = examData.durationMinutes * 60 - elapsed;
                        setTimeLeft(Math.max(0, remaining));

                        toast.info("Progress Restored", {
                            description: "Your previous answers have been recovered.",
                        });
                        return;
                    }
                } catch {
                    // Invalid saved data, start fresh
                }
            }

            // Fresh start
            const now = new Date().toISOString();
            setAnswers(new Array(examData.questions.length).fill(-1));
            setStartedAt(now);
            setTimeLeft(examData.durationMinutes * 60);

            // Save initial state
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    examId,
                    answers: new Array(examData.questions.length).fill(-1),
                    startedAt: now,
                    tabSwitchCount: 0,
                })
            );
        } catch (err: any) {
            setError(err.message || "Failed to load exam");
        } finally {
            setLoading(false);
        }
    }, [examId, storageKey]);

    // Start exam
    useEffect(() => {
        loadExam();
    }, [loadExam]);

    // Timer countdown
    useEffect(() => {
        if (timeLeft <= 0 || !exam || hasSubmitted.current) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Auto-submit when time runs out
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [exam, timeLeft]);

    // Tab switch detection (anti-cheat)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !hasSubmitted.current) {
                setTabSwitchCount((prev) => {
                    const newCount = prev + 1;

                    // Update localStorage
                    const saved = localStorage.getItem(storageKey);
                    if (saved) {
                        const progress = JSON.parse(saved);
                        progress.tabSwitchCount = newCount;
                        localStorage.setItem(storageKey, JSON.stringify(progress));
                    }

                    if (newCount >= 3) {
                        toast.error("Warning: Tab Switch Detected", {
                            description: `You have switched tabs ${newCount} times. This will be reported.`,
                        });
                    } else {
                        toast.warning("Tab Switch Detected", {
                            description: "Switching tabs during exam is monitored.",
                        });
                    }

                    return newCount;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [storageKey]);

    // Save answers to localStorage on change
    useEffect(() => {
        if (!exam || answers.length === 0) return;

        localStorage.setItem(
            storageKey,
            JSON.stringify({
                examId,
                answers,
                startedAt,
                tabSwitchCount,
            })
        );
    }, [answers, examId, startedAt, tabSwitchCount, storageKey, exam]);

    // Select answer
    const selectAnswer = (optionIndex: number) => {
        const updated = [...answers];
        updated[currentQuestion] = optionIndex;
        setAnswers(updated);
    };

    // Navigate questions
    const goToQuestion = (index: number) => {
        if (index >= 0 && index < (exam?.questions.length || 0)) {
            setCurrentQuestion(index);
        }
    };

    // Submit exam
    const handleSubmit = async (isAutoSubmit = false) => {
        if (hasSubmitted.current || isSubmitting) return;

        hasSubmitted.current = true;
        setIsSubmitting(true);

        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        try {
            const token = getToken();

            const res = await fetch(`${API_BASE_URL}/api/exams/${examId}/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify({
                    answers,
                    startedAt,
                    tabSwitchCount,
                    isAutoSubmitted: isAutoSubmit,
                }),
            });

            const data = await res.json();

            // Clear localStorage
            localStorage.removeItem(storageKey);

            if (data.success) {
                setResult(data.result);
                setShowResult(true);

                if (isAutoSubmit) {
                    toast.info("Time's Up!", {
                        description: "Your exam has been auto-submitted.",
                    });
                }
            } else {
                setError(data.message || "Failed to submit exam");
                hasSubmitted.current = false;
            }
        } catch (err: any) {
            setError(err.message || "Failed to submit exam");
            hasSubmitted.current = false;
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
                    <p className="text-stone-400">Loading exam...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
                <Card className="bg-stone-900/40 border-red-500/30 max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Cannot Access Exam</h2>
                        <p className="text-stone-400 mb-6">{error}</p>
                        <Button
                            onClick={() => navigate("/student-portal")}
                            className="bg-amber-500 hover:bg-amber-600"
                        >
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!exam) return null;

    const question = exam.questions[currentQuestion];
    const answeredCount = answers.filter((a) => a !== -1).length;
    const isLowTime = timeLeft <= 60;

    return (
        <div className="min-h-screen bg-stone-950">
            {/* Sticky Header with Timer */}
            <div className="sticky top-0 z-50 bg-stone-900/95 backdrop-blur-xl border-b border-amber-500/20 shadow-lg">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Exam Info */}
                        <div>
                            <h1 className="font-bold text-white">{exam.title}</h1>
                            <p className="text-sm text-stone-400">{exam.subject}</p>
                        </div>

                        {/* Timer */}
                        <div
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xl font-bold",
                                isLowTime
                                    ? "bg-red-500/20 text-red-400 animate-pulse"
                                    : "bg-amber-500/20 text-amber-400"
                            )}
                        >
                            <Clock className={cn("h-5 w-5", isLowTime && "animate-bounce")} />
                            {formatTime(timeLeft)}
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={() => handleSubmit(false)}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 hover:from-amber-600 hover:to-yellow-600"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Submit
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all"
                                style={{
                                    width: `${(answeredCount / exam.questions.length) * 100}%`,
                                }}
                            />
                        </div>
                        <span className="text-xs text-stone-400 font-mono">
                            {answeredCount}/{exam.questions.length}
                        </span>
                    </div>

                    {/* Tab Switch Warning */}
                    {tabSwitchCount > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-orange-400">
                            <Eye className="h-3 w-3" />
                            Tab switches detected: {tabSwitchCount}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Question Navigator */}
                    <div className="lg:col-span-3 order-2 lg:order-1">
                        <Card className="bg-stone-900/40 border-amber-500/20 sticky top-32">
                            <CardContent className="pt-6">
                                <h3 className="text-sm font-semibold text-stone-400 mb-4">
                                    Question Navigator
                                </h3>
                                <div className="grid grid-cols-5 gap-2">
                                    {exam.questions.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => goToQuestion(index)}
                                            className={cn(
                                                "w-10 h-10 rounded-lg font-semibold text-sm transition-all",
                                                currentQuestion === index
                                                    ? "bg-amber-500 text-stone-900"
                                                    : answers[index] !== -1
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                                            )}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-6 space-y-2 text-xs text-stone-400">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-amber-500" />
                                        <span>Current</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/30" />
                                        <span>Answered</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-stone-800" />
                                        <span>Unanswered</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Question Card */}
                    <div className="lg:col-span-9 order-1 lg:order-2">
                        <Card className="bg-stone-900/40 border-amber-500/20">
                            <CardContent className="pt-6">
                                {/* Question Number */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-stone-900 font-bold">
                                        {currentQuestion + 1}
                                    </div>
                                    <span className="text-stone-500">
                                        of {exam.questions.length}
                                    </span>
                                </div>

                                {/* Question Text */}
                                <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">
                                    {question.questionText}
                                </h2>

                                {/* Options */}
                                <div className="space-y-3">
                                    {question.options.map((option, oIndex) => (
                                        <button
                                            key={oIndex}
                                            onClick={() => selectAnswer(oIndex)}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                                                answers[currentQuestion] === oIndex
                                                    ? "border-amber-500 bg-amber-500/10"
                                                    : "border-stone-700 bg-stone-800/50 hover:border-amber-500/50 hover:bg-stone-800"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors",
                                                    answers[currentQuestion] === oIndex
                                                        ? "bg-amber-500 text-stone-900"
                                                        : "bg-stone-700 text-stone-400"
                                                )}
                                            >
                                                {String.fromCharCode(65 + oIndex)}
                                            </div>
                                            <span
                                                className={cn(
                                                    "flex-1",
                                                    answers[currentQuestion] === oIndex
                                                        ? "text-white"
                                                        : "text-stone-300"
                                                )}
                                            >
                                                {option}
                                            </span>
                                            {answers[currentQuestion] === oIndex && (
                                                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-800">
                                    <Button
                                        variant="outline"
                                        onClick={() => goToQuestion(currentQuestion - 1)}
                                        disabled={currentQuestion === 0}
                                        className="border-stone-700"
                                    >
                                        <ChevronLeft className="mr-2 h-4 w-4" />
                                        Previous
                                    </Button>

                                    {currentQuestion < exam.questions.length - 1 ? (
                                        <Button
                                            onClick={() => goToQuestion(currentQuestion + 1)}
                                            className="bg-amber-500 hover:bg-amber-600 text-stone-900"
                                        >
                                            Next
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleSubmit(false)}
                                            disabled={isSubmitting}
                                            className="bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600"
                                        >
                                            <Send className="mr-2 h-4 w-4" />
                                            Finish Exam
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Result Modal */}
            <Dialog open={showResult} onOpenChange={() => { }}>
                <DialogContent className="bg-stone-900 border-amber-500/30 max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            {result?.score !== undefined ? (
                                <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                            ) : (
                                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                            )}
                            <span className="text-2xl text-white block mb-2">
                                Exam Submitted!
                            </span>
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="text-center space-y-4">
                                {result?.score !== undefined ? (
                                    <>
                                        <div className="bg-stone-800/50 rounded-xl p-6">
                                            <p className="text-4xl font-bold text-white mb-2">
                                                {result.score}/{result.totalMarks}
                                            </p>
                                            <p className="text-2xl text-amber-400 font-semibold">
                                                {result.percentage}%
                                            </p>
                                            {result.grade && (
                                                <p className="text-lg text-stone-400 mt-2">
                                                    Grade: <span className="text-white font-bold">{result.grade}</span>
                                                </p>
                                            )}
                                        </div>
                                        <p
                                            className={cn(
                                                "font-semibold",
                                                result.isPassed ? "text-emerald-400" : "text-red-400"
                                            )}
                                        >
                                            {result.isPassed ? "🎉 Congratulations! You Passed!" : "Keep trying! You can do better!"}
                                        </p>
                                    </>
                                ) : (
                                    <div className="bg-stone-800/50 rounded-xl p-6">
                                        <p className="text-stone-400">{result?.message || "Results will be available soon."}</p>
                                    </div>
                                )}

                                <Button
                                    onClick={() => navigate("/student-portal")}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900"
                                >
                                    Back to Dashboard
                                </Button>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            {/* Low Time Warning Overlay */}
            {isLowTime && timeLeft > 0 && (
                <div className="fixed bottom-4 right-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                    <div>
                        <p className="text-red-400 font-bold">Time Running Out!</p>
                        <p className="text-red-300/80 text-sm">Less than 1 minute remaining</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamRoom;
