/**
 * Security Receipt Generator - Anti-Fraud Entry Slip
 * 
 * Generates printable entry permits with barcode for thermal or A4 printing.
 * Tracks reprints for fraud prevention.
 */

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Printer,
    User,
    AlertTriangle,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface Student {
    _id: string;
    studentId: string;
    barcodeId?: string;
    studentName: string;
    fatherName: string;
    class: string;
    group: string;
    photo?: string;
    reprintCount?: number;
    sessionRef?: { name: string; endDate?: string };
    feeStatus: string;
}

interface SecurityReceiptProps {
    student: Student;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SecurityReceipt({ student, open, onOpenChange }: SecurityReceiptProps) {
    const queryClient = useQueryClient();
    const printRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Get session end date for validity
    const validUntil = student.sessionRef?.endDate
        ? new Date(student.sessionRef.endDate).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "End of Session";

    // Record reprint mutation
    const reprintMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/gatekeeper/reprint/${student._id}`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to record reprint");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success(data.message);
        },
    });

    // Handle print
    const handlePrint = async () => {
        setIsPrinting(true);

        // Record the reprint
        await reprintMutation.mutateAsync();

        // Trigger browser print dialog
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 500);
    };

    const reprintCount = (student.reprintCount || 0) + 1;
    const isDuplicate = reprintCount > 1;
    const barcodeValue = student.barcodeId || student.studentId || "EDW-0000-000";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-0 print:hidden">
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5 text-indigo-600" />
                        Print Entry Receipt
                    </DialogTitle>
                </DialogHeader>

                {/* Receipt Preview */}
                <div className="p-6">
                    <div
                        ref={printRef}
                        id="security-receipt"
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white print:border-none print:p-0"
                    >
                        {/* Duplicate Warning Banner */}
                        {isDuplicate && (
                            <div className="bg-red-600 text-white text-center py-3 mb-4 rounded font-bold text-sm print:bg-red-600 print:rounded-none">
                                ⚠️ DUPLICATE COPY [{reprintCount}] ⚠️
                            </div>
                        )}

                        {/* Header */}
                        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
                            <h1 className="text-xl font-bold text-gray-900 print:text-2xl">EDWARDIAN ACADEMY</h1>
                            <p className="text-sm text-gray-600 font-medium">Official Entry Permit</p>
                        </div>

                        {/* Student Photo & Info */}
                        <div className="flex gap-4 mb-4">
                            {/* Photo */}
                            <div className="flex-shrink-0">
                                {student.photo ? (
                                    <img
                                        src={student.photo}
                                        alt={student.studentName}
                                        className="w-24 h-28 object-cover border-2 border-gray-400 rounded grayscale print:filter print:grayscale"
                                    />
                                ) : (
                                    <div className="w-24 h-28 border-2 border-gray-400 rounded bg-gray-100 flex items-center justify-center">
                                        <User className="h-12 w-12 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-sm">
                                <div className="mb-2">
                                    <p className="text-gray-500 text-xs">Name</p>
                                    <p className="font-bold text-gray-900 text-base">{student.studentName}</p>
                                </div>
                                <div className="mb-2">
                                    <p className="text-gray-500 text-xs">Father's Name</p>
                                    <p className="font-semibold text-gray-800">{student.fatherName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-gray-500 text-xs">Class</p>
                                        <p className="font-semibold text-gray-800">{student.class}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Group</p>
                                        <p className="font-semibold text-gray-800">{student.group}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Roll Number */}
                        <div className="bg-gray-100 rounded p-3 mb-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Roll Number / Barcode ID</p>
                            <p className="font-mono text-2xl font-bold text-gray-900 tracking-wider">
                                {barcodeValue}
                            </p>
                        </div>

                        {/* React-Barcode Component */}
                        <div className="mb-4 flex justify-center">
                            <Barcode
                                value={barcodeValue}
                                width={1.5}
                                height={50}
                                fontSize={12}
                                background="#ffffff"
                                lineColor="#000000"
                                displayValue={true}
                                format="CODE128"
                            />
                        </div>

                        {/* Fee Status */}
                        <div className={`rounded p-3 mb-4 text-center border ${student.feeStatus === "paid"
                                ? "bg-green-100 border-green-300"
                                : student.feeStatus === "partial"
                                    ? "bg-amber-100 border-amber-300"
                                    : "bg-red-100 border-red-300"
                            }`}>
                            <p className={`font-bold text-sm flex items-center justify-center gap-1 ${student.feeStatus === "paid"
                                    ? "text-green-700"
                                    : student.feeStatus === "partial"
                                        ? "text-amber-700"
                                        : "text-red-700"
                                }`}>
                                {student.feeStatus === "paid" && <CheckCircle2 className="h-4 w-4 inline" />}
                                {student.feeStatus !== "paid" && <AlertTriangle className="h-4 w-4 inline" />}
                                <span>FEE STATUS: {student.feeStatus?.toUpperCase()}</span>
                            </p>
                        </div>

                        {/* Validity */}
                        <div className="border-t-2 border-gray-800 pt-3 text-center">
                            <p className="text-sm font-semibold text-gray-800">
                                Valid Until: <span className="font-bold">{validUntil}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Session: {student.sessionRef?.name || "Current Session"}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-3 border-t border-gray-300 text-center">
                            <p className="text-xs text-gray-400">
                                This is a computer-generated document. Keep it safe.
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Printed: {new Date().toLocaleDateString("en-PK", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3 print:hidden">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePrint}
                            disabled={isPrinting || reprintMutation.isPending}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isPrinting || reprintMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Printer className="h-4 w-4 mr-2" />
                            )}
                            Print Receipt
                        </Button>
                    </div>

                    {isDuplicate && (
                        <p className="text-center text-sm text-amber-600 mt-3 print:hidden">
                            ⚠️ This will print as Duplicate Copy #{reprintCount}
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Export a styled print button for easy use
export function PrintReceiptButton({ student, onOpen }: { student: Student; onOpen: () => void }) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onOpen}
            className="text-indigo-600 hover:bg-indigo-50"
        >
            <Printer className="h-4 w-4 mr-1" />
            Print Slip
        </Button>
    );
}

export default SecurityReceipt;
