/**
 * Public Registration Page - Midnight Glass Edition
 *
 * Premium dark theme matching the Student Portal aesthetic
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, CheckCircle2, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function PublicRegister() {
  const [formData, setFormData] = useState({
    studentName: "",
    fatherName: "",
    parentCell: "",
    studentCell: "",
    email: "",
    address: "",
    class: "", // Will store class _id
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Fetch available classes (active only)
  const { data: classesData } = useQuery({
    queryKey: ["public-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  const classes = (classesData?.data || []).filter(
    (c: any) => c.status === "active",
  );

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`${API_BASE_URL}/api/public/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      setSubmittedData(data.data);
      toast.success("Registration submitted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !formData.studentName ||
      !formData.fatherName ||
      !formData.parentCell ||
      !formData.class
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // SUCCESS STATE
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0c0a09] relative overflow-hidden flex items-center justify-center p-4">
        {/* Rich Void Background */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-lg"
        >
          <Card className="bg-stone-900/40 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shadow-2xl">
            <CardContent className="pt-12 pb-8 px-8 text-center">
              {/* Success Icon */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6 relative">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping"></div>
              </div>

              <h2 className="text-4xl font-bold text-white mb-3">
                Application Submitted!
              </h2>
              <p className="text-stone-400 mb-8 text-lg">
                Your application is pending verification.
              </p>

              {/* Application Details */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-left mb-6">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-4">
                  Application Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-400">Application ID:</span>
                    <span className="font-mono font-bold text-white">
                      {submittedData?.applicationId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-400">Student Name:</span>
                    <span className="font-semibold text-white">
                      {submittedData?.studentName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-400">Status:</span>
                    <span className="font-semibold text-amber-400">
                      Pending Verification
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-xl p-5 mb-8">
                <p className="text-sm font-semibold text-amber-400 uppercase tracking-widest mb-2">
                  📍 Next Steps
                </p>
                <p className="text-sm text-stone-300 leading-relaxed">
                  Please visit the <strong className="text-white">administration office</strong> with
                  your documents to verify your admission and receive your login
                  credentials.
                </p>
              </div>

              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    studentName: "",
                    fatherName: "",
                    parentCell: "",
                    studentCell: "",
                    email: "",
                    address: "",
                    class: "",
                  });
                }}
                className="w-full h-12 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-xl transition-all"
              >
                Register Another Student
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // REGISTRATION FORM
  return (
    <div className="min-h-screen bg-[#0c0a09] relative overflow-hidden flex items-center justify-center p-4">
      {/* Rich Void Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Edwardian Academy
          </h1>
          <p className="text-stone-400 text-lg">Online Admission Registration Form</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-stone-900/40 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Row 1: Student Name | Father Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-stone-300 text-sm font-medium mb-2 block">
                      Student Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="Full name as per documents"
                      value={formData.studentName}
                      onChange={(e) =>
                        handleInputChange("studentName", e.target.value)
                      }
                      className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-300 text-sm font-medium mb-2 block">
                      Father's Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="Father's full name"
                      value={formData.fatherName}
                      onChange={(e) =>
                        handleInputChange("fatherName", e.target.value)
                      }
                      className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                    />
                  </div>
                </div>

                {/* Row 2: Parent Phone | Student Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-stone-300 text-sm font-medium mb-2 block">
                      Parent's Phone <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="03XX-XXXXXXX"
                      value={formData.parentCell}
                      onChange={(e) =>
                        handleInputChange("parentCell", e.target.value)
                      }
                      className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-300 text-sm font-medium mb-2 block">
                      Student's Phone (Optional)
                    </Label>
                    <Input
                      placeholder="03XX-XXXXXXX"
                      value={formData.studentCell}
                      onChange={(e) =>
                        handleInputChange("studentCell", e.target.value)
                      }
                      className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                    />
                  </div>
                </div>

                {/* Row 3: Email | Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-stone-300 text-sm font-medium mb-2 block">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-300 text-sm font-medium mb-2 block">Address</Label>
                    <Input
                      placeholder="City / Area"
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                      className="bg-stone-800/50 border-stone-700 text-white placeholder:text-stone-500 focus:border-amber-500 focus:ring-amber-500/20 h-11"
                    />
                  </div>
                </div>

                {/* Row 4: Select Batch */}
                <div>
                  <Label className="text-stone-300 text-sm font-medium mb-2 block">
                    Select Desired Batch <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => handleInputChange("class", value)}
                  >
                    <SelectTrigger className="bg-stone-800/50 border-stone-700 text-white h-11">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900/95 backdrop-blur-xl border-white/10">
                      {classes.map((cls: any) => (
                        <SelectItem
                          key={cls._id}
                          value={cls._id}
                          className="text-white focus:bg-white/5 focus:text-white"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {cls.classTitle ||
                                `${cls.gradeLevel} - ${cls.section}`}
                            </span>
                            {cls.scheduleDisplay && (
                              <span className="text-xs text-stone-400">
                                {cls.scheduleDisplay}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold shadow-lg shadow-amber-500/30 transition-all duration-300"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-stone-400 text-sm mt-6">
          Already registered?{" "}
          <a href="/student-portal" className="text-amber-400 hover:text-indigo-300 underline font-medium">
            Login to Student Portal
          </a>
        </p>
      </div>
    </div>
  );
}
