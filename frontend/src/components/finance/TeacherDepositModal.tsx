/**
 * TeacherDepositModal Component
 * 
 * Modal for Owner to deposit arbitrary amounts to teachers.
 * Used for: Advance payments, Bonuses, Reimbursements, etc.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Loader2, BadgeCheck, Gift, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { payrollApi } from "@/lib/api";

interface Teacher {
  _id: string;
  name: string;
  subject: string;
  balance?: {
    floating: number;
    verified: number;
    pending: number;
  };
}

interface TeacherDepositModalProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const DEPOSIT_TYPES = [
  { value: "ADVANCE", label: "Advance Payment", icon: Wallet, description: "Early salary payment" },
  { value: "BONUS", label: "Bonus/Reward", icon: Gift, description: "Performance bonus or reward" },
  { value: "REIMBURSEMENT", label: "Reimbursement", icon: Receipt, description: "Expense reimbursement" },
  { value: "ADJUSTMENT", label: "Balance Adjustment", icon: BadgeCheck, description: "Correct balance error" },
  { value: "OTHER", label: "Other", icon: AlertCircle, description: "Other payment reason" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "ADJUSTMENT", label: "Internal Adjustment" },
];

export function TeacherDepositModal({
  teacher,
  open,
  onOpenChange,
  onSuccess,
}: TeacherDepositModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [depositType, setDepositType] = useState("OTHER");
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const depositMutation = useMutation({
    mutationFn: (data: {
      teacherId: string;
      amount: number;
      depositType: string;
      reason: string;
      paymentMethod: string;
    }) => payrollApi.createDeposit(data),
    onSuccess: (response) => {
      toast.success(`Deposited PKR ${response.data.deposit.amount.toLocaleString()} to ${teacher?.name}`);
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-deposits", teacher?._id] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create deposit");
    },
  });

  const resetForm = () => {
    setAmount("");
    setDepositType("OTHER");
    setReason("");
    setPaymentMethod("CASH");
  };

  const handleSubmit = () => {
    if (!teacher) return;
    
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (!reason.trim()) {
      toast.error("Please enter a reason for this deposit");
      return;
    }

    depositMutation.mutate({
      teacherId: teacher._id,
      amount: amountNum,
      depositType,
      reason: reason.trim(),
      paymentMethod,
    });
  };

  const selectedType = DEPOSIT_TYPES.find((t) => t.value === depositType);
  const TypeIcon = selectedType?.icon || AlertCircle;

  if (!teacher) return null;

  const currentBalance = (teacher.balance?.floating || 0) + (teacher.balance?.verified || 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            Deposit to Teacher
          </DialogTitle>
          <DialogDescription>
            Add funds to {teacher.name}'s verified balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Teacher Info Card */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
            <div>
              <p className="font-semibold">{teacher.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{teacher.subject}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="font-bold text-primary">PKR {currentBalance.toLocaleString()}</p>
            </div>
          </div>

          {/* Deposit Type Selection */}
          <div className="space-y-2">
            <Label>Deposit Type *</Label>
            <Select value={depositType} onValueChange={setDepositType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DEPOSIT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount (PKR) *</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="text-lg font-semibold"
            />
            {amount && parseInt(amount) > 0 && (
              <p className="text-xs text-emerald-600">
                New balance will be: PKR {(currentBalance + parseInt(amount)).toLocaleString()}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this deposit is being made..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the teacher's transaction history
            </p>
          </div>

          {/* Preview Card */}
          {amount && parseInt(amount) > 0 && reason && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <TypeIcon className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {selectedType?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-600">Amount to Deposit</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  PKR {parseInt(amount).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={depositMutation.isPending || !amount || parseInt(amount) <= 0 || !reason.trim()}
          >
            {depositMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-1" />
                Confirm Deposit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TeacherDepositModal;
