import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { User, DollarSign, Loader2, Eye, Edit, Camera } from "lucide-react";
import { teacherApi, settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImageCapture } from "@/components/shared/ImageCapture";

interface ViewEditTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: any | null;
  mode: "view" | "edit";
}

type CompensationType = "percentage" | "fixed" | "perStudent";

export const ViewEditTeacherModal = ({
  open,
  onOpenChange,
  teacher,
  mode: initialMode,
}: ViewEditTeacherModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "edit">(initialMode);

  // Fetch configuration for dynamic subjects
  const { data: configData } = useQuery({
    queryKey: ["config"],
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const subjects = configData?.data?.defaultSubjectFees || [];

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [compType, setCompType] = useState<CompensationType>("percentage");
  const [teacherShare, setTeacherShare] = useState("70");
  const [academyShare, setAcademyShare] = useState("30");
  const [fixedSalary, setFixedSalary] = useState("");
  const [perStudentAmount, setPerStudentAmount] = useState("");
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
      setProfileImage(teacher.profileImage || null);

      const comp = teacher.compensation;
      if (comp) {
        setCompType(comp.type || "percentage");
        setTeacherShare(String(comp.teacherShare ?? 70));
        setAcademyShare(String(comp.academyShare ?? 30));
        setFixedSalary(String(comp.fixedSalary ?? ""));
        setPerStudentAmount(String(comp.perStudentAmount ?? ""));
        setBaseSalary(String(comp.baseSalary ?? ""));
        setProfitShare(String(comp.profitShare ?? ""));
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
    } else if (compType === "perStudent") {
      compensation.perStudentAmount = Number(perStudentAmount);
    }

    const teacherData = {
      name,
      phone,
      subject,
      joiningDate,
      compensation,
      profileImage: profileImage || null,
    };

    updateTeacherMutation.mutate({ id: teacher._id, data: teacherData });
  };

  const isReadOnly = mode === "view";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] bg-card border-border text-foreground max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b bg-gray-50/50 shrink-0">
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center py-4 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-100">
            {isReadOnly ? (
              <div className="flex flex-col items-center gap-3">
                {profileImage ? (
                  <div className="relative">
                    <img
                      src={profileImage}
                      alt={name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-amber-400/60 shadow-md"
                    />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                      <Camera className="h-3 w-3 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-sm">
                    <span className="text-3xl font-bold text-primary">
                      {name?.charAt(0)?.toUpperCase() || <User className="h-10 w-10 text-primary/50" />}
                    </span>
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-800">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {profileImage ? "Profile photo on file" : "No photo uploaded"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Profile Photo
                </p>
                <ImageCapture
                  value={profileImage || undefined}
                  onChange={(img) => setProfileImage(img)}
                  size="lg"
                />
                {profileImage && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Hover over the photo to change or remove it
                  </p>
                )}
              </div>
            )}
          </div>

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
                  {subjects.map((s: any) => (
                    <SelectItem key={s.name} value={s.name.toLowerCase()}>
                      {s.name}
                    </SelectItem>
                  ))}
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

            {/* Owner/Partner: Read-only 100% Revenue Pool */}
            {(teacher?.userId?.role === "OWNER" || teacher?.userId?.role === "PARTNER") ? (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold shadow">
                    💰
                  </div>
                  <div>
                    <p className="font-bold text-amber-900 text-lg">100% Revenue Pool</p>
                    <p className="text-sm text-amber-700">
                      {teacher?.userId?.role === "OWNER" ? "Owner" : "Partner"} — earns 100% of tuition fee splits + academy share from config
                    </p>
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-3 bg-amber-100/50 rounded-lg p-3">
                  Revenue is auto-calculated when students pay fees and appears in the <strong>Daily Revenue Close</strong> section on the dashboard.
                  No manual compensation needed — close daily from your dashboard.
                </p>
              </div>
            ) : (
              <>
                {/* Regular Teacher: Normal compensation options */}
                <RadioGroup
                  value={compType}
                  onValueChange={(value) =>
                    !isReadOnly && setCompType(value as CompensationType)
                  }
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
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
                  <div
                    className={`flex items-center space-x-2 border border-border rounded-lg p-3 ${isReadOnly ? "opacity-70" : "cursor-pointer hover:border-primary/50"} transition-colors bg-card`}
                  >
                    <RadioGroupItem
                      value="perStudent"
                      id="r3"
                      className="text-primary"
                      disabled={isReadOnly}
                    />
                    <Label
                      htmlFor="r3"
                      className={`font-normal w-full ${!isReadOnly && "cursor-pointer"}`}
                    >
                      Per Student
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

                  {compType === "perStudent" && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Amount Per Student (PKR)
                      </Label>
                      <Input
                        type="number"
                        value={perStudentAmount}
                        onChange={(e) => setPerStudentAmount(e.target.value)}
                        disabled={isReadOnly}
                        placeholder="e.g. 3000"
                        className="bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Teacher earns this amount per active enrolled student. Shown in payroll reports.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50/50 shrink-0">
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
