import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  DollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  CalendarClock,
  GraduationCap,
  Shield,
  Globe,
  Banknote,
  Phone,
  ScanLine,
  UserCheck,
  ClipboardCheck,
  Video,
  BarChart,
  FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// Navigation items with permission keys
// permission: matches the key in user.permissions array
// ownerOnly: additional restriction for sensitive pages
const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    permission: "dashboard",
  },
  {
    icon: UserPlus,
    label: "Admissions",
    path: "/admissions",
    permission: "admissions",
  },
  { icon: Users, label: "Students", path: "/students", permission: "students" },
  {
    icon: GraduationCap,
    label: "Teachers",
    path: "/teachers",
    permission: "teachers",
  },
  {
    icon: DollarSign,
    label: "Finance",
    path: "/finance",
    permission: "finance",
  },
  {
    icon: Phone,
    label: "Inquiries",
    path: "/leads",
    permission: "inquiries",
  },
  { icon: BookOpen, label: "Classes", path: "/classes", permission: "classes" },
  {
    icon: Clock,
    label: "Timetable",
    path: "/timetable",
    permission: "timetable",
  },
  {
    icon: CalendarClock,
    label: "Sessions",
    path: "/sessions",
    permission: "sessions",
  },
  // Phase 2: Physical Security
  {
    icon: ScanLine,
    label: "Gate Scanner",
    path: "/gatekeeper",
    permission: "gatekeeper",
  },
  {
    icon: ClipboardCheck,
    label: "Front Desk",
    path: "/front-desk",
    permission: "frontdesk",
  },
  {
    icon: Settings,
    label: "Configuration",
    path: "/configuration",
    permission: "configuration",
    ownerOnly: true,
  },
  {
    icon: Shield,
    label: "Users",
    path: "/users",
    permission: "users",
    ownerOnly: true,
  },
  {
    icon: Video,
    label: "Lectures",
    path: "/lectures",
    permission: "lectures",
  },
  {
    icon: FileQuestion,
    label: "Exams",
    path: "/exams",
    permission: "exams",
  },
  {
    icon: BarChart,
    label: "Reports",
    path: "/reports",
    permission: "reports",
  },

  {
    icon: Globe,
    label: "Website",
    path: "/website-manager",
    permission: "website",
    ownerOnly: true,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Get user permissions (OWNER gets all permissions automatically)
  const userPermissions = user?.permissions || ["dashboard"];
  const isOwner = user?.role === "OWNER";

  // Filter nav items based on user permissions and role
  const filteredNavItems = navItems.filter((item) => {
    // OWNER bypasses all permission checks
    if (isOwner) return true;

    // ownerOnly items are restricted to OWNER role
    if (item.ownerOnly) return false;

    // Teachers automatically get access to lectures
    if (user?.role === "TEACHER" && item.label === "Lectures") return true;

    // Check if user has permission for this item
    return userPermissions.includes(item.permission);
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Sidebar Header - Luxury Academic Theme */}
      <div className="border-b border-amber-500/20 px-4 py-5">
        {!collapsed && (
          <div className="flex flex-col items-center gap-2">
            <img
              src="/logo.png"
              alt="Edwardian Academy"
              className="h-20 w-auto object-contain"
            />
            <p className="text-[10px] font-semibold text-amber-400/80 tracking-widest uppercase">
              Enterprise ERP
            </p>
          </div>
        )}
        {collapsed && (
          <img
            src="/logo.png"
            alt="Edwardian Academy"
            className="mx-auto h-10 w-10 object-contain"
          />
        )}
      </div>

      {/* Navigation */}
      <nav
        className="mt-4 flex flex-col gap-1 px-2 overflow-y-auto sidebar-scrollbar"
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>



      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 left-1/2 z-50 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
