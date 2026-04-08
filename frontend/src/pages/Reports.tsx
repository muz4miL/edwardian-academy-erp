/**
 * Reports Page — Comprehensive Financial & Academic Reports
 * 
 * Features:
 * - Class Reports: Full student roster with fees, teacher assignments
 * - Teacher Reports: Earnings by compensation mode, per-student details
 * - Academy Summary: Overall stats and financial health
 * - Downloadable as PDF and Excel
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  BarChart3, Download, Printer, Loader2, DollarSign, TrendingUp, TrendingDown,
  FileSpreadsheet, Receipt, Users, GraduationCap, ArrowLeft, RefreshCcw, Package,
  ChevronDown, ChevronRight, BookOpen, Wallet, PiggyBank, Building2, Calendar,
  FileText, Phone, MapPin, ClipboardList, CheckCircle2, AlertCircle, Clock,
  Percent, User, Hash, CalendarDays, Info,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { reportApi } from "@/lib/api";

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
            <div className="flex-1 min-w-[250px]">
              <Label className="text-xs text-muted-foreground mb-2 block">Select Teacher</Label>
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={teachersLoading ? "Loading teachers..." : "Choose a teacher..."} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t._id} value={t._id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.fullName}</span>
                        <Badge variant="secondary" className="text-xs">{t.compensationMode}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Classes Taught */}
          <div className="section mb-6">
            <h2 className="section-title flex items-center gap-2 text-lg font-bold text-slate-800 border-b-2 border-slate-800 pb-2 mb-4">
              <BookOpen className="h-5 w-5" /> Classes & Earnings Breakdown
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800">
                      <TableHead className="text-white">Class</TableHead>
                      <TableHead className="text-white">Subject</TableHead>
                      <TableHead className="text-white text-center">Students</TableHead>
                      <TableHead className="text-white">Mode</TableHead>
                      <TableHead className="text-white text-right">Earned</TableHead>
                      <TableHead className="text-white text-right">Paid</TableHead>
                      <TableHead className="text-white text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(report.classes || []).map((c: any, i: number) => (
                      <TableRow key={i}>
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
                        <TableCell className="text-right font-medium">{fmt(c.totalEarned)}</TableCell>
                        <TableCell className="text-right text-emerald-700">{fmt(c.totalPaid)}</TableCell>
                        <TableCell className="text-right text-amber-700">{fmt(c.totalPending)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals */}
                    <TableRow className="bg-blue-100 font-bold">
                      <TableCell colSpan={2} className="text-right">TOTAL</TableCell>
                      <TableCell className="text-center">{report.totalStudents}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{fmt(report.totalEarned)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{fmt(report.totalPaid)}</TableCell>
                      <TableCell className="text-right text-amber-700">{fmt(report.totalPending)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
                            <TableCell className="text-right">{fmt(s.feePaid)}</TableCell>
                            <TableCell className="text-right text-emerald-700 font-semibold">{fmt(s.teacherEarning)}</TableCell>
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
// MAIN REPORTS PAGE
// ═══════════════════════════════════════════════════════
export default function Reports() {
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
              Generate comprehensive reports for classes, teachers, and finances
            </p>
          </div>
        </div>

        {/* Tabs for different report types */}
        <Tabs defaultValue="class" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="class" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Class Report</span>
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Teacher Report</span>
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

          <TabsContent value="summary">
            <AcademySummary />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
