/**
 * Exams.tsx - Admin/Teacher Exam Management
 * 
 * List all exams, view results, create new exams
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    FileQuestion,
    Plus,
    Eye,
    Trash2,
    Loader2,
    Trophy,
    Users,
    Clock,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Exams = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [showResults, setShowResults] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [resultsData, setResultsData] = useState<any>(null);
    const [resultsLoading, setResultsLoading] = useState(false);

    // Fetch exams
    const { data: examsData, isLoading } = useQuery({
        queryKey: ["exams"],
        queryFn: () => examApi.getAll(),
    });

    const exams = examsData?.data || [];

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: examApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams"] });
            toast.success("Exam deleted successfully");
            setShowDeleteConfirm(false);
            setSelectedExam(null);
        },
        onError: (error: any) => {
            toast.error("Failed to delete exam", { description: error.message });
        },
    });

    // View results
    const handleViewResults = async (exam: any) => {
        setSelectedExam(exam);
        setShowResults(true);
        setResultsLoading(true);

        try {
            const data = await examApi.getResults(exam._id);
            setResultsData(data);
        } catch (error: any) {
            toast.error("Failed to load results", { description: error.message });
        } finally {
            setResultsLoading(false);
        }
    };

    // Get exam status badge
    const getStatusBadge = (exam: any) => {
        const now = new Date();
        const start = new Date(exam.startTime);
        const end = new Date(exam.endTime);

        if (now < start) {
            return (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                    <Clock className="mr-1 h-3 w-3" />
                    Scheduled
                </Badge>
            );
        }
        if (now >= start && now <= end) {
            return (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="bg-stone-700 text-stone-300">
                <XCircle className="mr-1 h-3 w-3" />
                Ended
            </Badge>
        );
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("en-PK", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    return (
        <DashboardLayout title="Exams">
            <HeaderBanner
                title="Exam Management"
                subtitle={`Total Exams: ${exams.length}`}
            >
                <Button
                    onClick={() => navigate("/exams/create")}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 hover:from-amber-600 hover:to-yellow-600"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Exam
                </Button>
            </HeaderBanner>

            {/* Stats Cards */}
            <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Card className="bg-card border-amber-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <FileQuestion className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">{exams.length}</p>
                                <p className="text-sm text-muted-foreground">Total Exams</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-emerald-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {exams.filter((e: any) => {
                                        const now = new Date();
                                        return now >= new Date(e.startTime) && now <= new Date(e.endTime);
                                    }).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Active Now</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-blue-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {exams.filter((e: any) => new Date() < new Date(e.startTime)).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Scheduled</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-stone-500/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-stone-500/20 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-stone-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-foreground">
                                    {exams.filter((e: any) => new Date() > new Date(e.endTime)).length}
                                </p>
                                <p className="text-sm text-muted-foreground">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Exams Table */}
            <Card className="mt-6 bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileQuestion className="h-5 w-5 text-amber-500" />
                        All Exams
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="text-center py-12">
                            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No exams created yet</p>
                            <Button
                                onClick={() => navigate("/exams/create")}
                                className="mt-4"
                                variant="outline"
                            >
                                Create Your First Exam
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Exam</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Questions</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {exams.map((exam: any) => (
                                    <TableRow key={exam._id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-semibold">{exam.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {exam.examId} • {exam.subject}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{exam.className || "—"}</TableCell>
                                        <TableCell>{exam.questions?.length || 0}</TableCell>
                                        <TableCell>{exam.durationMinutes} min</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <p>{formatDate(exam.startTime)}</p>
                                                <p className="text-muted-foreground">to {formatDate(exam.endTime)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(exam)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewResults(exam)}
                                                    className="text-amber-500 hover:text-amber-600"
                                                >
                                                    <Trophy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedExam(exam);
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Results Modal */}
            <Dialog open={showResults} onOpenChange={setShowResults}>
                <DialogContent className="max-w-3xl bg-card border-amber-500/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            Exam Results: {selectedExam?.title}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedExam?.examId} • {selectedExam?.subject}
                        </DialogDescription>
                    </DialogHeader>

                    {resultsLoading ? (
                        <div className="flex items-center justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        </div>
                    ) : resultsData?.data?.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No submissions yet</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats */}
                            {resultsData?.stats && (
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-amber-400">
                                            {resultsData.stats.totalSubmissions}
                                        </p>
                                        <p className="text-xs text-stone-400">Submissions</p>
                                    </div>
                                    <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-white">
                                            {resultsData.stats.averageScore}%
                                        </p>
                                        <p className="text-xs text-stone-400">Average</p>
                                    </div>
                                    <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-emerald-400">
                                            {resultsData.stats.passRate}%
                                        </p>
                                        <p className="text-xs text-stone-400">Pass Rate</p>
                                    </div>
                                    <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-orange-400">
                                            {resultsData.stats.flaggedCount}
                                        </p>
                                        <p className="text-xs text-stone-400">Flagged</p>
                                    </div>
                                </div>
                            )}

                            {/* Leaderboard */}
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {resultsData?.data?.map((result: any, index: number) => (
                                            <TableRow key={result._id}>
                                                <TableCell>
                                                    <span
                                                        className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                            index === 0
                                                                ? "bg-amber-500 text-stone-900"
                                                                : index === 1
                                                                    ? "bg-stone-400 text-stone-900"
                                                                    : index === 2
                                                                        ? "bg-amber-700 text-white"
                                                                        : "bg-stone-700 text-stone-300"
                                                        )}
                                                    >
                                                        {index + 1}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">
                                                            {result.studentRef?.studentName || "Unknown"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {result.studentRef?.barcodeId}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-bold">
                                                            {result.score}/{result.totalMarks}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {result.percentage}%
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {Math.floor(result.timeTakenSeconds / 60)}m{" "}
                                                    {result.timeTakenSeconds % 60}s
                                                </TableCell>
                                                <TableCell>
                                                    {result.isFlagged ? (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertTriangle className="mr-1 h-3 w-3" />
                                                            Flagged
                                                        </Badge>
                                                    ) : result.isPassed ? (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                                                            Passed
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Failed
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{selectedExam?.title}" and all associated results.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => selectedExam && deleteMutation.mutate(selectedExam._id)}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
};

export default Exams;
