import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  Wallet,
  DollarSign,
  FileText,
  HandCoins,
  ClipboardCheck,
  Loader2,
  CreditCard,
  CheckCircle2,
  Clock,
  BookOpen,
  CalendarDays,
  MapPin,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Briefcase,
  Lock,
  Camera,
} from "lucide-react";

// API Base URL - Auto-detect Codespaces
const getApiBaseUrl = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes(".app.github.dev")
  ) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, "");
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  return "http://localhost:5000/api";
};
const API_BASE_URL = getApiBaseUrl();

// ========================================
//  PARTNER DASHBOARD COMPONENT
// ========================================
const PartnerDashboard = () => {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "ledger" | "expenses" | "timetable">("overview");
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Financial data
  const [partnerStats, setPartnerStats] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Teacher-like data
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Close day
  const [isClosing, setIsClosing] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [floatingCash, setFloatingCash] = useState(0);

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const capitalizeSubject = (s: string) => {
    const map: Record<string, string> = {
      biology: "Biology", chemistry: "Chemistry", physics: "Physics",
      math: "Mathematics", english: "English", urdu: "Urdu",
      islamiat: "Islamiat", computer: "Computer Science",
    };
    return map[s?.toLowerCase()] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : "N/A");
  };

  // Fetch partner dashboard data
  const fetchPartnerData = async () => {
    try {
      setLoading(true);

      // Fetch partner financial stats
      const statsRes = await fetch(`${API_BASE_URL}/finance/partner/dashboard`, { credentials: "include" });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setPartnerStats(statsData.data);
      }

      // Fetch floating cash from general dashboard stats
      const dashRes = await fetch(`${API_BASE_URL}/finance/dashboard-stats`, { credentials: "include" });
      const dashData = await dashRes.json();
      if (dashData.success) {
        setFloatingCash(dashData.data?.floatingCash || 0);
      }

      // Fetch teacher profile if partnerId links to teacher
      if (user?.teacherId) {
        const profileRes = await fetch(`${API_BASE_URL}/teachers/${user.teacherId}`, { credentials: "include" });
        const profileData = await profileRes.json();
        if (profileData.success) setTeacherProfile(profileData.data);
      }

      // Fetch timetable
      const ttRes = await fetch(`${API_BASE_URL}/timetable`, { credentials: "include" });
      const ttData = await ttRes.json();
      if (ttData.success) {
        const sorted = (ttData.data || []).sort((a: any, b: any) => {
          const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return (a.startTime || "").localeCompare(b.startTime || "");
        });
        setTimetable(sorted);
      }
    } catch (err) {
      console.error("Error fetching partner data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch financial ledger
  const fetchLedger = async () => {
    try {
      setLedgerLoading(true);
      const res = await fetch(`${API_BASE_URL}/finance/partner/ledger`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setLedger(data.data || []);
    } catch (err) {
      console.error("Error fetching ledger:", err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerData();
  }, [user]);

  useEffect(() => {
    if (activeTab === "ledger") fetchLedger();
  }, [activeTab]);

  // Profile image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid file", description: "Please select an image" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB" }); return; }
    try {
      setUploadingImage(true);
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            if (width > 800) { height = (height * 800) / width; width = 800; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("Canvas error")); return; }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          };
          img.onerror = () => reject(new Error("Load error"));
          img.src = ev.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Read error"));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_BASE_URL}/teachers/me/profile`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ profileImage: compressedBase64 }),
      });
      const data = await res.json();
      if (data.success) {
        setTeacherProfile((prev: any) => ({ ...prev, profileImage: compressedBase64 }));
        await checkAuth();
        toast({ title: "Profile picture updated!" });
      } else {
        toast({ title: "Update failed", description: data.message });
      }
    } catch (err) {
      toast({ title: "Upload error", description: "Something went wrong" });
    } finally {
      setUploadingImage(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  };

  // Close day handler
  const handleCloseDay = () => {
    if (floatingCash === 0) {
      toast({ title: "Nothing to close", description: "No floating cash available.", variant: "destructive" });
      return;
    }
    setCloseConfirmOpen(true);
  };

  const confirmCloseDay = async () => {
    try {
      setIsClosing(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/finance/close-day`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: `Daily closing by ${user?.fullName}` }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Day closed successfully!");
        await fetchPartnerData();
      } else {
        setError(data.message || "Failed to close day");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsClosing(false);
      setCloseConfirmOpen(false);
    }
  };

  // Payment request handler
  const handleRequestPayment = async () => {
    const amt = parseInt(paymentAmount) || 0;
    if (amt <= 0) { setError("Please enter a valid amount"); return; }
    try {
      setIsProcessingPayment(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/finance/partner/request-payment`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, notes: paymentNotes || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Payment submitted!");
        setPaymentModalOpen(false);
        setPaymentAmount("");
        setPaymentNotes("");
        await fetchPartnerData();
      } else {
        setError(data.message || "Failed to submit payment");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayClasses = timetable.filter((t: any) => t.day === today);
  const currentImage = teacherProfile?.profileImage || user?.profileImage;

  const groupedByDay = timetable.reduce((acc: any, entry: any) => {
    if (!acc[entry.day]) acc[entry.day] = [];
    acc[entry.day].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <DashboardLayout title="Partner Dashboard">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Partner Dashboard">
      <input ref={profileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 p-6 md:p-8 shadow-2xl border-b-4 border-yellow-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2djRoNHYtNGgtNHptMC0yaDZ2Nmgtdi02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 relative group">
            {currentImage ? (
              <img src={currentImage} alt={user?.fullName} className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-4 border-yellow-400/50 shadow-xl" />
            ) : (
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-yellow-400/50 shadow-xl">
                <span className="text-3xl font-bold text-white">{user?.fullName?.charAt(0) || "P"}</span>
              </div>
            )}
            {user?.teacherId && (
              <button onClick={() => profileInputRef.current?.click()} disabled={uploadingImage}
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-4 border-transparent">
                {uploadingImage ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : (
                  <div className="text-center"><Camera className="h-5 w-5 text-white mx-auto" /><span className="text-[10px] text-white font-medium">Change</span></div>
                )}
              </button>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Welcome, <span className="text-yellow-400">{user?.fullName || "Partner"}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-medium border border-yellow-500/30">
                <Briefcase className="h-3.5 w-3.5" /> Partner
              </span>
              {teacherProfile?.subject && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
                  <BookOpen className="h-3.5 w-3.5" /> {capitalizeSubject(teacherProfile.subject)}
                </span>
              )}
              {partnerStats?.splitPercentage > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/20 text-slate-300 text-xs font-medium border border-slate-500/30">
                  <PieChart className="h-3.5 w-3.5" /> {partnerStats.splitPercentage}% Expense Share
                </span>
              )}
            </div>
            <p className="text-blue-200 text-sm mt-2">
              Edwardian Academy - {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="mt-4 bg-green-50 border border-green-300 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800 flex-1">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 text-sm font-bold">x</button>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-300 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-sm font-bold">x</button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {(["overview", "ledger", "expenses", "timetable"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            {tab === "overview" ? "Overview" : tab === "ledger" ? "Financial Ledger" : tab === "expenses" ? "My Expenses" : "Timetable"}
          </button>
        ))}
      </div>

      {/* ======= OVERVIEW TAB ======= */}
      {activeTab === "overview" && (
        <div className="mt-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Floating Cash */}
            <div className="rounded-2xl bg-white p-5 shadow-lg border-l-4 border-orange-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Cash in Hand</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">PKR {floatingCash > 0 ? Math.round(floatingCash / 1000) : 0}K</p>
                  <p className="text-xs text-orange-600 font-medium mt-1">Needs End of Day Closing</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Expense Debt */}
            <div className={`rounded-2xl p-5 shadow-lg border-l-4 ${(partnerStats?.expenseDebt || 0) > 0 ? "bg-red-50 border-red-500" : "bg-white border-green-500"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-medium ${(partnerStats?.expenseDebt || 0) > 0 ? "text-red-700" : "text-slate-600"}`}>
                    Expense Payable
                  </p>
                  <p className={`text-3xl font-bold mt-1 ${(partnerStats?.expenseDebt || 0) > 0 ? "text-red-600" : "text-slate-900"}`}>
                    PKR {(partnerStats?.expenseDebt || 0).toLocaleString()}
                  </p>
                  {(partnerStats?.expenseDebt || 0) > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => setPaymentModalOpen(true)}
                      className="mt-2 w-full border-red-300 text-red-700 hover:bg-red-50 text-xs">
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Request Payment
                    </Button>
                  ) : (
                    <p className="text-xs text-green-600 font-medium mt-1">All Caught Up!</p>
                  )}
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow ${(partnerStats?.expenseDebt || 0) > 0 ? "bg-red-500 text-white" : "bg-green-100 text-green-600"}`}>
                  {(partnerStats?.expenseDebt || 0) > 0 ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
              </div>
            </div>

            {/* Total Settled */}
            <div className="rounded-2xl bg-white p-5 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Settled</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">PKR {(partnerStats?.totalSettled || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">Lifetime payments</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow">
                  <HandCoins className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Today's Classes */}
            <div className="rounded-2xl bg-white p-5 shadow-lg border-l-4 border-purple-500">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Today's Classes</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{todayClasses.length}</p>
                  <p className="text-xs text-slate-500 mt-1">{today}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow">
                  <CalendarDays className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <Card className="border-slate-200 bg-white shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" onClick={handleCloseDay} disabled={isClosing}
                  className="h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow">
                  <DollarSign className="mr-2 h-5 w-5" /> {isClosing ? "Closing..." : "End of Day Closing"}
                </Button>
                {(partnerStats?.expenseDebt || 0) > 0 && (
                  <Button size="lg" variant="outline" onClick={() => setPaymentModalOpen(true)}
                    className="h-12 border-red-300 text-red-700 hover:bg-red-50 font-semibold">
                    <CreditCard className="mr-2 h-5 w-5" /> Pay Expense Debt
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Floating cash: <span className="font-semibold text-orange-600">PKR {floatingCash.toLocaleString()}</span>
              </p>
            </CardContent>
          </Card>

          {/* Expense Debt Breakdown */}
          {partnerStats?.debtDetails && partnerStats.debtDetails.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-red-800">
                  <FileText className="h-5 w-5" /> Outstanding Expense Shares
                </CardTitle>
                <CardDescription className="text-red-600">
                  Your share of academy expenses ({partnerStats.splitPercentage}%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {partnerStats.debtDetails.map((d: any) => (
                    <div key={d.expenseId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{d.title}</p>
                        <p className="text-xs text-slate-500">{d.category} - {new Date(d.expenseDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">PKR {d.myShare.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">{d.myPercentage}% of {d.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Schedule Preview */}
          {todayClasses.length > 0 && (
            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5 text-emerald-600" /> Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayClasses.map((entry: any, idx: number) => (
                    <div key={entry._id || idx} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold">{idx + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{entry.classId?.classTitle || entry.classId?.className || "Class"}</p>
                        <p className="text-xs text-slate-500">{capitalizeSubject(entry.subject)}</p>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700">{entry.startTime} - {entry.endTime}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ======= FINANCIAL LEDGER TAB ======= */}
      {activeTab === "ledger" && (
        <div className="mt-6">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" /> Financial Ledger
              </CardTitle>
              <CardDescription>All your financial transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : ledger.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {ledger.map((entry: any) => (
                    <div key={entry._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm ${
                          entry.source === "expense_share" ? "bg-red-500" :
                          entry.source === "settlement" ? "bg-emerald-500" :
                          entry.type === "INCOME" || entry.type === "CREDIT" ? "bg-green-500" :
                          entry.type === "EXPENSE" ? "bg-red-500" :
                          "bg-blue-500"
                        }`}>
                          {entry.source === "expense_share" ? <TrendingDown className="h-4 w-4" /> :
                           entry.source === "settlement" ? <ArrowUpRight className="h-4 w-4" /> :
                           entry.type === "INCOME" || entry.type === "CREDIT" ? <ArrowUpRight className="h-4 w-4" /> :
                           <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{entry.description || entry.category}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(entry.date).toLocaleDateString()} - {entry.type}
                            {entry.repaymentStatus ? ` (${entry.repaymentStatus})` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          entry.source === "settlement" ? "text-emerald-600" :
                          entry.source === "expense_share" ? "text-red-600" :
                          entry.type === "INCOME" || entry.type === "CREDIT" ? "text-green-600" :
                          "text-red-600"
                        }`}>
                          {entry.source === "settlement" || entry.type === "INCOME" || entry.type === "CREDIT" ? "+" : "-"}
                          PKR {entry.amount?.toLocaleString()}
                        </p>
                        <p className={`text-xs ${entry.status === "VERIFIED" || entry.status === "COMPLETED" || entry.status === "PAID" ? "text-green-500" : "text-orange-500"}`}>
                          {entry.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======= MY EXPENSES TAB ======= */}
      {activeTab === "expenses" && (
        <div className="mt-6">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5 text-red-600" /> My Expense Shares
                  </CardTitle>
                  <CardDescription>
                    Your {partnerStats?.splitPercentage || 0}% share of academy expenses
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">PKR {(partnerStats?.expenseDebt || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Outstanding</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!partnerStats?.debtDetails || partnerStats.debtDetails.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="text-sm font-medium text-green-700">All Caught Up!</p>
                  <p className="text-xs text-slate-500">No outstanding expense shares</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partnerStats.debtDetails.map((d: any) => (
                    <div key={d.expenseId} className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{d.title}</p>
                          <p className="text-xs text-slate-500">{d.category}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === "PAID" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {d.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total: PKR {d.totalAmount.toLocaleString()}</span>
                        <span className="font-bold text-red-600">My Share: PKR {d.myShare.toLocaleString()} ({d.myPercentage}%)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{new Date(d.expenseDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                    </div>
                  ))}
                  {(partnerStats?.expenseDebt || 0) > 0 && (
                    <Button onClick={() => setPaymentModalOpen(true)} className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white">
                      <CreditCard className="h-4 w-4 mr-2" /> Pay Outstanding Balance - PKR {partnerStats.expenseDebt.toLocaleString()}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======= TIMETABLE TAB ======= */}
      {activeTab === "timetable" && (
        <div className="mt-6">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-600" /> Weekly Timetable
              </CardTitle>
              <CardDescription>Your complete teaching schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {timetable.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-500">No timetable assigned yet</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {dayOrder.filter(day => groupedByDay[day]).map(day => (
                    <div key={day}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${day === today ? "text-emerald-600" : "text-slate-500"}`}>{day}</h3>
                        {day === today && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Today</span>}
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {groupedByDay[day].map((entry: any, idx: number) => (
                          <div key={entry._id || idx} className={`p-3 rounded-lg border transition-all hover:shadow-md ${day === today ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-bold ${day === today ? "text-emerald-700" : "text-slate-700"}`}>{entry.startTime} - {entry.endTime}</span>
                              {entry.room && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.room}</span>}
                            </div>
                            <p className="font-medium text-slate-900 text-sm">{entry.classId?.classTitle || entry.classId?.className || "Class"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{capitalizeSubject(entry.subject)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Close Day Dialog */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent className="max-w-md border-2 border-blue-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" /> Daily Closing
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-600 py-3">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-4">
                  <p className="text-xs uppercase tracking-widest font-bold text-blue-700 mb-1">Cash to be Reported</p>
                  <p className="text-3xl font-black text-blue-950">PKR {floatingCash.toLocaleString()}</p>
                </div>
                <p>Lock this amount into verified balance?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseDay} className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Verify & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Request Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-600" /> Record Expense Payment
            </DialogTitle>
            <DialogDescription>
              Submit a debt payment. The owner will be notified to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="text-xs uppercase tracking-widest font-bold text-red-700 mb-1">Outstanding Debt</p>
              <p className="text-2xl font-black text-red-600">PKR {(partnerStats?.expenseDebt || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmt">Payment Amount (PKR)</Label>
              <Input id="paymentAmt" type="number" placeholder="Enter amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes (optional)</Label>
              <Input id="paymentNotes" placeholder="e.g. Cash payment" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestPayment} disabled={isProcessingPayment} className="bg-red-600 hover:bg-red-700 text-white">
              {isProcessingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Submit Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PartnerDashboard;
