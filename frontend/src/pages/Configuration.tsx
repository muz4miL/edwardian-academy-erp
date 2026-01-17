import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Save,
  UserPlus,
  Users,
  Loader2,
  ShieldAlert,
  PieChart,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { AddTeacherModal } from "@/components/dashboard/AddTeacherModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Configuration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Loading & Modal State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // --- Academy Identity State ---
  const [academyName, setAcademyName] = useState("Edwardian Academy");

  // --- Partnership Expense Split State (must total 100%) ---
  const [waqarShare, setWaqarShare] = useState(40);
  const [zahidShare, setZahidShare] = useState(30);
  const [saudShare, setSaudShare] = useState(30);
  const [splitError, setSplitError] = useState("");

  // --- Staff Salary Rules State ---
  const [teacherShare, setTeacherShare] = useState(70);
  const [academyShare, setAcademyShare] = useState(30);
  const [salaryError, setSalaryError] = useState("");

  // --- Check Owner Access ---
  useEffect(() => {
    if (user && user.role !== "OWNER") {
      setAccessDenied(true);
      setIsLoading(false);
    }
  }, [user]);

  // --- Fetch Settings on Component Mount ---
  useEffect(() => {
    const fetchSettings = async () => {
      // Only fetch if user is OWNER
      if (!user || user.role !== "OWNER") {
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/config`, {
          credentials: "include",
        });

        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }

        const result = await response.json();

        if (result.success && result.data) {
          const data = result.data;
          // Academy Identity
          setAcademyName(data.academyName || "Edwardian Academy");

          // Partnership Expense Split
          if (data.expenseSplit) {
            setWaqarShare(data.expenseSplit.waqar ?? 40);
            setZahidShare(data.expenseSplit.zahid ?? 30);
            setSaudShare(data.expenseSplit.saud ?? 30);
          }

          // Staff Salary Rules
          if (data.salaryConfig) {
            setTeacherShare(data.salaryConfig.teacherShare ?? 70);
            setAcademyShare(data.salaryConfig.academyShare ?? 30);
          }
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

    if (user) {
      fetchSettings();
    }
  }, [user, toast]);

  // --- Validate Partnership Split (must total 100%) ---
  useEffect(() => {
    const total = waqarShare + zahidShare + saudShare;
    if (total !== 100) {
      setSplitError(`Total must be 100%. Current: ${total}%`);
    } else {
      setSplitError("");
    }
  }, [waqarShare, zahidShare, saudShare]);

  // --- Validate Salary Split (must total 100%) ---
  useEffect(() => {
    const total = teacherShare + academyShare;
    if (total !== 100) {
      setSalaryError(`Total must be 100%. Current: ${total}%`);
    } else {
      setSalaryError("");
    }
  }, [teacherShare, academyShare]);

  // --- Save Settings Handler ---
  const handleSaveSettings = async () => {
    // Validate splits before saving
    if (waqarShare + zahidShare + saudShare !== 100) {
      toast({
        title: "❌ Validation Error",
        description: "Partnership splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    if (teacherShare + academyShare !== 100) {
      toast({
        title: "❌ Validation Error",
        description: "Salary splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const settingsData = {
        academyName,
        expenseSplit: {
          waqar: waqarShare,
          zahid: zahidShare,
          saud: saudShare,
        },
        salaryConfig: {
          teacherShare,
          academyShare,
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Settings Saved",
          description:
            "Partnership configuration has been updated successfully.",
          className: "bg-green-50 border-green-200",
        });
      } else {
        throw new Error(result.message || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      toast({
        title: "❌ Save Failed",
        description:
          error.message || "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Access Denied Screen ---
  if (accessDenied) {
    return (
      <DashboardLayout title="Configuration">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Access Denied
            </h2>
            <p className="text-muted-foreground max-w-md">
              This configuration page is restricted to the{" "}
              <strong>Owner</strong> only. Partners and Staff cannot view or
              modify partnership settings.
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configuration">
      {/* Header */}
      <HeaderBanner
        title="Partnership Configuration"
        subtitle="Manage expense splits, salary rules, and academy settings (Owner Only)"
      >
        <Button
          onClick={() => setIsTeacherModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </HeaderBanner>

      {/* Configuration Sections */}
      {isLoading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading settings...
          </span>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                <Label className="text-base font-semibold text-foreground">
                  Academy Name
                </Label>
                <Input
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  className="h-10"
                />
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                This name appears on receipts and reports.
              </p>
            </div>
          </div>

          {/* Column 2: Partnership Expense Split */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <PieChart className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Partnership Split
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define how expenses are split between partners. Must total 100%.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Sir Waqar (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={waqarShare}
                    onChange={(e) => setWaqarShare(Number(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Dr. Zahid (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={zahidShare}
                    onChange={(e) => setZahidShare(Number(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    Sir Saud (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={saudShare}
                    onChange={(e) => setSaudShare(Number(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Validation Display */}
              <div
                className={`p-3 rounded-lg ${splitError ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}
              >
                <div className="flex items-center gap-2">
                  {splitError ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        {splitError}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium text-green-700">
                        Total: 100% ✓
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Staff Salary Rules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm h-fit">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <Briefcase className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Staff Salary Rules
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Global split between teachers and the academy for fee
                collections.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Teacher (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={teacherShare}
                    onChange={(e) =>
                      setTeacherShare(Number(e.target.value) || 0)
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-600" />
                    Academy (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={academyShare}
                    onChange={(e) =>
                      setAcademyShare(Number(e.target.value) || 0)
                    }
                    className="h-10"
                  />
                </div>
              </div>

              {/* Validation Display */}
              <div
                className={`p-3 rounded-lg ${salaryError ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}
              >
                <div className="flex items-center gap-2">
                  {salaryError ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700">
                        {salaryError}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium text-green-700">
                        Total: 100% ✓
                      </span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Example: With 70/30, if a teacher collects PKR 10,000, they keep
                PKR 7,000.
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
          disabled={isSaving || isLoading || !!splitError || !!salaryError}
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
        defaultMode="percentage"
        defaultTeacherShare={String(teacherShare)}
        defaultAcademyShare={String(academyShare)}
        defaultFixedSalary=""
      />
    </DashboardLayout>
  );
};

export default Configuration;
