import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
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
  Settings,
  Save,
  UserPlus,
  Users,
  CreditCard,
  Loader2,
  BookOpen,
  Trash2,
  Plus,
} from "lucide-react";
import { AddTeacherModal } from "@/components/dashboard/AddTeacherModal";
import { useToast } from "@/hooks/use-toast";

const Configuration = () => {
  const { toast } = useToast();

  // --- Loading & Modal State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);

  // --- Academy Identity State ---
  const [academyName, setAcademyName] = useState("Academy Management System");
  const [contactEmail, setContactEmail] = useState("admin@academy.com");
  const [contactPhone, setContactPhone] = useState("+92 321 1234567");
  const [currency, setCurrency] = useState("PKR");

  // --- Teacher Compensation Defaults State ---
  const [globalCompMode, setGlobalCompMode] = useState<"percentage" | "fixed">("percentage");
  const [defaultTeacherShare, setDefaultTeacherShare] = useState("70");
  const [defaultAcademyShare, setDefaultAcademyShare] = useState("30");
  const [defaultFixedSalary, setDefaultFixedSalary] = useState("");

  // --- Student Policies State ---
  const [defaultLateFee, setDefaultLateFee] = useState("500");
  const [feeDueDay, setFeeDueDay] = useState("10");

  // --- Global Subject Fees State ---
  const [defaultSubjectFees, setDefaultSubjectFees] = useState<Array<{ name: string; fee: number }>>([]);

  // --- Fetch Settings on Component Mount ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:5000/api/config");
        const result = await response.json();

        if (result.success && result.data) {
          const data = result.data;
          // Academy Identity
          setAcademyName(data.academyName || "Academy Management System");
          setContactEmail(data.contactEmail || "admin@academy.com");
          setContactPhone(data.contactPhone || "+92 321 1234567");
          setCurrency(data.currency || "PKR");

          // Teacher Defaults
          setGlobalCompMode(data.defaultCompensationMode || "percentage");
          setDefaultTeacherShare(String(data.defaultTeacherShare || 70));
          setDefaultAcademyShare(String(data.defaultAcademyShare || 30));
          setDefaultFixedSalary(String(data.defaultBaseSalary || ""));

          // Student Policies
          setDefaultLateFee(String(data.defaultLateFee || 500));
          setFeeDueDay(data.feeDueDay || "10");

          // Global Subject Fees
          setDefaultSubjectFees(data.defaultSubjectFees || []);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast({
          title: "Error Loading Settings",
          description: "Failed to load configuration. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  // --- Subject Fee Management Helpers ---
  const addSubject = () => {
    setDefaultSubjectFees([...defaultSubjectFees, { name: "", fee: 0 }]);
  };

  const removeSubject = (index: number) => {
    setDefaultSubjectFees(defaultSubjectFees.filter((_, i) => i !== index));
  };

  const updateSubjectName = (index: number, name: string) => {
    const updated = [...defaultSubjectFees];
    updated[index].name = name;
    setDefaultSubjectFees(updated);
  };

  const updateSubjectFee = (index: number, fee: string) => {
    const updated = [...defaultSubjectFees];
    updated[index].fee = Number(fee) || 0;
    setDefaultSubjectFees(updated);
  };

  // --- Save Settings Handler ---
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      const settingsData = {
        // Academy Identity
        academyName,
        contactEmail,
        contactPhone,
        currency,

        // Teacher Defaults
        defaultCompensationMode: globalCompMode,
        defaultTeacherShare: Number(defaultTeacherShare),
        defaultAcademyShare: Number(defaultAcademyShare),
        defaultBaseSalary: Number(defaultFixedSalary) || 0,

        // Student Policies
        defaultLateFee: Number(defaultLateFee),
        feeDueDay,

        // Global Subject Fees
        defaultSubjectFees,
      };

      const response = await fetch("http://localhost:5000/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Settings Saved",
          description: "All configuration changes have been saved successfully.",
          className: "bg-green-50 border-green-200",
        });
      } else {
        throw new Error(result.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "❌ Save Failed",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title="Configuration">
      {/* Header: Only "Add Teacher" action remains */}
      <HeaderBanner
        title="System Configuration"
        subtitle="Manage core academy settings and compensation rules"
      >
        <Button
          onClick={() => setIsTeacherModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </HeaderBanner>

      {/* Configuration Sections (4 Columns) */}
      {isLoading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading settings...</span>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Column 1: General Info */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                General Info
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Academy Name</Label>
                <Input
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Contact Email</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Contact Phone</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-background h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="PKR">PKR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Column 2: Teacher Rules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Teacher Rules
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Compensation Model</Label>
                <Select
                  value={globalCompMode}
                  onValueChange={(value: "percentage" | "fixed") => setGlobalCompMode(value)}
                >
                  <SelectTrigger className="bg-background h-10">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="percentage">Percentage Split</SelectItem>
                    <SelectItem value="fixed">Fixed Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {globalCompMode === "percentage" && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Teacher (%)</Label>
                    <Input
                      type="number"
                      value={defaultTeacherShare}
                      onChange={(e) => setDefaultTeacherShare(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Academy (%)</Label>
                    <Input
                      type="number"
                      value={defaultAcademyShare}
                      onChange={(e) => setDefaultAcademyShare(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              )}

              {globalCompMode === "fixed" && (
                <div className="space-y-2 animate-fade-in">
                  <Label className="font-semibold text-sm">Base Salary (PKR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={defaultFixedSalary}
                    onChange={(e) => setDefaultFixedSalary(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Student Rules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Student Rules
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Late Fee (PKR)</Label>
                <Input
                  type="number"
                  value={defaultLateFee}
                  onChange={(e) => setDefaultLateFee(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Due Day</Label>
                <Select value={feeDueDay} onValueChange={setFeeDueDay}>
                  <SelectTrigger className="bg-background h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="1">1st</SelectItem>
                    <SelectItem value="5">5th</SelectItem>
                    <SelectItem value="10">10th</SelectItem>
                    <SelectItem value="15">15th</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Column 4: Subject Fee Management */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Subject Fees
              </h3>
            </div>

            <div className="space-y-3">
              {defaultSubjectFees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No global subject fees defined yet
                </p>
              ) : (
                defaultSubjectFees.map((subject, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="Subject name"
                      value={subject.name}
                      onChange={(e) => updateSubjectName(index, e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Fee"
                      value={subject.fee}
                      onChange={(e) => updateSubjectFee(index, e.target.value)}
                      className="h-9 w-24"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSubject(index)}
                      className="h-9 w-9 hover:bg-red-50 hover:text-red-600"
                      title="Remove subject"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}

              <Button
                variant="outline"
                onClick={addSubject}
                className="w-full h-9 text-sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Subject
              </Button>

              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                These fees will be used as defaults when creating new classes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={handleSaveSettings}
          disabled={isSaving || isLoading}
          className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-base font-semibold"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      {/* Modal Integration */}
      <AddTeacherModal
        open={isTeacherModalOpen}
        onOpenChange={setIsTeacherModalOpen}
        defaultMode={globalCompMode}
        defaultTeacherShare={defaultTeacherShare}
        defaultAcademyShare={defaultAcademyShare}
        defaultFixedSalary={defaultFixedSalary}
      />
    </DashboardLayout>
  );
};

export default Configuration;