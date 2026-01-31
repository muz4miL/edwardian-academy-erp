import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
  Loader2,
  LogIn,
  Sparkles,
  Crown,
  Star,
  Award,
  ChevronRight,
  Twitter,
  Instagram,
  Youtube,
  Send,
  CheckCircle2,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface PublicConfig {
  heroSection: {
    title: string;
    subtitle: string;
    tagline: string;
  };
  announcements: { _id: string; text: string }[];
  admissionStatus: {
    isOpen: boolean;
    notice: string;
    closedMessage: string;
  };
  contactInfo: {
    phone: string;
    mobile: string;
    email: string;
    address: string;
    facebook: string;
  };
  featuredSubjects: string[];
  highlights: { title: string; description: string; icon: string }[];
  faculty: { name: string; subject: string; isPartner: boolean }[];
}

// Icon mapping for highlights
const iconMap: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap className="h-8 w-8" />,
  BookOpen: <BookOpen className="h-8 w-8" />,
  Users: <Users className="h-8 w-8" />,
  Trophy: <Trophy className="h-8 w-8" />,
  Star: <Star className="h-8 w-8" />,
  Award: <Award className="h-8 w-8" />,
};

// Motion Variants
const waterfall = {
  initial: { y: 60, opacity: 0 },
  whileInView: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 40,
      damping: 15,
      mass: 1,
    },
  },
  viewport: { once: true, margin: "-100px" },
};

const float = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const ripple = {
  whileHover: { scale: 1.02, transition: { type: "spring" as const, stiffness: 400, damping: 10 } },
  whileTap: { scale: 0.98 },
};

