
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
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: UserPlus, label: "Admissions", path: "/admissions" },
  { icon: Users, label: "Students", path: "/students" },
  { icon: GraduationCap, label: "Teachers", path: "/teachers" },
  { icon: DollarSign, label: "Finance", path: "/finance" },
  { icon: BookOpen, label: "Classes", path: "/classes" },
  { icon: Clock, label: "Timetable", path: "/timetable" },
  { icon: CalendarClock, label: "Sessions", path: "/sessions" },
  { icon: Settings, label: "Configuration", path: "/configuration" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar Header - Professional Layout */}
      <div className="border-b border-slate-700/50 px-6 py-5">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Edwardian Logo"
              className="h-12 w-12 object-contain"
            />
            <div className="flex flex-col">
              <h1 className="font-bold text-lg leading-tight text-white">Edwardian Academy</h1>
              <p className="text-xs font-medium text-blue-300/80 tracking-wide uppercase">Enterprise ERP</p>
            </div>
          </div>
        )}
        {collapsed && (
          <img
            src="/logo.png"
            alt="Edwardian Logo"
            className="mx-auto h-10 w-10 object-contain"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
        className="absolute bottom-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-sidebar-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
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
