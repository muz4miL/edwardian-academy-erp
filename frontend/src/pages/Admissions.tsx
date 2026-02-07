import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdmissionSuccessModal } from "@/components/admissions/AdmissionSuccessModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Save,
  UserPlus,
  Sparkles,
  Eye,
  CheckCircle2,
  Loader2,
  DollarSign,
  Wallet,
  Pencil,
  Lock,
  Calculator,
  Package,
  Printer,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentApi, classApi, sessionApi } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { AdmissionSlip } from "@/components/admissions/AdmissionSlip";
import { ImageCapture } from "@/components/shared/ImageCapture";
// Import PDF Receipt System (replaces react-to-print)
import { usePDFReceipt } from "@/hooks/usePDFReceipt";

// API Base URL for config fetch
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// TASK 1: Draft Persistence Key
const ADMISSION_DRAFT_KEY = "academy_sparkle_admission_draft";

// Type for subject with fee
interface SubjectWithFee {
  name: string;
  fee: number;
}

// Type for global config subject pricing
interface GlobalSubjectFee {
  name: string;
  fee: number;
}

const Admissions = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // PDF Receipt Hook (replaces react-to-print)
  const { isPrinting, generatePDF } = usePDFReceipt();

  // Fetch Active Classes and Sessions
  const { data: classesData } = useQuery({
    queryKey: ["classes", { status: "active" }],
    queryFn: () => classApi.getAll({ status: "active" }),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => sessionApi.getAll(), // Fetch ALL sessions (active, upcoming, completed)
  });

  // Fetch Global Config for Master Subject Pricing
  const { data: configData } = useQuery({
    queryKey: ["global-config"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/config`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch config");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const globalSubjectFees: GlobalSubjectFee[] =
    configData?.data?.defaultSubjectFees || [];
  const classes = classesData?.data || [];
  const sessions = sessionsData?.data || [];

  // Form state
  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [group, setGroup] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [parentCell, setParentCell] = useState("");
  const [studentCell, setStudentCell] = useState("");
  const [address, setAddress] = useState("");
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [totalFee, setTotalFee] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [feeValidationError, setFeeValidationError] = useState("");

  // TASK 4: Custom Fee Toggle (Lump Sum mode)
  const [isCustomFeeMode, setIsCustomFeeMode] = useState(false);

  // WAQAR PROTOCOL V2: Session-Based Pricing
  const [sessionPrice, setSessionPrice] = useState<number | null>(null);
  const [isSessionPriceMode, setIsSessionPriceMode] = useState(false);
  const [sessionPriceLoading, setSessionPriceLoading] = useState(false);

  // Discount/Scholarship Calculation
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Modal states
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [savedStudent, setSavedStudent] = useState<any>(null);
  const [savedSession, setSavedSession] = useState<any>(null);

  // TASK 1: Draft Persistence State
  const [draftSaved, setDraftSaved] = useState(false);

  const [quickName, setQuickName] = useState("");
  const [quickClassId, setQuickClassId] = useState("");
  const [quickSessionId, setQuickSessionId] = useState("");
  const [quickParentCell, setQuickParentCell] = useState("");
  const [quickTotalFee, setQuickTotalFee] = useState("");
  const [quickPaidAmount, setQuickPaidAmount] = useState("");
  const [quickFeeValidationError, setQuickFeeValidationError] = useState("");

  // Student Photo State
  const [photo, setPhoto] = useState<string | null>(null);

  // TASK 1: Load Draft on Component Mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(ADMISSION_DRAFT_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setStudentName(draft.studentName || "");
        setFatherName(draft.fatherName || "");
        setSelectedClassId(draft.selectedClassId || "");
        setSelectedSessionId(draft.selectedSessionId || "");
        setGroup(draft.group || "");
        setSelectedSubjects(draft.selectedSubjects || []);
        setParentCell(draft.parentCell || "");
        setStudentCell(draft.studentCell || "");
        setAddress(draft.address || "");
        setAdmissionDate(
          draft.admissionDate || new Date().toISOString().split("T")[0],
        );
        setTotalFee(draft.totalFee || "");
        setPaidAmount(draft.paidAmount || "");
        setIsCustomFeeMode(draft.isCustomFeeMode || false);
        setPhoto(draft.photo || null);
        console.log("✅ Draft loaded from localStorage");
      } catch (error) {
        console.error("❌ Error loading draft:", error);
      }
    }
  }, []);

  // TASK 1: Save Draft to localStorage whenever form state changes
  useEffect(() => {
    // Skip if form is completely empty
    if (!studentName && !fatherName && !selectedClassId && !parentCell) {
      return;
    }

    const draft = {
      studentName,
      fatherName,
      selectedClassId,
      selectedSessionId,
      group,
      selectedSubjects,
      parentCell,
      studentCell,
      address,
      admissionDate,
      totalFee,
      paidAmount,
      isCustomFeeMode,
      photo,
    };

    localStorage.setItem(ADMISSION_DRAFT_KEY, JSON.stringify(draft));
    setDraftSaved(true);

    // Hide "Draft saved" indicator after 2 seconds
    const timer = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [
    studentName,
    fatherName,
    selectedClassId,
    selectedSessionId,
    group,
    selectedSubjects,
    parentCell,
    studentCell,
    address,
    admissionDate,
    totalFee,
    paidAmount,
    isCustomFeeMode,
  ]);

  // TASK 1: Auto-select active or upcoming session for Quick Add
  useEffect(() => {
    if (sessions.length > 0 && !quickSessionId) {
      // Prefer active, then upcoming, then any session
      const activeSession = sessions.find((s: any) => s.status === "active");
      const upcomingSession = sessions.find(
        (s: any) => s.status === "upcoming",
      );
      const defaultSession = activeSession || upcomingSession || sessions[0];

      if (defaultSession) {
        setQuickSessionId(defaultSession._id);
      }
    }
  }, [sessions]);

  // WAQAR PROTOCOL V2: Fetch session price when session changes
  useEffect(() => {
    const fetchSessionPrice = async () => {
      // Reset if no session selected
      if (!selectedSessionId) {
        setSessionPrice(null);
        setIsSessionPriceMode(false);
        setTotalFee("");
        setDiscountAmount(0);
        return;
      }

      setSessionPriceLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/config/session-price/${selectedSessionId}`,
          { credentials: "include" }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.found && result.data?.price > 0) {
            console.log("📊 Session price found:", result.data.price);
            const price = result.data.price;
            setSessionPrice(price);
            setIsSessionPriceMode(true);
            setTotalFee(String(price));
            setDiscountAmount(0); // Reset discount when session changes
          } else {
            console.log("📊 No session price configured");
            setSessionPrice(null);
            setIsSessionPriceMode(false);
            setTotalFee("");
          }
        } else {
          console.error("Failed to fetch session price - response not ok");
          setSessionPrice(null);
          setIsSessionPriceMode(false);
        }
      } catch (error) {
        console.error("Failed to fetch session price:", error);
        setSessionPrice(null);
        setIsSessionPriceMode(false);
      } finally {
        setSessionPriceLoading(false);
      }
    };

    fetchSessionPrice();
  }, [selectedSessionId]); // Only re-fetch when session changes

  // TASK 2: Dynamic fee sync for Quick Add when class changes
  useEffect(() => {
    if (quickClassId) {
      const selectedClass = getQuickSelectedClass();
      if (selectedClass) {
        // Calculate total from subjects or use baseFee
        const subjectTotal = (selectedClass.subjects || []).reduce(
          (sum: number, s: any) => {
            if (typeof s === "object" && s.fee) return sum + s.fee;
            return sum;
          },
          0,
        );
        setQuickTotalFee(String(subjectTotal || selectedClass.baseFee || 0));
      }
    }
  }, [quickClassId, classes]);

  // Get selected class
  const getSelectedClass = () =>
    classes.find((c: any) => c._id === selectedClassId);
  const getQuickSelectedClass = () =>
    classes.find((c: any) => c._id === quickClassId);

  // Get classes filtered by group (cascading select)
  const getFilteredClasses = () => {
    if (!group) return classes;
    // Filter classes by the new 'group' field (exact match with backend enum)
    return classes.filter((c: any) => {
      const classGroup = c.group || "";
      const selectedGroup = group;

      // Direct match with the new group field
      return classGroup === selectedGroup;
    });
  };

  const filteredClasses = getFilteredClasses();

  // REFACTORED: Get subjects with fees from GLOBAL CONFIG (Master Subject Pricing)
  const getClassSubjectsWithFees = (): SubjectWithFee[] => {
    const selectedClass = getSelectedClass();
    if (!selectedClass || !selectedClass.subjects) return [];

    return selectedClass.subjects.map((s: any) => {
      const subjectName = typeof s === "string" ? s : s.name;

      // First try to get fee from class definition
      let fee = typeof s === "object" ? s.fee : 0;

      // If fee is 0 or undefined, look up from global config
      if (!fee || fee === 0) {
        const globalSubject = globalSubjectFees.find(
          (gs) => gs.name.toLowerCase() === subjectName.toLowerCase(),
        );
        fee = globalSubject?.fee || 0;
      }

      return { name: subjectName, fee };
    });
  };

  const classSubjects = getClassSubjectsWithFees();

  // Calculate total fee based on selected subjects
  const calculateSubjectBasedFee = () => {
    return classSubjects
      .filter((s) => selectedSubjects.includes(s.name))
      .reduce((sum, s) => sum + (s.fee || 0), 0);
  };

  // Auto-update fee when subjects change (unless in custom mode OR session price mode)
  useEffect(() => {
    // Skip if custom fee mode is enabled
    if (isCustomFeeMode) return;

    // Skip if session price mode is active (session pricing takes precedence)
    if (isSessionPriceMode && sessionPrice && sessionPrice > 0) {
      console.log("📊 Using session-based pricing:", sessionPrice);
      return;
    }

    // Fall back to subject-based pricing
    if (selectedClassId && selectedSubjects.length > 0) {
      const calculatedFee = calculateSubjectBasedFee();
      setTotalFee(String(calculatedFee));
    }
  }, [selectedSubjects, selectedClassId, isCustomFeeMode, globalSubjectFees, isSessionPriceMode, sessionPrice]);

  // WAQAR PROTOCOL V2: Calculate Discount when Custom Fee is used
  useEffect(() => {
    if (isCustomFeeMode && sessionPrice && sessionPrice > 0) {
      const customFee = Number(totalFee) || 0;
      const discount = Math.max(0, sessionPrice - customFee);
      setDiscountAmount(discount);
    } else {
      setDiscountAmount(0);
    }
  }, [totalFee, isCustomFeeMode, sessionPrice]);

  // Reset to session rate when custom mode is disabled
  useEffect(() => {
    if (!isCustomFeeMode && isSessionPriceMode && sessionPrice && sessionPrice > 0) {
      setTotalFee(String(sessionPrice));
      setDiscountAmount(0);
    }
  }, [isCustomFeeMode, isSessionPriceMode, sessionPrice]);

  // Reset class selection when group changes (cascading behavior)
  useEffect(() => {
    if (group) {
      // Clear class selection when group changes
      setSelectedClassId("");
      setSelectedSubjects([]);
      setTotalFee("");
    }
  }, [group]);

  // Reset subjects when class changes
  useEffect(() => {
    if (selectedClassId) {
      setSelectedSubjects([]);
      setIsCustomFeeMode(false);
      // Auto-select all subjects if no individual selection
      const selectedClass = getSelectedClass();
      if (selectedClass?.subjects?.length > 0) {
        const subjectNames = selectedClass.subjects.map((s: any) =>
          typeof s === "string" ? s : s.name,
        );
        setSelectedSubjects(subjectNames);
      }
    }
  }, [selectedClassId]);

  // Subject toggle handler
  const handleSubjectToggle = (subjectName: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((id) => id !== subjectName)
        : [...prev, subjectName],
    );
  };

  // Get fee for a subject
  const getSubjectFee = (subjectName: string): number => {
    const subject = classSubjects.find((s) => s.name === subjectName);
    return subject?.fee || 0;
  };

  // Subtle confetti celebration
  const triggerConfetti = () => {
    const count = 100;
    const defaults = {
      origin: { y: 0.5 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
        colors: ["#0ea5e9", "#38bdf8", "#cbd5e1", "#e2e8f0"],
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  // React Query Mutation
  const createStudentMutation = useMutation({
    mutationFn: studentApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setSavedStudent(data.data);

      // Save session info for print slip
      if (selectedSessionId) {
        const session = sessions.find((s: any) => s._id === selectedSessionId);
        setSavedSession(session);
      }

      // TASK 3: Clear draft after successful save (Safety Flush)
      localStorage.removeItem(ADMISSION_DRAFT_KEY);
      console.log("🗑️ Draft cleared after successful save");

      triggerConfetti();
      setSuccessModalOpen(true);
    },
    onError: (error: any) => {
      toast.error("Admission Failed", {
        description: error.message || "Failed to save student admission",
        duration: 4000,
      });
    },
  });

  const handleSaveAdmission = () => {
    const selectedClass = getSelectedClass();

    // Validation
    if (
      !studentName ||
      !fatherName ||
      !selectedClassId ||
      !group ||
      !parentCell
    ) {
      toast.error("Missing Information", {
        description: "Please fill in all required fields",
        duration: 3000,
      });
      return;
    }

    if (!totalFee || Number(totalFee) <= 0) {
      toast.error("Invalid Fee", {
        description: "Please enter a valid total fee amount",
        duration: 3000,
      });
      return;
    }

    // TASK 1: Safety Check - Prevent paidAmount from exceeding totalFee
    const totalFeeNum = Number(totalFee);
    const paidAmountNum = Number(paidAmount) || 0;

    if (paidAmountNum > totalFeeNum) {
      toast.error("Invalid Payment Amount", {
        description: `Received amount (${paidAmountNum.toLocaleString()} PKR) cannot exceed total fee (${totalFeeNum.toLocaleString()} PKR)`,
        duration: 4000,
      });
      setFeeValidationError("Received amount cannot exceed total fee");
      return;
    }

    // ZERO-FEE PREVENTION: Warn if no payment received (for active students)
    if (paidAmountNum === 0 ) {
      toast.error("No Fee Received", {
        description:
          "Active students must have an initial fee payment. Set status to 'inactive' if this is intentional.",
        duration: 5000,
      });
      return;
    }

    setFeeValidationError("");

    // Calculate discount if custom fee mode is active (Session-Based Pricing)
    let calculatedDiscount = 0;
    if (isCustomFeeMode && isSessionPriceMode && sessionPrice && sessionPrice > 0) {
      const customTotal = Number(totalFee);
      calculatedDiscount = Math.max(0, sessionPrice - customTotal);
      console.log(
        `🎓 Session Discount Calculation: Session Rate ${sessionPrice} - Custom ${customTotal} = ${calculatedDiscount}`
      );
    }

    // Prepare student data
    // TASK 1 FIX: Transform subjects from string array to objects with locked pricing
    const subjectsWithFees = selectedSubjects.map((subjectName) => {
      const subject = classSubjects.find((s) => s.name === subjectName);
      return {
        name: subjectName,
        fee: subject?.fee || 0,
      };
    });

    // Ensure we have a valid class name
    const classTitle =
      selectedClass?.classTitle || selectedClass?.className || "";
    if (!classTitle) {
      toast.error("Class Selection Required", {
        description: "Please select a valid class from the dropdown",
        duration: 3000,
      });
      return;
    }

    const studentData = {
      studentName,
      fatherName,
      class: classTitle,
      group,
      subjects: subjectsWithFees, // Send as array of {name, fee} objects
      parentCell,
      studentCell: studentCell || undefined,
      address: address || undefined,
      admissionDate: new Date(admissionDate),
      totalFee: Number(totalFee),
      paidAmount: Number(paidAmount) || 0,
      discountAmount: calculatedDiscount, // Session-based discount
      sessionRate: isSessionPriceMode && sessionPrice ? sessionPrice : undefined, // Original session rate
      classRef: selectedClassId,
      sessionRef: selectedSessionId || undefined,
      photo: photo || undefined,
    };

    console.log("📤 Sending Student Data to Backend:", studentData);
    createStudentMutation.mutate(studentData);
  };

  // Quick Add submission
  const handleQuickAdd = () => {
    if (!quickName || !quickClassId || !quickParentCell) {
      toast.error("Missing Information", {
        description: "Please fill in all required fields for quick add",
        duration: 3000,
      });
      return;
    }

    const selectedClass = getQuickSelectedClass();
    const classTitle =
      selectedClass?.classTitle || selectedClass?.className || "TBD";

    const quickData = {
      studentName: quickName,
      fatherName: "To be updated",
      class: classTitle,
      group: "Pre-Medical",
      subjects: [],
      parentCell: quickParentCell,
      studentCell: undefined,
      address: undefined,
      admissionDate: new Date(),
      totalFee: Number(quickTotalFee) || 0,
      paidAmount: Number(quickPaidAmount) || 0,
      classRef: quickClassId,
      sessionRef: quickSessionId || undefined,
    };

    createStudentMutation.mutate(quickData);
    setQuickAddOpen(false);

    // Reset quick form
    setQuickName("");
    setQuickClassId("");
    setQuickSessionId("");
    setQuickParentCell("");
    setQuickTotalFee("");
    setQuickPaidAmount("");
  };

  // TASK 4: Reset form and clear ALL state including validation errors
  const handleCancel = () => {
    setStudentName("");
    setFatherName("");
    setSelectedClassId("");
    setSelectedSessionId("");
    setGroup("");
    setSelectedSubjects([]);
    setParentCell("");
    setStudentCell("");
    setAddress("");
    setAdmissionDate(new Date().toISOString().split("T")[0]);
    setTotalFee("");
    setPaidAmount("");
    setIsCustomFeeMode(false);
    setFeeValidationError(""); // Clear validation error
    setPhoto(null);

    // Clear localStorage draft
    localStorage.removeItem(ADMISSION_DRAFT_KEY);
    console.log("🗑️ Draft manually cleared via Cancel");
  };

  // Get balance - TASK 1: Use Math.max to prevent negative balance
  const balance =
    totalFee && paidAmount
      ? Math.max(0, Number(totalFee) - Number(paidAmount)).toString()
      : totalFee || "0";

  // Print receipt handler - Opens PDF in new tab (no DOM visibility issues)
  const handlePrintReceipt = async () => {
    if (savedStudent?._id) {
      // generatePDF handles all loading states and toasts internally
      await generatePDF(savedStudent._id, "admission");
    }
  };

  // Calculated fee display
  const calculatedFee = calculateSubjectBasedFee();

  return (
    <DashboardLayout title="Admissions">
      <HeaderBanner
        title="New Admission"
        subtitle={
          <div className="flex items-center gap-2">
            <span>Register a new student to the academy</span>
            {draftSaved && (
              <span className="flex items-center gap-1 text-xs text-slate-500 animate-in fade-in duration-200">
                <CheckCircle2 className="h-3 w-3" />
                Draft saved
              </span>
            )}
          </div>
        }
      >
        <Button
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={() => setQuickAddOpen(true)}
          style={{ borderRadius: "0.75rem" }}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Quick Add
        </Button>
      </HeaderBanner>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Student Information */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Student Information
            </h3>

            {/* Profile Photo Section */}
            <div className="mb-6 flex flex-col items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border">
              <Label className="text-sm font-medium text-muted-foreground">
                Student Photo
              </Label>
              <ImageCapture
                value={photo || undefined}
                onChange={(img) => setPhoto(img)}
                size="lg"
              />
              <p className="text-xs text-muted-foreground text-center">
                Take a webcam photo or upload an image file
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name *</Label>
                <Input
                  id="fatherName"
                  placeholder="Enter father's name"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </div>

              {/* Session Dropdown - Show All Sessions */}
              <div className="space-y-2">
                <Label htmlFor="session">Academic Session</Label>
                <Select
                  value={selectedSessionId}
                  onValueChange={setSelectedSessionId}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {sessions.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No sessions available
                      </SelectItem>
                    ) : (
                      sessions.map((session: any) => (
                        <SelectItem key={session._id} value={session._id}>
                          {session.sessionName}
                          {session.status === "active" && (
                            <span className="ml-2 text-green-600 text-xs">
                              (Active)
                            </span>
                          )}
                          {session.status === "upcoming" && (
                            <span className="ml-2 text-sky-600 text-xs">
                              (Upcoming)
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group">Group *</Label>
                <Select
                  value={group}
                  onValueChange={(value) => {
                    setGroup(value);
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Pre-Medical">Pre-Medical</SelectItem>
                    <SelectItem value="Pre-Engineering">
                      Pre-Engineering
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Class Dropdown - Filtered by Group */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="class">Class *</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={!group}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue
                      placeholder={
                        group ? "Select class" : "Select group first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {!group ? (
                      <SelectItem value="none" disabled>
                        Please select a group first
                      </SelectItem>
                    ) : filteredClasses.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No classes for {group}
                      </SelectItem>
                    ) : (
                      filteredClasses.map((cls: any) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {cls.classTitle || cls.className}{" "}
                          {cls.section && `- ${cls.section}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* TASK 3: Subjects Selection (No Individual Prices - Session-Based Pricing) */}
              {selectedClassId && classSubjects.length > 0 && (
                <div className="sm:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Subjects</Label>
                    {selectedSubjects.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {classSubjects.map((subject) => {
                      const isSelected = selectedSubjects.includes(
                        subject.name,
                      );

                      return (
                        <div
                          key={subject.name}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected
                            ? "border-sky-500 bg-sky-50"
                            : "border-border hover:border-sky-300"
                            }`}
                          onClick={() => handleSubjectToggle(subject.name)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleSubjectToggle(subject.name)
                            }
                          />
                          <span
                            className={`font-medium text-sm ${isSelected ? "text-sky-700" : "text-foreground"}`}
                          >
                            {subject.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select subjects the student will study. Fee is based on session rate.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="parentCell">Parent Cell No. *</Label>
                <Input
                  id="parentCell"
                  placeholder="03XX-XXXXXXX"
                  value={parentCell}
                  onChange={(e) => setParentCell(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentCell">Student Cell No.</Label>
                <Input
                  id="studentCell"
                  placeholder="03XX-XXXXXXX"
                  value={studentCell}
                  onChange={(e) => setStudentCell(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter complete address"
                  className="resize-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Office Use Section */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <h3 className="mb-6 text-lg font-semibold text-foreground">
              Office Use Only
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                />
              </div>

              {/* WAQAR PROTOCOL V2: Custom Fee / Scholarship Toggle */}
              {isSessionPriceMode && sessionPrice && sessionPrice > 0 && (
                <div className={`flex items-center justify-between p-3 rounded-lg border ${isCustomFeeMode
                  ? "border-amber-400 bg-amber-50"
                  : "border-border bg-secondary/50"
                  }`}>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">Apply Discount / Scholarship</p>
                      <p className="text-xs text-muted-foreground">
                        Session Rate: PKR {sessionPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isCustomFeeMode && discountAmount > 0 && (
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        -{discountAmount.toLocaleString()} PKR
                      </span>
                    )}
                    <Switch
                      checked={isCustomFeeMode}
                      onCheckedChange={setIsCustomFeeMode}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="totalFee">Total Fee (PKR) *</Label>
                  {isCustomFeeMode ? (
                    <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" />
                      Manual Override Active
                    </span>
                  ) : isSessionPriceMode && sessionPrice && sessionPrice > 0 ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium animate-in fade-in duration-300">
                      <Package className="h-3 w-3" />
                      Session Rate: PKR {sessionPrice.toLocaleString()}
                    </span>
                  ) : sessionPriceLoading ? (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking session price...
                    </span>
                  ) : selectedSubjects.length > 0 ? (
                    <span className="text-xs text-sky-600 flex items-center gap-1">
                      <Calculator className="h-3 w-3" />
                      Auto-calculated
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="totalFee"
                    type="number"
                    placeholder="0"
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    readOnly={!isCustomFeeMode && (selectedSubjects.length > 0 || isSessionPriceMode)}
                    className={`${isCustomFeeMode
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                      : isSessionPriceMode && sessionPrice && sessionPrice > 0
                        ? "border-emerald-400 bg-emerald-50 cursor-not-allowed font-bold text-emerald-700"
                        : !isCustomFeeMode && selectedSubjects.length > 0
                          ? "border-sky-300 bg-sky-50 cursor-not-allowed"
                          : ""
                      }`}
                  />
                  {!isCustomFeeMode && isSessionPriceMode && sessionPrice && sessionPrice > 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Package className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}
                  {!isCustomFeeMode && !isSessionPriceMode && selectedSubjects.length > 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Lock className="h-4 w-4 text-sky-500" />
                    </div>
                  )}
                  {isCustomFeeMode && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Pencil className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                </div>
                {/* Session Rate Summary with Discount */}
                {isSessionPriceMode && sessionPrice && sessionPrice > 0 && (
                  <div className={`mt-2 p-3 rounded-lg border ${isCustomFeeMode && discountAmount > 0
                      ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
                      : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200"
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className={`h-4 w-4 ${isCustomFeeMode && discountAmount > 0 ? "text-amber-600" : "text-emerald-600"}`} />
                      <p className={`text-sm font-semibold ${isCustomFeeMode && discountAmount > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                        {isCustomFeeMode && discountAmount > 0 ? "Scholarship / Discount Applied" : "Session-Based Pricing"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600">Session Rate</span>
                        <span className={`font-medium ${isCustomFeeMode && discountAmount > 0 ? "line-through text-slate-400" : "text-slate-700"}`}>
                          PKR {sessionPrice.toLocaleString()}
                        </span>
                      </div>

                      {isCustomFeeMode && discountAmount > 0 && (
                        <>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-green-600 font-medium">Discount</span>
                            <span className="font-bold text-green-600">
                              -PKR {discountAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-amber-200">
                            <span className="text-sm font-semibold text-amber-800">Final Fee</span>
                            <span className="text-lg font-bold text-amber-700">
                              PKR {Number(totalFee).toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}

                      {!isCustomFeeMode && (
                        <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200">
                          <span className="text-xs font-medium text-emerald-600">Total Fee</span>
                          <span className="text-lg font-bold text-emerald-700">
                            PKR {sessionPrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No Session Price Warning */}
                {!isSessionPriceMode && selectedSessionId && !sessionPriceLoading && (
                  <div className="mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      <strong>Note:</strong> No session rate configured for this session.
                      Please configure session pricing in Settings → Configuration.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Fee Received (PKR)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPaidAmount(value);

                    // TASK 1: Real-time validation
                    if (value && totalFee) {
                      const paidNum = Number(value);
                      const totalNum = Number(totalFee);
                      if (paidNum > totalNum) {
                        setFeeValidationError(
                          "Received amount cannot exceed total fee",
                        );
                      } else {
                        setFeeValidationError("");
                      }
                    } else {
                      setFeeValidationError("");
                    }
                  }}
                  className={
                    feeValidationError
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {feeValidationError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    {feeValidationError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Balance (PKR)</Label>
                <Input
                  id="balance"
                  type="number"
                  placeholder="0"
                  value={balance}
                  disabled
                  className="bg-secondary"
                />
              </div>

              {/* Discount Display - Only show when custom fee is active and there's a discount */}
              {isCustomFeeMode &&
                selectedSubjects.length > 0 &&
                (() => {
                  const standardTotal = classSubjects
                    .filter((s) => selectedSubjects.includes(s.name))
                    .reduce((sum, s) => sum + (s.fee || 0), 0);
                  const customTotal = Number(totalFee) || 0;
                  const discount = Math.max(0, standardTotal - customTotal);

                  return discount > 0 ? (
                    <div className="p-3 rounded-lg border border-green-200 bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-800">
                            Discount / Scholarship Applied
                          </span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          PKR {discount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        Standard: {standardTotal.toLocaleString()} → Custom:{" "}
                        {customTotal.toLocaleString()}
                      </p>
                    </div>
                  ) : null;
                })()}
            </div>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-warning bg-warning-light p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-warning">Important Note</p>
                <p className="mt-1 text-sm text-warning/80">
                  Fee is not refundable in any case.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={createStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveAdmission}
              disabled={createStudentMutation.isPending}
              style={{ borderRadius: "0.75rem" }}
            >
              {createStudentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Admission
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
              <UserPlus className="h-6 w-6 text-sky-600" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold">
              Speed Enrollment
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Quick add with minimal info
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="quick-name" className="text-sm">
                Student Name *
              </Label>
              <Input
                id="quick-name"
                placeholder="Enter full name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="h-9"
              />
            </div>

            {/* TASK 1: Session with auto-select (active or upcoming) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Session</Label>
                {sessions.find((s: any) => s._id === quickSessionId) &&
                  (() => {
                    const selected = sessions.find(
                      (s: any) => s._id === quickSessionId,
                    );
                    if (selected?.status === "active") {
                      return (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      );
                    } else if (selected?.status === "upcoming") {
                      return (
                        <span className="text-xs text-sky-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Upcoming
                        </span>
                      );
                    }
                    return null;
                  })()}
              </div>
              <Select value={quickSessionId} onValueChange={setQuickSessionId}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No sessions available
                    </SelectItem>
                  ) : (
                    sessions.map((session: any) => (
                      <SelectItem key={session._id} value={session._id}>
                        {session.sessionName}
                        {session.status === "active" && (
                          <span className="ml-2 text-green-600 text-xs">
                            (Current)
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* TASK 2: Class with fee sync */}
            <div className="space-y-1.5">
              <Label htmlFor="quick-class" className="text-sm">
                Class *
              </Label>
              <Select value={quickClassId} onValueChange={setQuickClassId}>
                <SelectTrigger className="h-9 bg-background">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.className} - {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quick-parent" className="text-sm">
                Parent Cell *
              </Label>
              <Input
                id="quick-parent"
                placeholder="03XX-XXXXXXX"
                value={quickParentCell}
                onChange={(e) => setQuickParentCell(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Fee fields with sync indicator */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Total Fee</Label>
                  {quickClassId && (
                    <span className="text-xs text-sky-600">Auto-filled</span>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0"
                  value={quickTotalFee}
                  onChange={(e) => setQuickTotalFee(e.target.value)}
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Paid Amount</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={quickPaidAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setQuickPaidAmount(value);

                    // TASK 1: Real-time validation for Quick Add
                    if (value && quickTotalFee) {
                      const paidNum = Number(value);
                      const totalNum = Number(quickTotalFee);
                      if (paidNum > totalNum) {
                        setQuickFeeValidationError(
                          "Received amount cannot exceed total fee",
                        );
                      } else {
                        setQuickFeeValidationError("");
                      }
                    } else {
                      setQuickFeeValidationError("");
                    }
                  }}
                  className={`h-9 ${quickFeeValidationError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {quickFeeValidationError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    {quickFeeValidationError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setQuickAddOpen(false);
                setQuickFeeValidationError("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAdd}
              disabled={
                createStudentMutation.isPending || !!quickFeeValidationError
              }
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              style={{ borderRadius: "0.75rem" }}
            >
              {createStudentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Enroll Student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Elegant Compact Design */}
      <AdmissionSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        studentData={savedStudent}
        onNavigateToStudents={() => navigate("/students")}
        onPrintReceipt={handlePrintReceipt}
        onNewAdmission={handleCancel}
      />

      {/* Hidden Print Slip Component (legacy - kept for reference) */}
      {savedStudent && (
        <AdmissionSlip student={savedStudent} session={savedSession} />
      )}

      {/* PDF Receipt is now generated programmatically - no hidden DOM template needed */}
    </DashboardLayout>
  );
};

export default Admissions;
