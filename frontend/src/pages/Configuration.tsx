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
  Phone,
  UserCheck,
  BookOpen,
  Shield,
  Percent,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { configApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const Configuration = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Loading State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [deleteStudentsOnReset, setDeleteStudentsOnReset] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // --- Dynamic Partners/Owner List (for display cards) ---
  const [systemPartners, setSystemPartners] = useState<
    Array<{
      userId: string;
      fullName: string;
      role: string;
      subject: string | null;
      phone: string | null;
      profileImage: string | null;
      isActive: boolean;
      joiningDate: string | null;
      compensation: { type: string; teacherShare?: number; academyShare?: number; fixedSalary?: number; baseSalary?: number; profitShare?: number } | null;
      status: string;
    }>
  >([]);

  // --- Dynamic Expense Split (fetched from PARTNER/OWNER users) ---
  const [expenseShares, setExpenseShares] = useState<Array<{ userId: string; fullName: string; subject: string | null; percentage: number }>>([]);
  const [splitError, setSplitError] = useState("");

  // --- Card 6: Academy Pool Distribution (Income IN) ---
  const [poolWaqarShare, setPoolWaqarShare] = useState(40);
  const [poolZahidShare, setPoolZahidShare] = useState(30);
  const [poolSaudShare, setPoolSaudShare] = useState(30);
  const [poolSplitError, setPoolSplitError] = useState("");

  // --- Academy Share Split (NEW: for academy class revenue distribution to Owner/Partners) ---
  const [academyShareSplit, setAcademyShareSplit] = useState<Array<{ userId: string; fullName: string; role: string; percentage: number }>>([]);
  const [academyShareError, setAcademyShareError] = useState("");

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
  const [academyOwner, setAcademyOwner] = useState("");

  // --- Card 5: Master Subject Pricing ---
  const [defaultSubjectFees, setDefaultSubjectFees] = useState<
    Array<{ name: string; fee: number }>
  >([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectFee, setNewSubjectFee] = useState("");

  // --- Card 7: ETEA/MDCAT Config ---
  const [eteaCommission, setEteaCommission] = useState(3000);
  const [englishFixedSalary, setEnglishFixedSalary] = useState(80000);

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
          setAcademyOwner(data.academyOwner || "");

          // Card 5: Master Subject Pricing
          setDefaultSubjectFees(data.defaultSubjectFees || []);

          // Card 7: ETEA Config
          if (data.eteaConfig) {
            setEteaCommission(data.eteaConfig.perStudentCommission ?? 3000);
            setEnglishFixedSalary(data.eteaConfig.englishFixedSalary ?? 80000);
          }

          // NOTE: expenseShares and academyShareSplit are now synced from backend's /partners endpoint
          // No need to load from config here - the backend handles all the syncing
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

    // Fetch partners + their current shares from backend - ALWAYS sync with live DB
    const fetchPartners = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/partners`, { credentials: "include" });
        const result = await res.json();
        if (result.success && result.data) {
          const partners = result.data as Array<{
            userId: string; fullName: string; role: string; subject: string | null;
            phone: string | null; profileImage: string | null; isActive: boolean;
            joiningDate: string | null; compensation: any; status: string;
          }>;

          // ═══════════════════════════════════════════════════════════════
          // LIVE DATA SYNC: Backend already cleaned and synced the data
          // Use the backend's synced arrays directly - no local merging
          // ═══════════════════════════════════════════════════════════════

          // Store full partner data for display cards
          setSystemPartners(partners);

          // ═══════════════════════════════════════════════════════════════
          // SPECIAL CASE: Single OWNER → Default to 100%, hide ghost entries
          // ═══════════════════════════════════════════════════════════════
          const owners = partners.filter(p => p.role === "OWNER");
          const isSingleOwner = owners.length === 1 && partners.length === 1;

          // Use the backend's pre-synced expense shares (already cleaned of stale entries)
          if (result.currentShares && result.currentShares.length > 0) {
            // Filter out any ghost entries (users not in the live partners list)
            const liveUserIds = new Set(partners.map(p => p.userId));
            const cleanedShares = result.currentShares.filter((s: any) => liveUserIds.has(s.userId));

            setExpenseShares(cleanedShares.map((s: any) => ({
              userId: s.userId,
              fullName: s.fullName,
              subject: partners.find(p => p.userId === s.userId)?.subject || null,
              percentage: isSingleOwner ? 100 : s.percentage, // Single OWNER gets 100%
            })));
          } else if (partners.length > 0) {
            // No saved shares - create new ones with smart distribution
            if (isSingleOwner) {
              // Single OWNER gets 100%
              setExpenseShares([{
                userId: partners[0].userId,
                fullName: partners[0].fullName,
                subject: partners[0].subject,
                percentage: 100,
              }]);
            } else {
              // Multiple partners - equal distribution
              const equalShare = Math.floor(100 / partners.length);
              const remainder = 100 - equalShare * partners.length;
              setExpenseShares(partners.map((p, i) => ({
                userId: p.userId,
                fullName: p.fullName,
                subject: p.subject,
                percentage: equalShare + (i === 0 ? remainder : 0),
              })));
            }
          } else {
            setExpenseShares([]);
          }

          // Use the backend's pre-synced academy shares (already cleaned of stale entries)
          if (result.currentAcademyShares && result.currentAcademyShares.length > 0) {
            // Filter out any ghost entries (users not in the live partners list)
            const liveUserIds = new Set(partners.map(p => p.userId));
            const cleanedAcademyShares = result.currentAcademyShares.filter((s: any) => liveUserIds.has(s.userId));

            setAcademyShareSplit(cleanedAcademyShares.map((s: any) => ({
              userId: s.userId,
              fullName: s.fullName,
              role: s.role || partners.find(p => p.userId === s.userId)?.role || "PARTNER",
              percentage: isSingleOwner ? 100 : s.percentage, // Single OWNER gets 100%
            })));
          } else if (partners.length > 0) {
            // No saved shares - create new ones with smart distribution
            if (isSingleOwner) {
              // Single OWNER gets 100%
              setAcademyShareSplit([{
                userId: partners[0].userId,
                fullName: partners[0].fullName,
                role: partners[0].role || "OWNER",
                percentage: 100,
              }]);
            } else {
              // Multiple partners - equal distribution
              const equalShare = Math.floor(100 / partners.length);
              const remainder = 100 - equalShare * partners.length;
              setAcademyShareSplit(partners.map((p, i) => ({
                userId: p.userId,
                fullName: p.fullName,
                role: p.role || "PARTNER",
                percentage: equalShare + (i === 0 ? remainder : 0),
              })));
            }
          } else {
            setAcademyShareSplit([]);
          }

          // Log if backend auto-cleaned stale data
          if (result.wasAutoClean) {
            console.log(`🧹 Backend auto-cleaned stale partner entries. Live count: ${result.liveCount}`);
          }
        }
      } catch {
        /* use empty */
      }
    };

    if (user) {
      fetchSettings();
      fetchPartners();
    }
  }, [user, toast]);

  // --- Validate Expense Split (must total 100%) ---
  useEffect(() => {
    if (expenseShares.length === 0) {
      setSplitError("No partners found. Add partners in the Teachers section first.");
      return;
    }
    const total = expenseShares.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (total !== 100) {
      setSplitError(`Total must be 100%. Current: ${total}%`);
    } else {
      setSplitError("");
    }
  }, [expenseShares]);

  // --- Validate Academy Share Split (must total 100%) ---
  useEffect(() => {
    if (academyShareSplit.length === 0) {
      setAcademyShareError("");
      return;
    }
    const total = academyShareSplit.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (total !== 100) {
      setAcademyShareError(`Total must be 100%. Current: ${total}%`);
    } else {
      setAcademyShareError("");
    }
  }, [academyShareSplit]);

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

  // --- Build settings data for saving ---
  const buildSettingsData = (subjects?: Array<{ name: string; fee: number }>) => {
    return {
      // Dynamic expense shares (new system)
      expenseShares: expenseShares.map(s => ({
        userId: s.userId,
        fullName: s.fullName,
        percentage: s.percentage,
      })),
      poolDistribution: {
        waqar: poolWaqarShare,
        zahid: poolZahidShare,
        saud: poolSaudShare,
      },
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
        englishFixedSalary: englishFixedSalary,
      },
      academyName,
      academyAddress,
      academyPhone,
      academyOwner,
      defaultSubjectFees: subjects || defaultSubjectFees,
      academyShareSplit: academyShareSplit.map(s => ({
        userId: s.userId,
        fullName: s.fullName,
        role: s.role,
        percentage: s.percentage,
      })),
    };
  };

  // --- Reset Finance Data Helper ---
  const handleResetFinance = async (deleteStudents: boolean = false) => {
    const studentsMessage = deleteStudents 
      ? "\n- ALL STUDENTS (deleted permanently)" 
      : "\n\nStudents will be preserved (fees reset to unpaid).";
    
    if (!confirm(`⚠️ This will PERMANENTLY DELETE all financial data including:\n- Fee payments & records\n- Transactions & settlements\n- Expenses\n- Wallet balances${studentsMessage}\n\nTeachers and classes will be preserved.\n\nContinue?`)) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await configApi.resetFinance({ deleteStudents });
      const studentsMsg = deleteStudents 
        ? `${result.results?.studentsDeleted || 0} students deleted.`
        : `${result.results?.students || 0} students reset.`;
      toast({
        title: "Finance Reset Complete",
        description: `All financial data cleared. ${studentsMsg}`,
      });
      // Reload page to reflect changes
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Could not reset finance data",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // --- Instant Save Helper ---
  const saveConfigToBackend = async (
    subjects: Array<{ name: string; fee: number }>,
  ) => {
    try {
      const settingsData = buildSettingsData(subjects);

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
    // Validate expense splits
    if (expenseShares.length > 0) {
      const total = expenseShares.reduce((sum, s) => sum + (s.percentage || 0), 0);
      if (total !== 100) {
        toast({
          title: "Validation Error",
          description: `Expense splits must total 100%. Current: ${total}%`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate academy share split (CRITICAL for revenue distribution)
    if (academyShareSplit.length > 0) {
      const total = academyShareSplit.reduce((sum, s) => sum + (s.percentage || 0), 0);
      if (total !== 100) {
        toast({
          title: "Validation Error",
          description: `Academy Revenue Share splits must total 100%. Current: ${total}%`,
          variant: "destructive",
        });
        return;
      }
    }

    if (poolWaqarShare + poolZahidShare + poolSaudShare !== 100) {
      toast({
        title: "Validation Error",
        description: "Pool distribution must total 100%",
        variant: "destructive",
      });
      return;
    }

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

    try {
      setIsSaving(true);

      const settingsData = buildSettingsData();

      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settingsData),
      });

      const result = await response.json();

      if (result.success) {
        setHasChanges(false);
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

            {/* ========== CARD: Academy Profile (TOP) ========== */}
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
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Academy Name</Label>
                    <Input
                      value={academyName}
                      onChange={(e) => {
                        setAcademyName(e.target.value);
                        setHasChanges(true);
                      }}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Academy Owner</Label>
                    <Input
                      value={academyOwner}
                      onChange={(e) => {
                        setAcademyOwner(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="e.g. Sir Waqar Baig"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Address</Label>
                    <Input
                      value={academyAddress}
                      onChange={(e) => {
                        setAcademyAddress(e.target.value);
                        setHasChanges(true);
                      }}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Phone</Label>
                    <Input
                      value={academyPhone}
                      onChange={(e) => {
                        setAcademyPhone(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="+92 XXX XXXXXXX"
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ========== SYSTEM PARTNERS & OWNER (Dynamic) ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100">
                      <Users className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">System Partners & Owner</CardTitle>
                      <CardDescription>Dynamically detected from teachers with Partner/Owner roles</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>{systemPartners.length} member{systemPartners.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {systemPartners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No partners or owner found</p>
                    <p className="text-sm mt-1">Create teachers with <strong>Partner</strong> or <strong>Owner</strong> system role from the Teachers tab.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Owner Section */}
                    {systemPartners.filter(p => p.role === "OWNER").length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Crown className="h-4 w-4 text-amber-500" />
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">System Owner</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {systemPartners.filter(p => p.role === "OWNER").map((partner) => (
                            <div
                              key={partner.userId}
                              className="relative overflow-hidden rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-100/40 rounded-bl-full" />
                              <div className="flex items-start gap-3">
                                <div className="relative">
                                  {partner.profileImage ? (
                                    <img
                                      src={partner.profileImage.startsWith('http') ? partner.profileImage : `${API_BASE_URL}${partner.profileImage}`}
                                      alt={partner.fullName}
                                      className="h-12 w-12 rounded-full object-cover border-2 border-amber-300"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg border-2 border-amber-300">
                                      {partner.fullName?.charAt(0)?.toUpperCase()}
                                    </div>
                                  )}
                                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
                                    <Crown className="h-2.5 w-2.5 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 truncate">{partner.fullName}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-200 text-amber-800">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Owner
                                    </span>
                                    {partner.status === "active" && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 space-y-1.5 text-sm">
                                {partner.subject && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="capitalize">{partner.subject}</span>
                                  </div>
                                )}
                                {partner.phone && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{partner.phone}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 pt-2 border-t border-amber-200/60">
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  Full system access
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Partners Section */}
                    {systemPartners.filter(p => p.role === "PARTNER").length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-indigo-500" />
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">System Partners</h3>
                          <span className="text-xs text-gray-400">({systemPartners.filter(p => p.role === "PARTNER").length})</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {systemPartners.filter(p => p.role === "PARTNER").map((partner) => (
                            <div
                              key={partner.userId}
                              className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50/50 rounded-bl-full" />
                              <div className="flex items-start gap-3">
                                <div className="relative">
                                  {partner.profileImage ? (
                                    <img
                                      src={partner.profileImage.startsWith('http') ? partner.profileImage : `${API_BASE_URL}${partner.profileImage}`}
                                      alt={partner.fullName}
                                      className="h-12 w-12 rounded-full object-cover border-2 border-indigo-200"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg border-2 border-indigo-200">
                                      {partner.fullName?.charAt(0)?.toUpperCase()}
                                    </div>
                                  )}
                                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center">
                                    <Users className="h-2.5 w-2.5 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 truncate">{partner.fullName}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700">
                                      <Users className="h-3 w-3 mr-1" />
                                      Partner
                                    </span>
                                    {partner.status === "active" && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 space-y-1.5 text-sm">
                                {partner.subject && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="capitalize">{partner.subject}</span>
                                  </div>
                                )}
                                {partner.phone && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{partner.phone}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 pt-2 border-t border-gray-100">
                                <p className="text-xs text-indigo-500 flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  Partner access
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ========== EXPENSE SPLIT CONFIGURATION (Dynamic) ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-green-100">
                      <Percent className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Expense Split Configuration</CardTitle>
                      <CardDescription>Set how monthly expenses are divided among partners (must total 100%)</CardDescription>
                    </div>
                  </div>
                  {splitError ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{splitError}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Valid (100%)</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {expenseShares.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Percent className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No partners found</p>
                    <p className="text-sm mt-1">Create teachers with <strong>Partner</strong> or <strong>Owner</strong> system role to configure expense splits.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm text-emerald-800">
                        <strong>How it works:</strong> When you click "Split Month Expenses" in the Finance tab, each expense for that month
                        will be divided among partners using these percentages. The resulting debt is tracked in Settlements.
                      </p>
                    </div>

                    {/* Partner Split Inputs */}
                    <div className="space-y-3">
                      {expenseShares.map((share, index) => {
                        const isOwner = systemPartners.find(p => p.userId === share.userId)?.role === "OWNER";
                        return (
                          <div
                            key={share.userId}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-xl border transition-all",
                              isOwner
                                ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                                : "bg-white border-gray-200 hover:border-emerald-200"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                                isOwner
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                  : "bg-gradient-to-br from-indigo-400 to-purple-500"
                              )}>
                                {share.fullName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{share.fullName}</p>
                                <p className="text-xs text-gray-500">
                                  {isOwner ? "Owner" : "Partner"}
                                  {share.subject ? ` · ${share.subject}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative w-24">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={share.percentage}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                    setExpenseShares(prev => prev.map((s, i) =>
                                      i === index ? { ...s, percentage: val } : s
                                    ));
                                    setHasChanges(true);
                                  }}
                                  className="h-10 pr-8 text-right font-bold text-emerald-700"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Bar */}
                    <div className="pt-2">
                      {(() => {
                        const total = expenseShares.reduce((sum, s) => sum + (s.percentage || 0), 0);
                        const isValid = total === 100;
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700">Total</span>
                              <span className={cn("font-bold text-lg", isValid ? "text-green-600" : "text-red-600")}>
                                {total}%
                              </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isValid ? "bg-gradient-to-r from-green-400 to-emerald-500" : total > 100 ? "bg-red-500" : "bg-amber-400"
                                )}
                                style={{ width: `${Math.min(total, 100)}%` }}
                              />
                            </div>
                            {!isValid && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {total > 100 ? `Exceeds 100% by ${total - 100}%` : `${100 - total}% remaining to allocate`}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ========== ACADEMY SHARE SPLIT (Revenue from Academy Classes) ========== */}
            <Card className="shadow-md border-l-4 border-l-violet-500">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-purple-100">
                      <DollarSign className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Academy Revenue Share Split</CardTitle>
                      <CardDescription>How academy's share from teacher classes is distributed among Owner/Partners (must total 100%)</CardDescription>
                    </div>
                  </div>
                  {academyShareSplit.length > 0 && (
                    academyShareError ? (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{academyShareError}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Valid (100%)</span>
                      </div>
                    )
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-violet-800">
                    <strong>How it works:</strong> When a student pays for an academy class (MDCAT/ETEA), the teacher gets their share (e.g., 70%).
                    The remaining academy share (e.g., 30%) is distributed among Owner/Partners using these percentages, flowing to their dashboard for daily closing.
                  </p>
                </div>

                {academyShareSplit.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Percent className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No partners configured</p>
                    <p className="text-sm mt-1">Partners will appear here once fetched.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {academyShareSplit.map((share, index) => {
                        const isOwner = share.role === "OWNER";
                        return (
                          <div
                            key={share.userId}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-xl border transition-all",
                              isOwner
                                ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                                : "bg-white border-gray-200 hover:border-violet-200"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                                isOwner
                                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                  : "bg-gradient-to-br from-violet-400 to-purple-500"
                              )}>
                                {share.fullName?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{share.fullName}</p>
                                <p className="text-xs text-gray-500">{isOwner ? "Owner" : "Partner"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative w-24">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={share.percentage}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                    setAcademyShareSplit(prev => prev.map((s, i) =>
                                      i === index ? { ...s, percentage: val } : s
                                    ));
                                    setHasChanges(true);
                                  }}
                                  className="h-10 pr-8 text-right font-bold text-violet-700"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Bar */}
                    <div className="pt-2">
                      {(() => {
                        const total = academyShareSplit.reduce((sum, s) => sum + (s.percentage || 0), 0);
                        const isValid = total === 100;
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-700">Total</span>
                              <span className={cn("font-bold text-lg", isValid ? "text-green-600" : "text-red-600")}>
                                {total}%
                              </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  isValid ? "bg-gradient-to-r from-violet-400 to-purple-500" : total > 100 ? "bg-red-500" : "bg-amber-400"
                                )}
                                style={{ width: `${Math.min(total, 100)}%` }}
                              />
                            </div>
                            {!isValid && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {total > 100 ? `Exceeds 100% by ${total - 100}%` : `${100 - total}% remaining to allocate`}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ========== OWNER & PARTNER COMPENSATION MODEL ========== */}
            <Card className="shadow-md">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Owner & Partner Compensation Model</CardTitle>
                      <CardDescription>How the owner and partners earn from the academy</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-5">
                  {/* Step 1: Teaching Income */}
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-sm shrink-0">1</div>
                      <div>
                        <p className="font-semibold text-gray-900">Teaching Income — 100%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          The owner and each partner keeps <strong>100%</strong> of the fee revenue from the subject they personally teach — they receive the full amount for their classes with no academy cut.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Academy Revenue Pool */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white font-bold text-sm shrink-0">2</div>
                      <div>
                        <p className="font-semibold text-gray-900">Academy Revenue Pool</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Each regular teacher has a custom compensation split (e.g. 70/30, 60/40, etc.). The <strong>academy's portion</strong> from every teacher is pooled together as academy revenue — this pool is then
                          divided between the owner and partners based on the <strong>Expense Split</strong> percentages defined above.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Expense Liability */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white font-bold text-sm shrink-0">3</div>
                      <div>
                        <p className="font-semibold text-gray-900">Expense Liability</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Academy expenses (utilities, rent, supplies, etc.) are split among all partners using the same <strong>Expense Split</strong> percentages.
                          The owner records settlements when partners pay their share.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Partners Summary */}
                  {systemPartners.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Members</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {systemPartners.map((p) => {
                          const share = expenseShares.find(s => s.userId === p.userId);
                          return (
                            <div key={p.userId} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                  p.role === "OWNER" ? "bg-amber-500" : "bg-indigo-500"
                                }`}>
                                  {p.fullName?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{p.fullName}</p>
                                  <p className="text-xs text-gray-500 capitalize">{p.role?.toLowerCase()} · {p.subject || "N/A"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-amber-700">100% + Pool</p>
                                <p className="text-xs text-gray-400">{share ? `${share.percentage}% expense split` : "split not set"}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ========== CARD 5: Master Subject Pricing ========== */}
              <Card className="shadow-md lg:col-span-2">
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                      <Banknote className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Master Subject List
                      </CardTitle>
                      <CardDescription>Manage subjects and their default fees (used in class/admissions pricing)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Add New Subject */}
                  <div className="flex gap-3">
                    <Input
                      placeholder="Subject Name (e.g. Biology, English)"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
                      }}
                    />
                    <div className="relative w-40">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Fee (PKR)"
                        value={newSubjectFee}
                        onChange={(e) => setNewSubjectFee(e.target.value)}
                        className="h-10 pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        PKR
                      </span>
                    </div>
                    <Button
                      onClick={async () => {
                        if (!newSubjectName.trim()) {
                          toast({
                            title: "Missing Information",
                            description: "Enter a subject name",
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
                        const parsedFee = Number(newSubjectFee || 0);
                        if (Number.isNaN(parsedFee) || parsedFee < 0) {
                          toast({
                            title: "Invalid Fee",
                            description: "Fee must be 0 or greater",
                            variant: "destructive",
                          });
                          return;
                        }
                        const newSubjects = [
                          ...defaultSubjectFees,
                          {
                            name: newSubjectName.trim(),
                            fee: parsedFee,
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
                            description: `${subjectName} added with PKR ${parsedFee.toLocaleString()}`,
                          });
                        } catch (error) {
                          setDefaultSubjectFees(defaultSubjectFees);
                          setNewSubjectName(subjectName);
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
                          <p className="text-xs text-emerald-700 font-semibold mt-1">
                            PKR {Number(subject.fee || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600"
                            onClick={() => {
                              setEditingSubject({
                                name: subject.name,
                                fee: Number(subject.fee || 0),
                                index,
                              });
                              setEditFeeValue(String(Number(subject.fee || 0)));
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
                  isSaving ||
                  (expenseShares.length > 0 && !!splitError) ||
                  !!poolSplitError ||
                  !!academyShareError
                }
                className={cn(
                  "h-12 px-8 text-white font-semibold shadow-md transition-all",
                  (expenseShares.length > 0 && splitError) || poolSplitError || academyShareError
                    ? "bg-gray-400 cursor-not-allowed"
                    : hasChanges
                    ? "bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300 ring-offset-2"
                    : "bg-indigo-600 hover:bg-indigo-700",
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : hasChanges ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Unsaved Changes
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>

            {/* Reset Finance Data Section - For Testing */}
            <div className="mt-8 pt-6 border-t border-red-200">
              <Card className="border-red-300 bg-red-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-red-700 text-base">
                    <AlertCircle className="h-5 w-5" />
                    Reset Finance Data
                  </CardTitle>
                  <CardDescription className="text-red-600 text-xs">
                    Clear ALL financial data for testing. Use carefully!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Checkbox for deleting students */}
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <input
                      type="checkbox"
                      id="deleteStudents"
                      checked={deleteStudentsOnReset}
                      onChange={(e) => setDeleteStudentsOnReset(e.target.checked)}
                      className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="deleteStudents" className="text-sm text-red-700 font-medium cursor-pointer">
                      Also delete all students permanently
                    </label>
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleResetFinance(deleteStudentsOnReset)}
                    disabled={isResetting}
                    className="bg-red-600 hover:bg-red-700 w-full"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reset All Finance Data
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
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
