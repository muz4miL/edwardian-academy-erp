/**
 * Leads & Inquiries - Premium CRM Module
 * 
 * Enterprise-grade sales pipeline for tracking potential students.
 * Status Flow: New → FollowUp → Converted (or Dead)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Phone,
    UserPlus,
    Users,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Loader2,
    Search,
    PhoneCall,
    Trash2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Plus,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Types
interface Lead {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    source: string;
    interest: string;
    status: "New" | "FollowUp" | "Converted" | "Dead";
    remarks: string;
    createdAt: string;
    daysSinceInquiry?: number;
    createdBy?: { fullName: string };
}

interface LeadCounts {
    total: number;
    new: number;
    followUp: number;
    converted: number;
    dead: number;
}

// Generate avatar color based on name
const getAvatarColor = (name: string) => {
    const colors = [
        "bg-rose-100 text-rose-700",
        "bg-sky-100 text-sky-700",
        "bg-amber-100 text-amber-700",
        "bg-emerald-100 text-emerald-700",
        "bg-violet-100 text-violet-700",
        "bg-fuchsia-100 text-fuchsia-700",
        "bg-cyan-100 text-cyan-700",
        "bg-orange-100 text-orange-700",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

// Get initials from name
const getInitials = (name: string) => {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

// Status pill styles (soft, modern)
const getStatusPill = (status: string) => {
    switch (status) {
        case "New":
            return (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    New
                </span>
            );
        case "FollowUp":
            return (
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    Follow Up
                </span>
            );
        case "Converted":
            return (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Converted
                </span>
            );
        case "Dead":
            return (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 rounded-full px-3 py-1 text-xs font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    Dead
                </span>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

// Source pill styles
const getSourcePill = (source: string) => {
    const styles: Record<string, string> = {
        "Walk-in": "bg-violet-50 text-violet-700",
        "Phone": "bg-cyan-50 text-cyan-700",
        "Referral": "bg-amber-50 text-amber-700",
        "Social Media": "bg-pink-50 text-pink-700",
        "Website": "bg-indigo-50 text-indigo-700",
        "Other": "bg-gray-100 text-gray-600",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[source] || styles["Other"]}`}>
            {source}
        </span>
    );
};

export default function Leads() {
    const queryClient = useQueryClient();

    // Form state for quick add
    const [newLead, setNewLead] = useState({
        name: "",
        phone: "",
        interest: "",
        source: "Walk-in",
    });

    // UI state
    const [isFormExpanded, setIsFormExpanded] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Edit modal state
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [editRemarks, setEditRemarks] = useState("");

    // Fetch leads
    const { data, isLoading, refetch } = useQuery<{
        success: boolean;
        data: Lead[];
        counts: LeadCounts;
    }>({
        queryKey: ["leads", statusFilter, searchQuery],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (searchQuery) params.append("search", searchQuery);

            const res = await fetch(`${API_BASE_URL}/api/leads?${params}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch leads");
            return res.json();
        },
        staleTime: 1000 * 30,
    });

    const leads = data?.data || [];
    const counts = data?.counts || { total: 0, new: 0, followUp: 0, converted: 0, dead: 0 };

    // Create lead mutation
    const createMutation = useMutation({
        mutationFn: async (leadData: typeof newLead) => {
            const res = await fetch(`${API_BASE_URL}/api/leads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(leadData),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create lead");
            }
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success(data.message);
            if (data.warning) toast.warning(data.warning);
            setNewLead({ name: "", phone: "", interest: "", source: "Walk-in" });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to add lead");
        },
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await fetch(`${API_BASE_URL}/api/leads/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success(data.message);
        },
        onError: () => {
            toast.error("Failed to update status");
        },
    });

    // Update remarks mutation
    const updateRemarksMutation = useMutation({
        mutationFn: async ({ id, remarks }: { id: string; remarks: string }) => {
            const res = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ remarks }),
            });
            if (!res.ok) throw new Error("Failed to update remarks");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success("Remarks updated");
            setEditingLead(null);
        },
        onError: () => {
            toast.error("Failed to update remarks");
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`${API_BASE_URL}/api/leads/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to delete lead");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success(data.message);
        },
        onError: () => {
            toast.error("Failed to delete lead");
        },
    });

    // Handle quick add submit
    const handleQuickAdd = () => {
        if (!newLead.name || !newLead.phone || !newLead.interest) {
            toast.error("Please fill all required fields");
            return;
        }
        createMutation.mutate(newLead);
    };

    return (
        <DashboardLayout title="Leads & Inquiries">
            {/* Clean Modern Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Leads & Inquiries
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Track and manage your sales pipeline
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="text-gray-600 hover:text-gray-900"
                    >

                        Refresh
                    </Button>
                </div>
            </div>

            {/* Minimalist Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {/* Total Leads */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Total Leads</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* New */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-amber-600">{counts.new}</p>
                            <p className="text-sm text-gray-500 mt-0.5">New</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>
                </div>

                {/* Follow Up */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-blue-600">{counts.followUp}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Follow Up</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <PhoneCall className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>
                </div>

                {/* Converted */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">{counts.converted}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Converted</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Dead */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-red-600">{counts.dead}</p>
                            <p className="text-sm text-gray-500 mt-0.5">Dead</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-red-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Glassmorphic Quick Add Card */}
            <div className="mb-6">
                <div
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.9) 100%)"
                    }}
                >
                    {/* Collapsible Header */}
                    <button
                        onClick={() => setIsFormExpanded(!isFormExpanded)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                <UserPlus className="h-4 w-4 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-gray-900">Quick Add Inquiry</h3>
                                <p className="text-xs text-gray-500">Log a walk-in or phone inquiry</p>
                            </div>
                        </div>
                        {isFormExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </button>

                    {/* Expandable Form */}
                    {isFormExpanded && (
                        <div className="px-6 pb-5 pt-2 border-t border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                                        Name <span className="text-red-400">*</span>
                                    </Label>
                                    <Input
                                        placeholder="Student/Parent Name"
                                        value={newLead.name}
                                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                                        className="h-10 bg-white border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                                        Phone <span className="text-red-400">*</span>
                                    </Label>
                                    <Input
                                        placeholder="03XX-XXXXXXX"
                                        value={newLead.phone}
                                        onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                                        className="h-10 bg-white border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                                        Interest <span className="text-red-400">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g., 11th Pre-Medical"
                                        value={newLead.interest}
                                        onChange={(e) => setNewLead({ ...newLead, interest: e.target.value })}
                                        className="h-10 bg-white border-gray-200 focus:border-indigo-300 focus:ring-indigo-200"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">
                                        Source
                                    </Label>
                                    <Select
                                        value={newLead.source}
                                        onValueChange={(value) => setNewLead({ ...newLead, source: value })}
                                    >
                                        <SelectTrigger className="h-10 bg-white border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                                            <SelectItem value="Phone">Phone</SelectItem>
                                            <SelectItem value="Referral">Referral</SelectItem>
                                            <SelectItem value="Social Media">Social Media</SelectItem>
                                            <SelectItem value="Website">Website</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="md:col-span-1">
                                    <Button
                                        onClick={handleQuickAdd}
                                        disabled={createMutation.isPending}
                                        className="w-full h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-sm"
                                    >
                                        {createMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-1.5" />
                                                Add Lead
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by name, phone, or interest..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-white border-gray-200 rounded-xl"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-11 bg-white border-gray-200 rounded-xl">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="FollowUp">Follow Up</SelectItem>
                        <SelectItem value="Converted">Converted</SelectItem>
                        <SelectItem value="Dead">Dead</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Premium Leads Table */}
            <Card className="border-gray-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">Loading leads...</p>
                            </div>
                        </div>
                    ) : leads.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <Phone className="h-7 w-7 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No leads found</h3>
                            <p className="text-sm text-gray-500">Add your first inquiry using the form above</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                                    <TableHead className="font-semibold text-gray-700 py-4">Lead</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Contact</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Interest</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Source</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                                    <TableHead className="font-semibold text-gray-700 text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leads.map((lead) => (
                                    <TableRow
                                        key={lead._id}
                                        className="hover:bg-gray-50/60 transition-colors border-b border-gray-100 last:border-0"
                                    >
                                        {/* Name with Avatar */}
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm ${getAvatarColor(lead.name)}`}>
                                                    {getInitials(lead.name)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{lead.name}</p>
                                                    {lead.remarks && (
                                                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{lead.remarks}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Phone */}
                                        <TableCell>
                                            <a
                                                href={`tel:${lead.phone}`}
                                                className="inline-flex items-center gap-1.5 text-gray-700 hover:text-indigo-600 transition-colors"
                                            >
                                                <Phone className="h-3.5 w-3.5" />
                                                <span className="text-sm">{lead.phone}</span>
                                            </a>
                                        </TableCell>

                                        {/* Interest */}
                                        <TableCell>
                                            <span className="text-sm text-gray-700">{lead.interest}</span>
                                        </TableCell>

                                        {/* Source */}
                                        <TableCell>{getSourcePill(lead.source)}</TableCell>

                                        {/* Status */}
                                        <TableCell>{getStatusPill(lead.status)}</TableCell>

                                        {/* Date */}
                                        <TableCell>
                                            <div className="text-sm text-gray-600">
                                                {new Date(lead.createdAt).toLocaleDateString("en-PK", {
                                                    day: "2-digit",
                                                    month: "short",
                                                })}
                                                {lead.daysSinceInquiry !== undefined && lead.daysSinceInquiry > 0 && (
                                                    <span className="text-xs text-gray-400 ml-1">
                                                        ({lead.daysSinceInquiry}d)
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="text-right pr-6">
                                            <div className="inline-flex items-center gap-1">
                                                {/* Call / Follow Up */}
                                                {(lead.status === "New" || lead.status === "FollowUp") && (
                                                    <button
                                                        onClick={() => updateStatusMutation.mutate({ id: lead._id, status: "FollowUp" })}
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Mark as Follow Up"
                                                    >
                                                        <PhoneCall className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {/* Convert */}
                                                {lead.status !== "Converted" && lead.status !== "Dead" && (
                                                    <button
                                                        onClick={() => updateStatusMutation.mutate({ id: lead._id, status: "Converted" })}
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="Mark as Converted"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {/* Notes */}
                                                <button
                                                    onClick={() => {
                                                        setEditingLead(lead);
                                                        setEditRemarks(lead.remarks || "");
                                                    }}
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                                                    title="Add Remarks"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Delete lead "${lead.name}"?`)) {
                                                            deleteMutation.mutate(lead._id);
                                                        }
                                                    }}
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete Lead"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Remarks Modal */}
            <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-indigo-600" />
                            </div>
                            Edit Remarks
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Add notes for: <span className="font-medium text-gray-700">{editingLead?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Textarea
                            placeholder="Enter remarks or follow-up notes..."
                            value={editRemarks}
                            onChange={(e) => setEditRemarks(e.target.value)}
                            rows={4}
                            className="resize-none border-gray-200 focus:border-indigo-300"
                        />
                        <Button
                            onClick={() => {
                                if (editingLead) {
                                    updateRemarksMutation.mutate({
                                        id: editingLead._id,
                                        remarks: editRemarks,
                                    });
                                }
                            }}
                            disabled={updateRemarksMutation.isPending}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                            {updateRemarksMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Save Remarks
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
