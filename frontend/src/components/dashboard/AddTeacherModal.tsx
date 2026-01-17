import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { User, DollarSign, Loader2 } from "lucide-react";
import { teacherApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AddTeacherModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // Props passed from Configuration Page (Defaults)
    defaultMode?: "percentage" | "fixed";
    defaultTeacherShare?: string;
    defaultAcademyShare?: string;
    defaultFixedSalary?: string;
}

type CompensationType = "percentage" | "fixed" | "hybrid";

export const AddTeacherModal = ({
    open,
    onOpenChange,
    defaultMode = "percentage",
    defaultTeacherShare = "70",
    defaultAcademyShare = "30",
    defaultFixedSalary = "",
}: AddTeacherModalProps) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Form State - Personal Details
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [subject, setSubject] = useState("");
    const [joiningDate, setJoiningDate] = useState("");
    const [status, setStatus] = useState<"active" | "inactive">("active"); // Status defaults to active

    // Form State - Compensation
    const [compType, setCompType] = useState<CompensationType>(defaultMode);
    const [teacherShare, setTeacherShare] = useState(defaultTeacherShare);
    const [academyShare, setAcademyShare] = useState(defaultAcademyShare);
    const [fixedSalary, setFixedSalary] = useState(defaultFixedSalary);
    const [baseSalary, setBaseSalary] = useState("");
    const [bonusPercent, setBonusPercent] = useState("");

    // React Query Mutation for Creating Teacher
    const createTeacherMutation = useMutation({
        mutationFn: teacherApi.create,
        onSuccess: (data) => {
            // Invalidate and refetch teachers list
            queryClient.invalidateQueries({ queryKey: ['teachers'] });

            toast({
                title: "✅ Teacher Added Successfully",
                description: `${data.data.name} has been added to the system.`,
                className: "bg-green-50 border-green-200",
            });

            // Reset form and close modal
            resetForm();
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast({
                title: "❌ Failed to Add Teacher",
                description: error.message || "An error occurred. Please try again.",
                variant: "destructive",
            });
        },
    });

    // Reset form to defaults
    const resetForm = () => {
        setName("");
        setPhone("");
        setSubject("");
        setJoiningDate("");
        setStatus("active"); // Reset to active
        setCompType(defaultMode);
        setTeacherShare(defaultTeacherShare);
        setAcademyShare(defaultAcademyShare);
        setFixedSalary(defaultFixedSalary);
        setBaseSalary("");
        setBonusPercent("");
    };

    // Sync Logic: Reset local state to global defaults when the modal opens
    useEffect(() => {
        if (open) {
            setCompType(defaultMode);
            setTeacherShare(defaultTeacherShare);
            setAcademyShare(defaultAcademyShare);
            setFixedSalary(defaultFixedSalary);
            // Reset hybrid fields
            setBaseSalary("");
            setBonusPercent("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]); // Only reset when modal opens, not when defaults change

    // Auto-calculate academyShare when teacherShare changes (for percentage mode)
    useEffect(() => {
        if (compType === "percentage" && teacherShare) {
            const teacherValue = Number(teacherShare);
            if (!isNaN(teacherValue) && teacherValue >= 0 && teacherValue <= 100) {
                const calculatedAcademyShare = (100 - teacherValue).toString();
                setAcademyShare(calculatedAcademyShare);
            }
        }
    }, [teacherShare, compType]);

    // Handler for the Submit Button
    const handleSubmit = () => {
        // Validation
        if (!name || !phone || !subject) {
            toast({
                title: "⚠️ Missing Information",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        // Helper to convert empty string or invalid number to null
        const toNumberOrNull = (value: string) => {
            if (!value || value.trim() === '') return null;
            const num = Number(value);
            return isNaN(num) ? null : num;
        };

        // Build compensation object based on type with explicit null values
        let compensation: any = { type: compType };

        if (compType === "percentage") {
            const tShare = toNumberOrNull(teacherShare);
            const aShare = toNumberOrNull(academyShare);

            if (tShare === null || aShare === null) {
                toast({
                    title: "⚠️ Invalid Percentages",
                    description: "Please provide valid teacher and academy shares.",
                    variant: "destructive",
                });
                return;
            }

            // Bulletproof 100% check
            if (tShare + aShare !== 100) {
                toast({
                    title: "🧮 Math Error",
                    description: "Total split must be exactly 100%. Currently: " + (tShare + aShare) + "%",
                    variant: "destructive",
                });
                return;
            }

            compensation.teacherShare = tShare;
            compensation.academyShare = aShare;
            // Explicitly set unused fields to null
            compensation.fixedSalary = null;
            compensation.baseSalary = null;
            compensation.profitShare = null;
        } else if (compType === "fixed") {
            const salary = toNumberOrNull(fixedSalary);

            if (salary === null) {
                toast({
                    title: "⚠️ Invalid Salary",
                    description: "Please provide a valid fixed salary amount.",
                    variant: "destructive",
                });
                return;
            }

            compensation.fixedSalary = salary;
            // Explicitly set unused fields to null
            compensation.teacherShare = null;
            compensation.academyShare = null;
            compensation.baseSalary = null;
            compensation.profitShare = null;
        } else if (compType === "hybrid") {
            const base = toNumberOrNull(baseSalary);
            const profit = toNumberOrNull(bonusPercent);

            if (base === null || profit === null) {
                toast({
                    title: "⚠️ Missing Hybrid Details",
                    description: "Please provide both base salary and profit share percentage.",
                    variant: "destructive",
                });
                return;
            }

            compensation.baseSalary = base;
            compensation.profitShare = profit;
            // Explicitly set unused fields to null
            compensation.teacherShare = null;
            compensation.academyShare = null;
            compensation.fixedSalary = null;
        }

        console.log('🔍 FRONTEND - Sending teacher data:', JSON.stringify({ name, phone, subject, compensation }, null, 2));

        // Build teacher data object
        const teacherData = {
            name,
            phone,
            subject,
            joiningDate: joiningDate || new Date().toISOString(),
            status, //Include status (active/inactive)
            compensation,
        };

        // Trigger mutation
        createTeacherMutation.mutate(teacherData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        Add New Teacher
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Enter the teacher details. Compensation defaults are pre-filled from settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-6">
                    {/* Personal Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Dr. Sarah Ali"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <Input
                                id="phone"
                                placeholder="+92 300 1234567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject Specialization *</Label>
                            <Select value={subject} onValueChange={setSubject}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                    <SelectItem value="biology">Biology</SelectItem>
                                    <SelectItem value="chemistry">Chemistry</SelectItem>
                                    <SelectItem value="physics">Physics</SelectItem>
                                    <SelectItem value="math">Mathematics</SelectItem>
                                    <SelectItem value="english">English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Joining Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border">
                        <div className="space-y-0.5">
                            <Label htmlFor="status" className="text-base font-medium">
                                Teacher Status
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                {status === "active" ? "Currently Active" : "Currently Inactive"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${status === "inactive" ? "text-muted-foreground" : "text-gray-400"}`}>
                                Inactive
                            </span>
                            <Switch
                                id="status"
                                checked={status === "active"}
                                onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
                                className="data-[state=checked]:bg-green-500"
                            />
                            <span className={`text-sm font-medium ${status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                                Active
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border my-2" />

                    {/* Compensation Section */}
                    <div className="space-y-4 bg-secondary/30 p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <Label className="text-base font-medium">Compensation Package</Label>
                        </div>

                        <RadioGroup
                            value={compType}
                            onValueChange={(value) => setCompType(value as CompensationType)}
                            className="grid grid-cols-1 md:grid-cols-3 gap-3"
                        >
                            {/* Percentage Option */}
                            <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors bg-card">
                                <RadioGroupItem value="percentage" id="r1" className="text-primary" />
                                <Label htmlFor="r1" className="font-normal cursor-pointer w-full">
                                    Percentage
                                </Label>
                            </div>

                            {/* Fixed Salary Option */}
                            <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors bg-card">
                                <RadioGroupItem value="fixed" id="r2" className="text-primary" />
                                <Label htmlFor="r2" className="font-normal cursor-pointer w-full">
                                    Fixed Salary
                                </Label>
                            </div>

                            {/* Hybrid Option */}
                            <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors bg-card">
                                <RadioGroupItem value="hybrid" id="r3" className="text-primary" />
                                <Label htmlFor="r3" className="font-normal cursor-pointer w-full">
                                    Hybrid
                                </Label>
                            </div>
                        </RadioGroup>

                        {/* Dynamic Fields based on Selection */}
                        <div className="grid gap-4 mt-4 animate-fade-in">
                            {compType === "percentage" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm text-muted-foreground">Teacher Share (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={teacherShare}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Strict clamping: force 0-100 range
                                                if (value !== "") {
                                                    const clamped = Math.min(100, Math.max(0, Number(value)));
                                                    setTeacherShare(clamped.toString());
                                                } else {
                                                    setTeacherShare(value);
                                                }
                                            }}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-muted-foreground flex items-center gap-1">
                                            Academy Share (%)
                                            <span className="text-xs text-primary">• Auto-calculated</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            value={academyShare}
                                            disabled
                                            className="bg-muted/50 cursor-not-allowed text-muted-foreground"
                                        />
                                    </div>
                                </div>
                            )}

                            {compType === "fixed" && (
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Monthly Salary (PKR)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 50000"
                                        value={fixedSalary}
                                        onChange={(e) => setFixedSalary(e.target.value)}
                                        className="bg-background"
                                    />
                                </div>
                            )}

                            {compType === "hybrid" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm text-muted-foreground">Base Salary (PKR)</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 25000"
                                            value={baseSalary}
                                            onChange={(e) => setBaseSalary(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm text-muted-foreground">Bonus (%)</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 10"
                                            value={bonusPercent}
                                            onChange={(e) => setBonusPercent(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createTeacherMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createTeacherMutation.isPending}
                        className="header-gradient text-white hover:opacity-90"
                    >
                        {createTeacherMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            'Add Teacher'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
};

export default AddTeacherModal;