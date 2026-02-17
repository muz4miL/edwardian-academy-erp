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
  Users,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

const getApiBaseUrl = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes(".app.github.dev")
  ) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, "");
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
};
const API_BASE_URL = getApiBaseUrl();

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExpenseDialog({
  isOpen,
  onOpenChange,
}: AddExpenseDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:refresh"));
      }

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
    setPaidByType("ACADEMY_CASH");
  };

  const handleAddExpense = () => {
    if (
      !expenseTitle ||
      !expenseCategory ||
      !expenseAmount ||
      !vendorName
    ) {
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
                <Label
                  htmlFor="expense-title"
                  className="text-xs font-medium text-gray-700 flex items-center gap-1"
                >
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
                <Label
                  htmlFor="vendor-name"
                  className="text-xs font-medium text-gray-700 flex items-center gap-1"
                >
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
                <Select
                  value={expenseCategory}
                  onValueChange={setExpenseCategory}
                >
                  <SelectTrigger className="bg-gray-50 h-10 border-gray-300">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Generator Fuel">
                      ⛽ Generator Fuel
                    </SelectItem>
                    <SelectItem value="Electricity Bill">
                      💡 Electricity Bill
                    </SelectItem>
                    <SelectItem value="Staff Tea & Refreshments">
                      ☕ Staff Tea & Refreshments
                    </SelectItem>
                    <SelectItem value="Marketing / Ads">
                      📣 Marketing / Ads
                    </SelectItem>
                    <SelectItem value="Stationery">📝 Stationery</SelectItem>
                    <SelectItem value="Rent">🏢 Rent</SelectItem>
                    <SelectItem value="Salaries">💵 Salaries</SelectItem>
                    <SelectItem value="Utilities">💧 Utilities</SelectItem>
                    <SelectItem value="Equipment/Asset">
                      🧰 Equipment/Asset
                    </SelectItem>
                    <SelectItem value="Misc">📦 Misc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="expense-amount"
                  className="text-xs font-medium text-gray-700 flex items-center gap-1"
                >
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


            {/* Payment Source */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-red-600" />
                Payment Source
              </Label>
              <Select value={paidByType} onValueChange={setPaidByType}>
                <SelectTrigger className="bg-white h-10 border-gray-300">
                  <SelectValue placeholder="Select payment source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACADEMY_CASH">
                    Academy Cash (Normal Flow)
                  </SelectItem>
                </SelectContent>
              </Select>
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
