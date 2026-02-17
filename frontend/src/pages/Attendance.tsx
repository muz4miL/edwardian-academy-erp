/**
 * Attendance Page — Comprehensive Attendance Tracking & Management
 * Shows daily attendance records, class-wise summaries, student history,
 * monthly overview, with CSV export and print support.
 */

import { useState, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCheck,
  Users,
  Clock,
  Calendar,
  Download,
  Printer,
  Loader2,
  ArrowLeft,
  RefreshCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ScanBarcode,
  CalendarDays,
  TrendingUp,
  Timer,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ─── HELPERS ──────────────────────────────────────────────
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(+parts[0], +parts[1] - 1, +parts[2]).toLocaleDateString(
      "en-PK",
      { weekday: "short", year: "numeric", month: "short", day: "numeric" }
    );
  }
  return dateStr;
}

function getTodayStr() {
  const now = new Date();
  // Use Pakistan time zone
  const pk = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
  );
  return `${pk.getFullYear()}-${String(pk.getMonth() + 1).padStart(2, "0")}-${String(pk.getDate()).padStart(2, "0")}`;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

// ─── STATUS BADGE ─────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "present")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Present
      </Badge>
    );
  if (status === "late")
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
        <AlertTriangle className="mr-1 h-3 w-3" /> Late
      </Badge>
    );
  if (status === "early-leave")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200">
        <XCircle className="mr-1 h-3 w-3" /> Early Leave
      </Badge>
    );
  return <Badge variant="secondary">{status}</Badge>;
}