// Inquiry Form Component
function InquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const inquiryMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone: string;
      message: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/public/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          interest: "General Inquiry",
          remarks: data.message,
          source: "Website Contact Form",
        }),
      });
      if (!response.ok) throw new Error("Failed to submit inquiry");
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      toast.success("Thank you!", {
        description: "Our team will contact you soon.",
        duration: 5000,
      });
      setTimeout(() => setSubmitted(false), 5000);
    },
    onError: (error: any) => {
      toast.error("Submission Failed", {
        description: error.message || "Please try again later.",
        duration: 4000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) {
      toast.error("Missing Information", {
        description: "Please fill in all required fields.",
        duration: 3000,
      });
      return;
    }
    inquiryMutation.mutate({ name, email, phone, message });
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-12"
      >
        <div className="h-20 w-20 mx-auto mb-6 rounded-3xl bg-brand-primary text-white flex items-center justify-center shadow-2xl shadow-brand-primary/20">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-2xl font-black text-brand-primary mb-2 uppercase tracking-tighter">Thank You!</h3>
        <p className="text-slate-500 font-medium">
          Our team will contact you shortly to assist with your inquiry.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="inquiry-name" className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">
            Full Name *
          </Label>
          <Input
            id="inquiry-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold"
            required
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="inquiry-phone"
            className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1"
          >
            Phone Number *
          </Label>
          <Input
            id="inquiry-phone"
            type="tel"
            placeholder="03XX-XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-14 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="inquiry-email" className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">
          Email Address (Optional)
        </Label>
        <Input
          id="inquiry-email"
          type="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="inquiry-message"
          className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1"
        >
          Your Message *
        </Label>
        <Textarea
          id="inquiry-message"
          placeholder="How can we help you?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold min-h-[120px] resize-none"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={inquiryMutation.isPending}
        className="w-full h-16 bg-brand-primary hover:bg-brand-primary/90 text-white text-lg font-black uppercase tracking-widest rounded-full transition-all shadow-xl shadow-brand-primary/20"
      >
        {inquiryMutation.isPending ? (
          <>
            <Loader2 className="h-6 w-6 mr-3 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-5 w-5 mr-3" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}

// Skeleton Loaders
function HeroSkeleton() {
  return (
    <div className="bg-brand-primary py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-32 mb-6 bg-white/20" />
        <Skeleton className="h-16 w-3/4 mb-6 bg-white/20" />
        <Skeleton className="h-8 w-1/2 mb-8 bg-white/20" />
        <div className="flex gap-4">
          <Skeleton className="h-12 w-40 bg-white/20" />
          <Skeleton className="h-12 w-40 bg-white/20" />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="py-20 max-w-7xl mx-auto px-4">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-64 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function PublicLanding() {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);

  // Fetch public config
  const { data, isLoading } = useQuery({
    queryKey: ["public-website-config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/website/public`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const config: PublicConfig | null = data?.data || null;

  // Rotate announcements
  useEffect(() => {
    if (config?.announcements && config.announcements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAnnouncement((prev) =>
          prev === config.announcements.length - 1 ? 0 : prev + 1,
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [config?.announcements]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-secondary">
        <nav className="h-20 bg-white border-b border-slate-200" />
        <HeroSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-secondary font-sans text-brand-primary">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            {/* Logo with Dynamic Title */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-4 cursor-pointer"
            >
              <img
                src="/logo.png"
                alt="Edwardian Academy"
                className="h-14 w-14 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-serif font-black tracking-tight text-brand-primary leading-none">
                  {config?.heroSection?.title?.split("'")[0] || "Edwardian"}
                </span>
                <span className="text-sm font-bold tracking-[0.4em] text-brand-gold uppercase">
                  Academy
                </span>
              </div>
            </motion.div>

            {/* Primary Action Buttons */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/register">
                <motion.div {...ripple}>
                  <Button className="bg-brand-gold hover:bg-brand-gold/90 text-white rounded-full px-10 h-12 transition-all shadow-xl shadow-brand-gold/20 font-bold tracking-wide">
                    Apply Now
                  </Button>
                </motion.div>
              </Link>
              <Link to="/student-portal">
                <motion.div {...ripple}>
                  <Button
                    variant="outline"
                    className="border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white rounded-full px-10 h-12 transition-all font-bold tracking-wide bg-white/50 backdrop-blur-sm"
                  >
                    Student Portal
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Mobile Menu Button - Placeholder for future expansion */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon">
                <Users className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden liquid-mesh">
        <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-[2px]" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 -skew-x-12 transform origin-top-right backdrop-blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl text-left">
              {/* Admission Status Badge */}
              {config?.admissionStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, type: "spring" }}
                >
                  <Badge
                    className={`mb-6 text-xs font-bold uppercase tracking-[0.2em] px-5 py-2 rounded-full backdrop-blur-xl border ${
                      config.admissionStatus.isOpen
                        ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                        : "bg-red-400/10 text-red-300 border-red-400/20"
                    }`}
                  >
                    {config.admissionStatus.isOpen
                      ? `🟢 ${config.admissionStatus.notice || "Admissions Open"}`
                      : `🔴 ${config.admissionStatus.closedMessage || "Admissions Closed"}`}
                  </Badge>
                </motion.div>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, type: "spring", stiffness: 50 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-serif font-black text-white mb-8 leading-[1.1] tracking-tight"
              >
                {config?.heroSection?.title || "The Edwardian Academy"}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.1, type: "spring", stiffness: 50 }}
                className="text-xl text-slate-200/80 mb-10 leading-relaxed font-medium max-w-xl"
              >
                {config?.heroSection?.subtitle ||
                  "Advancing Knowledge. Transforming Lives."}
              </motion.p>

              {config?.heroSection?.tagline && (
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 50 }}
                  className="text-sm font-bold uppercase tracking-[0.3em] text-brand-gold mb-8"
                >
                  {config.heroSection.tagline}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, type: "spring", stiffness: 50 }}
                className="flex flex-wrap gap-5"
              >
                <motion.div {...ripple}>
                  <Button
                    size="lg"
                    className="bg-brand-gold hover:bg-brand-gold/90 text-white rounded-full px-12 h-16 text-base font-bold shadow-2xl shadow-brand-gold/20"
                    onClick={() =>
                      (window.location.href = `tel:${config?.contactInfo?.mobile}`)
                    }
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    Inquiry Now
                  </Button>
                </motion.div>
                <motion.div {...ripple}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 rounded-full px-12 h-16 text-base font-bold bg-white/5 backdrop-blur-md"
                    onClick={() =>
                      window.open(config?.contactInfo?.facebook, "_blank")
                    }
                  >
                    <Facebook className="h-5 w-5 mr-2" />
                    Official Page
                  </Button>
                </motion.div>
              </motion.div>
            </div>
            
            <div className="hidden lg:block relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, type: "spring" }}
                className="relative z-10 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border-[12px] border-white/5 backdrop-blur-3xl"
              >
                <img 
                  src="edwardian.png" 
                  alt="Academy Life" 
                  className="w-full h-[600px] object-cover mix-blend-overlay opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 to-transparent" />
              </motion.div>
              <motion.div 
                {...float}
                className="absolute -bottom-10 -left-10 w-48 h-48 bg-brand-gold rounded-full -z-0 opacity-20 blur-3xl" 
              />
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="absolute -top-10 -right-10 w-72 h-72 bg-brand-navy rounded-full -z-0 blur-3xl" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      {config?.announcements && config.announcements.length > 0 && (
        <section className="bg-white py-12 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <Megaphone className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl font-black text-brand-primary uppercase tracking-tighter">
                  Notice<br />Board
                </h2>
              </div>
              <div className="flex-1 overflow-hidden relative h-12 flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAnnouncement}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center"
                  >
                    <p className="text-lg font-medium text-slate-700 truncate">
                      {config.announcements[currentAnnouncement].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                {config.announcements.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentAnnouncement(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentAnnouncement ? "w-8 bg-brand-primary" : "w-2 bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Subjects Section */}
      <section className="py-32 bg-brand-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            {...waterfall}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-brand-primary mb-6 tracking-tight">
              Academic Programs
            </h2>
            <div className="w-24 h-1.5 bg-brand-gold mx-auto rounded-full mb-8" />
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
              Explore our specialized tuition tracks designed for board exam excellence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(config?.featuredSubjects || ["Chemistry", "Physics", "Biology", "Mathematics"]).map((subject, idx) => (
              <motion.div
                key={subject}
                {...waterfall}
                transition={{ ...waterfall.whileInView.transition, delay: idx * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] group-hover:-translate-y-3 group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-bl-[4rem] -mr-8 -mt-8 group-hover:bg-brand-gold/10 transition-colors" />
                  
                  <div className="w-20 h-20 bg-brand-secondary rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-500">
                    <BookOpen className="h-10 w-10 text-brand-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-brand-primary mb-4">
                    {subject}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium mb-8">
                    Comprehensive syllabus coverage with expert guidance and testing.
                  </p>
                  <Link to="/register" className="flex items-center text-brand-gold font-bold group-hover:gap-3 transition-all tracking-wide">
                    Enroll Now <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Highlights */}
      {config?.highlights && config.highlights.length > 0 && (
        <section className="py-32 px-4 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-slate-50/50 -z-10" />
          <div className="max-w-7xl mx-auto">
            <motion.div
              {...waterfall}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-brand-primary mb-6 tracking-tight">
                Why Edwardian's?
              </h2>
              <div className="w-24 h-1.5 bg-brand-gold mx-auto rounded-full mb-8" />
              <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
                We combine traditional academic excellence with modern interactive learning systems.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {config.highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  {...waterfall}
                  transition={{ ...waterfall.whileInView.transition, delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-brand-secondary flex items-center justify-center shadow-lg group-hover:bg-brand-primary group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                    <div className="text-brand-primary group-hover:text-white transition-colors">
                      {iconMap[highlight.icon] || <Sparkles className="h-10 w-10" />}
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-brand-primary mb-4 tracking-tight">
                    {highlight.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    {highlight.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Faculty Section */}
      <section className="py-32 px-4 bg-brand-secondary relative overflow-hidden" id="faculty">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white to-transparent opacity-50" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            {...waterfall}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-black text-brand-primary mb-6 tracking-tight">
              Expert Faculty
            </h2>
            <div className="w-24 h-1.5 bg-brand-gold mx-auto rounded-full mb-8" />
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
              Learn from the region's most experienced professors and subject matter experts.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {config?.faculty?.map((professor, index) => (
              <motion.div
                key={index}
                {...waterfall}
                transition={{ ...waterfall.whileInView.transition, delay: index * 0.1 }}
              >
                <div className={`group relative bg-white rounded-[3rem] p-10 text-center border transition-all duration-500 hover:-translate-y-3 ${
                  professor.isPartner 
                    ? "border-brand-gold/30 shadow-[0_20px_50px_rgba(180,83,9,0.1)]" 
                    : "border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
                }`}>
                  <div className="relative inline-block mb-8">
                    <div className="w-32 h-32 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-4xl font-black text-brand-primary shadow-inner border-[6px] border-white overflow-hidden group-hover:scale-105 transition-transform duration-500">
                      {professor.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    {professor.isPartner && (
                      <motion.div 
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute -top-1 -right-1 bg-brand-gold text-white p-2.5 rounded-full shadow-lg"
                      >
                        <Crown className="h-5 w-5" />
                      </motion.div>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-brand-primary mb-2">
                    {professor.name}
                  </h3>
                  <p className="text-sm font-bold text-brand-gold uppercase tracking-[0.2em] mb-6">
                    {professor.subject}
                  </p>
                  {professor.isPartner && (
                    <Badge className="bg-brand-gold/10 text-brand-gold border-brand-gold/20 hover:bg-brand-gold/20 transition-colors px-4 py-1.5 rounded-full">
                      Academy Partner
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Inquiry Section */}
      <section className="py-32 px-4 bg-white" id="contact">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div {...waterfall}>
              <h2 className="text-4xl md:text-6xl font-serif font-black text-brand-primary mb-10 tracking-tight leading-[1.1]">
                Have a Question? <br /><span className="text-brand-gold italic">Get in Touch.</span>
              </h2>
              <p className="text-xl text-slate-500 mb-12 font-medium leading-relaxed">
                Our admissions team is ready to help you plan your academic journey. Send us a message and we'll respond within 24 hours.
              </p>
              
              <div className="space-y-10">
                <div className="flex items-start gap-8 group">
                  <div className="w-16 h-16 bg-brand-secondary rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:rotate-6 transition-all duration-500">
                    <Phone className="h-7 w-7 text-brand-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Call Us</p>
                    <p className="text-2xl font-black text-brand-primary">{config?.contactInfo?.mobile || "0300-0000000"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8 group">
                  <div className="w-16 h-16 bg-brand-secondary rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:rotate-6 transition-all duration-500">
                    <Mail className="h-7 w-7 text-brand-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Email Us</p>
                    <p className="text-2xl font-black text-brand-primary">{config?.contactInfo?.email || "academy@example.com"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-8 group">
                  <div className="w-16 h-16 bg-brand-secondary rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:rotate-6 transition-all duration-500">
                    <MapPin className="h-7 w-7 text-brand-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Visit Us</p>
                    <p className="text-xl font-black text-brand-primary max-w-sm">
                      {config?.contactInfo?.address || "University Road, Peshawar"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              {...waterfall}
              className="bg-brand-secondary p-10 md:p-16 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.08)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-bl-[5rem]" />
              <h3 className="text-3xl font-serif font-black text-brand-primary mb-10">Send an Inquiry</h3>
              <InquiryForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-brand-primary text-white pt-32 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 lg:col-span-1">
              <div className="flex items-center gap-4 mb-10">
                <img src="/logo.png" alt="Logo" className="h-14 w-14 brightness-0 invert opacity-90" />
                <div className="flex flex-col">
                  <span className="text-2xl font-serif font-black tracking-tight">EDWARDIAN</span>
                  <span className="text-sm font-bold tracking-[0.4em] text-brand-gold">ACADEMY</span>
                </div>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed mb-10 text-lg">
                Advancing knowledge and transforming lives through excellence in education since 2017.
              </p>
              <div className="flex gap-5">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <motion.a 
                    key={i} 
                    href="#" 
                    whileHover={{ y: -5, scale: 1.1 }}
                    className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-brand-gold hover:text-white transition-all border border-white/5 hover:border-brand-gold"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-10 uppercase tracking-[0.3em] text-brand-gold">Programs</h4>
              <ul className="space-y-5 text-slate-400 font-medium text-lg">
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">F.Sc Pre-Medical</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">F.Sc Pre-Engineering</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Computer Science</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Matric Science</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-10 uppercase tracking-[0.3em] text-brand-gold">Quick Links</h4>
              <ul className="space-y-5 text-slate-400 font-medium text-lg">
                <li><Link to="/student-portal" className="hover:text-brand-gold transition-colors">Student Portal</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Online Admission</Link></li>
                <li><a href="#faculty" className="hover:text-brand-gold transition-colors">Our Faculty</a></li>
                <li><Link to="/login" className="hover:text-brand-gold transition-colors">Staff Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-10 uppercase tracking-[0.3em] text-brand-gold">Newsletter</h4>
              <p className="text-slate-400 text-base font-medium mb-8">Subscribe to get updates on admissions and academic calendars.</p>
              <div className="flex gap-3">
                <Input className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white placeholder:text-slate-500 focus:ring-brand-gold focus:border-brand-gold" placeholder="Email Address" />
                <Button className="h-14 bg-brand-gold hover:bg-brand-gold/90 rounded-2xl px-8 shadow-lg shadow-brand-gold/20">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">
            <p>© {new Date().getFullYear()} The Edwardian Academy. All Rights Reserved.</p>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
