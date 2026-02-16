/**
 * Day Closing Modal - Replaces the ugly window.alert() with a proper UI
 *
 * This modal shows a confirmation dialog before closing the day,
 * with a breakdown of floating cash and proper success/error feedback.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Loader2,
    Lock,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};
const API_BASE_URL = getApiBaseUrl();

interface DayClosingModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    floatingCash: number;
    userName?: string;
    onSuccess?: () => void;
}

export function DayClosingModal({
    isOpen,
    onOpenChange,
    floatingCash,
    userName = "Partner",
    onSuccess,
}: DayClosingModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [notes, setNotes] = useState("");
    const [step, setStep] = useState<"confirm" | "success">("confirm");

    const handleCloseDay = async () => {
        if (floatingCash === 0) {
            toast.error("❌ No floating cash to close. Collect some payments first!");
            onOpenChange(false);
            return;
        }

        try {
            setIsClosing(true);

            const res = await fetch(`${API_BASE_URL}/api/finance/close-day`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notes: notes || `Daily closing by ${userName}`,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setStep("success");
                toast.success(data.message || "✅ Day closed successfully!");
                onSuccess?.();

                // Auto-close after showing success
                setTimeout(() => {
                    onOpenChange(false);
                    setStep("confirm");
                    setNotes("");
                }, 2000);
            } else {
                toast.error(data.message || "Failed to close day");
                onOpenChange(false);
            }
        } catch (err: any) {
            console.error("Error closing day:", err);
            toast.error("Network error. Please try again.");
            onOpenChange(false);
        } finally {
            setIsClosing(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        setStep("confirm");
        setNotes("");
    };

    if (step === "success") {
        return (
            <Dialog open={isOpen} onOpenChange={handleCancel}>
                <DialogContent className="sm:max-w-md">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-green-800 mb-2">
                            Day Closed Successfully!
                        </h3>
                        <p className="text-green-600">
                            PKR {floatingCash.toLocaleString()} has been verified and locked.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Lock className="h-5 w-5 text-purple-600" />
                        </div>
                        End of Day Closing
                    </DialogTitle>
                    <DialogDescription>
                        Lock your floating cash into verified balance. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Floating Cash Display */}
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Wallet className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-orange-700">
                                        Cash in Hand (Floating)
                                    </p>
                                    <p className="text-3xl font-bold text-orange-600">
                                        PKR {floatingCash.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning if no cash */}
                    {floatingCash === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-800">
                                    No floating cash to close
                                </p>
                                <p className="text-xs text-yellow-700">
                                    Collect some payments first before closing the day.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Optional Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="closing-notes" className="text-sm font-medium text-gray-700">
                            Notes (Optional)
                        </Label>
                        <Input
                            id="closing-notes"
                            placeholder="e.g., Regular daily closing"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-gray-50 border-gray-300"
                        />
                    </div>

                    {/* Confirmation Message */}
                    {floatingCash > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                <strong>What happens next:</strong>
                            </p>
                            <ul className="text-xs text-blue-700 mt-1 space-y-1">
                                <li>✓ All floating transactions will be marked as VERIFIED</li>
                                <li>✓ Cash total will be locked into your verified balance</li>
                                <li>✓ A daily closing record will be created</li>
                            </ul>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleCancel} disabled={isClosing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCloseDay}
                        disabled={isClosing || floatingCash === 0}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        {isClosing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Closing...
                            </>
                        ) : (
                            <>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Close Day & Lock Cash
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
