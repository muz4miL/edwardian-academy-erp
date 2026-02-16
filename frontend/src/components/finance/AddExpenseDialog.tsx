/**
 * Add Expense Dialog - Reusable component for recording expenses
 *
 * This dialog wraps the expense form and can be used in:
 * - Dashboard.tsx (Record Expense quick action)
 * - Finance.tsx (inline form - can optionally use this dialog too)
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Loader2,
    Plus,
    FileText,
    Building2,
    Tag,
    DollarSign,
    Calendar,
    Users,
    HelpCircle,
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

interface AddExpenseDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddExpenseDialog({ isOpen, onOpenChange }: AddExpenseDialogProps) {
    const queryClient = useQueryClient();

    // Form state
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [paidByType, setPaidByType] = useState("ACADEMY_CASH");

    // Create expense mutation
    const createExpenseMutation = useMutation({
        mutationFn: async (expenseData: any) => {
            const response = await fetch(`${API_BASE_URL}/api/expenses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(expenseData),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to create expense");
            }
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["finance-history"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["finance", "stats"] });

            toast.success("✅ Expense recorded successfully!", {
                description: `${data.data?.title || "Expense"} - PKR ${data.data?.amount?.toLocaleString() || "0"}`,
            });

            // Reset form and close dialog
            resetForm();
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error("Failed to add expense", {
                description: error.message,
            });
        },
    });

    const resetForm = () => {
        setExpenseTitle("");
        setExpenseCategory("");
        setExpenseAmount("");
        setVendorName("");
        setDueDate("");
        setPaidByType("ACADEMY_CASH");
    };

    const handleAddExpense = () => {
        if (!expenseTitle || !expenseCategory || !expenseAmount || !vendorName || !dueDate) {
            toast.error("⚠️ Please fill all required fields");
            return;
        }

        if (parseFloat(expenseAmount) <= 0) {
            toast.error("⚠️ Amount must be greater than 0");
            return;
        }

        createExpenseMutation.mutate({
            title: expenseTitle,
            category: expenseCategory,
            amount: parseFloat(expenseAmount),
            vendorName,
            dueDate,
            paidByType,
        });
    };

    return (
        <TooltipProvider>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <FileText className="h-5 w-5 text-orange-600" />
                            </div>
                            Record New Expense
                        </DialogTitle>
                        <DialogDescription>
                            Add operational costs, bills, and supplier payments to the ledger.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Row 1: Title & Vendor */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="expense-title" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <FileText className="h-3 w-3 text-gray-500" />
                                    Expense Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="expense-title"
                                    placeholder="e.g., Electricity Bill"
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    className="bg-gray-50 h-10 border-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendor-name" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-gray-500" />
                                    Vendor/Supplier <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="vendor-name"
                                    placeholder="e.g., PESCO, SNGPL"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    className="bg-gray-50 h-10 border-gray-300"
                                />
                            </div>
                        </div>

                        {/* Row 2: Category & Amount */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-gray-500" />
                                    Category <span className="text-red-500">*</span>
                                </Label>
                                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                    <SelectTrigger className="bg-gray-50 h-10 border-gray-300">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Utilities">💡 Utilities</SelectItem>
                                        <SelectItem value="Rent">🏢 Rent/Lease</SelectItem>
                                        <SelectItem value="Salaries">💵 Salaries</SelectItem>
                                        <SelectItem value="Stationery">📚 Stationery</SelectItem>
                                        <SelectItem value="Marketing">📣 Marketing</SelectItem>
                                        <SelectItem value="Misc">📦 Miscellaneous</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expense-amount" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 text-gray-500" />
                                    Amount (PKR) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="expense-amount"
                                    type="number"
                                    placeholder="0"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    className="bg-gray-50 h-10 border-gray-300"
                                />
                            </div>
                        </div>

                        {/* Row 3: Due Date */}
                        <div className="space-y-2">
                            <Label htmlFor="due-date" className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                Payment Due <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="due-date"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="bg-gray-50 h-10 border-gray-300"
                            />
                        </div>

                        {/* Who Paid Dropdown */}
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-gray-600" />
                                Who Paid for This?
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p className="text-xs">
                                            Select "Academy Cash" for normal operations. If a partner paid out-of-pocket, select their name.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Select value={paidByType} onValueChange={setPaidByType}>
                                <SelectTrigger className="bg-white h-10 border-gray-300">
                                    <SelectValue placeholder="Who paid?" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACADEMY_CASH">
                                        🏦 Academy Cash (Normal Flow)
                                    </SelectItem>
                                    <SelectItem value="JOINT_POOL">
                                        🤝 Joint Pool (Pre-Split Deduction)
                                    </SelectItem>
                                    <SelectItem value="WAQAR">👤 Sir Waqar (Out-of-Pocket)</SelectItem>
                                    <SelectItem value="ZAHID">👤 Dr. Zahid (Out-of-Pocket)</SelectItem>
                                    <SelectItem value="SAUD">👤 Sir Saud (Out-of-Pocket)</SelectItem>
                                </SelectContent>
                            </Select>
                            {paidByType !== "ACADEMY_CASH" && paidByType !== "JOINT_POOL" && (
                                <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                    ⚠️ This will generate debt for other partners
                                </p>
                            )}
                            {paidByType === "JOINT_POOL" && (
                                <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                                    ℹ️ Joint Pool expenses are deducted from gross revenue before the 70/30 teacher split
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleAddExpense}
                            disabled={createExpenseMutation.isPending}
                            className="w-full bg-orange-600 hover:bg-orange-700 h-11 font-medium text-white"
                        >
                            {createExpenseMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Recording...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Expense
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
