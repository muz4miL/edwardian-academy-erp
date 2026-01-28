/**
 * Configuration Page - 4-Card Financial Engine Setup
 *
 * Card 1: Global Staff Split (Revenue IN) - Teacher % / Academy %
 * Card 2: Partner Revenue Rule (The 100% Rule) - Toggle for partners
 * Card 3: Dynamic Expense Split (Money OUT) - Waqar/Zahid/Saud %
 * Card 4: Academy Info - Name, Logo, Address
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  Save,
  Loader2,
  ShieldAlert,
  PieChart,
  Users,
  Crown,
  Building2,
  AlertCircle,
  CheckCircle2,
  Percent,
  Banknote,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Configuration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Loading State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // --- Card 1: Global Staff Split (Revenue IN) ---
  const [teacherShare, setTeacherShare] = useState(70);
  const [academyShare, setAcademyShare] = useState(30);
  const [salaryError, setSalaryError] = useState("");

  // --- Card 2: Partner 100% Rule ---
  const [partner100Rule, setPartner100Rule] = useState(true);

  // --- Card 3: Dynamic Expense Split (Money OUT) ---
  const [waqarShare, setWaqarShare] = useState(40);
  const [zahidShare, setZahidShare] = useState(30);
  const [saudShare, setSaudShare] = useState(30);
  const [splitError, setSplitError] = useState("");

  // --- Card 6: Academy Pool Distribution (Income IN) ---
  const [poolWaqarShare, setPoolWaqarShare] = useState(40);
  const [poolZahidShare, setPoolZahidShare] = useState(30);
  const [poolSaudShare, setPoolSaudShare] = useState(30);
  const [poolSplitError, setPoolSplitError] = useState("");

  // --- Card 4: Academy Info ---
  const [academyName, setAcademyName] = useState("Edwardian Academy");
  const [academyAddress, setAcademyAddress] = useState("Peshawar, Pakistan");
  const [academyPhone, setAcademyPhone] = useState("");

  // --- Card 5: Master Subject Pricing ---
  const [defaultSubjectFees, setDefaultSubjectFees] = useState<
    Array<{ name: string; fee: number }>
  >([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectFee, setNewSubjectFee] = useState("");

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<{
    name: string;
    fee: number;
    index: number;
  } | null>(null);
  const [editFeeValue, setEditFeeValue] = useState("");

  // --- Check Owner Access ---
  useEffect(() => {
    if (user && user.role !== "OWNER") {
      setAccessDenied(true);
      setIsLoading(false);
    }
  }, [user]);

  // --- Fetch Settings on Mount ---
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user || user.role !== "OWNER") return;

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

          // Card 1: Staff Split
          if (data.salaryConfig) {
            setTeacherShare(data.salaryConfig.teacherShare ?? 70);
            setAcademyShare(data.salaryConfig.academyShare ?? 30);
          }

          // Card 2: Partner 100% Rule
          setPartner100Rule(data.partner100Rule ?? true);

          // Card 3: Expense Split
          if (data.expenseSplit) {
            setWaqarShare(data.expenseSplit.waqar ?? 40);
            setZahidShare(data.expenseSplit.zahid ?? 30);
            setSaudShare(data.expenseSplit.saud ?? 30);
          }

          // Card 6: Pool Distribution
          if (data.poolDistribution) {
            setPoolWaqarShare(data.poolDistribution.waqar ?? 40);
            setPoolZahidShare(data.poolDistribution.zahid ?? 30);
            setPoolSaudShare(data.poolDistribution.saud ?? 30);
          }

          // Card 4: Academy Info
          setAcademyName(data.academyName || "Edwardian Academy");
          setAcademyAddress(data.academyAddress || "Peshawar, Pakistan");
          setAcademyPhone(data.academyPhone || "");

          // Card 5: Master Subject Pricing
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

    if (user) {
      fetchSettings();
    }
  }, [user, toast]);

  // --- Validate Expense Split (must total 100%) ---
  useEffect(() => {
    const total = waqarShare + zahidShare + saudShare;
    if (total !== 100) {
      setSplitError(`Total must be 100%. Current: ${total}%`);
    } else {
      setSplitError("");
    }
  }, [waqarShare, zahidShare, saudShare]);

  // --- Validate Pool Distribution (must total 100%) ---
  useEffect(() => {
    const total = poolWaqarShare + poolZahidShare + poolSaudShare;
    if (total !== 100) {
      setPoolSplitError(`Total must be 100%. Current: ${total}%`);
    } else {
      setPoolSplitError("");
    }
  }, [poolWaqarShare, poolZahidShare, poolSaudShare]);

  // --- Validate Salary Split (must total 100%) ---
  useEffect(() => {
    const total = teacherShare + academyShare;
    if (total !== 100) {
      setSalaryError(`Total must be 100%. Current: ${total}%`);
    } else {
      setSalaryError("");
    }
  }, [teacherShare, academyShare]);

  // --- Instant Save Helper ---
  const saveConfigToBackend = async (
    subjects: Array<{ name: string; fee: number }>,
  ) => {
    try {
      const settingsData = {
        salaryConfig: { teacherShare, academyShare },
        partner100Rule,
        expenseSplit: { waqar: waqarShare, zahid: zahidShare, saud: saudShare },
        poolDistribution: {
          waqar: poolWaqarShare,
          zahid: poolZahidShare,
          saud: poolSaudShare,
        },
        academyName,
        academyAddress,
        academyPhone,
        defaultSubjectFees: subjects,
      };

      console.log("💾 Instant Save: Updating subjects", {
        count: subjects.length,
        subjects,
      });

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to save configuration");
      }

      console.log("✅ Instant Save: Success", {
        savedCount: result.data?.defaultSubjectFees?.length || 0,
      });

      return result.data;
    } catch (error: any) {
      console.error("❌ Instant Save: Failed", error);
      throw error;
    }
  };

  // --- Save Settings Handler ---
  const handleSaveSettings = async () => {
    if (waqarShare + zahidShare + saudShare !== 100) {
      toast({
        title: "❌ Validation Error",
        description: "Expense splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    if (poolWaqarShare + poolZahidShare + poolSaudShare !== 100) {
      toast({
        title: "❌ Validation Error",
        description: "Pool distribution must total 100%",
        variant: "destructive",
      });
      return;
    }

    if (teacherShare + academyShare !== 100) {
      toast({
        title: "❌ Validation Error",
        description: "Staff splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const settingsData = {
        // Card 1
        salaryConfig: {
          teacherShare,
          academyShare,
        },
        // Card 2
        partner100Rule,
        // Card 3
        expenseSplit: {
          waqar: waqarShare,
          zahid: zahidShare,
          saud: saudShare,
        },
        // Card 6
        poolDistribution: {
          waqar: poolWaqarShare,
          zahid: poolZahidShare,
          saud: poolSaudShare,
        },
        // Card 4
        academyName,
        academyAddress,
        academyPhone,
        // Card 5
        defaultSubjectFees,
      };

      console.log("💾 Saving configuration with subject fees:", {
        subjectCount: defaultSubjectFees.length,
        subjects: defaultSubjectFees,
      });

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ Settings Saved",
          description:
            "All configuration changes have been saved successfully.",
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
              <strong>Owner</strong> only.
            </p>
          </div>
          <Button onClick={() => navigate("/")} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configuration">
      <HeaderBanner
        title="⚙️ Financial Engine Configuration"
        subtitle="Configure revenue splits, expense sharing, and academy settings"
      />

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">
            Loading settings...
          </span>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ========== CARD 1: Global Staff Split (Revenue IN) ========== */}
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-green-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Global Staff Split</CardTitle>
                  <CardDescription>
                    Revenue IN - for non-partner teachers
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                When a student pays fees, this split applies to{" "}
                <strong>regular teachers</strong> (not partners).
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <Percent className="h-4 w-4 text-emerald-600" />
                    Teacher Share
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={teacherShare}
                      onChange={(e) =>
                        setTeacherShare(Number(e.target.value) || 0)
                      }
                      className="h-12 text-lg font-bold pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Academy Share
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={academyShare}
                      onChange={(e) =>
                        setAcademyShare(Number(e.target.value) || 0)
                      }
                      className="h-12 text-lg font-bold pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation */}
              <div
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  salaryError
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                {salaryError ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      {salaryError}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Total: 100% ✓
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Example: With 70/30, if student pays PKR 10,000, teacher keeps
                PKR 7,000.
              </p>
            </CardContent>
          </Card>

          {/* ========== CARD 2: Partner Revenue Rule (The 100% Rule) ========== */}
          <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-amber-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <Crown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Partner Revenue Rule
                  </CardTitle>
                  <CardDescription>
                    The 100% Rule for academy partners
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                When enabled,{" "}
                <strong>Sir Waqar, Dr. Zahid, and Sir Saud</strong> receive 100%
                of their own subject fees (bypassing the 70/30 split).
              </p>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-yellow-300">
                <div className="flex items-center gap-3">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold">Partners receive 100%</p>
                    <p className="text-xs text-muted-foreground">
                      For their own subjects
                    </p>
                  </div>
                </div>
                <Switch
                  checked={partner100Rule}
                  onCheckedChange={setPartner100Rule}
                  className="data-[state=checked]:bg-yellow-500"
                />
              </div>

              <div
                className={`p-3 rounded-lg ${
                  partner100Rule
                    ? "bg-yellow-100 border border-yellow-300"
                    : "bg-gray-100 border border-gray-200"
                }`}
              >
                {partner100Rule ? (
                  <p className="text-sm text-yellow-800">
                    ✓ <strong>Active:</strong> Partners keep 100% of their
                    subject fees.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    ✗ <strong>Disabled:</strong> Partners follow the same 70/30
                    split as staff.
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                This rule recognizes partners as co-owners who don't share
                revenue with the academy pool.
              </p>
            </CardContent>
          </Card>

          {/* ========== CARD 3: Dynamic Expense Split (Money OUT) ========== */}
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <PieChart className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Dynamic Expense Split
                  </CardTitle>
                  <CardDescription>
                    Money OUT - how expenses are shared
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                When Sir Waqar pays an expense from his pocket, this split
                determines
                <strong> how much each partner owes</strong>.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                    Sir Waqar (Owner)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={waqarShare}
                      onChange={(e) =>
                        setWaqarShare(Number(e.target.value) || 0)
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500"></span>
                    Dr. Zahid
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={zahidShare}
                      onChange={(e) =>
                        setZahidShare(Number(e.target.value) || 0)
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-purple-500"></span>
                    Sir Saud
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={saudShare}
                      onChange={(e) =>
                        setSaudShare(Number(e.target.value) || 0)
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation */}
              <div
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  splitError
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                {splitError ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      {splitError}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Total: 100% ✓
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Example: PKR 10,000 expense → Zahid owes PKR 3,000, Saud owes
                PKR 3,000.
              </p>
            </CardContent>
          </Card>

          {/* ========== CARD 6: Academy Pool Distribution (Income IN) ========== */}
          <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50/50 to-cyan-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                  <PieChart className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Academy Pool Distribution
                  </CardTitle>
                  <CardDescription>
                    Income IN - how pool is shared among partners
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                When the Academy Pool is distributed, this split determines
                <strong> how much each partner receives</strong>.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                    Sir Waqar (Owner)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={poolWaqarShare}
                      onChange={(e) =>
                        setPoolWaqarShare(Number(e.target.value) || 0)
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500"></span>
                    Dr. Zahid
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={poolZahidShare}
                      onChange={(e) =>
                        setPoolZahidShare(Number(e.target.value) || 0)
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-purple-500"></span>
                    Sir Saud
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={poolSaudShare}
                      onChange={(e) =>
                        setPoolSaudShare(Number(e.target.value) || 0)
                      }
                      className="h-10 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Validation */}
              <div
                className={`p-3 rounded-lg flex items-center gap-2 ${
                  poolSplitError
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                {poolSplitError ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">
                      {poolSplitError}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Total: 100% ✓
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Example: PKR 100,000 pool → Waqar gets PKR 40,000, Zahid gets
                PKR 30,000, Saud gets PKR 30,000.
              </p>
            </CardContent>
          </Card>

          {/* ========== CARD 4: Academy Info ========== */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Academy Information</CardTitle>
                  <CardDescription>
                    Branding for receipts and reports
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Academy Name</Label>
                <Input
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  placeholder="Edwardian Academy"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Address</Label>
                <Input
                  value={academyAddress}
                  onChange={(e) => setAcademyAddress(e.target.value)}
                  placeholder="Peshawar, Pakistan"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Phone Number</Label>
                <Input
                  value={academyPhone}
                  onChange={(e) => setAcademyPhone(e.target.value)}
                  placeholder="+92 XXX XXXXXXX"
                  className="h-10"
                />
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                This information appears on fee receipts and financial reports.
              </p>
            </CardContent>
          </Card>

          {/* ========== CARD 5: Master Subject Pricing ========== */}
          <Card className="lg:col-span-2 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <Banknote className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Master Subject Pricing
                  </CardTitle>
                  <CardDescription>
                    Global base fees synced across all modules
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define default fees for each subject. These will auto-fill in
                Class Management & Public Registration.
              </p>

              {/* Add New Subject */}
              <div className="p-4 bg-white rounded-lg border-2 border-dashed border-indigo-200">
                <p className="text-sm font-semibold mb-3 text-indigo-700">
                  Add New Subject
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <Input
                      placeholder="Subject Name (e.g., Biology)"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="Default Fee"
                        value={newSubjectFee}
                        onChange={(e) => setNewSubjectFee(e.target.value)}
                        className="h-10 pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        PKR
                      </span>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Button
                      onClick={async () => {
                        if (!newSubjectName.trim() || !newSubjectFee) {
                          toast({
                            title: "Missing Information",
                            description:
                              "Please enter both subject name and fee",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Check for duplicates
                        if (
                          defaultSubjectFees.some(
                            (s) =>
                              s.name.toLowerCase() ===
                              newSubjectName.trim().toLowerCase(),
                          )
                        ) {
                          toast({
                            title: "Duplicate Subject",
                            description: "This subject already exists",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Optimistic update
                        const newSubjects = [
                          ...defaultSubjectFees,
                          {
                            name: newSubjectName.trim(),
                            fee: Number(newSubjectFee),
                          },
                        ];
                        setDefaultSubjectFees(newSubjects);
                        const subjectName = newSubjectName.trim();
                        setNewSubjectName("");
                        setNewSubjectFee("");

                        try {
                          // Instant save to backend
                          await saveConfigToBackend(newSubjects);
                          toast({
                            title: "✅ Saved to Database",
                            description: `${subjectName} added and persisted`,
                            className: "bg-green-50 border-green-200",
                          });
                        } catch (error) {
                          // Rollback on failure
                          setDefaultSubjectFees(defaultSubjectFees);
                          setNewSubjectName(subjectName);
                          setNewSubjectFee(String(Number(newSubjectFee)));
                          toast({
                            title: "❌ Failed to Save",
                            description:
                              "Please try again or click 'Save All Changes'",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="w-full h-10 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subject
                    </Button>
                  </div>
                </div>
              </div>

              {/* Subject List */}
              {defaultSubjectFees.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">
                    Current Subject Pricing ({defaultSubjectFees.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                    {defaultSubjectFees.map((subject, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {subject.name}
                          </p>
                          <p className="text-sm text-indigo-600 font-medium">
                            PKR {subject.fee.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Edit Fee Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setEditingSubject({ ...subject, index });
                              setEditFeeValue(String(subject.fee));
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={async () => {
                              if (window.confirm(`Remove ${subject.name}?`)) {
                                // Optimistic update
                                const newSubjects = defaultSubjectFees.filter(
                                  (_, i) => i !== index,
                                );
                                setDefaultSubjectFees(newSubjects);
                                const subjectName = subject.name;

                                try {
                                  // Instant delete from backend
                                  await saveConfigToBackend(newSubjects);
                                  toast({
                                    title: "✅ Deleted from Database",
                                    description: `${subjectName} removed and persisted`,
                                    className: "bg-green-50 border-green-200",
                                  });
                                } catch (error) {
                                  // Rollback on failure
                                  setDefaultSubjectFees(defaultSubjectFees);
                                  toast({
                                    title: "❌ Failed to Delete",
                                    description:
                                      "Please try again or click 'Save All Changes'",
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                  <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No subjects defined yet
                  </p>
                  <p className="text-xs text-gray-400">
                    Add subjects to sync pricing across the system
                  </p>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Auto-Sync:</strong> These fees will appear in Class
                  Management dropdowns & Public Registration forms
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Subject Fee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-indigo-600" />
              Edit Subject Fee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Subject Name</Label>
              <Input
                value={editingSubject?.name || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Default Fee (PKR)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={editFeeValue}
                  onChange={(e) => setEditFeeValue(e.target.value)}
                  placeholder="Enter fee amount"
                  className="pr-12"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const newFee = Number(editFeeValue);
                      if (!isNaN(newFee) && newFee >= 0 && editingSubject) {
                        (async () => {
                          // Optimistic update
                          const newSubjects = defaultSubjectFees.map((s, i) =>
                            i === editingSubject.index
                              ? { ...s, fee: newFee }
                              : s,
                          );
                          setDefaultSubjectFees(newSubjects);
                          const subjectName = editingSubject.name;
                          setEditDialogOpen(false);

                          try {
                            // Instant save to backend
                            await saveConfigToBackend(newSubjects);
                            toast({
                              title: "✅ Saved to Database",
                              description: `${subjectName}: PKR ${newFee.toLocaleString()} persisted`,
                              className: "bg-green-50 border-green-200",
                            });
                          } catch (error) {
                            // Rollback on failure
                            setDefaultSubjectFees(defaultSubjectFees);
                            setEditDialogOpen(true);
                            toast({
                              title: "❌ Failed to Save",
                              description:
                                "Please try again or click 'Save All Changes'",
                              variant: "destructive",
                            });
                          }
                        })();
                      }
                    }
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  PKR
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const newFee = Number(editFeeValue);
                if (!isNaN(newFee) && newFee >= 0 && editingSubject) {
                  // Optimistic update
                  const newSubjects = defaultSubjectFees.map((s, i) =>
                    i === editingSubject.index ? { ...s, fee: newFee } : s,
                  );
                  setDefaultSubjectFees(newSubjects);
                  const subjectName = editingSubject.name;
                  setEditDialogOpen(false);

                  try {
                    // Instant save to backend
                    await saveConfigToBackend(newSubjects);
                    toast({
                      title: "✅ Saved to Database",
                      description: `${subjectName}: PKR ${newFee.toLocaleString()} persisted`,
                      className: "bg-green-50 border-green-200",
                    });
                  } catch (error) {
                    // Rollback on failure
                    setDefaultSubjectFees(defaultSubjectFees);
                    setEditDialogOpen(true);
                    toast({
                      title: "❌ Failed to Save",
                      description:
                        "Please try again or click 'Save All Changes'",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "Invalid Fee",
                    description: "Please enter a valid positive number",
                    variant: "destructive",
                  });
                }
              }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={handleSaveSettings}
          disabled={isSaving || isLoading || !!splitError || !!salaryError}
          className="shadow-lg bg-primary hover:bg-primary/90 h-14 px-8 text-base font-semibold"
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
    </DashboardLayout>
  );
};

export default Configuration;
