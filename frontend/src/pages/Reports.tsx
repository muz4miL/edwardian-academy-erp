/**
 * Reports Page — Comprehensive Financial & Academic Reports
 * 
 * Features:
 * - Class Reports: Full student roster with fees, teacher assignments
 * - Teacher Reports: Earnings by compensation mode, per-student details
 * - Academy Summary: Overall stats and financial health
 * - Downloadable as PDF and Excel
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  BarChart3, Download, Printer, Loader2, DollarSign, TrendingUp, TrendingDown,
  FileSpreadsheet, Receipt, Users, GraduationCap, ArrowLeft, RefreshCcw, Package,
  ChevronDown, ChevronRight, BookOpen, Wallet, PiggyBank, Building2, Calendar,
  FileText, Phone, MapPin, ClipboardList, CheckCircle2, AlertCircle, Clock,
  Percent, User, Hash, CalendarDays, Info, Mail, IdCard, Check, ChevronsUpDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { reportApi } from "@/lib/api";
import { API_BASE_URL } from "@/utils/apiConfig";

// Utility functions
function fmt(n: number) { return `PKR ${Math.round(n || 0).toLocaleString()}`; }
function fmtDate(d: string | Date | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtShort(d: string | Date | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function resolveStudentPhotoSrc(photo?: string | null, imageUrl?: string | null) {
  const value = imageUrl || photo;
  if (!value) return null;
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  return `${API_BASE_URL}${value}`;
}

// Download CSV helper
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

// Print helper with enhanced styling
function printContent(title: string, el: HTMLDivElement | null) {
  if (!el) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px 30px; color: #1a1a1a; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a365d; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 24px; color: #1a365d; margin: 0 0 4px 0; }
    .header .subtitle { color: #6b7280; font-size: 13px; }
    .logo { width: 80px; height: 80px; object-fit: contain; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 16px; }
    .kpi-row { display: flex; gap: 12px; margin: 16px 0; flex-wrap: wrap; }
    .kpi { flex: 1; min-width: 140px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #f9fafb; }
    .kpi .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .green { color: #059669; } .red { color: #dc2626; } .blue { color: #2563eb; } .amber { color: #d97706; } .purple { color: #7c3aed; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th, td { text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; }
    th { background: #1a365d; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    .right { text-align: right; } .center { text-align: center; }
    .total-row { background: #dbeafe !important; font-weight: 700; }
    .section { margin-top: 24px; page-break-inside: avoid; }
    .section-title { font-size: 14px; font-weight: 700; color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 4px; margin-bottom: 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; } .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; } .badge-amber { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 30px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
${el.innerHTML}
<div class="footer">
  <span>Generated by Edwardian Academy ERP</span>
  <span>${new Date().toLocaleString()}</span>
</div>
</body>
</html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ═══════════════════════════════════════════════════════
// CLASS REPORT COMPONENT
// ═══════════════════════════════════════════════════════
function ClassReport() {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Fetch all classes for dropdown
  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ["report-classes"],
    queryFn: () => reportApi.getAllClasses(),
  });

  // Fetch class report when selected
  const { data: reportData, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ["class-report", selectedClass],
    queryFn: () => reportApi.getClassReport(selectedClass),
    enabled: !!selectedClass,
  });

  const classes = classesData?.data || [];
  const report = reportData?.data;

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ["S.No", "Student Name", "Father Name", "Roll No", "Admission Date", "Phone", "Total Fee", "Paid", "Balance", "Status"];
    const rows = (report.students || []).map((s: any, i: number) => [
      String(i + 1),
      s.studentName || "",
      s.fatherName || "",
      s.studentId || "",
      fmtDate(s.admissionDate),
      s.phone || "",
      String(s.totalFee || 0),
      String(s.totalPaid || 0),
      String(s.balance || 0),
      s.feeStatus || "",
    ]);
    downloadCSV(`class-report-${report.classTitle}`, headers, rows);
    toast.success("CSV exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Class Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Class Report Generator
          </CardTitle>
          <CardDescription>
            Select a class to generate detailed student roster with fee status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={classesLoading ? "Loading classes..." : "Choose a class..."} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.title}</span>
                        <Badge variant="secondary" className="text-xs">{c.studentCount} students</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {report && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel/CSV
                </Button>
                <Button size="sm" onClick={() => printContent(`Class Report - ${report.classTitle}`, printRef.current)}>
                  <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {reportLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Generating class report...</span>
        </div>
      )}

      {/* Report Content */}
      {report && !reportLoading && (
        <div ref={printRef}>
          {/* Print Header */}
          <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1a365d", paddingBottom: 12, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, color: "#1a365d", margin: 0, marginBottom: 4 }}>Edwardian Academy</h1>
              <p className="subtitle" style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Class Report: <strong>{report.classTitle}</strong></p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: "4px 0 0 0" }}>Session: {report.session || "Current"} | Generated: {fmtDate(new Date())}</p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Students</div>
                <div className="text-2xl font-bold text-blue-700">{report.totalStudents}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Fee Expected</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(report.totalFeeExpected)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Collected</div>
                <div className="text-xl font-bold text-green-700">{fmt(report.totalCollected)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Outstanding</div>
                <div className="text-xl font-bold text-red-700">{fmt(report.totalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Collection Rate</div>
                <div className="text-2xl font-bold text-purple-700">{report.collectionRate?.toFixed(1) || 0}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Status Breakdown */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
              <PiggyBank className="h-5 w-5" /> Fee Status Distribution
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
                  <div className="text-2xl font-bold text-emerald-700">{report.feeStatusBreakdown?.paid || 0}</div>
                  <div className="text-sm text-emerald-600">Fully Paid</div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                  <div className="text-2xl font-bold text-amber-700">{report.feeStatusBreakdown?.partial || 0}</div>
                  <div className="text-sm text-amber-600">Partial</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-700">{report.feeStatusBreakdown?.pending || 0}</div>
                  <div className="text-sm text-red-600">Pending</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Teachers Section */}
          {report.teachers && report.teachers.length > 0 && (
            <div className="section mb-6">
              <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
                <GraduationCap className="h-5 w-5" /> Teachers & Subjects
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800">
                        <TableHead className="text-white">Teacher Name</TableHead>
                        <TableHead className="text-white">Subject</TableHead>
                        <TableHead className="text-white">Compensation</TableHead>
                        <TableHead className="text-white text-right">Rate/Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.teachers.map((t: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{t.teacherName}</TableCell>
                          <TableCell>{t.subjectName}</TableCell>
                          <TableCell>
                            <Badge variant={t.compensationMode === "percentage" ? "default" : t.compensationMode === "fixed" ? "secondary" : "outline"}>
                              {t.compensationMode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {t.compensationMode === "percentage" 
                              ? `${t.teacherShare}% / ${t.academyShare}%`
                              : t.compensationMode === "fixed"
                              ? fmt(t.fixedSalary || 0)
                              : `${fmt(t.perStudentRate || 0)}/student`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Roster - Main Table */}
          <div className="section">
            <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
              <Users className="h-5 w-5" /> Student Roster
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800">
                        <TableHead className="text-white w-[50px]">S.No</TableHead>
                        <TableHead className="text-white">Student Name</TableHead>
                        <TableHead className="text-white">Father Name</TableHead>
                        <TableHead className="text-white">Roll No</TableHead>
                        <TableHead className="text-white">Date</TableHead>
                        <TableHead className="text-white text-right">Fee</TableHead>
                        <TableHead className="text-white text-right">Paid</TableHead>
                        <TableHead className="text-white text-right">Balance</TableHead>
                        <TableHead className="text-white">Contact</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(report.students || []).map((s: any, i: number) => (
                        <TableRow key={s._id || i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <TableCell className="text-center font-medium">{i + 1}</TableCell>
                          <TableCell className="font-semibold">{s.studentName}</TableCell>
                          <TableCell className="text-muted-foreground">{s.fatherName || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">{s.studentId || "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{fmtShort(s.admissionDate)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(s.totalFee)}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-700">{fmt(s.totalPaid)}</TableCell>
                          <TableCell className="text-right font-bold text-red-700">{fmt(s.balance)}</TableCell>
                          <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={s.feeStatus === "PAID" ? "default" : s.feeStatus === "PARTIAL" ? "secondary" : "destructive"}
                              className={s.feeStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : s.feeStatus === "PARTIAL" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}
                            >
                              {s.feeStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="bg-blue-100 font-bold">
                        <TableCell colSpan={5} className="text-right">TOTAL</TableCell>
                        <TableCell className="text-right">{fmt(report.totalFeeExpected)}</TableCell>
                        <TableCell className="text-right text-emerald-700">{fmt(report.totalCollected)}</TableCell>
                        <TableCell className="text-right text-red-700">{fmt(report.totalOutstanding)}</TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedClass && !reportLoading && (
        <Card className="py-16">
          <CardContent className="text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">Select a class above to generate the report</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              The report will include student roster, fee status, and teacher assignments
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TEACHER REPORT COMPONENT
// ═══════════════════════════════════════════════════════
function TeacherReport() {
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false);
  // Track which class rows are expanded to show student detail sub-tables.
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());

  const toggleClassRow = (idx: number) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Fetch all teachers for dropdown
  const { data: teachersData, isLoading: teachersLoading } = useQuery({
    queryKey: ["report-teachers"],
    queryFn: () => reportApi.getAllTeachers(),
  });

  // Fetch teacher report when selected
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["teacher-report", selectedTeacher],
    queryFn: () => reportApi.getTeacherReport(selectedTeacher),
    enabled: !!selectedTeacher,
  });

  const teachers = teachersData?.data || [];
  const report = reportData?.data;

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ["Class", "Subject", "Students", "Compensation Mode", "Rate/Share", "Total Earned", "Paid", "Pending"];
    const rows = (report.classes || []).map((c: any) => [
      c.className || "",
      c.subjectName || "",
      String(c.studentCount || 0),
      c.compensationMode || "",
      c.compensationMode === "percentage" ? `${c.teacherShare}%` : c.compensationMode === "fixed" ? String(c.fixedSalary || 0) : String(c.perStudentRate || 0),
      String(c.totalEarned || 0),
      String(c.totalPaid || 0),
      String(c.totalPending || 0),
    ]);
    downloadCSV(`teacher-report-${report.teacherName}`, headers, rows);
    toast.success("CSV exported successfully!");
  };

  // Navigate to Finance → Teacher Payroll tab
  const goToTeacherPayroll = () => {
    navigate("/finance?tab=payroll");
  };

  return (
    <div className="space-y-6">
      {/* Teacher Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            Teacher Report Generator
          </CardTitle>
          <CardDescription>
            Select a teacher to view earnings breakdown. To pay teachers, go to Finance → Teacher Payroll
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[260px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Select Teacher</Label>
              {(() => {
                const selectedTeacherDoc = teachers.find((t: any) => t._id === selectedTeacher);
                return (
                  <Popover open={teacherPickerOpen} onOpenChange={setTeacherPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={teacherPickerOpen}
                        className="w-full justify-between font-normal"
                      >
                        {teachersLoading ? (
                          <span className="text-muted-foreground">Loading teachers...</span>
                        ) : selectedTeacherDoc ? (
                          <span className="flex items-center gap-2 truncate">
                            <span className="font-medium">{selectedTeacherDoc.fullName}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{selectedTeacherDoc.compensationMode}</Badge>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Choose a teacher...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command
                        filter={(value, search) => {
                          const haystack = value.toLowerCase();
                          const needle = search.toLowerCase().trim();
                          return haystack.includes(needle) ? 1 : 0;
                        }}
                      >
                        <CommandInput placeholder="Search teacher by name or subject..." />
                        <CommandList>
                          <CommandEmpty>No teacher found.</CommandEmpty>
                          <CommandGroup>
                            {teachers.map((t: any) => {
                              const searchValue = `${t.fullName || t.name} ${t.subject || ""}`.trim();
                              return (
                                <CommandItem
                                  key={t._id}
                                  value={searchValue}
                                  onSelect={() => {
                                    setSelectedTeacher(t._id);
                                    setTeacherPickerOpen(false);
                                    setExpandedClasses(new Set()); // reset expansions on teacher change
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Check className={cn("h-4 w-4", selectedTeacher === t._id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-medium truncate">{t.fullName || t.name}</span>
                                    {t.subject && (
                                      <span className="text-[11px] text-muted-foreground capitalize truncate">{t.subject}</span>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="text-[10px] shrink-0 ml-auto">{t.compensationMode}</Badge>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              })()}
            </div>
            {/* Go to Teacher Payroll button */}
            <Button variant="default" className="bg-purple-600 hover:bg-purple-700" onClick={goToTeacherPayroll}>
              <Wallet className="mr-1.5 h-4 w-4" /> Go to Teacher Payroll
            </Button>
            {report && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel/CSV
                </Button>
                <Button size="sm" onClick={() => printContent(`Teacher Report - ${report.teacherName}`, printRef.current)}>
                  <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {reportLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Generating teacher report...</span>
        </div>
      )}

      {/* Report Content */}
      {report && !reportLoading && (
        <div ref={printRef}>
          {/* Print Header */}
          <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1a365d", paddingBottom: 12, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, color: "#1a365d", margin: 0, marginBottom: 4 }}>Edwardian Academy</h1>
              <p className="subtitle" style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Teacher Report: <strong>{report.teacherName}</strong></p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: "4px 0 0 0" }}>Compensation: {report.compensationMode} | Generated: {fmtDate(new Date())}</p>
            </div>
          </div>

          {/* Teacher Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Classes Teaching</div>
                <div className="text-2xl font-bold text-purple-700">{report.totalClasses}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Students</div>
                <div className="text-2xl font-bold text-blue-700">{report.totalStudents}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Earned</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(report.totalEarned)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Wallet Balance</div>
                <div className="text-xl font-bold text-amber-700">{fmt(report.walletBalance)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Compensation Info */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
              <Wallet className="h-5 w-5" /> Compensation Details
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="text-base px-3 py-1" variant="secondary">
                      {report.compensationMode?.toUpperCase()}
                    </Badge>
                  </div>
                  {report.compensationMode === "percentage" && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Split:</span>{" "}
                      <span className="font-bold text-purple-700">{report.teacherShare}%</span> Teacher / {" "}
                      <span className="font-bold text-blue-700">{report.academyShare}%</span> Academy
                    </div>
                  )}
                  {report.compensationMode === "fixed" && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Monthly Salary:</span>{" "}
                      <span className="font-bold text-emerald-700">{fmt(report.fixedSalary)}</span>
                    </div>
                  )}
                  {report.compensationMode === "perStudent" && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Per Student:</span>{" "}
                      <span className="font-bold text-emerald-700">{fmt(report.perStudentRate)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Classes Taught — expandable rows */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
              <BookOpen className="h-5 w-5" /> Classes &amp; Earnings Breakdown
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Click any class row to expand and see a per-payment breakdown — student name, fee paid, teacher share, and academy share.</p>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800">
                        <TableHead className="text-white w-8"></TableHead>
                        <TableHead className="text-white">Class</TableHead>
                        <TableHead className="text-white">Subject</TableHead>
                        <TableHead className="text-white text-center">Students</TableHead>
                        <TableHead className="text-white">Mode</TableHead>
                        <TableHead className="text-white text-right">Fees Collected</TableHead>
                        <TableHead className="text-white text-right">Teacher Share</TableHead>
                        <TableHead className="text-white text-right">Academy Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(report.classes || []).map((c: any, i: number) => {
                        const isExpanded = expandedClasses.has(i);
                        const hasRows = (c.studentRows || []).length > 0;
                        const feesCollected = (c.studentRows || []).reduce((s: number, r: any) => s + (r.feePaid || 0), 0);
                        const teacherTotal = (c.studentRows || []).reduce((s: number, r: any) => s + (r.teacherShare || 0), 0);
                        const academyTotal = (c.studentRows || []).reduce((s: number, r: any) => s + (r.academyShare || 0), 0);
                        // Fall back to totalEarned from API when studentRows not populated.
                        const displayTeacher = teacherTotal || c.totalEarned || 0;
                        const displayAcademy = academyTotal || (feesCollected - displayTeacher) || 0;
                        return (
                          <>
                            <TableRow
                              key={`cls-${i}`}
                              className={`cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? "bg-slate-50" : ""}`}
                              onClick={() => toggleClassRow(i)}
                            >
                              <TableCell className="py-2 px-2">
                                {hasRows ? (
                                  isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-slate-500" />
                                    : <ChevronRight className="h-4 w-4 text-slate-500" />
                                ) : (
                                  <span className="w-4 h-4 inline-block" />
                                )}
                              </TableCell>
                              <TableCell className="font-semibold">{c.className}</TableCell>
                              <TableCell>{c.subjectName}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{c.studentCount}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={c.compensationMode === "percentage" ? "default" : "secondary"}>
                                  {c.compensationMode === "percentage" ? `${c.teacherShare}%` : c.compensationMode}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{fmt(feesCollected || c.totalCollected || 0)}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-700">{fmt(displayTeacher)}</TableCell>
                              <TableCell className="text-right font-medium text-blue-700">{fmt(displayAcademy)}</TableCell>
                            </TableRow>
                            {/* Expanded student detail sub-table */}
                            {isExpanded && hasRows && (
                              <TableRow key={`detail-${i}`} className="bg-slate-50">
                                <TableCell colSpan={8} className="p-0">
                                  <div className="border-t border-slate-200 bg-white">
                                    <div className="px-4 py-2 bg-slate-100 flex items-center gap-2">
                                      <Users className="h-3.5 w-3.5 text-slate-500" />
                                      <span className="text-xs font-semibold text-slate-700">Fee Payments for {c.className}</span>
                                      <Badge variant="secondary" className="text-[10px] ml-auto">{c.studentRows.length} payment{c.studentRows.length !== 1 ? "s" : ""}</Badge>
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-slate-700">
                                          <TableHead className="text-white text-xs py-1.5">#</TableHead>
                                          <TableHead className="text-white text-xs py-1.5">Student</TableHead>
                                          <TableHead className="text-white text-xs py-1.5">Date</TableHead>
                                          <TableHead className="text-white text-xs text-right py-1.5">Fee Paid</TableHead>
                                          <TableHead className="text-white text-xs text-right py-1.5">Teacher Share</TableHead>
                                          <TableHead className="text-white text-xs text-right py-1.5">Academy Share</TableHead>
                                          <TableHead className="text-white text-xs py-1.5">Receipt</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(c.studentRows || []).map((sr: any, j: number) => (
                                          <TableRow key={j} className={j % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                                            <TableCell className="text-xs py-1.5 text-slate-500">{j + 1}</TableCell>
                                            <TableCell className="text-xs py-1.5 font-medium text-slate-800">{sr.studentName}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-slate-500">{fmtShort(sr.date)}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-right font-medium">{fmt(sr.feePaid)}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-right font-bold text-emerald-700">{fmt(sr.teacherShare)}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-right font-semibold text-blue-700">{fmt(sr.academyShare)}</TableCell>
                                            <TableCell className="text-xs py-1.5 text-slate-400 font-mono">{sr.receiptNumber || "—"}</TableCell>
                                          </TableRow>
                                        ))}
                                        {/* Sub-total row */}
                                        <TableRow className="bg-emerald-50 font-bold border-t-2 border-emerald-200">
                                          <TableCell colSpan={3} className="text-xs py-2 text-right text-slate-700">Class Total</TableCell>
                                          <TableCell className="text-xs py-2 text-right">{fmt(feesCollected)}</TableCell>
                                          <TableCell className="text-xs py-2 text-right text-emerald-700">{fmt(teacherTotal)}</TableCell>
                                          <TableCell className="text-xs py-2 text-right text-blue-700">{fmt(academyTotal)}</TableCell>
                                          <TableCell />
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                      {/* Grand Totals */}
                      <TableRow className="bg-blue-100 font-bold">
                        <TableCell />
                        <TableCell colSpan={2} className="text-right">GRAND TOTAL</TableCell>
                        <TableCell className="text-center">{report.totalStudents}</TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          {fmt((report.classes || []).reduce((s: number, c: any) =>
                            s + (c.studentRows || []).reduce((ss: number, r: any) => ss + (r.feePaid || 0), 0), 0))}
                        </TableCell>
                        <TableCell className="text-right text-emerald-700">{fmt(report.totalEarned)}</TableCell>
                        <TableCell className="text-right text-blue-700">
                          {fmt((report.classes || []).reduce((s: number, c: any) =>
                            s + (c.studentRows || []).reduce((ss: number, r: any) => ss + (r.academyShare || 0), 0), 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Student Details (for percentage mode) */}
          {report.studentDetails && report.studentDetails.length > 0 && (
            <div className="section">
              <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
                <Users className="h-5 w-5" /> Per-Student Earnings
              </h2>
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-800">
                          <TableHead className="text-white">Student</TableHead>
                          <TableHead className="text-white">Class</TableHead>
                          <TableHead className="text-white text-right">Fee Paid</TableHead>
                          <TableHead className="text-white text-right">Teacher Share</TableHead>
                          <TableHead className="text-white">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.studentDetails.map((s: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{s.studentName}</TableCell>
                            <TableCell className="text-muted-foreground">{s.className}</TableCell>
                            <TableCell className="text-right">{fmt(s.feePaid || s.amount)}</TableCell>
                            <TableCell className="text-right text-emerald-700 font-semibold">{fmt(s.teacherEarning || s.teacherShare)}</TableCell>
                            <TableCell className="text-sm">{fmtShort(s.date)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!selectedTeacher && !reportLoading && (
        <Card className="py-16">
          <CardContent className="text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">Select a teacher above to generate the report</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              The report will include earnings by class, compensation breakdown, and payment history
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// STUDENT REPORT COMPONENT
// ═══════════════════════════════════════════════════════
function StudentReport({ initialStudentId = "" }: { initialStudentId?: string }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudent(initialStudentId);
    }
  }, [initialStudentId]);

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["report-students"],
    queryFn: () => reportApi.getAllStudents(),
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["student-report", selectedStudent],
    queryFn: () => reportApi.getStudentReport(selectedStudent),
    enabled: !!selectedStudent,
  });

  const students = studentsData?.data || [];
  const report = reportData?.data;

  const handleExportCSV = () => {
    if (!report) return;
    const headers = [
      "Student ID",
      "Student Name",
      "Father Name",
      "Class",
      "Group",
      "Subject",
      "Teacher",
      "Subject Fee",
      "Subject Discount",
      "Effective Fee",
      "Fee Status",
      "Total Fee",
      "Paid Amount",
      "Balance",
    ];
    const rows = (report.subjects || []).map((s: any) => [
      report.student.studentId || "",
      report.student.studentName || "",
      report.student.fatherName || "",
      report.student.className || "",
      report.student.group || "",
      s.name || "",
      s.teacherName || "",
      String(s.fee || 0),
      String(s.discount || 0),
      String(s.effectiveFee || 0),
      String(report.student.feeStatus || ""),
      String(report.student.totalFee || 0),
      String(report.student.paidAmount || 0),
      String(report.student.balance || 0),
    ]);
    downloadCSV(`student-report-${report.student.studentId || "student"}`, headers, rows);
    toast.success("CSV exported successfully!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Student Report Generator
          </CardTitle>
          <CardDescription>
            Select a student to view full profile, subject-wise teacher assignment, and fee history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[280px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={studentsLoading ? "Loading students..." : "Choose a student..."} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s: any) => (
                    <SelectItem key={s._id} value={s._id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.studentName}</span>
                        <Badge variant="outline" className="font-mono text-xs">{s.studentId}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {report && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel/CSV
                </Button>
                <Button size="sm" onClick={() => printContent(`Student Report - ${report.student.studentName}`, printRef.current)}>
                  <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {reportLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Generating student report...</span>
        </div>
      )}

      {report && !reportLoading && (
        <div ref={printRef} className="space-y-6">
          <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1a365d", paddingBottom: 12, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, color: "#1a365d", margin: 0, marginBottom: 4 }}>Edwardian Academy</h1>
              <p className="subtitle" style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                Student Report: <strong>{report.student.studentName}</strong>
              </p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: "4px 0 0 0" }}>
                ID: {report.student.studentId} | Generated: {fmtDate(new Date())}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Class</div>
                <div className="text-lg font-bold text-blue-700">{report.student.className}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Subjects</div>
                <div className="text-2xl font-bold text-purple-700">{report.summary.totalSubjects}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Paid</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(report.student.paidAmount)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Balance</div>
                <div className="text-xl font-bold text-red-700">{fmt(report.student.balance)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-600" /> Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="md:col-span-2 flex justify-center mb-2">
                <div className="h-20 w-20 rounded-full overflow-hidden border border-slate-200 shadow-sm">
                  {resolveStudentPhotoSrc(report.student.photo, report.student.imageUrl) ? (
                    <img
                      src={resolveStudentPhotoSrc(report.student.photo, report.student.imageUrl) || ""}
                      alt={report.student.studentName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-sky-500 text-white flex items-center justify-center font-bold text-xl">
                      {(report.student.studentName || "S").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div><span className="text-muted-foreground">Student Name:</span> <span className="font-medium">{report.student.studentName}</span></div>
              <div><span className="text-muted-foreground">Father Name:</span> <span className="font-medium">{report.student.fatherName}</span></div>
              <div><span className="text-muted-foreground">Class / Group:</span> <span className="font-medium">{report.student.className} ({report.student.group})</span></div>
              <div><span className="text-muted-foreground">Session:</span> <span className="font-medium">{report.student.session}</span></div>
              <div><span className="text-muted-foreground">Parent Cell:</span> <span className="font-medium">{report.student.parentCell}</span></div>
              <div><span className="text-muted-foreground">Student Cell:</span> <span className="font-medium">{report.student.studentCell}</span></div>
              <div><span className="text-muted-foreground">Admission Date:</span> <span className="font-medium">{fmtDate(report.student.admissionDate)}</span></div>
              <div>
                <span className="text-muted-foreground">Fee Status:</span>{" "}
                <Badge className={
                  report.student.feeStatus === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : report.student.feeStatus === "partial"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }>
                  {(report.student.feeStatus || "pending").toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" /> Subject-wise Breakdown
              </CardTitle>
              <CardDescription>
                Mirrors admissions structure with assigned teacher/demo status and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800">
                    <TableHead className="text-white">Subject</TableHead>
                    <TableHead className="text-white">Teacher</TableHead>
                    <TableHead className="text-white text-right">Fee</TableHead>
                    <TableHead className="text-white text-right">Discount</TableHead>
                    <TableHead className="text-white text-right">Effective</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.subjects || []).map((s: any, idx: number) => (
                    <TableRow key={`${s.name}-${idx}`}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <span className={s.teacherName?.includes("Undecided") ? "text-amber-700 italic" : ""}>
                          {s.teacherName || "Undecided (Demo)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmt(s.fee)}</TableCell>
                      <TableCell className="text-right text-amber-700">{fmt(s.discount)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{fmt(s.effectiveFee)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-blue-100 font-bold">
                    <TableCell colSpan={2} className="text-right">TOTAL</TableCell>
                    <TableCell className="text-right">{fmt(report.summary.totalSubjectFee)}</TableCell>
                    <TableCell className="text-right text-amber-700">{fmt(report.summary.totalDiscount)}</TableCell>
                    <TableCell className="text-right text-emerald-700">{fmt(report.summary.totalFee)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" /> Payment History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800">
                    <TableHead className="text-white">Receipt</TableHead>
                    <TableHead className="text-white">Month</TableHead>
                    <TableHead className="text-white text-right">Amount</TableHead>
                    <TableHead className="text-white">Method</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(report.feeHistory || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        No fee records yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    (report.feeHistory || []).map((f: any, idx: number) => (
                      <TableRow key={`${f.receiptNumber || idx}`}>
                        <TableCell className="font-mono text-xs">{f.receiptNumber || "-"}</TableCell>
                        <TableCell>{f.month || "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(f.amount)}</TableCell>
                        <TableCell>{f.paymentMethod || "CASH"}</TableCell>
                        <TableCell><Badge variant="outline">{f.status || "-"}</Badge></TableCell>
                        <TableCell>{fmtDate(f.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedStudent && !reportLoading && (
        <Card className="py-16">
          <CardContent className="text-center">
            <User className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">Select a student above to generate the report</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              The report will include full profile, all subjects, teacher assignment, and payment history
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ACADEMY SUMMARY COMPONENT
// ═══════════════════════════════════════════════════════
function AcademySummary() {
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["academy-summary"],
    queryFn: () => reportApi.getAcademySummary(),
  });

  const report = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading academy summary...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="py-16">
        <CardContent className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground">Failed to load academy summary</p>
          <Button variant="link" onClick={() => refetch()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
        </Button>
        <Button size="sm" onClick={() => printContent("Academy Summary Report", printRef.current)}>
          <Printer className="mr-1.5 h-4 w-4" /> Print / PDF
        </Button>
      </div>

      <div ref={printRef}>
        {/* Header */}
        <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1a365d", paddingBottom: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, color: "#1a365d", margin: 0, marginBottom: 4 }}>Edwardian Academy</h1>
            <p className="subtitle" style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Academy Summary Report</p>
            <p style={{ color: "#9ca3af", fontSize: 11, margin: "4px 0 0 0" }}>Generated: {fmtDate(new Date())}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-xs text-muted-foreground uppercase">Total Students</span>
              </div>
              <div className="text-3xl font-bold text-blue-700">{report.totalStudents}</div>
              <div className="text-xs text-muted-foreground mt-1">Active: {report.activeStudents}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                <span className="text-xs text-muted-foreground uppercase">Total Teachers</span>
              </div>
              <div className="text-3xl font-bold text-purple-700">{report.totalTeachers}</div>
              <div className="text-xs text-muted-foreground mt-1">Active: {report.activeTeachers}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-amber-600" />
                <span className="text-xs text-muted-foreground uppercase">Total Classes</span>
              </div>
              <div className="text-3xl font-bold text-amber-700">{report.totalClasses}</div>
              <div className="text-xs text-muted-foreground mt-1">Active: {report.activeClasses}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="text-xs text-muted-foreground uppercase">Collection Rate</span>
              </div>
              <div className="text-3xl font-bold text-emerald-700">{report.collectionRate?.toFixed(1) || 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <div className="section mb-6">
          <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
            <DollarSign className="h-5 w-5" /> Financial Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="p-5">
                <div className="text-sm text-emerald-600 mb-1">Total Fee Expected</div>
                <div className="text-2xl font-bold text-emerald-800">{fmt(report.totalFeeExpected)}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-5">
                <div className="text-sm text-green-600 mb-1">Total Collected</div>
                <div className="text-2xl font-bold text-green-800">{fmt(report.totalCollected)}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-5">
                <div className="text-sm text-red-600 mb-1">Total Outstanding</div>
                <div className="text-2xl font-bold text-red-800">{fmt(report.totalOutstanding)}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fee Status Distribution */}
        <div className="section mb-6">
          <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
            <ClipboardList className="h-5 w-5" /> Fee Status Distribution
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
                  <div className="text-2xl font-bold text-emerald-700">{report.feeStatusBreakdown?.paid || 0}</div>
                  <div className="text-sm text-emerald-600">Fully Paid</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                  <div className="text-2xl font-bold text-amber-700">{report.feeStatusBreakdown?.partial || 0}</div>
                  <div className="text-sm text-amber-600">Partial</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-700">{report.feeStatusBreakdown?.pending || 0}</div>
                  <div className="text-sm text-red-600">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Classes by Revenue */}
        {report.topClasses && report.topClasses.length > 0 && (
          <div className="section">
            <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
              <TrendingUp className="h-5 w-5" /> Top Classes by Revenue
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800">
                      <TableHead className="text-white">#</TableHead>
                      <TableHead className="text-white">Class</TableHead>
                      <TableHead className="text-white text-center">Students</TableHead>
                      <TableHead className="text-white text-right">Revenue</TableHead>
                      <TableHead className="text-white text-right">Collection %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.topClasses.map((c: any, i: number) => (
                      <TableRow key={c._id || i}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-semibold">{c.title}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{c.studentCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">{fmt(c.totalCollected)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={c.collectionRate >= 80 ? "bg-emerald-100 text-emerald-800" : c.collectionRate >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                            {c.collectionRate?.toFixed(0) || 0}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// FINANCIAL OVERVIEW COMPONENT
// ═══════════════════════════════════════════════════════
function FinancialOverview() {
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["financial-overview", startDate, endDate],
    queryFn: () => reportApi.getFinancialOverview({ startDate, endDate }),
  });

  const report = data?.data;

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ["Date", "Student", "Class", "Amount", "Type", "Method"];
    const rows = (report.recentTransactions || []).map((t: any) => [
      fmtDate(t.date),
      t.studentName || "",
      t.className || "",
      String(t.amount || 0),
      t.type || "",
      t.method || "",
    ]);
    downloadCSV("financial-overview", headers, rows);
    toast.success("CSV exported!");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Financial Overview
          </CardTitle>
          <CardDescription>
            Detailed revenue breakdown and recent transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Start Date (Optional)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-2 block">End Date (Optional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); }}>
                Clear
              </Button>
              <Button onClick={() => refetch()}>
                <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
              </Button>
            </div>
            {report && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="mr-1.5 h-4 w-4" /> CSV
                </Button>
                <Button size="sm" onClick={() => printContent("Financial Overview", printRef.current)}>
                  <Printer className="mr-1.5 h-4 w-4" /> Print
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading financial data...</span>
        </div>
      )}

      {/* Report Content */}
      {report && !isLoading && (
        <div ref={printRef}>
          {/* Header */}
          <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1a365d", paddingBottom: 12, marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, color: "#1a365d", margin: 0, marginBottom: 4 }}>Edwardian Academy</h1>
              <p className="subtitle" style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Financial Overview Report</p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: "4px 0 0 0" }}>
                {startDate || endDate ? `Period: ${startDate || "Start"} to ${endDate || "Now"}` : "All Time"} | Generated: {fmtDate(new Date())}
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Revenue</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(report.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Academy Share</div>
                <div className="text-xl font-bold text-blue-700">{fmt(report.academyShare)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Teacher Payments</div>
                <div className="text-xl font-bold text-purple-700">{fmt(report.teacherPayments)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Expenses</div>
                <div className="text-xl font-bold text-red-700">{fmt(report.totalExpenses)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Class */}
          {report.revenueByClass && report.revenueByClass.length > 0 && (
            <div className="section mb-6">
              <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
                <BookOpen className="h-5 w-5" /> Revenue by Class
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800">
                        <TableHead className="text-white">Class</TableHead>
                        <TableHead className="text-white text-center">Students</TableHead>
                        <TableHead className="text-white text-right">Fee Expected</TableHead>
                        <TableHead className="text-white text-right">Collected</TableHead>
                        <TableHead className="text-white text-right">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.revenueByClass.map((c: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold">{c.className}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{c.studentCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{fmt(c.totalExpected)}</TableCell>
                          <TableCell className="text-right text-emerald-700 font-medium">{fmt(c.totalCollected)}</TableCell>
                          <TableCell className="text-right text-red-700">{fmt(c.totalOutstanding)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Transactions */}
          {report.recentTransactions && report.recentTransactions.length > 0 && (
            <div className="section">
              <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
                <Receipt className="h-5 w-5" /> Recent Transactions
              </h2>
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[350px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-800">
                          <TableHead className="text-white">Date</TableHead>
                          <TableHead className="text-white">Student</TableHead>
                          <TableHead className="text-white">Class</TableHead>
                          <TableHead className="text-white text-right">Amount</TableHead>
                          <TableHead className="text-white">Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.recentTransactions.map((t: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{fmtShort(t.date)}</TableCell>
                            <TableCell className="font-medium">{t.studentName}</TableCell>
                            <TableCell className="text-muted-foreground">{t.className}</TableCell>
                            <TableCell className="text-right font-bold text-emerald-700">{fmt(t.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{t.method || "CASH"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SINGLE-SUBJECT ENROLLMENT REPORT
// Students who enrolled in exactly ONE subject (e.g. Ali → Botany only).
// Shows the same level of detail as the single-student view — fee paid,
// remaining balance, payment history, teacher, class — but aggregated
// across every such enrollment for easy reconciliation.
// ═══════════════════════════════════════════════════════
// Collapses a teacher's raw timetable dump into a clean list of distinct
// teaching windows. A teacher who teaches the same subject Mon–Sat at 10 AM
// across three different classes would otherwise produce 18 rows of visual
// noise; this helper collapses that to a single "Mon–Sat · 10:00 AM–11:00 AM"
// entry so the owner actually sees the schedule at a glance.
//
// Returns: [{ startTime, endTime, days: string[], daysLabel, rooms: string[] }]
// ordered by start time.
const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};
function toMinuteKey(t: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || "").trim());
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + mins;
}
function compactSlots(
  slots: Array<{ day?: string; startTime?: string; endTime?: string; room?: string }>,
): Array<{
  startTime: string;
  endTime: string;
  days: string[];
  daysLabel: string;
  rooms: string[];
}> {
  const groups = new Map<
    string,
    { startTime: string; endTime: string; days: Set<string>; rooms: Set<string> }
  >();
  (slots || []).forEach((s) => {
    if (!s?.startTime || !s?.endTime) return;
    const key = `${s.startTime}|${s.endTime}`;
    if (!groups.has(key)) {
      groups.set(key, {
        startTime: s.startTime,
        endTime: s.endTime,
        days: new Set<string>(),
        rooms: new Set<string>(),
      });
    }
    const g = groups.get(key)!;
    if (s.day) g.days.add(s.day);
    if (s.room) g.rooms.add(s.room);
  });

  const sortedDays = (set: Set<string>) =>
    Array.from(set).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  const labelOf = (days: string[]) => {
    if (!days.length) return "";
    const idxs = days.map((d) => DAY_ORDER.indexOf(d)).sort((a, b) => a - b);
    // Detect a contiguous run (Mon-Fri, Mon-Sat, Tue-Thu, etc.)
    const contiguous = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
    if (contiguous && idxs.length >= 3) {
      return `${DAY_SHORT[DAY_ORDER[idxs[0]]]}–${DAY_SHORT[DAY_ORDER[idxs[idxs.length - 1]]]}`;
    }
    return idxs.map((i) => DAY_SHORT[DAY_ORDER[i]]).join(", ");
  };

  return Array.from(groups.values())
    .map((g) => {
      const days = sortedDays(g.days);
      return {
        startTime: g.startTime,
        endTime: g.endTime,
        days,
        daysLabel: labelOf(days),
        rooms: Array.from(g.rooms),
      };
    })
    .sort((a, b) => toMinuteKey(a.startTime) - toMinuteKey(b.startTime));
}

function SingleSubjectReport() {
  const printRef = useRef<HTMLDivElement>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all"); // teacher _id
  const [timeFilter, setTimeFilter] = useState<string>("all"); // startTime string
  const [searchTerm, setSearchTerm] = useState<string>("");

  // We always fetch the full (un-status-filtered) dataset and then narrow on
  // the client — teacher/time filters live only on the client so the user
  // can flip between them instantly without a round-trip.
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: [
      "single-subject-report",
      subjectFilter === "all" ? "" : subjectFilter,
    ],
    queryFn: () =>
      reportApi.getSingleSubjectReport({
        subject: subjectFilter !== "all" ? subjectFilter : undefined,
      }),
  });

  const report = reportData?.data;
  const rows: any[] = report?.rows || [];
  const subjectBreakdown: any[] = report?.subjects || [];
  const summary = report?.summary || {
    totalStudents: 0,
    totalExpectedFee: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    paidCount: 0,
    partialCount: 0,
    pendingCount: 0,
    uniqueSubjects: 0,
  };

  // Build Teacher and Time Slot options from the current dataset so they're
  // always in sync with what's actually showing. Each row already carries
  // `subject.teacherId/teacherName` and a `timeSlots` array.
  const teacherOptions = (() => {
    const map = new Map<string, string>(); // teacherId -> teacherName
    rows.forEach((r) => {
      const id = r?.subject?.teacherId ? String(r.subject.teacherId) : "";
      const name = r?.subject?.teacherName || "";
      if (id && name && !map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  })();

  const timeOptions = (() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      (r?.timeSlots || []).forEach((s: any) => {
        if (s?.startTime) set.add(String(s.startTime));
      });
    });
    // Chronological sort — convert "HH:MM AM/PM" to minutes.
    const toMin = (t: string) => {
      const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) return 0;
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const p = m[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };
    return Array.from(set).sort((a, b) => toMin(a) - toMin(b));
  })();

  // Compose all client-side filters (search + teacher + time).
  // Note: `filteredRows` below is the exact set that renders in the UI, so the
  // real-time "Filtered Totals" footer card (further down) is computed from it.
  const filteredRows = rows.filter((r) => {
    if (teacherFilter !== "all") {
      const tid = r?.subject?.teacherId ? String(r.subject.teacherId) : "";
      if (tid !== teacherFilter) return false;
    }
    if (timeFilter !== "all") {
      const matched = (r?.timeSlots || []).some(
        (s: any) => String(s?.startTime || "") === timeFilter,
      );
      if (!matched) return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const hit =
        (r.studentName || "").toLowerCase().includes(q) ||
        (r.studentId || "").toLowerCase().includes(q) ||
        (r.className || "").toLowerCase().includes(q) ||
        (r.subject?.name || "").toLowerCase().includes(q) ||
        (r.subject?.teacherName || "").toLowerCase().includes(q) ||
        (r.parentCell || "").toLowerCase().includes(q) ||
        (r.studentCell || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  // Real-time totals for the currently-visible rows. These power the
  // "Filtered Totals" footer card so every change to teacher / subject / time /
  // search instantly updates the displayed sums.
  const filteredTotals = filteredRows.reduce(
    (acc, r: any) => {
      const expected = Number(r?.totalFee) || Number(r?.subject?.effectiveFee) || 0;
      const paid = Number(r?.paidAmount) || 0;
      const outstanding = Math.max(0, expected - paid);
      acc.enrollments += 1;
      acc.expected += expected;
      acc.collected += paid;
      acc.outstanding += outstanding;
      acc.discount += Number(r?.subject?.discount) || 0;
      const status = String(r?.feeStatus || "").toLowerCase();
      if (status === "paid") acc.paid += 1;
      else if (status === "partial") acc.partial += 1;
      else acc.pending += 1;
      if (r?.subject?.name) acc.subjectSet.add(String(r.subject.name));
      if (r?.subject?.teacherId) acc.teacherSet.add(String(r.subject.teacherId));
      return acc;
    },
    {
      enrollments: 0,
      expected: 0,
      collected: 0,
      outstanding: 0,
      discount: 0,
      paid: 0,
      partial: 0,
      pending: 0,
      subjectSet: new Set<string>(),
      teacherSet: new Set<string>(),
    },
  );

  // Human-friendly chip labels for whichever filters are active — we show
  // these on the footer card so the owner always sees *why* these totals
  // are what they are.
  const activeFilterChips: string[] = [];
  if (subjectFilter !== "all") activeFilterChips.push(`Subject: ${subjectFilter}`);
  if (teacherFilter !== "all") {
    const t = teacherOptions.find((x: any) => x.id === teacherFilter);
    activeFilterChips.push(`Teacher: ${t?.name || "Selected"}`);
  }
  if (timeFilter !== "all") activeFilterChips.push(`Time: ${timeFilter}`);
  if (searchTerm) activeFilterChips.push(`Search: "${searchTerm}"`);

  const handleExportCSV = () => {
    if (!filteredRows.length) {
      toast.error("No rows to export");
      return;
    }
    const headers = [
      "Student ID",
      "Student Name",
      "Father Name",
      "CNIC",
      "Parent Phone",
      "Student Phone",
      "Email",
      "Address",
      "Class",
      "Group",
      "Session",
      "Subject",
      "Teacher",
      "Teacher Phone",
      "Time Slots",
      "Subject Fee",
      "Discount",
      "Effective Fee",
      "Total Fee",
      "Paid",
      "Balance",
      "Fee Status",
      "Admission Date",
      "Enrolled Days",
      "Last Payment Date",
      "Last Payment Amount",
      "Payment Count",
    ];
    const csvRows = filteredRows.map((r: any) => [
      r.studentId || "",
      r.studentName || "",
      r.fatherName || "",
      r.cnic || "",
      r.parentCell || "",
      r.studentCell || "",
      r.email || "",
      r.address || "",
      r.className || "",
      r.classGroup || r.group || "",
      r.session?.sessionName || "",
      r.subject?.name || "",
      r.subject?.teacherName || "",
      r.subject?.teacherPhone || "",
      (r.timeSlots || [])
        .map((s: any) => `${s.day} ${s.startTime}-${s.endTime}${s.room ? ` @ ${s.room}` : ""}`)
        .join(" | "),
      String(r.subject?.fee || 0),
      String(r.subject?.discount || 0),
      String(r.subject?.effectiveFee || 0),
      String(r.totalFee || 0),
      String(r.paidAmount || 0),
      String(r.balance || 0),
      (r.feeStatus || "pending").toUpperCase(),
      r.admissionDate ? new Date(r.admissionDate).toLocaleDateString("en-GB") : "",
      r.enrolledDays != null ? String(r.enrolledDays) : "",
      r.lastPayment?.createdAt
        ? new Date(r.lastPayment.createdAt).toLocaleDateString("en-GB")
        : "",
      r.lastPayment ? String(r.lastPayment.amount || 0) : "",
      String(r.paymentCount || 0),
    ]);
    downloadCSV("single-subject-enrollments", headers, csvRows);
    toast.success("CSV exported successfully!");
  };

  const feeStatusBadge = (status: string) => {
    const s = (status || "pending").toLowerCase();
    if (s === "paid")
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
          FULLY PAID
        </Badge>
      );
    if (s === "partial")
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
          PARTIAL
        </Badge>
      );
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-300">
        PENDING
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters & actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-fuchsia-600" />
            Single-Subject Enrollments
          </CardTitle>
          <CardDescription>
            Every student who enrolled for exactly one subject — with their complete fee status, teacher assignment, and payment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Search</Label>
              <Input
                placeholder="Student, ID, subject, teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Filter by Subject</Label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjectBreakdown.map((s: any) => (
                    <SelectItem key={s.subject} value={s.subject}>
                      {s.subject} ({s.studentCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Filter by Teacher</Label>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teacherOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Filter by Time Slot</Label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time slots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time Slots</SelectItem>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="flex-1">
                <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex-1">
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  printContent("Single-Subject Enrollments Report", printRef.current)
                }
                className="flex-1"
              >
                <Printer className="mr-1.5 h-4 w-4" /> Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading single-subject enrollments...</span>
        </div>
      )}

      {!isLoading && report && (
        <div ref={printRef} className="space-y-6">
          {/* Print header */}
          <div
            className="header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "3px solid #1a365d",
              paddingBottom: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <h1 style={{ fontSize: 24, color: "#1a365d", margin: 0, marginBottom: 4 }}>
                Edwardian Academy
              </h1>
              <p className="subtitle" style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                Single-Subject Enrollment Report
              </p>
              <p style={{ color: "#9ca3af", fontSize: 11, margin: "4px 0 0 0" }}>
                {filteredRows.length} of {summary.totalStudents} enrollments · Generated {fmtDate(new Date())}
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-fuchsia-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Enrollments</div>
                <div className="text-2xl font-bold text-fuchsia-700">{summary.totalStudents}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {summary.uniqueSubjects} unique subject{summary.uniqueSubjects === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Expected Fees</div>
                <div className="text-xl font-bold text-blue-700">{fmt(summary.totalExpectedFee)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Collected</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(summary.totalCollected)}</div>
                <div className="text-[11px] text-emerald-600 mt-1">
                  {summary.paidCount} fully paid
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Outstanding</div>
                <div className="text-xl font-bold text-red-700">{fmt(summary.totalOutstanding)}</div>
                <div className="text-[11px] text-red-600 mt-1">
                  {summary.partialCount} partial · {summary.pendingCount} pending
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject breakdown */}
          {subjectBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-600" /> Subject Breakdown
                </CardTitle>
                <CardDescription>
                  Totals per subject for students who enrolled just for that subject.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjectBreakdown.map((s: any) => (
                    <div
                      key={s.subject}
                      className="border rounded-lg p-3 bg-gradient-to-br from-slate-50 to-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800">{s.subject}</span>
                        <Badge variant="outline" className="font-mono">
                          {s.studentCount} student{s.studentCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Expected</div>
                          <div className="font-bold text-blue-700">{fmt(s.expectedFee)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Collected</div>
                          <div className="font-bold text-emerald-700">{fmt(s.collected)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Outstanding</div>
                          <div className="font-bold text-red-700">{fmt(s.outstanding)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Status Mix</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {s.paidCount > 0 && (
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title={`${s.paidCount} paid`} />
                            )}
                            {s.partialCount > 0 && (
                              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title={`${s.partialCount} partial`} />
                            )}
                            {s.pendingCount > 0 && (
                              <span className="inline-block w-2 h-2 rounded-full bg-red-500" title={`${s.pendingCount} pending`} />
                            )}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {s.paidCount}/{s.partialCount}/{s.pendingCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main enrollments table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" /> Enrollments ({filteredRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredRows.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No single-subject enrollments match your filters.</p>
                  <p className="text-xs mt-1">
                    Once a student is admitted with just one subject, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100">
                        <TableHead className="font-semibold">Student</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="font-semibold">Class / Session</TableHead>
                        <TableHead className="font-semibold">Subject</TableHead>
                        <TableHead className="font-semibold">Teacher</TableHead>
                        <TableHead className="font-semibold">Time Slot</TableHead>
                        <TableHead className="text-right font-semibold">Fee</TableHead>
                        <TableHead className="text-right font-semibold">Paid</TableHead>
                        <TableHead className="text-right font-semibold">Balance</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Last Payment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((r: any) => {
                        const lastPayment = r.feeHistory?.[0];
                        const isFullyPaid = r.feeStatus === "paid";
                        return (
                          <TableRow key={r._id} className="hover:bg-slate-50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                  {resolveStudentPhotoSrc(r.photo, r.imageUrl) ? (
                                    <img
                                      src={resolveStudentPhotoSrc(r.photo, r.imageUrl) || ""}
                                      alt={r.studentName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
                                      {(r.studentName || "S").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800 leading-tight">
                                    {r.studentName}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    {r.studentId}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
                                <span className="flex items-center gap-1 text-slate-700">
                                  <Phone className="h-3 w-3 text-slate-500" />
                                  {r.parentCell || "—"}
                                </span>
                                {r.studentCell && r.studentCell !== "-" && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {r.studentCell}
                                  </span>
                                )}
                                {r.email && (
                                  <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[180px]">
                                    <Mail className="h-3 w-3" />
                                    {r.email}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{r.className}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {r.classGroup || r.group || "—"}
                              </div>
                              {r.session?.sessionName && (
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {r.session.sessionName}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200">
                                {r.subject?.name}
                              </Badge>
                              {r.subject?.discount > 0 && (
                                <div className="text-[10px] text-emerald-600 mt-1">
                                  Discount: {fmt(r.subject.discount)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{r.subject?.teacherName}</div>
                              {r.subject?.teacherPhone && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {r.subject.teacherPhone}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {(() => {
                                const compact = compactSlots(r.timeSlots || []);
                                if (compact.length === 0) {
                                  return (
                                    <span className="text-muted-foreground italic">
                                      Not scheduled
                                    </span>
                                  );
                                }
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    {compact.map((s, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 text-slate-700 whitespace-nowrap"
                                      >
                                        <Clock className="h-3 w-3 text-slate-500" />
                                        <span className="font-medium">
                                          {s.daysLabel}
                                        </span>{" "}
                                        {s.startTime}–{s.endTime}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {fmt(r.totalFee)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-emerald-700">
                              {fmt(r.paidAmount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-red-700">
                              {fmt(r.balance)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {feeStatusBadge(r.feeStatus)}
                                {isFullyPaid && (
                                  <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {r.studentName.split(" ")[0]} paid in full
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {lastPayment ? (
                                <div>
                                  <div className="font-semibold text-emerald-700">
                                    {fmt(lastPayment.amount)}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {fmtShort(lastPayment.createdAt)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Filtered Totals — sums update instantly as the user
              toggles subject / teacher / time / search filters. Rendered BEFORE
              the Detailed Enrollment Summaries so the owner sees the bottom
              line the moment they apply a filter, without scrolling through
              all the per-student cards first. */}
          {filteredRows.length > 0 && (
            <Card className="border-2 border-primary/40 bg-gradient-to-br from-fuchsia-50/60 to-white shadow-md print:shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Filtered Totals
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <span>
                    Live summary for the {filteredTotals.enrollments} enrollment
                    {filteredTotals.enrollments === 1 ? "" : "s"} currently in view.
                  </span>
                  {activeFilterChips.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {activeFilterChips.map((chip, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {chip}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal border-dashed"
                    >
                      No filters applied — showing all
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Headline Total Fees row — the big, prominent number the
                    owner explicitly asked for. Expected + collected live side
                    by side so the split is obvious at a glance. */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl border-2 border-blue-200 bg-white p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total Fees (Sum)
                    </div>
                    <div className="text-3xl font-bold text-blue-700">
                      {fmt(filteredTotals.expected)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Across {filteredTotals.enrollments} enrollment
                      {filteredTotals.enrollments === 1 ? "" : "s"}
                      {filteredTotals.discount > 0
                        ? ` · ${fmt(filteredTotals.discount)} discount applied`
                        : ""}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-emerald-200 bg-white p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total Collected (Sum)
                    </div>
                    <div className="text-3xl font-bold text-emerald-700">
                      {fmt(filteredTotals.collected)}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {filteredTotals.paid} fully paid ·{" "}
                      {filteredTotals.expected > 0
                        ? `${Math.round(
                            (filteredTotals.collected /
                              filteredTotals.expected) *
                              100,
                          )}% collection rate`
                        : "no fees expected"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Enrollments
                    </div>
                    <div className="text-2xl font-bold text-fuchsia-700">
                      {filteredTotals.enrollments}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {filteredTotals.subjectSet.size} subject
                      {filteredTotals.subjectSet.size === 1 ? "" : "s"} ·{" "}
                      {filteredTotals.teacherSet.size} teacher
                      {filteredTotals.teacherSet.size === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Outstanding
                    </div>
                    <div className="text-xl font-bold text-red-700">
                      {fmt(filteredTotals.outstanding)}
                    </div>
                    <div className="text-[10px] text-red-600 mt-1">
                      {filteredTotals.partial} partial ·{" "}
                      {filteredTotals.pending} pending
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Average Fee
                    </div>
                    <div className="text-xl font-bold text-slate-800">
                      {filteredTotals.enrollments > 0
                        ? fmt(
                            filteredTotals.expected /
                              filteredTotals.enrollments,
                          )
                        : fmt(0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Per student, this view
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Status Mix
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-bold text-emerald-700">
                        {filteredTotals.paid}
                      </span>
                      <span className="text-[10px] text-muted-foreground">paid</span>
                      <span className="text-sm font-bold text-amber-700 ml-1">
                        {filteredTotals.partial}
                      </span>
                      <span className="text-[10px] text-muted-foreground">partial</span>
                      <span className="text-sm font-bold text-red-700 ml-1">
                        {filteredTotals.pending}
                      </span>
                      <span className="text-[10px] text-muted-foreground">pending</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed cards — one per enrollment, mirrors Ali-style summary */}
          {filteredRows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-600" /> Detailed Enrollment Summaries
                </CardTitle>
                <CardDescription>
                  Expanded fee narrative for each student — matches the Ali-style "FULLY PAID / REMAINING" format.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredRows.map((r: any) => {
                    const firstName = (r.studentName || "").split(" ")[0] || r.studentName;
                    const isFullyPaid = r.feeStatus === "paid";
                    const isPartial = r.feeStatus === "partial";
                    const headline = isFullyPaid
                      ? `${firstName} has FULLY PAID their fee of ${fmt(r.totalFee)}`
                      : isPartial
                      ? `${firstName} has PARTIALLY PAID their fee`
                      : `${firstName} has a pending fee`;
                    const lastPayment = r.feeHistory?.[0];
                    return (
                      <div
                        key={`detail-${r._id}`}
                        className={`border rounded-xl p-4 ${
                          isFullyPaid
                            ? "border-emerald-300 bg-emerald-50/40"
                            : isPartial
                            ? "border-amber-300 bg-amber-50/40"
                            : "border-red-300 bg-red-50/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-200 shadow-sm shrink-0">
                            {resolveStudentPhotoSrc(r.photo, r.imageUrl) ? (
                              <img
                                src={resolveStudentPhotoSrc(r.photo, r.imageUrl) || ""}
                                alt={r.studentName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-sky-500 text-white flex items-center justify-center font-bold text-base">
                                {(r.studentName || "S").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Headline status line */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {isFullyPaid ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : isPartial ? (
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-semibold text-slate-800">{headline}</span>
                              {feeStatusBadge(r.feeStatus)}
                            </div>

                            {/* Top meta line: subject · class · session · teacher */}
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {r.subject?.name}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {r.className} ({r.classGroup || r.group})
                              </span>
                              {r.session?.sessionName && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {r.session.sessionName}
                                  </span>
                                </>
                              )}
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                Teacher: {r.subject?.teacherName}
                                {r.subject?.teacherPhone ? ` (${r.subject.teacherPhone})` : ""}
                              </span>
                            </div>

                            {/* Student identity & contact grid */}
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-700 bg-white/60 border border-slate-200/70 rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Hash className="h-3 w-3 text-slate-500" />
                                <span className="text-muted-foreground">Student ID:</span>
                                <span className="font-mono font-semibold">{r.studentId || "—"}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-slate-500" />
                                <span className="text-muted-foreground">Father:</span>
                                <span className="font-medium">{r.fatherName || "—"}</span>
                              </div>
                              {r.cnic && (
                                <div className="flex items-center gap-1.5">
                                  <IdCard className="h-3 w-3 text-slate-500" />
                                  <span className="text-muted-foreground">CNIC:</span>
                                  <span className="font-mono">{r.cnic}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-slate-500" />
                                <span className="text-muted-foreground">Parent:</span>
                                <span className="font-medium">{r.parentCell || "—"}</span>
                              </div>
                              {r.studentCell && r.studentCell !== "-" && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-slate-500" />
                                  <span className="text-muted-foreground">Student:</span>
                                  <span className="font-medium">{r.studentCell}</span>
                                </div>
                              )}
                              {r.email && (
                                <div className="flex items-center gap-1.5 sm:col-span-2">
                                  <Mail className="h-3 w-3 text-slate-500" />
                                  <span className="text-muted-foreground">Email:</span>
                                  <span className="font-medium truncate">{r.email}</span>
                                </div>
                              )}
                              {r.address && (
                                <div className="flex items-start gap-1.5 sm:col-span-2">
                                  <MapPin className="h-3 w-3 text-slate-500 mt-0.5" />
                                  <span className="text-muted-foreground">Address:</span>
                                  <span className="font-medium">{r.address}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3 text-slate-500" />
                                <span className="text-muted-foreground">Admitted:</span>
                                <span className="font-medium">
                                  {r.admissionDate ? fmtShort(r.admissionDate) : "—"}
                                  {r.enrolledDays != null ? ` · ${r.enrolledDays}d ago` : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Info className="h-3 w-3 text-slate-500" />
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-medium capitalize">{r.status || "active"}</span>
                              </div>
                            </div>

                            {/* Time slots block */}
                            <div className="mt-3 text-[11px]">
                              <div className="text-muted-foreground mb-1 flex items-center gap-1 font-semibold uppercase tracking-wide">
                                <Clock className="h-3 w-3" /> Scheduled Time Slots
                              </div>
                              {(() => {
                                const compact = compactSlots(r.timeSlots || []);
                                if (compact.length === 0) {
                                  return (
                                    <div className="italic text-muted-foreground">
                                      No timetable slot mapped yet — add one from the Timetable tab.
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-wrap gap-1.5">
                                    {compact.map((s, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-800"
                                      >
                                        <span className="font-semibold">
                                          {s.daysLabel}
                                        </span>
                                        <span>
                                          {s.startTime}–{s.endTime}
                                        </span>
                                        {s.rooms.length === 1 && (
                                          <span className="text-muted-foreground text-[10px]">
                                            · {s.rooms[0]}
                                          </span>
                                        )}
                                        {s.rooms.length > 1 && (
                                          <span className="text-muted-foreground text-[10px]">
                                            · {s.rooms.length} rooms
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Fee narrative (Ali-style) */}
                            {lastPayment && (
                              <div className="mt-3 text-xs text-slate-700 bg-white/70 border border-slate-200/70 rounded-lg p-2">
                                <span className="text-muted-foreground">
                                  {fmtShort(lastPayment.createdAt)} ·
                                </span>{" "}
                                Fee collected from {firstName}:{" "}
                                <span className="font-semibold text-emerald-700">
                                  {fmt(lastPayment.amount)}
                                </span>{" "}
                                <span className="text-muted-foreground">| Remaining:</span>{" "}
                                <span
                                  className={`font-semibold ${r.balance > 0 ? "text-red-700" : "text-emerald-700"}`}
                                >
                                  {fmt(r.balance)}
                                </span>
                                {lastPayment.paymentMethod && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {lastPayment.paymentMethod}
                                  </span>
                                )}
                                {lastPayment.receiptNumber && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · #{lastPayment.receiptNumber}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Fee breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                              <div>
                                <div className="text-muted-foreground">Subject Fee</div>
                                <div className="font-semibold">{fmt(r.subject?.fee || 0)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Discount</div>
                                <div className="font-semibold text-amber-700">
                                  {fmt((r.subject?.discount || 0) + (r.discountAmount || 0))}
                                  {r.subject?.discountReason && (
                                    <div
                                      className="text-[10px] text-muted-foreground italic truncate"
                                      title={r.subject.discountReason}
                                    >
                                      {r.subject.discountReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Total Fee</div>
                                <div className="font-semibold">{fmt(r.totalFee)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Paid</div>
                                <div className="font-semibold text-emerald-700">
                                  {fmt(r.paidAmount)}
                                </div>
                              </div>
                              <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-200/60">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Remaining Balance</span>
                                  <span
                                    className={`font-bold ${r.balance > 0 ? "text-red-700" : "text-emerald-700"}`}
                                  >
                                    {fmt(r.balance)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Payment history */}
                            {r.feeHistory && r.feeHistory.length > 0 ? (
                              <details className="mt-3 text-xs" open={r.paymentCount <= 3}>
                                <summary className="cursor-pointer text-slate-600 hover:text-slate-900 font-semibold">
                                  Payment History ({r.paymentCount})
                                </summary>
                                <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-200">
                                  {r.feeHistory.map((p: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center text-[11px] py-0.5"
                                    >
                                      <span className="text-muted-foreground truncate">
                                        {fmtShort(p.createdAt)} · {p.paymentMethod || "CASH"}
                                        {p.receiptNumber ? ` · #${p.receiptNumber}` : ""}
                                        {p.month ? ` · ${p.month}` : ""}
                                        {p.collectedBy ? ` · by ${p.collectedBy}` : ""}
                                      </span>
                                      <span className="font-semibold text-emerald-700 shrink-0 ml-2">
                                        {fmt(p.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : (
                              <div className="mt-3 text-[11px] italic text-muted-foreground">
                                No payments recorded yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ═══════════════════════════════════════════════════════
export default function Reports() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "class";
  const initialStudentId = searchParams.get("studentId") || "";
  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Reports Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate comprehensive reports for classes, teachers, students, and finances
            </p>
          </div>
        </div>

        {/* Tabs for different report types */}
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
            <TabsTrigger value="class" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Class Report</span>
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Teacher Report</span>
            </TabsTrigger>
            <TabsTrigger value="student" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Student Report</span>
            </TabsTrigger>
            <TabsTrigger value="single-subject" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Single Subject</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Academy Summary</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="class">
            <ClassReport />
          </TabsContent>

          <TabsContent value="teacher">
            <TeacherReport />
          </TabsContent>

          <TabsContent value="student">
            <StudentReport initialStudentId={initialStudentId} />
          </TabsContent>

          <TabsContent value="single-subject">
            <SingleSubjectReport />
          </TabsContent>

          <TabsContent value="summary">
            <AcademySummary />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
