/**
 * Pending Approvals Page
 * 
 * Admin interface for reviewing and approving pending student registrations.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    UserCheck,
    UserX,
    Clock,
    Phone,
    Mail,
    Loader2,
    CheckCircle2,
    XCircle,
    Eye,
    Search,
    RefreshCw,
    Users,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface PendingStudent {
    _id: string;
    studentId: string;
    studentName: string;
    fatherName: string;
    parentCell: string;
    email?: string;
    class: string;
    group: string;
    subjects?: Array<{ name: string; fee: number }>;
    totalFee: number;
    cnic?: string;
    createdAt: string;
}

export default function PendingApprovals() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [studentToReject, setStudentToReject] = useState<PendingStudent | null>(null);

    // Fetch pending registrations
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["pending-registrations"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/public/pending`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch pending registrations");
            return res.json();
        },
    });

    const pendingStudents: PendingStudent[] = data?.data || [];

    // Filter by search
    const filteredStudents = pendingStudents.filter(
        (s) =>
            s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.parentCell.includes(searchQuery) ||
            s.class.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE_URL}/api/public/approve/${id}`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to approve");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
            toast.success(data.message, {
                description: `Barcode: ${data.data?.barcodeId}`,
                duration: 5000,
            });
            setSelectedStudent(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to approve registration");
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const res = await fetch(`${API_BASE_URL}/api/public/reject/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ reason }),
            });
            if (!res.ok) throw new Error("Failed to reject");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["pending-registrations"] });
            toast.success(data.message);
            setRejectDialogOpen(false);
            setStudentToReject(null);
            setRejectReason("");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to reject registration");
        },
    });

    const handleReject = () => {
        if (studentToReject) {
            rejectMutation.mutate({ id: studentToReject._id, reason: rejectReason });
        }
    };

    return (
        <DashboardLayout title="Pending Approvals">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Pending Approvals
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Review and approve online registrations
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="px-4 py-2 text-lg">
                        <Clock className="h-4 w-4 mr-2" />
                        {pendingStudents.length} Pending
                    </Badge>
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search by name, phone, or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-white border-gray-200 rounded-xl max-w-md"
                />
            </div>

            {/* Pending List */}
            <Card className="border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {pendingStudents.length === 0 ? "No Pending Approvals" : "No matches found"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {pendingStudents.length === 0
                                    ? "All registrations have been processed"
                                    : "Try a different search term"}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                                    <TableHead className="font-semibold text-gray-700 py-4">Student</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Contact</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Class</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Fee</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Applied</TableHead>
                                    <TableHead className="font-semibold text-gray-700 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow
                                        key={student._id}
                                        className="hover:bg-gray-50/60 transition-colors border-b border-gray-100"
                                    >
                                        {/* Student Info */}
                                        <TableCell className="py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{student.studentName}</p>
                                                <p className="text-sm text-gray-500">S/O {student.fatherName}</p>
                                            </div>
                                        </TableCell>

                                        {/* Contact */}
                                        <TableCell>
                                            <div className="text-sm">
                                                <p className="flex items-center gap-1 text-gray-700">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {student.parentCell}
                                                </p>
                                                {student.email && (
                                                    <p className="flex items-center gap-1 text-gray-500">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        {student.email}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Class */}
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {student.class} ({student.group})
                                            </Badge>
                                        </TableCell>

                                        {/* Fee */}
                                        <TableCell>
                                            <span className="font-medium text-gray-900">
                                                PKR {student.totalFee?.toLocaleString() || 0}
                                            </span>
                                        </TableCell>

                                        {/* Applied Date */}
                                        <TableCell>
                                            <span className="text-sm text-gray-500">
                                                {new Date(student.createdAt).toLocaleDateString("en-PK", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right pr-6">
                                            <div className="inline-flex items-center gap-2">
                                                {/* View Details */}
                                                <button
                                                    onClick={() => setSelectedStudent(student)}
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>

                                                {/* Approve */}
                                                <Button
                                                    size="sm"
                                                    onClick={() => approveMutation.mutate(student._id)}
                                                    disabled={approveMutation.isPending}
                                                    className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                                >
                                                    {approveMutation.isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <UserCheck className="h-4 w-4" />
                                                    )}
                                                </Button>

                                                {/* Reject */}
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setStudentToReject(student);
                                                        setRejectDialogOpen(true);
                                                    }}
                                                    className="h-8"
                                                >
                                                    <UserX className="h-4 w-4" />
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

            {/* View Details Dialog */}
            <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
                <DialogContent className="sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <Users className="h-5 w-5 text-indigo-600" />
                            Application Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Student Name</p>
                                    <p className="font-medium text-gray-900">{selectedStudent.studentName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Father's Name</p>
                                    <p className="font-medium text-gray-900">{selectedStudent.fatherName}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Phone</p>
                                    <p className="font-medium text-gray-900">{selectedStudent.parentCell}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">CNIC</p>
                                    <p className="font-medium text-gray-900">{selectedStudent.cnic || "Not provided"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Class</p>
                                    <p className="font-medium text-gray-900">
                                        {selectedStudent.class} ({selectedStudent.group})
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Total Fee</p>
                                    <p className="font-medium text-gray-900">
                                        PKR {selectedStudent.totalFee?.toLocaleString() || 0}
                                    </p>
                                </div>
                            </div>

                            {selectedStudent.subjects && selectedStudent.subjects.length > 0 && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Subjects</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedStudent.subjects.map((s) => (
                                            <Badge key={s.name} variant="secondary">
                                                {s.name} (PKR {s.fee})
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={() => approveMutation.mutate(selectedStudent._id)}
                                    disabled={approveMutation.isPending}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {approveMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <UserCheck className="h-4 w-4 mr-2" />
                                    )}
                                    Approve & Generate ID
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setStudentToReject(selectedStudent);
                                        setSelectedStudent(null);
                                        setRejectDialogOpen(true);
                                    }}
                                    className="flex-1"
                                >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Reason Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-5 w-5" />
                            Reject Application
                        </DialogTitle>
                        <DialogDescription>
                            Rejecting application for: {studentToReject?.studentName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            placeholder="Reason for rejection (optional)..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectDialogOpen(false);
                                    setStudentToReject(null);
                                    setRejectReason("");
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={rejectMutation.isPending}
                                className="flex-1"
                            >
                                {rejectMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
