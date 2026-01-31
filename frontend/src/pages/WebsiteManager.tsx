/**
 * Website Manager (CMS)
 * OWNER-only page to manage public website content
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  Megaphone,
  Edit3,
  Trash2,
  Plus,
  Save,
  Eye,
  Phone,
  Mail,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Announcement {
  _id: string;
  text: string;
  active: boolean;
  priority: number;
}

interface WebsiteConfig {
  heroSection: {
    title: string;
    subtitle: string;
    tagline: string;
  };
  announcements: Announcement[];
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
}

export default function WebsiteManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form states
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroTagline, setHeroTagline] = useState("");
  const [admissionNotice, setAdmissionNotice] = useState("");
  const [admissionClosedMsg, setAdmissionClosedMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [facebook, setFacebook] = useState("");

  // Modal states
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [newAnnouncementText, setNewAnnouncementText] = useState("");
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);

  // Check if current user is OWNER
  if (user?.role !== "OWNER") {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Shield className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only OWNER can access Website Manager.
          </p>
          <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch config
  const { data: configData, isLoading } = useQuery({
    queryKey: ["website-config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/website/config`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
  });

  const config: WebsiteConfig | null = configData?.data || null;

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      setHeroTitle(config.heroSection?.title || "");
      setHeroSubtitle(config.heroSection?.subtitle || "");
      setHeroTagline(config.heroSection?.tagline || "");
      setAdmissionNotice(config.admissionStatus?.notice || "");
      setAdmissionClosedMsg(config.admissionStatus?.closedMessage || "");
      setPhone(config.contactInfo?.phone || "");
      setMobile(config.contactInfo?.mobile || "");
      setEmail(config.contactInfo?.email || "");
      setAddress(config.contactInfo?.address || "");
      setFacebook(config.contactInfo?.facebook || "");
    }
  }, [config]);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_BASE_URL}/website/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
      toast.success("Configuration saved!");
    },
    onError: () => {
      toast.error("Failed to save configuration");
    },
  });

  // Toggle admission status
  const toggleAdmissionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/website/admission-status`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to toggle admission status");
    },
  });

  // Add announcement mutation
  const addAnnouncementMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`${API_BASE_URL}/website/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to add");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
      toast.success("Announcement added!");
      setAnnouncementModalOpen(false);
      setNewAnnouncementText("");
    },
    onError: () => {
      toast.error("Failed to add announcement");
    },
  });

  // Update announcement mutation
  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`${API_BASE_URL}/website/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
      toast.success("Announcement updated!");
      setEditingAnnouncement(null);
    },
    onError: () => {
      toast.error("Failed to update announcement");
    },
  });

  // Delete announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/website/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-config"] });
      toast.success("Announcement deleted!");
    },
    onError: () => {
      toast.error("Failed to delete announcement");
    },
  });

  const handleSaveHero = () => {
    updateConfigMutation.mutate({
      heroSection: {
        title: heroTitle,
        subtitle: heroSubtitle,
        tagline: heroTagline,
      },
    });
  };

  const handleSaveContact = () => {
    updateConfigMutation.mutate({
      contactInfo: { phone, mobile, email, address, facebook },
    });
  };

  const handleSaveAdmissionMessages = () => {
    updateConfigMutation.mutate({
      admissionStatus: {
        isOpen: config?.admissionStatus?.isOpen,
        notice: admissionNotice,
        closedMessage: admissionClosedMsg,
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Website Manager">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Website Manager">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-3xl font-serif font-black flex items-center gap-3 text-brand-primary tracking-tight">
              <Globe className="h-8 w-8 text-brand-gold" />
              Website Manager
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Refine your academy's digital presence and ethereal branding
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open("/public-home", "_blank")}
            className="gap-2 rounded-full border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white transition-all px-6 h-12 font-bold"
          >
            <Eye className="h-4 w-4" />
            View Live Site
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section Editor */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-brand-primary p-6 text-white flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-brand-gold" />
                <div>
                  <CardTitle className="text-lg uppercase tracking-widest">Hero Configuration</CardTitle>
                  <CardDescription className="text-slate-400">Main banner content & ethereal typography</CardDescription>
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Academy Title</Label>
                    <Input
                      value={heroTitle}
                      onChange={(e) => setHeroTitle(e.target.value)}
                      placeholder="The Edwardian Academy"
                      className="h-12 rounded-xl border-slate-200 focus:ring-brand-gold"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Tagline (Ethereal)</Label>
                    <Input
                      value={heroTagline}
                      onChange={(e) => setHeroTagline(e.target.value)}
                      placeholder="Excellence in Education Since 2017"
                      className="h-12 rounded-xl border-slate-200 focus:ring-brand-gold"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Subtitle / Mission</Label>
                  <Textarea
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Advancing Knowledge. Transforming Lives."
                    className="rounded-xl border-slate-200 focus:ring-brand-gold min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleSaveHero}
                  disabled={updateConfigMutation.isPending}
                  className="gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-full px-8 h-12 font-bold shadow-lg shadow-brand-primary/20"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 text-brand-gold" />
                  )}
                  Update Hero Section
                </Button>
              </CardContent>
            </Card>

            {/* Announcements Manager */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-brand-primary p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-brand-gold" />
                  <div>
                    <CardTitle className="text-lg uppercase tracking-widest">Notice Board</CardTitle>
                    <CardDescription className="text-slate-400">Scrolling announcements on the public site</CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAnnouncementModalOpen(true)}
                  className="gap-2 bg-brand-gold hover:bg-brand-gold/90 text-white rounded-full px-4"
                >
                  <Plus className="h-4 w-4" />
                  New Notice
                </Button>
              </div>
              <CardContent className="p-8">
                {config?.announcements?.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                    <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">No announcements yet</p>
                    <Button
                      variant="link"
                      onClick={() => setAnnouncementModalOpen(true)}
                      className="text-brand-gold font-bold"
                    >
                      Create your first notice
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {config?.announcements?.map((ann) => (
                      <div
                        key={ann._id}
                        // initial={{ opacity: 0, x: -20 }}
                        // animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                          ann.active
                            ? "bg-emerald-50/30 border-emerald-100"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex-1 pr-6">
                          <p className={`text-sm font-bold ${ann.active ? "text-brand-primary" : "text-slate-400 italic"}`}>
                            {ann.text}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={ann.active ? "default" : "secondary"}
                              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                                ann.active ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-200"
                              }`}
                            >
                              {ann.active ? "Live" : "Draft"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-white"
                            onClick={() =>
                              updateAnnouncementMutation.mutate({
                                id: ann._id,
                                data: { active: !ann.active },
                              })
                            }
                          >
                            {ann.active ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-slate-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-white"
                            onClick={() => {
                              setEditingAnnouncement(ann);
                              setNewAnnouncementText(ann.text);
                              setAnnouncementModalOpen(true);
                            }}
                          >
                            <Edit3 className="h-4 w-4 text-brand-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-red-50"
                            onClick={() =>
                              deleteAnnouncementMutation.mutate(ann._id)
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="bg-brand-primary p-6 text-white flex items-center gap-3">
                <Phone className="h-6 w-6 text-brand-gold" />
                <div>
                  <CardTitle className="text-lg uppercase tracking-widest">Contact Details</CardTitle>
                  <CardDescription className="text-slate-400">Institutional contact points for the public</CardDescription>
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Landline</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="091-5601600"
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Mobile / WhatsApp</Label>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="0334-5852326"
                      className="h-12 rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Official Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="academy@email.com"
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Physical Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Facebook Profile URL</Label>
                  <Input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="h-12 rounded-xl border-slate-200"
                  />
                </div>
                <Button
                  onClick={handleSaveContact}
                  disabled={updateConfigMutation.isPending}
                  className="gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-full px-8 h-12 font-bold shadow-lg shadow-brand-primary/20"
                >
                  <Save className="h-4 w-4 text-brand-gold" />
                  Save Contact Information
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Preview */}
          <div className="space-y-6">
            {/* Admission Status Toggle */}
            <Card
              className={`rounded-[2rem] overflow-hidden border-2 transition-all duration-500 ${
                config?.admissionStatus?.isOpen
                  ? "border-emerald-500/30 bg-emerald-50/20 shadow-xl shadow-emerald-500/10"
                  : "border-red-500/30 bg-red-50/20 shadow-xl shadow-red-500/10"
              }`}
            >
              <div className={`p-6 text-white flex items-center justify-between ${
                config?.admissionStatus?.isOpen ? "bg-emerald-600" : "bg-red-600"
              }`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6" />
                  <CardTitle className="text-sm uppercase tracking-[0.2em]">Admission Pulse</CardTitle>
                </div>
                <Switch
                  checked={config?.admissionStatus?.isOpen}
                  onCheckedChange={() => toggleAdmissionMutation.mutate()}
                  disabled={toggleAdmissionMutation.isPending}
                  className="data-[state=checked]:bg-white data-[state=unchecked]:bg-slate-300"
                />
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="text-center pb-4 border-b border-slate-100">
                  <p className={`text-2xl font-black tracking-tighter ${config?.admissionStatus?.isOpen ? "text-emerald-700" : "text-red-700"}`}>
                    {config?.admissionStatus?.isOpen ? "PORTAL OPEN" : "PORTAL CLOSED"}
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status on Public Website</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Open/Banner Notice</Label>
                  <Textarea
                    value={admissionNotice}
                    onChange={(e) => setAdmissionNotice(e.target.value)}
                    rows={2}
                    className="text-sm rounded-xl border-slate-200"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Closed Message</Label>
                  <Textarea
                    value={admissionClosedMsg}
                    onChange={(e) => setAdmissionClosedMsg(e.target.value)}
                    rows={2}
                    className="text-sm rounded-xl border-slate-200"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveAdmissionMessages}
                  disabled={updateConfigMutation.isPending}
                  className="w-full h-12 rounded-full border-brand-primary text-brand-primary font-bold hover:bg-brand-primary hover:text-white transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Sync Status Messages
                </Button>
              </CardContent>
            </Card>

            {/* Live Preview Card */}
            <Card className="overflow-hidden border-brand-gold/20">
              <CardHeader className="bg-brand-primary text-white pb-6">
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                  <Eye className="h-4 w-4 text-brand-gold" />
                  Visual Live Preview
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Real-time visualization of your changes
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="liquid-mesh p-8 text-white text-center space-y-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-[1px]" />
                  <div className="relative z-10">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-brand-gold font-bold mb-2">Institutional Tagline</p>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-300 font-bold mb-4">{heroTagline || "Excellence in Education"}</p>
                    <h3 className="text-2xl font-serif font-black leading-tight mb-3">
                      {heroTitle || "Edwardian Academy"}
                    </h3>
                    <p className="text-sm text-slate-200 font-medium mb-6 opacity-80">
                      {heroSubtitle || "Advancing Knowledge. Transforming Lives."}
                    </p>
                    <Badge
                      className={`px-4 py-1 rounded-full border ${
                        config?.admissionStatus?.isOpen 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {config?.admissionStatus?.isOpen
                        ? "🟢 Admissions Open"
                        : "🔴 Admissions Closed"}
                    </Badge>
                  </div>
                </div>

                {/* Announcement Ticker Preview */}
                <div className="bg-white p-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <Megaphone className="h-4 w-4 text-brand-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Notice Board Preview</span>
                  </div>
                  {config?.announcements?.filter((a) => a.active).length > 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-sm font-bold text-brand-primary truncate">
                        {config.announcements.filter(a => a.active)[0].text}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 italic">
                      No active announcements to display
                    </div>
                  )}
                </div>

                {/* Card Style Preview */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-4">Glass Card Aesthetic</span>
                  <div className="glass-ethereal p-6 rounded-[2rem] border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="w-10 h-10 bg-brand-secondary rounded-xl mb-4" />
                    <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-slate-50 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add/Edit Announcement Modal */}
      <Dialog
        open={announcementModalOpen}
        onOpenChange={setAnnouncementModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Edit Announcement" : "Add Announcement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Announcement Text</Label>
              <Textarea
                value={newAnnouncementText}
                onChange={(e) => setNewAnnouncementText(e.target.value)}
                placeholder="Enter your announcement..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAnnouncementModalOpen(false);
                setEditingAnnouncement(null);
                setNewAnnouncementText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newAnnouncementText.trim()) {
                  toast.error("Please enter announcement text");
                  return;
                }
                if (editingAnnouncement) {
                  updateAnnouncementMutation.mutate({
                    id: editingAnnouncement._id,
                    data: { text: newAnnouncementText },
                  });
                } else {
                  addAnnouncementMutation.mutate(newAnnouncementText);
                }
              }}
              disabled={
                addAnnouncementMutation.isPending ||
                updateAnnouncementMutation.isPending
              }
            >
              {addAnnouncementMutation.isPending ||
              updateAnnouncementMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingAnnouncement ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
