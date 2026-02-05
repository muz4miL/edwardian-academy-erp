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
import { Switch } from "@/components/ui/switch";
import {
  User,
  DollarSign,
  Loader2,
  Copy,
  CheckCircle2,
  Key,
  Camera,
  UserCircle,
  Calendar,
  PhoneCall,
  BookOpen,
} from "lucide-react";
import { teacherApi, settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ImageCapture } from "@/components/shared/ImageCapture";
import { cn } from "@/lib/utils"; // Ensure you have this utility from Shadcn

interface AddTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "percentage" | "fixed";
  defaultTeacherShare?: string;
  defaultAcademyShare?: string;
  defaultFixedSalary?: string;
}

type CompensationType = "percentage" | "fixed";

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

  // Fetch configuration for dynamic subjects
  const { data: configData } = useQuery({
    queryKey: ["config"],
    queryFn: settingsApi.get,
    staleTime: 5 * 60 * 1000,
  });

  const subjects = configData?.data?.defaultSubjectFees || [];

  // Form State - Personal Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Credentials display state
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<
    "username" | "password" | null
  >(null);

  // Form State - Compensation
  const [compType, setCompType] = useState<CompensationType>(defaultMode);
  const [teacherShare, setTeacherShare] = useState(defaultTeacherShare);
  const [academyShare, setAcademyShare] = useState(defaultAcademyShare);
  const [fixedSalary, setFixedSalary] = useState(defaultFixedSalary);
  const [baseSalary, setBaseSalary] = useState("");
  const [bonusPercent, setBonusPercent] = useState("");

  // React Query Mutation
  const createTeacherMutation = useMutation({
    mutationFn: teacherApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      if (data.credentials) {
        setCredentials({
          username: data.credentials.username,
          password: data.credentials.password,
        });
        setShowCredentials(true);
      } else {
        toast({
          title: "✅ Teacher Added Successfully",
          description: `${data.data.name} has been added to the system.`,
          className: "bg-green-50 border-green-200 text-green-900",
        });
        resetForm();
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "❌ Failed to Add Teacher",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setPhone("");
    setSubject("");
    setJoiningDate("");
    setStatus("active");
    setCompType(defaultMode);
    setTeacherShare(defaultTeacherShare);
    setAcademyShare(defaultAcademyShare);
    setFixedSalary(defaultFixedSalary);
    setBaseSalary("");
    setBonusPercent("");
    setProfileImage(null);
    setCredentials(null);
    setShowCredentials(false);
  };

  const copyToClipboard = async (
    text: string,
    field: "username" | "password",
  ) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCredentialsClose = () => {
    setShowCredentials(false);
    resetForm();
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      setCompType(defaultMode);
      setTeacherShare(defaultTeacherShare);
      setAcademyShare(defaultAcademyShare);
      setFixedSalary(defaultFixedSalary);
      setBaseSalary("");
      setBonusPercent("");
    }
  }, [
    open,
    defaultMode,
    defaultTeacherShare,
    defaultAcademyShare,
    defaultFixedSalary,
  ]);

  useEffect(() => {
    if (compType === "percentage" && teacherShare) {
      const teacherValue = Number(teacherShare);
      if (!isNaN(teacherValue) && teacherValue >= 0 && teacherValue <= 100) {
        const calculatedAcademyShare = (100 - teacherValue).toString();
        setAcademyShare(calculatedAcademyShare);
      }
    }
  }, [teacherShare, compType]);

  const handleSubmit = () => {
    if (!name || !phone || !subject) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const toNumberOrNull = (value: string) => {
      if (!value || value.trim() === "") return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

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
      if (tShare + aShare !== 100) {
        toast({
          title: "🧮 Math Error",
          description: `Total split must be exactly 100%. Currently: ${tShare + aShare}%`,
          variant: "destructive",
        });
        return;
      }
      compensation.teacherShare = tShare;
      compensation.academyShare = aShare;
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
      compensation.teacherShare = null;
      compensation.academyShare = null;
      compensation.baseSalary = null;
      compensation.profitShare = null;
    }

    const teacherData = {
      name,
      phone,
      subject,
      joiningDate: joiningDate || new Date().toISOString(),
      status,
      compensation,
      profileImage: profileImage || null,
    };

    createTeacherMutation.mutate(teacherData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden bg-white text-foreground max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="px-8 py-6 border-b bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Add New Teacher
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Create a new profile and set compensation details.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="grid grid-cols-12 gap-8">
              {/* Left Column - Profile (4 cols) */}
              <div className="col-span-12 md:col-span-4 lg:col-span-4 space-y-6">
                <div className="flex flex-col items-center">
                  <Label className="text-sm font-semibold text-gray-700 mb-3 w-full text-left">
                    Profile Photo
                  </Label>
                  <div className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 flex flex-col items-center justify-center p-4 hover:bg-gray-50 hover:border-primary/50 transition-all group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100/50 pointer-events-none" />

                    {profileImage ? (
                      <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center z-10">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Camera className="h-7 w-7 text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          Upload Photo
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          JPG or PNG
                        </span>
                      </div>
                    )}

                    {/* Invisible trigger to open camera/upload */}
                    <div className="absolute inset-0 z-20 cursor-pointer">
                      <ImageCapture
                        value={profileImage || undefined}
                        onChange={(img) => setProfileImage(img)}
                        className="opacity-0 w-full h-full"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Max file size: 2MB
                  </p>
                </div>
              </div>

              {/* Right Column - Form (8 cols) */}
              <div className="col-span-12 md:col-span-8 lg:col-span-8 space-y-8">
                {/* Section 1: Personal Details */}
                <section>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-gray-400" /> Personal
                    Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-gray-700"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          placeholder="e.g. Dr. Sarah Ali"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-9 h-10 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-gray-700"
                      >
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          placeholder="+92 300 1234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="pl-9 h-10 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="subject"
                        className="text-sm font-medium text-gray-700"
                      >
                        Subject <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                        <Select value={subject} onValueChange={setSubject}>
                          <SelectTrigger className="pl-9 h-10 focus-visible:ring-primary/20">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.length > 0 ? (
                              subjects.map((subj: any) => (
                                <SelectItem
                                  key={subj.name}
                                  value={subj.name.toLowerCase()}
                                >
                                  {subj.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="biology">Biology</SelectItem>
                                <SelectItem value="chemistry">
                                  Chemistry
                                </SelectItem>
                                <SelectItem value="physics">Physics</SelectItem>
                                <SelectItem value="mathematics">
                                  Mathematics
                                </SelectItem>
                                <SelectItem value="english">English</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="date"
                        className="text-sm font-medium text-gray-700"
                      >
                        Joining Date
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="date"
                          type="date"
                          value={joiningDate}
                          onChange={(e) => setJoiningDate(e.target.value)}
                          className="pl-9 h-10 focus-visible:ring-primary/20 text-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 2: Status Toggle */}
                <section className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${status === "active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-current" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Teacher Status
                      </p>
                      <p className="text-xs text-gray-500">
                        {status === "active"
                          ? "Visible and active in system"
                          : "Hidden from schedules"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={status === "active"}
                    onCheckedChange={(checked) =>
                      setStatus(checked ? "active" : "inactive")
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                </section>

                {/* Section 3: Compensation Package */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />{" "}
                    Compensation Package
                  </h3>

                  {/* Type Selection Cards */}
                  <RadioGroup
                    value={compType}
                    onValueChange={(value) =>
                      setCompType(value as CompensationType)
                    }
                    className="grid grid-cols-2 gap-3"
                  >
                    {[
                      {
                        value: "percentage",
                        label: "Percentage",
                        icon: "%",
                        desc: "70/30 Split",
                      },
                      {
                        value: "fixed",
                        label: "Fixed Salary",
                        icon: "PKR",
                        desc: "Monthly amount",
                      },
                    ].map((type) => (
                      <div key={type.value}>
                        <RadioGroupItem
                          value={type.value}
                          id={`comp-${type.value}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`comp-${type.value}`}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all h-full",
                            "hover:bg-gray-50 hover:border-gray-300",
                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary",
                            "border-gray-200 text-gray-500",
                          )}
                        >
                          <span className="text-xs font-bold uppercase tracking-wide mb-1">
                            {type.icon}
                          </span>
                          <span className="text-sm font-medium">
                            {type.label}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {/* Dynamic Inputs */}
                  <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    {compType === "percentage" && (
                      <div className="space-y-4">
                        {/* Visual Split Bar */}
                        <div className="relative h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${teacherShare}%` }}
                          />
                          <div
                            className="h-full bg-blue-400 transition-all duration-500 ease-out"
                            style={{ width: `${academyShare}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                          <span className="text-primary">
                            Teacher Share ({teacherShare}%)
                          </span>
                          <span className="text-blue-500">
                            Academy Share ({academyShare}%)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-500 uppercase">
                              Teacher Cut
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={teacherShare}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== "") {
                                    const clamped = Math.min(
                                      100,
                                      Math.max(0, Number(val)),
                                    );
                                    setTeacherShare(clamped.toString());
                                  } else {
                                    setTeacherShare(val);
                                  }
                                }}
                                className="h-11 font-bold text-primary border-primary/20 focus:border-primary"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                %
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2 opacity-75">
                            <Label className="text-xs font-medium text-gray-500 uppercase">
                              Academy Cut
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={academyShare}
                                disabled
                                className="h-11 bg-gray-50 font-bold text-blue-600 border-blue-100"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {compType === "fixed" && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-500">
                          Monthly Fixed Salary (PKR)
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="e.g. 50000"
                            value={fixedSalary}
                            onChange={(e) => setFixedSalary(e.target.value)}
                            className="pl-9 h-11 font-medium"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="p-6 border-t bg-gray-50/50 backdrop-blur-sm">
            <div className="flex w-full justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={createTeacherMutation.isPending}
                className="text-gray-600 hover:text-gray-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTeacherMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 min-w-[140px]"
              >
                {createTeacherMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Teacher"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal - Modernized */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="sm:max-w-[480px] overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-50 to-white p-6 text-center border-b border-emerald-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Credentials Generated
            </DialogTitle>
            <DialogDescription className="text-gray-500 mt-2">
              Please save these details immediately. The password will not be
              shown again.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Username
              </Label>
              <div className="flex">
                <div className="flex-1 px-4 py-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg font-mono text-lg text-gray-700">
                  {credentials?.username}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-l-none border border-l-0 border-gray-200"
                  onClick={() =>
                    copyToClipboard(credentials?.username || "", "username")
                  }
                >
                  {copiedField === "username" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Password
              </Label>
              <div className="flex">
                <div className="flex-1 px-4 py-3 bg-amber-50 border border-r-0 border-amber-100 rounded-l-lg font-mono text-lg text-amber-900">
                  {credentials?.password}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-l-none border border-l-0 border-amber-200 bg-amber-50 hover:bg-amber-100"
                  onClick={() =>
                    copyToClipboard(credentials?.password || "", "password")
                  }
                >
                  {copiedField === "password" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-amber-700" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-3 items-start">
              <span className="text-xl">⚠️</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                We highly recommend copying these credentials now. If lost, they
                will require a system reset to recover.
              </p>
            </div>
          </div>

          <div className="p-6 pt-0">
            <Button
              onClick={handleCredentialsClose}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
            >
              I Have Saved the Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddTeacherModal;
