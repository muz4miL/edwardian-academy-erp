/**
 * Settlement Modal - Reusable component for recording partner cash payments
 * 
 * This modal is used in:
 * - PartnerSettlement.tsx (Record Cash Received button)
 * - Dashboard.tsx (Receive Partner Payment quick action)
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Banknote } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface Partner {
    id: string;
    name: string;
    debt: number;
}

interface SettlementModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettlementModal({ isOpen, onOpenChange }: SettlementModalProps) {
    const queryClient = useQueryClient();
    const [selectedPartner, setSelectedPartner] = useState<string>("");
    const [repaymentAmount, setRepaymentAmount] = useState<string>("");
    const [repaymentNotes, setRepaymentNotes] = useState<string>("");

    // Fetch settlement overview to get partner list
    const { data: overview } = useQuery<{
        data: {
            totalReceivable: number;
            partners: {
                zahid?: { partnerId: string; partnerName: string; unpaidTotal: number };
                saud?: { partnerId: string; partnerName: string; unpaidTotal: number };
            };
        };
    }>({
        queryKey: ["settlements", "overview"],
        queryFn: async () => {
            const res = await fetch(
                `${API_BASE_URL}/api/expenses/settlements/overview`,
            );
            if (!res.ok) throw new Error("Failed to fetch settlement overview");
            return res.json();
        },
        staleTime: 1000 * 30,
    });

    // Record repayment mutation
    const recordRepaymentMutation = useMutation({
        mutationFn: async (data: {
            partnerId: string;
            amount: number;
            notes?: string;
        }) => {
            const res = await fetch(
                `${API_BASE_URL}/api/expenses/settlements/record`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                },
            );
            if (!res.ok) throw new Error("Failed to record repayment");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["settlements"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            toast.success(
                `✅ Recorded PKR ${data.data.settlement.amount.toLocaleString()} from ${data.data.settlement.partner}`,
            );
            onOpenChange(false);
            setRepaymentAmount("");
            setRepaymentNotes("");
            setSelectedPartner("");
        },
        onError: () => {
            toast.error("❌ Failed to record repayment. Please try again.");
        },
    });

    const handleRecordRepayment = () => {
        if (!selectedPartner || !repaymentAmount) {
            toast.error("Please select a partner and enter an amount");
            return;
        }

        const amount = parseFloat(repaymentAmount);
        if (amount <= 0) {
            toast.error("Amount must be greater than 0");
            return;
        }

        recordRepaymentMutation.mutate({
            partnerId: selectedPartner,
            amount,
            notes: repaymentNotes,
        });
    };

    // Get partner list for dropdown
    const partners = overview?.data?.partners || {};
    const partnerList: Partner[] = Object.entries(partners).map(([key, stats]) => ({
        id: stats?.partnerId || key,
        name: stats?.partnerName || key,
        debt: stats?.unpaidTotal || 0,
    }));

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        Record Cash Received
                    </DialogTitle>
                    <DialogDescription>
                        When a partner pays cash to Sir Waqar, record it here to reduce
                        their debt.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Partner</Label>
                        <Select
                            value={selectedPartner}
                            onValueChange={setSelectedPartner}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select partner" />
                            </SelectTrigger>
                            <SelectContent>
                                {partnerList.map((partner) => (
                                    <SelectItem key={partner.id} value={partner.id}>
                                        {partner.name} (Owes: PKR{" "}
                                        {partner.debt.toLocaleString()})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Amount Received (PKR)</Label>
                        <Input
                            type="number"
                            placeholder="Enter amount"
                            value={repaymentAmount}
                            onChange={(e) => setRepaymentAmount(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Input
                            placeholder="e.g., Cash payment for January expenses"
                            value={repaymentNotes}
                            onChange={(e) => setRepaymentNotes(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={handleRecordRepayment}
                        disabled={recordRepaymentMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                    >
                        {recordRepaymentMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recording...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirm Payment Received
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
