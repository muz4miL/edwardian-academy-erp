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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, DollarSign, Loader2, Eye, Edit } from "lucide-react";
import { teacherApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ViewEditTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: any | null;
  mode: "view" | "edit";
}

type CompensationType = "percentage" | "fixed";

export const ViewEditTeacherModal = ({
  open,
  onOpenChange,
  teacher,
  mode: initialMode,
}: ViewEditTeacherModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [compType, setCompType] = useState<CompensationType>("percentage");
  const [teacherShare, setTeacherShare] = useState("70");
  const [academyShare, setAcademyShare] = useState("30");
  const [fixedSalary, setFixedSalary] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [profitShare, setProfitShare] = useState("");

  // Populate form when teacher data changes
  useEffect(() => {
    if (teacher && open) {
      setName(teacher.name || "");
      setPhone(teacher.phone || "");
      setSubject(teacher.subject || "");
      setJoiningDate(
        teacher.joiningDate ? teacher.joiningDate.split("T")[0] : "",
      );

      const comp = teacher.compensation;
      if (comp) {
        setCompType(comp.type || "percentage");
        setTeacherShare(String(comp.teacherShare || 70));
        setAcademyShare(String(comp.academyShare || 30));
        setFixedSalary(String(comp.fixedSalary || ""));
        setBaseSalary(String(comp.baseSalary || ""));
        setProfitShare(String(comp.profitShare || ""));
      }
    }
  }, [teacher, open]);

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Auto-calculate academyShare when teacherShare changes (for percentage mode)
  useEffect(() => {
    if (compType === "percentage" && teacherShare && mode === "edit") {
      const teacherValue = Number(teacherShare);
      if (!isNaN(teacherValue) && teacherValue >= 0 && teacherValue <= 100) {
        const calculatedAcademyShare = (100 - teacherValue).toString();
        setAcademyShare(calculatedAcademyShare);
      }
    }
  }, [teacherShare, compType, mode]);

  // Update mutation
  const updateTeacherMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      teacherApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "✅ Teacher Updated",
        description: `${data.data.name} has been updated successfully.`,
        className: "bg-green-50 border-green-200",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Update Failed",
        description: error.message || "Could not update teacher.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!teacher?._id) return;

    // Build compensation object
    let compensation: any = { type: compType };

    if (compType === "percentage") {
      const tShare = Number(teacherShare);
      const aShare = Number(academyShare);

      // Bulletproof 100% check
      if (tShare + aShare !== 100) {
        toast({
          title: "🧮 Math Error",
          description:
            "Total split must be exactly 100%. Currently: " +
            (tShare + aShare) +
            "%",
          variant: "destructive",
        });
        return;
      }

      compensation.teacherShare = tShare;
      compensation.academyShare = aShare;
    } else if (compType === "fixed") {
      compensation.fixedSalary = Number(fixedSalary);
    }

    const teacherData = {
      name,
      phone,
      subject,
      joiningDate,
      compensation,
    };

    updateTeacherMutation.mutate({ id: teacher._id, data: teacherData });
  };

  const isReadOnly = mode === "view";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              {mode === "view" ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <Edit className="h-5 w-5 text-primary" />
              )}
            </div>
            {mode === "view" ? "Teacher Details" : "Edit Teacher"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "view"
              ? "View teacher information and compensation details."
              : "Update teacher information and compensation details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-6">
          {/* Personal Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isReadOnly}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isReadOnly}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={subject}
                onValueChange={setSubject}
                disabled={isReadOnly}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
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
                disabled={isReadOnly}
                className="bg-background"
              />
            </div>
          </div>

          {/* Compensation Section */}
          <div className="space-y-4 bg-secondary/30 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <Label className="text-base font-medium">
                Compensation Package
              </Label>
            </div>

            <RadioGroup
              value={compType}
              onValueChange={(value) =>
                !isReadOnly && setCompType(value as CompensationType)
              }
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              disabled={isReadOnly}
            >
              <div
                className={`flex items-center space-x-2 border border-border rounded-lg p-3 ${isReadOnly ? "opacity-70" : "cursor-pointer hover:border-primary/50"} transition-colors bg-card`}
              >
                <RadioGroupItem
                  value="percentage"
                  id="r1"
                  className="text-primary"
                  disabled={isReadOnly}
                />
                <Label
                  htmlFor="r1"
                  className={`font-normal w-full ${!isReadOnly && "cursor-pointer"}`}
                >
                  Percentage (70/30)
                </Label>
              </div>
              <div
                className={`flex items-center space-x-2 border border-border rounded-lg p-3 ${isReadOnly ? "opacity-70" : "cursor-pointer hover:border-primary/50"} transition-colors bg-card`}
              >
                <RadioGroupItem
                  value="fixed"
                  id="r2"
                  className="text-primary"
                  disabled={isReadOnly}
                />
                <Label
                  htmlFor="r2"
                  className={`font-normal w-full ${!isReadOnly && "cursor-pointer"}`}
                >
                  Fixed Salary
                </Label>
              </div>
            </RadioGroup>

            {/* Dynamic Fields */}
            <div className="grid gap-4 mt-4">
              {compType === "percentage" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Teacher Share (%)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={teacherShare}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Strict clamping: force 0-100 range
                        if (value !== "") {
                          const clamped = Math.min(
                            100,
                            Math.max(0, Number(value)),
                          );
                          setTeacherShare(clamped.toString());
                        } else {
                          setTeacherShare(value);
                        }
                      }}
                      disabled={isReadOnly}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1">
                      Academy Share (%)
                      <span className="text-xs text-primary">
                        • Auto-calculated
                      </span>
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
                  <Label className="text-sm text-muted-foreground">
                    Monthly Salary (PKR)
                  </Label>
                  <Input
                    type="number"
                    value={fixedSalary}
                    onChange={(e) => setFixedSalary(e.target.value)}
                    disabled={isReadOnly}
                    className="bg-background"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {mode === "view" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => setMode("edit")}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Teacher
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  mode === "edit" && teacher
                    ? setMode("view")
                    : onOpenChange(false)
                }
                disabled={updateTeacherMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateTeacherMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateTeacherMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
