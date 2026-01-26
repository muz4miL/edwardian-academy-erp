/**
 * ExamBuilder.tsx - Teacher Exam Creation Interface
 * 
 * Luxury Academic Gold Theme - Form builder for creating MCQ exams
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    FileQuestion,
    Plus,
    Trash2,
    Save,
    Loader2,
    GraduationCap,
    Clock,
    Calendar,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examApi, classApi, settingsApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Question {
    questionText: string;
    options: string[];
    correctOptionIndex: number;
}

const ExamBuilder = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [classRef, setClassRef] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(30);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [showResultToStudent, setShowResultToStudent] = useState(false);
    const [instructions, setInstructions] = useState("Read each question carefully. Select the best answer.");
    const [questions, setQuestions] = useState<Question[]>([
        { questionText: "", options: ["", "", "", ""], correctOptionIndex: 0 },
    ]);

    // Fetch classes
    const { data: classesData } = useQuery({
        queryKey: ["classes", { status: "active" }],
        queryFn: () => classApi.getAll({ status: "active" }),
    });

    const classes = classesData?.data || [];

    // Fetch subjects from global config
    const { data: settingsData } = useQuery({
        queryKey: ["settings"],
        queryFn: () => settingsApi.get(),
    });

    const SUBJECTS = settingsData?.data?.defaultSubjectFees?.map((s: any) => s.name) || [
        "Biology", "Chemistry", "Physics", "Mathematics", "English", "Computer Science"
    ];

    // Create exam mutation
    const createMutation = useMutation({
        mutationFn: examApi.create,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["exams"] });
            toast.success("Exam Created!", {
                description: `${data.data.examId} - ${data.data.title}`,
            });
            navigate("/exams");
        },
        onError: (error: any) => {
            toast.error("Failed to create exam", { description: error.message });
        },
    });

    // Add new question
    const addQuestion = () => {
        setQuestions([
            ...questions,
            { questionText: "", options: ["", "", "", ""], correctOptionIndex: 0 },
        ]);
    };

    // Remove question
    const removeQuestion = (index: number) => {
        if (questions.length <= 1) {
            toast.error("Exam must have at least one question");
            return;
        }
        setQuestions(questions.filter((_, i) => i !== index));
    };

    // Update question text
    const updateQuestionText = (index: number, text: string) => {
        const updated = [...questions];
        updated[index].questionText = text;
        setQuestions(updated);
    };

    // Update option text
    const updateOption = (qIndex: number, oIndex: number, text: string) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = text;
        setQuestions(updated);
    };

    // Set correct option
    const setCorrectOption = (qIndex: number, oIndex: number) => {
        const updated = [...questions];
        updated[qIndex].correctOptionIndex = oIndex;
        setQuestions(updated);
    };

    // Validate form
    const validateForm = (): boolean => {
        if (!title.trim()) {
            toast.error("Please enter exam title");
            return false;
        }
        if (!subject) {
            toast.error("Please select a subject");
            return false;
        }
        if (!classRef) {
            toast.error("Please select a class");
            return false;
        }
        if (!startTime || !endTime) {
            toast.error("Please set start and end times");
            return false;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            toast.error("End time must be after start time");
            return false;
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.questionText.trim()) {
                toast.error(`Question ${i + 1}: Please enter question text`);
                return false;
            }
            for (let j = 0; j < 4; j++) {
                if (!q.options[j].trim()) {
                    toast.error(`Question ${i + 1}: Option ${j + 1} is empty`);
                    return false;
                }
            }
        }

        return true;
    };

    // Handle submit
    const handleSubmit = () => {
        if (!validateForm()) return;

        createMutation.mutate({
            title,
            subject,
            classRef,
            durationMinutes,
            startTime,
            endTime,
            showResultToStudent,
            instructions,
            questions,
        });
    };

    return (
        <DashboardLayout title="Create Exam">
            <HeaderBanner
                title="Exam Builder"
                subtitle="Create MCQ examinations for your students"
            >
                <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 hover:from-amber-600 hover:to-yellow-600"
                >
                    {createMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Publish Exam
                        </>
                    )}
                </Button>
            </HeaderBanner>

            <div className="mt-6 grid gap-6 lg:grid-cols-12">
                {/* Exam Details Card */}
                <div className="lg:col-span-4">
                    <Card className="bg-card border-amber-500/20 shadow-lg shadow-amber-500/5 sticky top-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <GraduationCap className="h-5 w-5 text-amber-500" />
                                Exam Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label>Exam Title *</Label>
                                <Input
                                    placeholder="e.g., Physics Chapter 1 Quiz"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-background"
                                />
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <Label>Subject *</Label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUBJECTS.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Class */}
                            <div className="space-y-2">
                                <Label>Class *</Label>
                                <Select value={classRef} onValueChange={setClassRef}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls: any) => (
                                            <SelectItem key={cls._id} value={cls._id}>
                                                {cls.classTitle || `${cls.gradeLevel} - ${cls.group}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Duration */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    Duration (minutes)
                                </Label>
                                <Input
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                                    className="bg-background"
                                />
                            </div>

                            {/* Start Time */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                    Start Time
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="bg-background"
                                />
                            </div>

                            {/* End Time */}
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="bg-background"
                                />
                            </div>

                            {/* Show Results Toggle */}
                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                <div>
                                    <Label>Show Results Immediately</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Students see their score after submission
                                    </p>
                                </div>
                                <Switch
                                    checked={showResultToStudent}
                                    onCheckedChange={setShowResultToStudent}
                                />
                            </div>

                            {/* Instructions */}
                            <div className="space-y-2">
                                <Label>Instructions (Optional)</Label>
                                <Textarea
                                    placeholder="Instructions for students..."
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    className="bg-background min-h-[80px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Questions Section */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileQuestion className="h-5 w-5 text-amber-500" />
                            Questions ({questions.length})
                        </h3>
                        <Button
                            variant="outline"
                            onClick={addQuestion}
                            className="border-amber-500/30 hover:bg-amber-500/10"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Question
                        </Button>
                    </div>

                    {questions.map((question, qIndex) => (
                        <Card
                            key={qIndex}
                            className="bg-card border-border hover:border-amber-500/30 transition-colors"
                        >
                            <CardContent className="pt-6">
                                {/* Question Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center text-amber-500 font-bold">
                                            {qIndex + 1}
                                        </div>
                                        <span className="text-sm text-muted-foreground">Question</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeQuestion(qIndex)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Question Text */}
                                <div className="mb-4">
                                    <Textarea
                                        placeholder="Enter your question here..."
                                        value={question.questionText}
                                        onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                                        className="bg-background min-h-[80px]"
                                    />
                                </div>

                                {/* Options */}
                                <div className="grid gap-3">
                                    {question.options.map((option, oIndex) => (
                                        <div
                                            key={oIndex}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                                question.correctOptionIndex === oIndex
                                                    ? "border-emerald-500 bg-emerald-500/10"
                                                    : "border-border hover:border-amber-500/30"
                                            )}
                                            onClick={() => setCorrectOption(qIndex, oIndex)}
                                        >
                                            {/* Option indicator */}
                                            <div
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                                                    question.correctOptionIndex === oIndex
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {String.fromCharCode(65 + oIndex)}
                                            </div>

                                            {/* Option input */}
                                            <Input
                                                placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                                value={option}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateOption(qIndex, oIndex, e.target.value);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0"
                                            />

                                            {/* Correct indicator */}
                                            {question.correctOptionIndex === oIndex ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-muted-foreground/30" />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-muted-foreground mt-3">
                                    💡 Click on an option to mark it as the correct answer
                                </p>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Add Question Button at bottom */}
                    <Button
                        variant="outline"
                        onClick={addQuestion}
                        className="w-full border-dashed border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another Question
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ExamBuilder;
