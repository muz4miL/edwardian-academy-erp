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
  Video,
  MessageCircle,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { websiteApi } from "@/lib/api"; // ✅ Import the proper API helper

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
  GraduationCap: <GraduationCap className="h-6 w-6" />,
  BookOpen: <BookOpen className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  Trophy: <Trophy className="h-6 w-6" />,
  Star: <Star className="h-6 w-6" />,
  Award: <Award className="h-6 w-6" />,
};

// Ordered faculty roster (rendered after the CEO section).
// Images are served from /var/www/edwardian-frontend on the VPS; the onError handler
// falls back to /logo.png if any photo is ever missing.
type FacultyMember = {
  name: string;
  image: string;
  role: string;
  credential?: string;
  secondary?: string;
  affiliation?: string;
  bio: string;
};

const FACULTY_MEMBERS: FacultyMember[] = [
  {
    name: "Dr. Muhammad Zahid",
    image: "/Zahid.png",
    role: "Zoology Teacher",
    credential: "Ph.D. Zoology",
    bio: "Senior partner and distinguished Zoology educator with extensive experience guiding medical aspirants.",
  },
  {
    name: "Shah Saud Khan",
    image: "/shahsaudkhan.png",
    role: "Physics Teacher",
    bio: "Passionate physics educator dedicated to student success and conceptual mastery.",
  },
  {
    name: "Dr. Muhammad Ibrar",
    image: "/Ibrar.png",
    role: "Botany Teacher",
    credential: "Ph.D. Botany",
    bio: "Accomplished Botany instructor known for result-oriented teaching and strong academic mentoring.",
  },
  {
    name: "Dr. Shah Khalid",
    image: "/ShahKhalid.png",
    role: "Lecturer, Department of Botany",
    credential: "Ph.D. ICP / Harvard University",
    secondary: "Postdoctoral: ETH Zurich, QMUL UK",
    affiliation: "Islamia College Peshawar",
    bio: "Highly accomplished academic and researcher in Botany. Former Visiting Scholar at Utah State University.",
  },
  {
    name: "Sir Nadeem Khan",
    image: "/Nadeem.png",
    role: "Mathematics Teacher",
    bio: "Expert mathematics instructor focused on building strong fundamentals and exam excellence.",
  },
  {
    name: "Sir Awal Said",
    image: "/awalsaid.png",
    role: "English Teacher",
    bio: "Dedicated English language instructor with a focus on communication and comprehension skills.",
  },
  {
    name: "Sir Kamran Mohsin",
    image: "/kamran.png",
    role: "English Teacher",
    bio: "Experienced English educator committed to language excellence and student growth.",
  },
  {
    name: "Sir Jamil Ahmad",
    image: "/Jamil.png",
    role: "Physics Teacher & CEO",
    credential: "MPhil Physics | B.Ed",
    affiliation: "The Grand School System",
    bio: "Specializes in conceptual clarity and analytical thinking for Matric & college levels.",
  },
  {
    name: "Sir Qaisar Shahzad",
    image: "/Qaiser.png",
    role: "Govt. School Teacher & Instructor",
    credential: "M.Sc. Chemistry | M.Ed",
    bio: "Expert in modern teaching methodologies, promoting scientific thinking and academic growth.",
  },
  {
    name: "Sir Muhammad Ishaq Jan",
    image: "/ishaq.png",
    role: "Biology Teacher",
    credential: "M.Sc. Botany | B.Ed",
    affiliation: "Expert Educator",
    bio: "Dedicated to concept-based learning and student excellence.",
  },
  {
    name: "Sir Shams ul Haq",
    image: "/shams.png",
    role: "Govt. School Teacher",
    credential: "M.Sc. Mathematics",
    affiliation: "The Grand School System",
    bio: "Focused on building solid conceptual understanding and maintaining high academic standards.",
  },
];

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
      return websiteApi.submitInquiry({
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        interest: "General Inquiry",
        remarks: data.message,
        source: "Website Contact Form",
      });
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
        <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-xl shadow-brand-primary/20">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-black text-brand-primary mb-2 uppercase tracking-tighter">Thank You!</h3>
        <p className="text-slate-500 font-medium">
          Our team will contact you shortly to assist with your inquiry.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="inquiry-name" className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">
            Full Name *
          </Label>
          <Input
            id="inquiry-name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold text-sm"
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
            className="h-10 rounded-xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold text-sm"
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
          className="h-10 rounded-xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold text-sm"
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
          className="rounded-xl border-slate-200 bg-white/50 focus:bg-white focus:ring-brand-primary transition-all text-brand-primary font-bold min-h-[80px] resize-none text-sm"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={inquiryMutation.isPending}
        className="w-full h-11 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-black uppercase tracking-widest rounded-full transition-all shadow-lg shadow-brand-primary/20"
      >
        {inquiryMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
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
    queryFn: () => websiteApi.getPublicConfig(), // ✅ Use proper API helper
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
          <div className="flex justify-between items-center h-16">
            {/* Logo with Dynamic Title */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <img
                src="/logo.png"
                alt="Edwardian Academy"
                className="h-10 w-10 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-lg font-serif font-black tracking-tight text-brand-primary leading-none">
                  {config?.heroSection?.title?.split("'")[0] || "Edwardian"}
                </span>
                <span className="text-[10px] font-bold tracking-[0.4em] text-brand-gold uppercase">
                  Academy
                </span>
              </div>
            </motion.div>

            {/* Primary Action Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/register">
                <motion.div {...ripple}>
                  <Button className="bg-brand-gold hover:bg-brand-gold/90 text-white rounded-full px-6 h-9 text-sm transition-all shadow-lg shadow-brand-gold/20 font-bold tracking-wide">
                    Apply Now
                  </Button>
                </motion.div>
              </Link>
              <Link to="/student-portal">
                <motion.div {...ripple}>
                  <Button
                    variant="outline"
                    className="border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white rounded-full px-6 h-9 text-sm transition-all font-bold tracking-wide bg-white/50 backdrop-blur-sm"
                  >
                    Student Portal
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/register">
                <Button size="sm" className="bg-brand-gold hover:bg-brand-gold/90 text-white rounded-full px-4 h-8 text-xs font-bold shadow-md">
                  Apply Now
                </Button>
              </Link>
              <Link to="/student-portal">
                <Button size="sm" variant="outline" className="border-brand-primary/20 text-brand-primary rounded-full px-4 h-8 text-xs font-bold bg-white/50">
                  Student Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 overflow-hidden liquid-mesh">
        <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-[2px]" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 -skew-x-12 transform origin-top-right backdrop-blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="max-w-xl text-left">
              {/* Admission Status Badge */}
              {config?.admissionStatus && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, type: "spring" }}
                >
                  <Badge
                    className={`mb-4 text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full backdrop-blur-xl border ${
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
                className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-white mb-5 leading-[1.1] tracking-tight"
              >
                {config?.heroSection?.title || "The Edwardian Academy"}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.1, type: "spring", stiffness: 50 }}
                className="text-base text-slate-200/80 mb-6 leading-relaxed font-medium max-w-lg"
              >
                {config?.heroSection?.subtitle ||
                  "Advancing Knowledge. Transforming Lives."}
              </motion.p>

              {config?.heroSection?.tagline && (
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 50 }}
                  className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold mb-5"
                >
                  {config.heroSection.tagline}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, type: "spring", stiffness: 50 }}
                className="flex flex-wrap gap-4"
              >
                <motion.div {...ripple}>
                  <Button
                    size="default"
                    className="bg-brand-gold hover:bg-brand-gold/90 text-white rounded-full px-8 h-11 text-sm font-bold shadow-xl shadow-brand-gold/20"
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
                    size="default"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-11 text-sm font-bold bg-white/5 backdrop-blur-md"
                    onClick={() =>
                      window.open(config?.contactInfo?.facebook, "_blank")
                    }
                  >
                    <Facebook className="h-5 w-5 mr-2" />
                    Official Page
                  </Button>
                </motion.div>
              </motion.div>

              <motion.a
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4, type: "spring", stiffness: 50 }}
                href="https://codeclub.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white/90 backdrop-blur-md transition-all hover:bg-white/15"
              >
                <img
                  src="/codeClub.png"
                  alt="CodeClub"
                  className="h-11 w-11 rounded-xl object-cover shadow-lg"
                />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-gold">
                    Digital Experience
                  </p>
                  <p className="text-sm font-semibold">
                    Designed with CodeClub
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-white/70" />
              </motion.a>
            </div>
            
            <div className="hidden lg:block relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, type: "spring" }}
                className="relative z-10 rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)] border-[8px] border-white/5 backdrop-blur-3xl"
              >
                <img 
                  src="edwardian.png" 
                  alt="Academy Life" 
                  className="w-full h-[380px] object-cover mix-blend-overlay opacity-90"
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
        <section className="bg-white py-5 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-5">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-9 h-9 bg-brand-primary rounded-xl flex items-center justify-center shadow-md shadow-brand-primary/20">
                  <Megaphone className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-sm font-black text-brand-primary uppercase tracking-tighter">
                  Notice<br />Board
                </h2>
              </div>
              <div className="flex-1 overflow-hidden relative h-10 flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentAnnouncement}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center"
                  >
                    <p className="text-sm font-medium text-slate-700 truncate">
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
      <section className="py-16 bg-brand-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            {...waterfall}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-serif font-black text-brand-primary mb-4 tracking-tight">
              Academic Programs
            </h2>
            <div className="w-16 h-1 bg-brand-gold mx-auto rounded-full mb-4" />
            <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
              Explore our specialized tuition tracks designed for board exam excellence.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(config?.featuredSubjects || ["Chemistry", "Physics", "Biology", "Mathematics"]).map((subject, idx) => (
              <motion.div
                key={subject}
                {...waterfall}
                transition={{ ...waterfall.whileInView.transition, delay: idx * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] group-hover:-translate-y-2 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-brand-gold/5 rounded-bl-[2rem] -mr-4 -mt-4 group-hover:bg-brand-gold/10 transition-colors" />
                  
                  <div className="w-12 h-12 bg-brand-secondary rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-500">
                    <BookOpen className="h-6 w-6 text-brand-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-black text-brand-primary mb-2">
                    {subject}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-medium mb-4">
                    Comprehensive syllabus coverage with expert guidance and testing.
                  </p>
                  <Link to="/register" className="flex items-center text-sm text-brand-gold font-bold group-hover:gap-2 transition-all tracking-wide">
                    Enroll Now <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Highlights */}
      {config?.highlights && config.highlights.length > 0 && (
        <section className="py-16 px-4 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-slate-50/50 -z-10" />
          <div className="max-w-7xl mx-auto">
            <motion.div
              {...waterfall}
              className="text-center mb-10"
            >
              <h2 className="text-2xl md:text-3xl font-serif font-black text-brand-primary mb-4 tracking-tight">
                Why Edwardian's?
              </h2>
              <div className="w-16 h-1 bg-brand-gold mx-auto rounded-full mb-4" />
              <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium">
                We combine traditional academic excellence with modern interactive learning systems.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {config.highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  {...waterfall}
                  transition={{ ...waterfall.whileInView.transition, delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-secondary flex items-center justify-center shadow-md group-hover:bg-brand-primary group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                    <div className="text-brand-primary group-hover:text-white transition-colors">
                      {iconMap[highlight.icon] || <Sparkles className="h-6 w-6" />}
                    </div>
                  </div>
                  <h3 className="text-base font-black text-brand-primary mb-2 tracking-tight">
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

      {/* Expert Faculty Section - Premium Static Team Showcase */}
      <section className="py-20 bg-gradient-to-b from-white via-brand-secondary/30 to-white relative overflow-hidden" id="faculty">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...waterfall}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-brand-gold/10 px-4 py-2 rounded-full mb-6">
              <Crown className="h-4 w-4 text-brand-gold" />
              <span className="text-xs font-bold text-brand-gold uppercase tracking-widest">Our Leadership</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-black text-brand-primary mb-6 tracking-tight">
              Expert Faculty
            </h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-brand-gold to-brand-primary mx-auto rounded-full mb-6" />
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
              Meet the dedicated educators and visionary leaders who make excellence possible at our institution.
            </p>
          </motion.div>

          {/* Luxurious CEO Section - Mr. Waqar Baig */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 relative">
              {/* Subtle Accent Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-gold via-brand-primary to-brand-gold" />
              
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left Side - Portrait */}
                <div className="flex items-center justify-center p-8 md:p-12 bg-gradient-to-br from-slate-100/50 to-white">
                  <div className="relative group w-full max-w-sm">
                    {/* Refined CEO Badge */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <div className="flex items-center gap-2 bg-gradient-to-r from-brand-primary to-slate-800 text-white px-6 py-2 rounded-full shadow-lg border border-brand-gold/20">
                        <Crown className="h-4 w-4 text-brand-gold" />
                        <span className="text-xs font-bold uppercase tracking-wide">Chief Executive Officer</span>
                      </div>
                    </div>
                    
                    {/* Portrait with Elegant Frame */}
                    <div className="relative mt-6">
                      {/* Subtle Gold Accent */}
                      <div className="absolute -inset-2 bg-gradient-to-br from-brand-gold/20 via-brand-primary/10 to-transparent rounded-2xl" />
                      
                      {/* Image Container */}
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-4 border-white transform group-hover:scale-[1.02] transition-transform duration-500">
                        <img
                          src="/waqar.png"
                          alt="Mr. Waqar Baig - CEO"
                          className="w-full h-full object-cover object-center"
                          onError={(e) => { e.target.src = '/logo.png'; }}
                        />
                        {/* Subtle Vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Content */}
                <div className="flex flex-col justify-center space-y-6 p-8 md:p-12">
                  {/* Name & Title */}
                  <div>
                    <h3 className="text-3xl md:text-4xl font-serif font-black text-brand-primary mb-3 tracking-tight">
                      Mr. Waqar Baig
                    </h3>
                    <p className="text-lg font-bold text-slate-700 mb-1">
                      CEO & Founder, The Edwardian's Academy
                    </p>
                    <p className="text-base font-semibold text-brand-gold">
                      Expert Chemistry Educator
                    </p>
                  </div>

                  {/* Refined Divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-0.5 w-16 bg-brand-gold rounded-full" />
                    <GraduationCap className="h-4 w-4 text-brand-gold" />
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-brand-gold/50 to-transparent rounded-full" />
                  </div>

                  {/* Content Sections - Compact & Elegant */}
                  <div className="space-y-4 text-sm leading-relaxed">
                    <div className="border-l-4 border-brand-gold/30 pl-4">
                      <h4 className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider mb-2">
                        <Award className="h-3.5 w-3.5" />
                        Academic Background
                      </h4>
                      <p className="text-slate-600 font-medium">
                        M.Sc. Chemistry, Institute of Chemical Sciences, University of Peshawar (2012).
                      </p>
                    </div>

                    <div className="border-l-4 border-brand-gold/30 pl-4">
                      <h4 className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider mb-2">
                        <Briefcase className="h-3.5 w-3.5" />
                        Professional Experience
                      </h4>
                      <p className="text-slate-600 font-medium">
                        Former Lecturer at Fazaia Degree College and Edwardes College. Visiting Lecturer at Islamia College Peshawar.
                      </p>
                    </div>

                    <div className="border-l-4 border-brand-gold/30 pl-4">
                      <h4 className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-wider mb-2">
                        <Trophy className="h-3.5 w-3.5" />
                        Impact & Recognition
                      </h4>
                      <p className="text-slate-600 font-medium">
                        Extensive experience in F.Sc. tuition and ETEA/MDCAT preparation, guiding thousands into medical colleges. Author of MCQ books and comprehensive notes. Multiple Letters of Commendation recipient.
                      </p>
                    </div>
                  </div>

                  {/* Achievement Highlights */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <div className="flex items-center gap-1.5 bg-brand-gold/10 px-3 py-1.5 rounded-full border border-brand-gold/20">
                      <Award className="h-3.5 w-3.5 text-brand-gold" />
                      <span className="text-xs font-bold text-brand-primary">Award Winner</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-brand-gold/10 px-3 py-1.5 rounded-full border border-brand-gold/20">
                      <BookOpen className="h-3.5 w-3.5 text-brand-gold" />
                      <span className="text-xs font-bold text-brand-primary">Published Author</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-brand-gold/10 px-3 py-1.5 rounded-full border border-brand-gold/20">
                      <Users className="h-3.5 w-3.5 text-brand-gold" />
                      <span className="text-xs font-bold text-brand-primary">1000+ Students</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Premium Faculty Grid — ordered per latest product decision.
              Order after CEO Mr. Waqar Baig: Zahid → Saud → Ibrar → Khalid → Nadeem → Awal → Kamran → Jamil → Qaiser → Ishaq → Shams. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {FACULTY_MEMBERS.map((member, idx) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + idx * 0.05 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border border-slate-100/80">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-black text-brand-primary mb-1 group-hover:text-brand-gold transition-colors duration-300">
                      {member.name}
                    </h3>
                    {member.credential && (
                      <p className="text-sm font-bold text-brand-gold mb-2">{member.credential}</p>
                    )}
                    {member.secondary && (
                      <p className="text-xs text-slate-600 mb-1 font-semibold">{member.secondary}</p>
                    )}
                    <p className="text-sm font-semibold text-slate-700 mb-1">{member.role}</p>
                    {member.affiliation && (
                      <p className="text-xs text-brand-primary/80 font-medium mb-3">{member.affiliation}</p>
                    )}
                    <p className="text-xs text-slate-500 leading-relaxed">{member.bio}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Inquiry Section */}
      <section className="py-16 px-4 bg-white" id="contact">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div {...waterfall}>
              <h2 className="text-2xl md:text-3xl font-serif font-black text-brand-primary mb-6 tracking-tight leading-[1.1]">
                Have a Question? <br /><span className="text-brand-gold italic">Get in Touch.</span>
              </h2>
              <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
                Our admissions team is ready to help you plan your academic journey. Send us a message and we'll respond within 24 hours.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 bg-brand-secondary rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:rotate-6 transition-all duration-500">
                    <Phone className="h-4 w-4 text-brand-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Call Us</p>
                    <p className="text-base font-black text-brand-primary">{config?.contactInfo?.mobile || "0300-0000000"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 bg-brand-secondary rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:rotate-6 transition-all duration-500">
                    <Mail className="h-4 w-4 text-brand-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Email Us</p>
                    <p className="text-base font-black text-brand-primary">{config?.contactInfo?.email || "academy@example.com"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 bg-brand-secondary rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-brand-primary group-hover:rotate-6 transition-all duration-500">
                    <MapPin className="h-4 w-4 text-brand-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Visit Us</p>
                    <p className="text-sm font-black text-brand-primary max-w-xs">
                      {config?.contactInfo?.address || "University Road, Peshawar"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              {...waterfall}
              className="bg-brand-secondary p-8 md:p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-bl-[3rem]" />
              <h3 className="text-xl font-serif font-black text-brand-primary mb-6">Send an Inquiry</h3>
              <InquiryForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-brand-primary text-white pt-16 pb-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div className="col-span-1 lg:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 brightness-0 invert opacity-90" />
                <div className="flex flex-col">
                  <span className="text-lg font-serif font-black tracking-tight">EDWARDIAN</span>
                  <span className="text-[10px] font-bold tracking-[0.4em] text-brand-gold">ACADEMY</span>
                </div>
              </div>
              <p className="text-slate-400 font-medium leading-relaxed mb-6 text-sm">
                Advancing knowledge and transforming lives through excellence in education since 2017.
              </p>
              <div className="flex gap-3">
                <motion.a 
                  href="https://www.facebook.com/theedwardiansacademy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.1 }}
                  className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-white/5 hover:border-blue-600"
                >
                  <Facebook className="h-4 w-4" />
                </motion.a>
                <motion.a 
                  href="https://www.instagram.com/theedwardiansacademy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.1 }}
                  className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all border border-white/5 hover:border-pink-600"
                >
                  <Instagram className="h-4 w-4" />
                </motion.a>
                <motion.a 
                  href="https://www.tiktok.com/@theedwardiansacademy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.1 }}
                  className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-black hover:text-white transition-all border border-white/5 hover:border-black"
                >
                  <Video className="h-4 w-4" />
                </motion.a>
                <motion.a 
                  href="https://whatsapp.com/channel/0029VaiTo3bJuyAEfReetV0R" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.1 }}
                  className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all border border-white/5 hover:border-green-600"
                >
                  <MessageCircle className="h-4 w-4" />
                </motion.a>
                <motion.a 
                  href="https://youtube.com/@theedwardiansacademy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.1 }}
                  className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all border border-white/5 hover:border-red-600"
                >
                  <Youtube className="h-4 w-4" />
                </motion.a>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold mb-6 uppercase tracking-[0.25em] text-brand-gold">Programs</h4>
              <ul className="space-y-3 text-slate-400 font-medium text-sm">
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">F.Sc Pre-Medical</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">F.Sc Pre-Engineering</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Computer Science</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Matric Science</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Etea / Mdcat</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold mb-6 uppercase tracking-[0.25em] text-brand-gold">Quick Links</h4>
              <ul className="space-y-3 text-slate-400 font-medium text-sm">
                <li><Link to="/student-portal" className="hover:text-brand-gold transition-colors">Student Portal</Link></li>
                <li><Link to="/register" className="hover:text-brand-gold transition-colors">Online Admission</Link></li>
                <li><a href="#faculty" className="hover:text-brand-gold transition-colors">Our Faculty</a></li>
                <li><Link to="/login" className="hover:text-brand-gold transition-colors">Staff Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold mb-6 uppercase tracking-[0.25em] text-brand-gold">Newsletter</h4>
              <p className="text-slate-400 text-xs font-medium mb-4">Subscribe to get updates on admissions and academic calendars.</p>
              <div className="flex gap-2">
                <Input className="h-10 bg-white/5 border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-slate-500 focus:ring-brand-gold focus:border-brand-gold" placeholder="Email Address" />
                <Button className="h-10 bg-brand-gold hover:bg-brand-gold/90 rounded-xl px-5 shadow-md shadow-brand-gold/20">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">
            <p>© {new Date().getFullYear()} The Edwardian Academy. All Rights Reserved.</p>
            <div className="flex flex-col items-center gap-4 md:flex-row md:gap-10">
              <a
                href="https://codeclub.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-full border border-brand-gold/30 bg-white px-4 py-2 text-[10px] tracking-[0.16em] text-brand-primary shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.3)]"
              >
                <img
                  src="/codeClub.png"
                  alt="CodeClub"
                  className="h-8 w-8 rounded-full border border-slate-200 bg-white object-contain p-0.5"
                />
                <span className="font-semibold">Website Experience by CodeClub</span>
                <ExternalLink className="h-3.5 w-3.5 text-brand-gold" />
              </a>
              <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