// ═══════════════════════════════════════════════════════════
// DAILY VIEW — All attendance records for a selected date
// ═══════════════════════════════════════════════════════════
function DailyView() {
  const [date, setDate] = useState(getTodayStr());
  const [classFilter, setClassFilter] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["attendance-summary", date],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/attendance/daily-summary?date=${date}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch daily summary");
      return res.json();
    },
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ["attendance-records", date, classFilter],
    queryFn: async () => {
      let url = `${API_BASE}/api/attendance?date=${date}&limit=500`;
      if (classFilter !== "all") url += `&classId=${classFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    },
  });

  const isLoading = summaryLoading || recordsLoading;
  const attendanceRecords = records?.records || [];
  const stats = summary?.stats || {};
  const classBreakdown = summary?.classBreakdown || [];

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Attendance Report - ${formatDate(date)}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .stats { display: flex; gap: 24px; margin: 12px 0; }
        .stat-box { padding: 8px 16px; background: #f9f9f9; border-radius: 6px; }
      </style></head><body>
      <h1>Attendance Report — ${formatDate(date)}</h1>
      <div class="stats">
        <div class="stat-box"><strong>${stats.totalPresent || 0}</strong> Students Present</div>
        <div class="stat-box"><strong>${stats.attendanceRate || 0}%</strong> Attendance Rate</div>
      </div>
      ${el.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleExport = () => {
    downloadCSV(
      `attendance-${date}.csv`,
      ["Student ID", "Name", "Class", "Group", "Time", "Status", "Scan Method", "Fee Status"],
      attendanceRecords.map((r: any) => [
        r.studentNumericId,
        r.studentName,
        r.class,
        r.group || "-",
        formatTime(r.timestamp),
        r.status,
        r.scanMethod,
        r.feeStatus || "-",
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classBreakdown.map((c: any) => (
              <SelectItem key={c.classId} value={c.classId}>
                {c.className} ({c.present})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!attendanceRecords.length}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!attendanceRecords.length}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Present</p>
                <p className="text-2xl font-bold">{stats.totalPresent ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{stats.attendanceRate ?? "—"}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Late Arrivals</p>
                <p className="text-2xl font-bold">
                  {attendanceRecords.filter((r: any) => r.status === "late").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classes Reporting</p>
                <p className="text-2xl font-bold">{classBreakdown.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Breakdown */}
      {classBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Class-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {classBreakdown.map((c: any) => (
                <div
                  key={c.classId}
                  className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setClassFilter(c.classId)}
                >
                  <p className="font-medium text-sm">{c.className}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold text-emerald-600">
                      {c.present}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {c.totalEnrolled} enrolled
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, c.totalEnrolled > 0 ? (c.present / c.totalEnrolled) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Attendance Records — {formatDate(date)}
            {classFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 text-xs"
                onClick={() => setClassFilter("all")}
              >
                Clear Filter
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScanBarcode className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No attendance records for this date</p>
              <p className="text-sm mt-1">
                Records will appear here once students scan their IDs at the gate
              </p>
            </div>
          ) : (
            <div ref={printRef} className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((r: any, i: number) => (
                    <TableRow key={r._id}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.studentNumericId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.studentName}
                      </TableCell>
                      <TableCell>{r.class}</TableCell>
                      <TableCell>{r.group || "—"}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatTime(r.timestamp)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.scanMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.currentSession
                          ? `${r.currentSession.subject} (${r.currentSession.teacher})`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STUDENT LOOKUP — Search a student and see their history
// ═══════════════════════════════════════════════════════════
function StudentLookup() {
  const [searchId, setSearchId] = useState("");
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch students");
      const all = await res.json();
      const list = Array.isArray(all) ? all : all.students || [];
      const filtered = list.filter(
        (s: any) =>
          s.studentId?.toString().includes(searchId) ||
          s.studentName?.toLowerCase().includes(searchId.toLowerCase()) ||
          s.barcodeId?.toLowerCase().includes(searchId.toLowerCase())
      );
      setStudents(filtered.slice(0, 20));
      if (filtered.length === 1) setActiveStudentId(filtered[0]._id);
    } catch {
      toast.error("Failed to search students");
    } finally {
      setSearching(false);
    }
  };

  const {
    data: history,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ["attendance-student", activeStudentId],
    queryFn: async () => {
      if (!activeStudentId) return null;
      const res = await fetch(
        `${API_BASE}/api/attendance/student/${activeStudentId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch student attendance");
      return res.json();
    },
    enabled: !!activeStudentId,
  });

  const stats = history?.stats || {};
  const attendanceRecords = history?.records || [];

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Student ID, Name, or Barcode ID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-1.5">Search</span>
            </Button>
          </div>

          {/* Search Results */}
          {students.length > 0 && !activeStudentId && (
            <div className="mt-4 grid gap-2">
              {students.map((s: any) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setActiveStudentId(s._id)}
                >
                  <div>
                    <span className="font-medium">{s.studentName}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ID: {s.studentId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.class}</Badge>
                    {s.group && <Badge variant="secondary">{s.group}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {students.length === 0 && searchId && !searching && (
            <p className="mt-3 text-sm text-muted-foreground">
              No students found matching &ldquo;{searchId}&rdquo;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Student Attendance Detail */}
      {activeStudentId && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveStudentId(null);
              setStudents([]);
            }}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Search
          </Button>

          {historyLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Days Present</p>
                    <p className="text-2xl font-bold">{stats.totalDays ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">On-Time Days</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.onTimeDays ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Late Days</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.lateDays ?? 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Punctuality Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.totalDays
                        ? Math.round((stats.onTimeDays / stats.totalDays) * 100)
                        : 0}
                      %
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* History Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Attendance History</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadCSV(
                          `student-attendance-${activeStudentId}.csv`,
                          ["Date", "Time", "Status", "Class", "Session", "Method"],
                          attendanceRecords.map((r: any) => [
                            formatDate(r.date),
                            formatTime(r.timestamp),
                            r.status,
                            r.class,
                            r.currentSession?.subject || "-",
                            r.scanMethod,
                          ])
                        )
                      }
                    >
                      <Download className="mr-1.5 h-4 w-4" /> Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {attendanceRecords.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No attendance records found for this student
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Check-in Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Session</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map((r: any, i: number) => (
                          <TableRow key={r._id}>
                            <TableCell className="text-muted-foreground">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatDate(r.date)}
                            </TableCell>
                            <TableCell>{formatTime(r.timestamp)}</TableCell>
                            <TableCell>
                              <StatusBadge status={r.status} />
                            </TableCell>
                            <TableCell>{r.class}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.currentSession?.subject || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {r.scanMethod}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MONTHLY OVERVIEW — Calendar heatmap for the entire month
// ═══════════════════════════════════════════════════════════
function MonthlyOverview() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["attendance-monthly", year, month],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/attendance/monthly-overview?year=${year}&month=${month}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch monthly overview");
      return res.json();
    },
  });

  const days = data?.days || [];
  const monthStats = data?.monthStats || {};

  const monthName = new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
  });

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayDataMap = useMemo(() => {
    const map: Record<string, any> = {};
    days.forEach((d: any) => {
      map[d.date] = d;
    });
    return map;
  }, [days]);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  function getHeatColor(rate: number) {
    if (rate >= 90) return "bg-emerald-500 text-white";
    if (rate >= 75) return "bg-emerald-300 text-emerald-900";
    if (rate >= 50) return "bg-amber-300 text-amber-900";
    if (rate > 0) return "bg-red-300 text-red-900";
    return "bg-muted text-muted-foreground";
  }

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {monthName} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Avg Daily Attendance</p>
            <p className="text-2xl font-bold">{monthStats.avgDaily ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Best Day</p>
            <p className="text-2xl font-bold text-emerald-600">
              {monthStats.bestDay?.present ?? "—"}
            </p>
            {monthStats.bestDay && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(monthStats.bestDay.date)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Avg Attendance Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {monthStats.avgRate ?? "—"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Attendance Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-medium text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Actual days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const dayData = dayDataMap[dateKey];
                  const rate = dayData?.attendanceRate || 0;
                  const present = dayData?.present || 0;

                  return (
                    <div
                      key={dayNum}
                      className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs border transition-colors ${
                        present > 0 ? getHeatColor(rate) : "bg-muted/40"
                      }`}
                      title={`${dateKey}: ${present} present (${rate}%)`}
                    >
                      <span className="font-medium">{dayNum}</span>
                      {present > 0 && (
                        <span className="text-[10px] opacity-80">{present}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-muted border" />
                  <span>No Data</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-300 border" />
                  <span>&lt;50%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-amber-300 border" />
                  <span>50-74%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-emerald-300 border" />
                  <span>75-89%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-emerald-500 border" />
                  <span>90%+</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Daily List */}
      {days.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Daily Breakdown</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCSV(
                    `attendance-${monthName}-${year}.csv`,
                    ["Date", "Day", "Present", "Attendance Rate"],
                    days.map((d: any) => [
                      d.date,
                      new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                      }),
                      d.present,
                      `${d.attendanceRate}%`,
                    ])
                  )
                }
              >
                <Download className="mr-1.5 h-4 w-4" /> Export Month
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((d: any) => (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium">{d.date}</TableCell>
                    <TableCell>
                      {new Date(d.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "long" }
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {d.present}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          d.attendanceRate >= 90
                            ? "bg-emerald-100 text-emerald-700"
                            : d.attendanceRate >= 75
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }
                      >
                        {d.attendanceRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MANUAL MARKING DIALOG
// ═══════════════════════════════════════════════════════════
function ManualMarkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markDate, setMarkDate] = useState(getTodayStr());
  const [markStatus, setMarkStatus] = useState("present");
  const [markType, setMarkType] = useState("check-in");

  const searchStudents = async () => {
    if (!studentSearch.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        credentials: "include",
      });
      const all = await res.json();
      const list = Array.isArray(all) ? all : all.students || [];
      setSearchResults(
        list
          .filter(
            (s: any) =>
              s.studentId?.toString().includes(studentSearch) ||
              s.studentName?.toLowerCase().includes(studentSearch.toLowerCase())
          )
          .slice(0, 10)
      );
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleMark = async () => {
    if (!selectedStudent) return;
    setMarking(true);
    try {
      const res = await fetch(`${API_BASE}/api/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: selectedStudent._id,
          date: markDate,
          status: markStatus,
          type: markType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to mark attendance");
      }
      toast.success(
        `Attendance marked for ${selectedStudent.studentName}`
      );
      onOpenChange(false);
      setSelectedStudent(null);
      setStudentSearch("");
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manual Attendance Marking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Search */}
          {!selectedStudent ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search student by ID or name..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchStudents()}
                />
                <Button size="sm" onClick={searchStudents} disabled={searching}>
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {searchResults.map((s: any) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedStudent(s)}
                >
                  <div>
                    <span className="font-medium">{s.studentName}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      #{s.studentId}
                    </span>
                  </div>
                  <Badge variant="outline">{s.class}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedStudent.studentName}</p>
                  <p className="text-sm text-muted-foreground">
                    #{selectedStudent.studentId} • {selectedStudent.class}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudent(null)}
                >
                  Change
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={markDate}
                    onChange={(e) => setMarkDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={markType} onValueChange={setMarkType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check-in">Check In</SelectItem>
                      <SelectItem value="check-out">Check Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={markStatus} onValueChange={setMarkStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="early-leave">Early Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleMark}
                disabled={marking}
              >
                {marking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                Mark Attendance
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ATTENDANCE PAGE
// ═══════════════════════════════════════════════════════════
export default function Attendance() {
  const [showManualDialog, setShowManualDialog] = useState(false);

  return (
    <DashboardLayout title="Attendance">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track and manage student attendance via gate scanner and manual entry
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowManualDialog(true)}>
              <UserCheck className="mr-1.5 h-4 w-4" /> Manual Entry
            </Button>
            <Button
              variant="default"
              onClick={() => window.open("/gatekeeper", "_blank")}
            >
              <ScanBarcode className="mr-1.5 h-4 w-4" /> Open Scanner
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="daily" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Daily View
            </TabsTrigger>
            <TabsTrigger value="student" className="flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              Student Lookup
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-6">
            <DailyView />
          </TabsContent>
          <TabsContent value="student" className="mt-6">
            <StudentLookup />
          </TabsContent>
          <TabsContent value="monthly" className="mt-6">
            <MonthlyOverview />
          </TabsContent>
        </Tabs>

        {/* Manual Mark Dialog */}
        <ManualMarkDialog
          open={showManualDialog}
          onOpenChange={setShowManualDialog}
        />
      </div>
    </DashboardLayout>
  );
}
