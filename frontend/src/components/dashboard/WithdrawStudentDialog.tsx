import { useState, useEffect } from "react";
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
import { Loader2, AlertTriangle, Banknote, UserMinus, Users, GraduationCap } from "lucide-react";
import { API_BASE_URL } from "@/utils/apiConfig";

interface WithdrawStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (refundAmount?: number, refundReason?: string) => void;
  studentName: string;
  studentId: string;
  studentDbId?: string; // MongoDB _id for withdrawal preview
  paidAmount: number;
  isProcessing: boolean;
}

export const WithdrawStudentDialog = ({
  open,
  onOpenChange,
  onConfirm,
  studentName,
  studentId,
  studentDbId,
  paidAmount,
  isProcessing,
}: WithdrawStudentDialogProps) => {
  const [wantRefund, setWantRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch withdrawal preview when dialog opens
  useEffect(() => {
    if (open && studentDbId) {
      setPreviewLoading(true);
      fetch(`${API_BASE_URL}/api/students/${studentDbId}/withdrawal-preview`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setPreview(data.data);
        })
        .catch(() => {})
        .finally(() => setPreviewLoading(false));
    }
  }, [open, studentDbId]);

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setWantRefund(false);
      setRefundAmount("");
      setRefundReason("");
      setPreview(null);
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
      <AlertDialogContent className="bg-card border-border sm:max-w-lg max-h-[85vh] overflow-y-auto">
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

        {/* Teacher & Stakeholder Earnings Breakdown */}
        {previewLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400 mr-2" />
            <span className="text-sm text-slate-500">Loading earnings breakdown...</span>
          </div>
        ) : preview && (preview.teacherBreakdown?.length > 0 || preview.stakeholderBreakdown?.length > 0) ? (
          <div className="space-y-3">
            {/* Teacher earnings */}
            {preview.teacherBreakdown?.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Teacher Earnings from this Student
                </p>
                {preview.teacherBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-blue-100 last:border-0">
                    <div>
                      <span className="font-medium text-slate-800">{t.teacherName}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">
                        {t.compensationType}
                      </span>
                      {t.subjects?.length > 0 && (
                        <span className="ml-1 text-xs text-slate-400">
                          ({t.subjects.join(", ")})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-blue-700">PKR {t.totalEarned.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 text-sm font-bold text-blue-800 border-t border-blue-200">
                  <span>Total Teacher Earnings</span>
                  <span>PKR {preview.totalTeacherEarnings.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Stakeholder earnings */}
            {preview.stakeholderBreakdown?.length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Owner/Partner Revenue from this Student
                </p>
                {preview.stakeholderBreakdown.map((sh: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-emerald-100 last:border-0">
                    <div>
                      <span className="font-medium text-slate-800">{sh.fullName}</span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-medium">
                        {sh.role}
                      </span>
                    </div>
                    <div className="text-right">
                      {sh.totalFloating > 0 && (
                        <span className="text-xs text-amber-600 mr-2">
                          Floating: PKR {sh.totalFloating.toLocaleString()}
                        </span>
                      )}
                      {sh.totalCollected > 0 && (
                        <span className="text-xs text-emerald-600 mr-2">
                          Verified: PKR {sh.totalCollected.toLocaleString()}
                        </span>
                      )}
                      <span className="font-bold text-emerald-700">
                        PKR {(sh.totalFloating + sh.totalCollected).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {wantRefund && refundNum > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                  ⚠️ Refund Impact: Proportional deductions will be applied
                </p>
                <p className="text-xs text-red-600">
                  Refunding PKR {refundNum.toLocaleString()} ({Math.round((refundNum / paidAmount) * 100)}% of paid amount) will proportionally deduct from floating/verified balances of all stakeholders above.
                </p>
              </div>
            )}
          </div>
        ) : null}

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
