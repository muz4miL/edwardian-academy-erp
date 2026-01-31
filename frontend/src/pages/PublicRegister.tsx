/**
 * Public Registration Page - Academic Professional Edition
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, CheckCircle2, Loader2, Sparkles, ArrowRight, Phone, Mail, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

// Motion Variants
const waterfall = {
  initial: { y: 40, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 40,
      damping: 15,
      mass: 1,
    },
  },
};

const ripple = {
  whileHover: { scale: 1.01, transition: { type: "spring" as const, stiffness: 400, damping: 10 } },
  whileTap: { scale: 0.99 },
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
  const { data: classesData, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["public-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/classes`);
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
      const res = await fetch(`${API_BASE_URL}/public/register`, {
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
      <div className="min-h-screen bg-brand-secondary flex items-center justify-center p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="bg-brand-primary p-12 text-center text-white">
              <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-accent/20">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">
                Application Received
              </h2>
              <p className="text-slate-400 font-medium">
                Your admission application has been successfully submitted for review.
              </p>
            </div>
            
            <div className="p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Application ID</p>
                  <p className="text-xl font-black text-brand-primary">{submittedData?.applicationId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Name</p>
                  <p className="text-xl font-black text-brand-primary">{submittedData?.studentName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Applied Program</p>
                  <p className="text-xl font-black text-brand-primary">{submittedData?.class}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current Status</p>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1 text-sm font-bold">
                    Pending Verification
                  </Badge>
                </div>
              </div>

              <div className="bg-brand-secondary rounded-[2rem] p-8 border border-slate-100 mb-10">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-brand-primary mb-2 uppercase tracking-tight">Final Step: In-Person Verification</h4>
                    <p className="text-slate-600 font-medium leading-relaxed">
                      Please visit the <span className="text-brand-primary font-bold">Administration Office</span> at the Academy with your original documents to complete the admission process and receive your portal credentials.
                    </p>
                  </div>
                </div>
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
                className="w-full h-14 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-full transition-all shadow-xl shadow-brand-primary/20"
              >
                Submit Another Application
              </Button>
              <div className="text-center mt-6">
                <Link to="/public-home" className="text-brand-accent font-bold flex items-center justify-center gap-2">
                  Return to Home <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // REGISTRATION FORM
  return (
    <div className="min-h-screen bg-brand-primary liquid-mesh flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-brand-primary/60 backdrop-blur-[2px]" />
      
      <div className="max-w-4xl w-full relative z-10">
        {/* Header */}
        <motion.div
          {...waterfall}
          className="text-center mb-12"
        >
          <Link to="/public-home" className="inline-block mb-10">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-6"
            >
              <img src="/logo.png" alt="Logo" className="h-20 w-20 object-contain brightness-0 invert opacity-90" />
              <div className="text-left border-l border-white/20 pl-6">
                <h1 className="text-4xl font-serif font-black text-white tracking-tight leading-none">
                  Edwardian<br />
                  <span className="text-brand-gold text-lg font-bold tracking-[0.4em] uppercase">Academy</span>
                </h1>
              </div>
            </motion.div>
          </Link>
          <h2 className="text-3xl font-serif font-black text-white tracking-tight">
            Online Admission Application
          </h2>
          <p className="text-slate-300/80 font-medium mt-3 tracking-wide italic">New Academic Session {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          {...waterfall}
          transition={{ ...waterfall.animate.transition, delay: 0.1 }}
        >
          <div className="glass-ethereal rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] overflow-hidden border-white/10">
            <div className="bg-brand-gold h-2 opacity-80" />
            <form onSubmit={handleSubmit} className="p-10 md:p-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-3">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">
                    Student Full Name <span className="text-brand-gold">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder="As per Matric Certificate"
                      value={formData.studentName}
                      onChange={(e) => handleInputChange("studentName", e.target.value)}
                      className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white placeholder:text-slate-500 font-bold text-lg"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">
                    Father's Name <span className="text-brand-gold">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder="Full name"
                      value={formData.fatherName}
                      onChange={(e) => handleInputChange("fatherName", e.target.value)}
                      className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white placeholder:text-slate-500 font-bold text-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-3">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">
                    Parent Contact Number <span className="text-brand-gold">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder="03XX-XXXXXXX"
                      value={formData.parentCell}
                      onChange={(e) => handleInputChange("parentCell", e.target.value)}
                      className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white placeholder:text-slate-500 font-bold text-lg"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">
                    Student Cell (Optional)
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder="03XX-XXXXXXX"
                      value={formData.studentCell}
                      onChange={(e) => handleInputChange("studentCell", e.target.value)}
                      className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white placeholder:text-slate-500 font-bold text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-3">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white placeholder:text-slate-500 font-bold text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">Current Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      placeholder="City / Area"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white placeholder:text-slate-500 font-bold text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-16">
                <Label className="text-slate-300 text-xs font-bold uppercase tracking-[0.2em] ml-2">
                  Desired Academic Program <span className="text-brand-gold">*</span>
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                  <Select
                    value={formData.class}
                    onValueChange={(value) => handleInputChange("class", value)}
                  >
                    <SelectTrigger className="h-16 pl-14 rounded-3xl border-white/10 bg-white/5 focus:bg-white/10 focus:ring-brand-gold transition-all text-white font-bold text-lg">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent className="rounded-3xl border-white/10 bg-brand-primary/95 backdrop-blur-3xl text-white">
                      {isLoadingClasses ? (
                        <div className="p-4 text-center text-sm text-slate-400">Loading programs...</div>
                      ) : classes.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">No active programs available</div>
                      ) : (
                        classes.map((cls: any) => (
                          <SelectItem
                            key={cls._id}
                            value={cls._id}
                            className="h-14 focus:bg-white/10 rounded-2xl mx-2 my-1 font-medium text-white"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-base">{cls.classTitle || `${cls.gradeLevel} - ${cls.section}`}</span>
                              {cls.scheduleDisplay && (
                                <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">{cls.scheduleDisplay}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <motion.div {...ripple}>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-20 bg-brand-gold hover:bg-brand-gold/90 text-white text-xl font-black uppercase tracking-[0.2em] rounded-3xl transition-all duration-300 shadow-2xl shadow-brand-gold/20 group"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      Processing Application...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="ml-4 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-slate-400 font-medium mt-16 tracking-wide">
          Already a student?{" "}
          <Link to="/student-portal" className="text-brand-gold font-black hover:underline ml-2 transition-all">
            Access Portal
          </Link>
        </p>
      </div>
    </div>
  );
}
