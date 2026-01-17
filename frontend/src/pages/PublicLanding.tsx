import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
} from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom Styles for Glassmorphism & Glow Effects */}
      <style>{`
        .glass-card {
          backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-glow:hover {
          box-shadow: 0 0 20px rgba(251, 146, 60, 0.5),
                      0 0 40px rgba(251, 146, 60, 0.3);
          transition: box-shadow 0.3s ease-in-out;
        }
        .btn-glow-cyan:hover {
          box-shadow: 0 0 20px rgba(8, 145, 178, 0.5),
                      0 0 40px rgba(8, 145, 178, 0.3);
          transition: box-shadow 0.3s ease-in-out;
        }
      `}</style>
      {/* Decorative Dot Pattern - Top Left */}
      <div className="fixed top-0 left-0 w-20 h-64 opacity-20 pointer-events-none">
        <div className="grid grid-cols-6 gap-2 p-4">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>
      </div>

      {/* Decorative Dot Pattern - Bottom Right */}
      <div className="fixed bottom-0 right-0 w-20 h-64 opacity-20 pointer-events-none">
        <div className="grid grid-cols-6 gap-2 p-4">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          ))}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-xl font-bold text-gray-800">Education</span>
              <span className="text-xs text-gray-500 italic">
                Be Prepared for the future
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#home"
                className="text-gray-700 hover:text-cyan-600 transition-colors"
              >
                Home
              </a>
              <a
                href="#courses"
                className="text-gray-700 hover:text-cyan-600 transition-colors"
              >
                All Courses
              </a>
              <a
                href="#about"
                className="text-gray-700 hover:text-cyan-600 transition-colors"
              >
                About Us
              </a>
              <a
                href="#faculty"
                className="text-gray-700 hover:text-cyan-600 transition-colors"
              >
                Instructors
              </a>
              <a
                href="#pricing"
                className="text-gray-700 hover:text-cyan-600 transition-colors"
              >
                Pricing & FAQ
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-cyan-600 transition-colors"
              >
                Contact
              </a>
            </div>

            {/* CTA Button */}
            <Link to="/login">
              <Button className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-md btn-glow">
                START LEARNING
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-cyan-600 via-cyan-700 to-cyan-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYyaDR2Mmgtdjh6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            {/* Admission Status Badge - Pulsing Animation */}
            {config?.admissionStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <motion.div
                  animate={
                    config.admissionStatus.isOpen
                      ? {
                          scale: [1, 1.05, 1],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Badge
                    className={`mb-6 text-sm px-4 py-1.5 ${
                      config.admissionStatus.isOpen
                        ? "bg-green-500/90 hover:bg-green-500 text-white"
                        : "bg-red-500/90 hover:bg-red-500 text-white"
                    }`}
                  >
                    {config.admissionStatus.isOpen
                      ? `🟢 ${config.admissionStatus.notice || "Admissions Open!"}`
                      : `🔴 ${config.admissionStatus.closedMessage || "Admissions Closed"}`}
                  </Badge>
                </motion.div>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
            >
              {config?.heroSection?.title || "Edwardian Academy"}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-xl md:text-2xl text-cyan-100 mb-4 leading-relaxed"
            >
              {config?.heroSection?.subtitle ||
                "Your Pathway to Academic Excellence"}
            </motion.p>

            {config?.heroSection?.tagline && (
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-lg text-cyan-200 mb-8"
              >
                {config.heroSection.tagline}
              </motion.p>
            )}

            {/* CTA Buttons - Animated Entrance with Glow */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white shadow-lg px-8 btn-glow"
                onClick={() =>
                  (window.location.href = `tel:${config?.contactInfo?.mobile}`)
                }
              >
                <Phone className="h-5 w-5 mr-2" />
                Call Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white hover:text-cyan-700 bg-transparent px-8"
                onClick={() =>
                  window.open(config?.contactInfo?.facebook, "_blank")
                }
              >
                <Facebook className="h-5 w-5 mr-2" />
                Follow Us
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="#F9FAFB"
            />
          </svg>
        </div>
      </section>

      {/* Announcements Ticker - Styled like "Become a Member" section */}
      {config?.announcements && config.announcements.length > 0 && (
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-start gap-8">
              <div className="flex-shrink-0">
                <p className="text-sm text-gray-500 mb-2">Important Notice</p>
                <h2 className="text-4xl font-bold text-gray-900">
                  Announcements
                </h2>
              </div>
              <div className="flex-1 border-l-4 border-orange-400 pl-8">
                <div className="text-gray-700 space-y-3">
                  {config.announcements
                    .slice(0, 3)
                    .map((announcement, index) => (
                      <div
                        key={announcement._id}
                        className="flex items-start gap-2"
                      >
                        <ChevronRight className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-base leading-relaxed">
                          {announcement.text}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Subjects Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Fresh Tuition Classes
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              F.Sc Classes for First & Second Year Students. Choose a plan that
              fits your learning goals and budget without any hidden costs.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {(
              config?.featuredSubjects || [
                "Chemistry",
                "Physics",
                "Biology",
                "Mathematics",
              ]
            ).map((subject) => (
              <div
                key={subject}
                className="bg-white border-2 border-cyan-600 rounded-lg px-6 py-3 text-cyan-700 font-semibold hover:bg-cyan-50 transition-colors cursor-pointer shadow-sm"
              >
                {subject}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Highlights with Scroll Reveal */}
      {config?.highlights && config.highlights.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why Choose Edwardian's?
              </h2>
              <p className="text-lg text-gray-600">
                Every option gives you access to high-quality courses designed
                to build real, practical skills.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {config.highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center group hover:scale-105 transition-transform"
                >
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    {iconMap[highlight.icon] || (
                      <Sparkles className="h-8 w-8" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {highlight.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {highlight.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Faculty Section - Staggered Card Entrance */}
      <section className="py-16 px-4 bg-gray-50" id="faculty">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Our Expert Faculty
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Learn from experienced professors dedicated to your success. Our
              instructors bring years of expertise and passion.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {config?.faculty?.map((professor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`overflow-hidden hover:shadow-xl transition-all ${
                    professor.isPartner ? "ring-2 ring-orange-400" : ""
                  }`}
                >
                  {professor.isPartner && (
                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-1">
                      <Crown className="h-3 w-3" />
                      Partner
                    </div>
                  )}
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                      {professor.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {professor.name}
                    </h3>
                    <p className="text-sm text-cyan-600 capitalize font-medium">
                      {professor.subject} Teacher
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-white" id="contact">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Join Our Community
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Enter your email address to register to our newsletter
              subscription delivered on regular basis!
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto mb-16"
          >
            <div className="flex gap-2 glass-card p-2 rounded-xl shadow-lg">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none focus:ring-0"
              />
              <Button className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-8 btn-glow">
                SUBSCRIBE
              </Button>
            </div>
          </motion.div>

          {/* Footer Content - Glassmorphism Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8 border-t border-gray-200"
          >
            {/* About */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
                <span className="text-xl font-bold text-gray-800">
                  Education
                </span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                We provide simple, practical online courses that help you learn
                web skills and build websites with confidence.
              </p>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Popular Courses */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Popular Courses
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>LMS Interactive Content</li>
                <li>Become a PHP Master</li>
                <li>HTML5/CSS3 Essentials</li>
                <li>JavaScript Development</li>
                <li>WordPress Basic Tutorial</li>
                <li>Introduction to Coding</li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Contact Info
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">Address</p>
                  <p className="text-gray-600">
                    {config?.contactInfo?.address ||
                      "123 Fifth Avenue, New York, NY 10160"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Phone</p>
                  <p className="text-gray-600">
                    {config?.contactInfo?.phone || "929-242-6868"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-gray-600">
                    {config?.contactInfo?.email || "contact@info.com"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <p>Copyright © {new Date().getFullYear()} Online Courses</p>
          <div className="flex items-center gap-2">
            <span>Powered by Online Courses</span>
            <Link
              to="/login"
              className="text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1 btn-glow-cyan"
            >
              <LogIn className="h-3 w-3" />
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
