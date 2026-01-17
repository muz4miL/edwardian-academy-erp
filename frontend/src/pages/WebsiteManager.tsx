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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Website Manager
            </h1>
            <p className="text-muted-foreground">
              Manage your public website content
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.open("/public-home", "_blank")}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview Site
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section Editor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Hero Section
                </CardTitle>
                <CardDescription>
                  Main banner text that visitors see first
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Academy Title</Label>
                  <Input
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="The Edwardian's Academy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Your Pathway to Success"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={heroTagline}
                    onChange={(e) => setHeroTagline(e.target.value)}
                    placeholder="Excellence in Education Since 2017"
                  />
                </div>
                <Button
                  onClick={handleSaveHero}
                  disabled={updateConfigMutation.isPending}
                  className="gap-2"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Hero
                </Button>
              </CardContent>
            </Card>

            {/* Announcements Manager */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-orange-500" />
                    Notice Board
                  </CardTitle>
                  <CardDescription>
                    Scrolling announcements on the public site
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAnnouncementModalOpen(true)}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                {config?.announcements?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No announcements yet</p>
                    <Button
                      variant="link"
                      onClick={() => setAnnouncementModalOpen(true)}
                    >
                      Add your first announcement
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config?.announcements?.map((ann) => (
                      <div
                        key={ann._id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          ann.active
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex-1">
                          <p
                            className={`text-sm ${!ann.active && "text-muted-foreground"}`}
                          >
                            {ann.text}
                          </p>
                          <Badge
                            variant={ann.active ? "default" : "secondary"}
                            className="mt-1 text-xs"
                          >
                            {ann.active ? "Active" : "Hidden"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateAnnouncementMutation.mutate({
                                id: ann._id,
                                data: { active: !ann.active },
                              })
                            }
                          >
                            {ann.active ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingAnnouncement(ann);
                              setNewAnnouncementText(ann.text);
                              setAnnouncementModalOpen(true);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Landline</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="091-5601600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="0334-5852326"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="academy@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <Button
                  onClick={handleSaveContact}
                  disabled={updateConfigMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Contact Info
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Preview */}
          <div className="space-y-6">
            {/* Admission Status Toggle */}
            <Card
              className={
                config?.admissionStatus?.isOpen
                  ? "border-green-300 bg-green-50/50"
                  : "border-red-300 bg-red-50/50"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle
                    className={`h-5 w-5 ${config?.admissionStatus?.isOpen ? "text-green-600" : "text-red-600"}`}
                  />
                  Admission Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {config?.admissionStatus?.isOpen
                        ? "Admissions OPEN"
                        : "Admissions CLOSED"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Toggle to change public status
                    </p>
                  </div>
                  <Switch
                    checked={config?.admissionStatus?.isOpen}
                    onCheckedChange={() => toggleAdmissionMutation.mutate()}
                    disabled={toggleAdmissionMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Open Message</Label>
                  <Textarea
                    value={admissionNotice}
                    onChange={(e) => setAdmissionNotice(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Closed Message</Label>
                  <Textarea
                    value={admissionClosedMsg}
                    onChange={(e) => setAdmissionClosedMsg(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveAdmissionMessages}
                  disabled={updateConfigMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save Messages
                </Button>
              </CardContent>
            </Card>

            {/* Live Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg p-4 text-white text-center space-y-2">
                  <p className="text-xs opacity-70">The</p>
                  <h3 className="text-lg font-bold">
                    {heroTitle || "Edwardian's Academy"}
                  </h3>
                  <p className="text-sm text-blue-200">
                    {heroSubtitle || "Your Pathway to Success"}
                  </p>
                  <p className="text-xs opacity-70">{heroTagline}</p>
                  <Badge
                    className={`mt-2 ${config?.admissionStatus?.isOpen ? "bg-green-500" : "bg-red-500"}`}
                  >
                    {config?.admissionStatus?.isOpen
                      ? "🟢 Admissions Open"
                      : "🔴 Admissions Closed"}
                  </Badge>
                </div>
                {config?.announcements?.filter((a) => a.active).length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <p className="font-medium text-yellow-800 mb-1">
                      📢 Announcements:
                    </p>
                    <ul className="list-disc list-inside text-yellow-700">
                      {config.announcements
                        .filter((a) => a.active)
                        .slice(0, 3)
                        .map((a) => (
                          <li key={a._id} className="truncate">
                            {a.text}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
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
