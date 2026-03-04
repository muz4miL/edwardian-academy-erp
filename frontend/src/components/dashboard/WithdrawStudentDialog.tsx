import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, Banknote, UserMinus } from "lucide-react";

interface WithdrawStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (refundAmount?: number, refundReason?: string) => void;
  studentName: string;
  studentId: string;
  paidAmount: number;
  isProcessing: boolean;
}

export const WithdrawStudentDialog = ({
  open,
  onOpenChange,
  onConfirm,
  studentName,
  studentId,
  paidAmount,
  isProcessing,
}: WithdrawStudentDialogProps) => {
  const [wantRefund, setWantRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setWantRefund(false);
      setRefundAmount("");
      setRefundReason("");
    }
    onOpenChange(val);
  };

  const handleConfirm = () => {
    if (wantRefund && refundAmount) {
      onConfirm(Number(refundAmount), refundReason || "Student withdrawn");
    } else {
      onConfirm();
    }
  };

  const refundNum = Number(refundAmount) || 0;
  const isRefundValid = !wantRefund || (refundNum > 0 && refundNum <= paidAmount);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card border-border sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-amber-600" />
            Withdraw Student
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            <span className="font-bold text-sky-600">{studentName}</span>{" "}
            <span className="font-mono text-sm text-muted-foreground">
              ({studentId})
            </span>{" "}
            will be marked as <strong className="text-amber-600">Withdrawn</strong>.
            They will no longer appear in active class lists or revenue calculations.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Paid Amount Info */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Paid</span>
          <span className="font-bold text-lg text-emerald-600">
            PKR {paidAmount.toLocaleString()}
          </span>
        </div>

        {/* Refund Toggle */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={wantRefund}
              onChange={(e) => setWantRefund(e.target.checked)}
              disabled={isProcessing || paidAmount <= 0}
              className="rounded border-slate-300"
            />
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-amber-600" />
              Issue Refund
            </span>
            {paidAmount <= 0 && (
              <span className="text-xs text-muted-foreground">(No payments to refund)</span>
            )}
          </label>

          {wantRefund && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 animate-in slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <Label className="text-sm">Refund Amount (PKR)</Label>
                <Input
                  type="number"
                  placeholder="Enter refund amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={paidAmount}
                  min={1}
                  disabled={isProcessing}
                  className="bg-white"
                />
                {refundNum > paidAmount && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Cannot exceed paid amount (PKR {paidAmount.toLocaleString()})
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Reason (optional)</Label>
                <Textarea
                  placeholder="e.g. Family relocation, Financial reasons..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  disabled={isProcessing}
                  className="bg-white resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isProcessing} className="border-border">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isProcessing || !isRefundValid}
            className={
              wantRefund
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : wantRefund ? (
              `Withdraw & Refund PKR ${refundNum.toLocaleString()}`
            ) : (
              "Withdraw Student"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
