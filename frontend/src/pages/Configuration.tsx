/**
 * Configuration Page - Financial Engine Setup
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
  Save,
  Loader2,
  ShieldAlert,
  PieChart,
  Users,
  Crown,
  Building2,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Plus,
  Edit,
  Trash2,
  Wallet,
  GraduationCap,
  Receipt,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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

  // --- Card 8: Waqar's Protocol - Dual Pool Splits ---
  // Protocol A: Tuition Pool (50/30/20)
  const [tuitionPoolWaqar, setTuitionPoolWaqar] = useState(50);
  const [tuitionPoolZahid, setTuitionPoolZahid] = useState(30);
  const [tuitionPoolSaud, setTuitionPoolSaud] = useState(20);
  const [tuitionPoolError, setTuitionPoolError] = useState("");

  // Protocol B: ETEA Pool (40/30/30)
  const [eteaPoolWaqar, setEteaPoolWaqar] = useState(40);
  const [eteaPoolZahid, setEteaPoolZahid] = useState(30);
  const [eteaPoolSaud, setEteaPoolSaud] = useState(30);
  const [eteaPoolError, setEteaPoolError] = useState("");

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

  // --- Card 7: ETEA/MDCAT Config ---
  const [eteaCommission, setEteaCommission] = useState(3000);

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

          // Card 6: Pool Distribution (Legacy)
          if (data.poolDistribution) {
            setPoolWaqarShare(data.poolDistribution.waqar ?? 40);
            setPoolZahidShare(data.poolDistribution.zahid ?? 30);
            setPoolSaudShare(data.poolDistribution.saud ?? 30);
          }

          // Card 8: Waqar's Protocol - Dual Pool Splits
          if (data.tuitionPoolSplit) {
            setTuitionPoolWaqar(data.tuitionPoolSplit.waqar ?? 50);
            setTuitionPoolZahid(data.tuitionPoolSplit.zahid ?? 30);
            setTuitionPoolSaud(data.tuitionPoolSplit.saud ?? 20);
          }
          if (data.eteaPoolSplit) {
            setEteaPoolWaqar(data.eteaPoolSplit.waqar ?? 40);
            setEteaPoolZahid(data.eteaPoolSplit.zahid ?? 30);
            setEteaPoolSaud(data.eteaPoolSplit.saud ?? 30);
          }

          // Card 4: Academy Info
          setAcademyName(data.academyName || "Edwardian Academy");
          setAcademyAddress(data.academyAddress || "Peshawar, Pakistan");
          setAcademyPhone(data.academyPhone || "");

          // Card 5: Master Subject Pricing
          setDefaultSubjectFees(data.defaultSubjectFees || []);

          // Card 7: ETEA Config
          if (data.eteaConfig) {
            setEteaCommission(data.eteaConfig.perStudentCommission ?? 3000);
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

  // --- Validate Tuition Pool Split (must total 100%) ---
  useEffect(() => {
    const total = tuitionPoolWaqar + tuitionPoolZahid + tuitionPoolSaud;
    if (total !== 100) {
      setTuitionPoolError(`Total must be 100%. Current: ${total}%`);
    } else {
      setTuitionPoolError("");
    }
  }, [tuitionPoolWaqar, tuitionPoolZahid, tuitionPoolSaud]);

  // --- Validate ETEA Pool Split (must total 100%) ---
  useEffect(() => {
    const total = eteaPoolWaqar + eteaPoolZahid + eteaPoolSaud;
    if (total !== 100) {
      setEteaPoolError(`Total must be 100%. Current: ${total}%`);
    } else {
      setEteaPoolError("");
    }
  }, [eteaPoolWaqar, eteaPoolZahid, eteaPoolSaud]);

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
        // Waqar's Protocol: Dual Pool Splits
        tuitionPoolSplit: {
          waqar: tuitionPoolWaqar,
          zahid: tuitionPoolZahid,
          saud: tuitionPoolSaud,
        },
        eteaPoolSplit: {
          waqar: eteaPoolWaqar,
          zahid: eteaPoolZahid,
          saud: eteaPoolSaud,
        },
        eteaConfig: {
          perStudentCommission: eteaCommission,
        },
        academyName,
        academyAddress,
        academyPhone,
        defaultSubjectFees: subjects,
      };

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
        title: "Validation Error",
        description: "Expense splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    if (poolWaqarShare + poolZahidShare + poolSaudShare !== 100) {
      toast({
        title: "Validation Error",
        description: "Pool distribution must total 100%",
        variant: "destructive",
      });
      return;
    }

    // Validate Waqar's Protocol splits
    if (tuitionPoolWaqar + tuitionPoolZahid + tuitionPoolSaud !== 100) {
      toast({
        title: "Validation Error",
        description: "Tuition Pool splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    if (eteaPoolWaqar + eteaPoolZahid + eteaPoolSaud !== 100) {
      toast({
        title: "Validation Error",
        description: "ETEA Pool splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    if (teacherShare + academyShare !== 100) {
      toast({
        title: "Validation Error",
        description: "Staff splits must total 100%",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const settingsData = {
        salaryConfig: { teacherShare, academyShare },
        partner100Rule,
        expenseSplit: { waqar: waqarShare, zahid: zahidShare, saud: saudShare },
        poolDistribution: {
          waqar: poolWaqarShare,
          zahid: poolZahidShare,
          saud: poolSaudShare,
        },
        // Waqar's Protocol: Dual Pool Splits
        tuitionPoolSplit: {
          waqar: tuitionPoolWaqar,
          zahid: tuitionPoolZahid,
          saud: tuitionPoolSaud,
        },
        eteaPoolSplit: {
          waqar: eteaPoolWaqar,
          zahid: eteaPoolZahid,
          saud: eteaPoolSaud,
        },
        eteaConfig: { perStudentCommission: eteaCommission },
        academyName,
        academyAddress,
        academyPhone,
        defaultSubjectFees,
      };

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Settings Saved",
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
        title: "Save Failed",
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
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-red-100">
            <ShieldAlert className="h-12 w-12 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Access Denied
            </h2>
            <p className="text-muted-foreground text-lg">
              This configuration page is restricted to the{" "}
              <strong>Owner</strong> only.
            </p>
          </div>
          <Button onClick={() => navigate("/")} size="lg" className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Financial Configuration">
      <div className="min-h-screen bg-gray-50/50 pb-12">
        <HeaderBanner
          title="Financial Engine Configuration"
          subtitle="Manage revenue distribution, expense sharing, and academy settings"
        />

        {isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-muted-foreground">
              Loading configuration...
            </span>
          </div>
        ) : (
          <div className="mt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
            {/* Simple Status Bar */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold">System Configuration</p>
                  <p className="text-sm text-gray-500">Owner Access Only</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <Lock className="h-4 w-4" />
                <span>Super Admin</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ========== CARD 1: Global Staff Split ========== */}
              <Card className="shadow-md">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Global Staff Split
                      </CardTitle>
                      <CardDescription>
                        Revenue IN - Non-partner teachers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
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
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {salaryError ? (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      {salaryError}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Total: 100%
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ========== CARD 2: Partner Revenue Rule ========== */}
              <Card className="shadow-md">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <Crown className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Partner Revenue Rule
                      </CardTitle>
                      <CardDescription>
                        100% retention for partners
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all cursor-pointer",
                      partner100Rule
                        ? "bg-amber-50 border-amber-300"
                        : "bg-gray-50 border-gray-200",
                    )}
                    onClick={() => setPartner100Rule(!partner100Rule)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Partners Receive 100%</p>
                        <p className="text-sm text-gray-500">
                          Bypass standard split for partner subjects
                        </p>
                      </div>
                      <Switch
                        checked={partner100Rule}
                        onCheckedChange={setPartner100Rule}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">Sir Waqar</p>
                      <p className="text-xs text-gray-500">Chemistry</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">Dr. Zahid</p>
                      <p className="text-xs text-gray-500">Zoology</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">Sir Saud</p>
                      <p className="text-xs text-gray-500">Physics</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ========== CARD 3: Expense Split (COMPACT) ========== */}
              <Card className="shadow-md">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
                      <Wallet className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Expense Split</CardTitle>
                      <CardDescription>Money OUT distribution</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-blue-600">
                        Sir Waqar
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
                          className="h-10 pr-6 text-sm font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-emerald-600">
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
                          className="h-10 pr-6 text-sm font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-purple-600">
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
                          className="h-10 pr-6 text-sm font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {splitError ? (
                    <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      {splitError}
                    </div>
                  ) : (
                    <div className="mt-3 p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Total: 100%
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ========== CARD 6: Pool Distribution (COMPACT) ========== */}
              <Card className="shadow-md">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                      <PieChart className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Pool Distribution
                      </CardTitle>
                      <CardDescription>Income IN sharing</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-blue-600">
                        Sir Waqar
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
                          className="h-10 pr-6 text-sm font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-emerald-600">
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
                          className="h-10 pr-6 text-sm font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-purple-600">
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
                          className="h-10 pr-6 text-sm font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {poolSplitError ? (
                    <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      {poolSplitError}
                    </div>
                  ) : (
                    <div className="mt-3 p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Total: 100%
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ========== CARD 8: WAQAR'S PROTOCOL - DUAL POOL SPLITS ========== */}
              <Card className="shadow-md lg:col-span-2 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                <CardHeader className="pb-4 border-b border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <Crown className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-amber-800">
                        Waqar's Protocol
                      </CardTitle>
                      <CardDescription className="text-amber-600">
                        Dual-Pool Revenue Distribution
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Protocol A: Tuition Pool */}
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                          A
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-800">
                            Tuition Pool
                          </h4>
                          <p className="text-xs text-blue-600">
                            After 70% teacher share
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-blue-600">
                            Waqar
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={tuitionPoolWaqar}
                              onChange={(e) =>
                                setTuitionPoolWaqar(Number(e.target.value) || 0)
                              }
                              className="h-9 pr-5 text-sm font-bold text-center"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-emerald-600">
                            Zahid
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={tuitionPoolZahid}
                              onChange={(e) =>
                                setTuitionPoolZahid(Number(e.target.value) || 0)
                              }
                              className="h-9 pr-5 text-sm font-bold text-center"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-purple-600">
                            Saud
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={tuitionPoolSaud}
                              onChange={(e) =>
                                setTuitionPoolSaud(Number(e.target.value) || 0)
                              }
                              className="h-9 pr-5 text-sm font-bold text-center"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                      {tuitionPoolError ? (
                        <div className="mt-2 p-1.5 rounded bg-red-100 text-xs text-red-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {tuitionPoolError}
                        </div>
                      ) : (
                        <div className="mt-2 p-1.5 rounded bg-blue-100 text-xs text-blue-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          50/30/20 ✓
                        </div>
                      )}
                    </div>

                    {/* Protocol B: ETEA Pool */}
                    <div className="p-4 rounded-lg bg-violet-50 border border-violet-200">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold">
                          B
                        </div>
                        <div>
                          <h4 className="font-semibold text-violet-800">
                            ETEA/MDCAT Pool
                          </h4>
                          <p className="text-xs text-violet-600">
                            After teacher commission
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-blue-600">
                            Waqar
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={eteaPoolWaqar}
                              onChange={(e) =>
                                setEteaPoolWaqar(Number(e.target.value) || 0)
                              }
                              className="h-9 pr-5 text-sm font-bold text-center"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-emerald-600">
                            Zahid
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={eteaPoolZahid}
                              onChange={(e) =>
                                setEteaPoolZahid(Number(e.target.value) || 0)
                              }
                              className="h-9 pr-5 text-sm font-bold text-center"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-purple-600">
                            Saud
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={eteaPoolSaud}
                              onChange={(e) =>
                                setEteaPoolSaud(Number(e.target.value) || 0)
                              }
                              className="h-9 pr-5 text-sm font-bold text-center"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                      {eteaPoolError ? (
                        <div className="mt-2 p-1.5 rounded bg-red-100 text-xs text-red-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {eteaPoolError}
                        </div>
                      ) : (
                        <div className="mt-2 p-1.5 rounded bg-violet-100 text-xs text-violet-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          40/30/30 ✓
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Protocol Summary */}
                  <div className="mt-4 p-3 rounded-lg bg-amber-100 border border-amber-300">
                    <div className="text-xs font-medium text-amber-800 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded-full bg-blue-500 text-white text-center text-xs leading-5">
                          A
                        </span>
                        <span>
                          <strong>Tuition:</strong> Teacher 70% → Pool 30% →{" "}
                          {tuitionPoolWaqar}/{tuitionPoolZahid}/
                          {tuitionPoolSaud}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded-full bg-violet-500 text-white text-center text-xs leading-5">
                          B
                        </span>
                        <span>
                          <strong>ETEA:</strong> Commission PKR{" "}
                          {eteaCommission.toLocaleString()} → Pool rest →{" "}
                          {eteaPoolWaqar}/{eteaPoolZahid}/{eteaPoolSaud}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded-full bg-orange-500 text-white text-center text-xs leading-5">
                          C
                        </span>
                        <span>
                          <strong>Expenses:</strong> Waqar pays → Split{" "}
                          {waqarShare}/{zahidShare}/{saudShare} → Partner debt
                          created
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ========== CARD 7: ETEA/MDCAT Config (NO EXAMPLES) ========== */}
              <Card className="shadow-md lg:col-span-2">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                      <GraduationCap className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        ETEA/MDCAT Commission
                      </CardTitle>
                      <CardDescription>
                        Per-student compensation
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="max-w-md">
                    <Label className="text-sm font-semibold mb-2 block">
                      Per-Student Commission (PKR)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                        PKR
                      </span>
                      <Input
                        type="number"
                        min="0"
                        value={eteaCommission}
                        onChange={(e) =>
                          setEteaCommission(Number(e.target.value) || 0)
                        }
                        className="h-12 pl-12 text-lg font-bold"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Fixed amount credited to teachers for each ETEA/MDCAT
                      student enrolled
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* ========== CARD 4: Academy Info ========== */}
              <Card className="shadow-md">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Academy Profile</CardTitle>
                      <CardDescription>Branding information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Academy Name
                    </Label>
                    <Input
                      value={academyName}
                      onChange={(e) => setAcademyName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Address</Label>
                    <Input
                      value={academyAddress}
                      onChange={(e) => setAcademyAddress(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Phone</Label>
                    <Input
                      value={academyPhone}
                      onChange={(e) => setAcademyPhone(e.target.value)}
                      placeholder="+92 XXX XXXXXXX"
                      className="h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ========== CARD 5: Master Subject Pricing ========== */}
              <Card className="shadow-md lg:col-span-2">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                      <Banknote className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Master Subject Pricing
                      </CardTitle>
                      <CardDescription>Global fee structure</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Add New */}
                  <div className="flex gap-3">
                    <Input
                      placeholder="Subject Name"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 h-10"
                    />
                    <div className="relative w-32">
                      <Input
                        type="number"
                        placeholder="Fee"
                        value={newSubjectFee}
                        onChange={(e) => setNewSubjectFee(e.target.value)}
                        className="h-10 pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        PKR
                      </span>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newSubjectName.trim() || !newSubjectFee) {
                          toast({
                            title: "Missing Information",
                            description: "Enter both name and fee",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (
                          defaultSubjectFees.some(
                            (s) =>
                              s.name.toLowerCase() ===
                              newSubjectName.trim().toLowerCase(),
                          )
                        ) {
                          toast({
                            title: "Duplicate",
                            description: "Subject already exists",
                            variant: "destructive",
                          });
                          return;
                        }
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
                          await saveConfigToBackend(newSubjects);
                          toast({
                            title: "Saved",
                            description: `${subjectName} added`,
                          });
                        } catch (error) {
                          setDefaultSubjectFees(defaultSubjectFees);
                          setNewSubjectName(subjectName);
                          setNewSubjectFee(String(Number(newSubjectFee)));
                          toast({
                            title: "Error",
                            description: "Failed to save",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="h-10 px-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* List */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {defaultSubjectFees.map((subject, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div>
                          <p className="font-semibold text-sm">
                            {subject.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            PKR {subject.fee.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingSubject({ ...subject, index });
                              setEditFeeValue(String(subject.fee));
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={async () => {
                              if (window.confirm(`Remove ${subject.name}?`)) {
                                const newSubjects = defaultSubjectFees.filter(
                                  (_, i) => i !== index,
                                );
                                setDefaultSubjectFees(newSubjects);
                                try {
                                  await saveConfigToBackend(newSubjects);
                                  toast({
                                    title: "Deleted",
                                    description: `${subject.name} removed`,
                                  });
                                } catch (error) {
                                  setDefaultSubjectFees(defaultSubjectFees);
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete",
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
                </CardContent>
              </Card>
            </div>

            {/* ========== SAVE BUTTON (NOT FLOATING) ========== */}
            <div className="flex justify-end pt-6 border-t mt-8">
              <Button
                size="lg"
                onClick={handleSaveSettings}
                disabled={
                  isSaving || !!splitError || !!salaryError || !!poolSplitError
                }
                className={cn(
                  "h-12 px-8",
                  splitError || salaryError || poolSplitError
                    ? "bg-gray-400"
                    : "bg-slate-900 hover:bg-slate-800",
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Subject Fee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={editingSubject?.name || ""}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label>Fee (PKR)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={editFeeValue}
                    onChange={(e) => setEditFeeValue(e.target.value)}
                    className="pr-8"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
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
                    const newSubjects = defaultSubjectFees.map((s, i) =>
                      i === editingSubject.index ? { ...s, fee: newFee } : s,
                    );
                    setDefaultSubjectFees(newSubjects);
                    const subjectName = editingSubject.name;
                    setEditDialogOpen(false);
                    try {
                      await saveConfigToBackend(newSubjects);
                      toast({
                        title: "Saved",
                        description: `${subjectName} updated`,
                      });
                    } catch (error) {
                      setDefaultSubjectFees(defaultSubjectFees);
                      setEditDialogOpen(true);
                      toast({
                        title: "Error",
                        description: "Failed to save",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Configuration;
