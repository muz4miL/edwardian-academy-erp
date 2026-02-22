/**
 * User Management Page
 * OWNER-only hub for creating staff accounts and controlling their permissions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Shield,
  Users,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Crown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Power,
  Key,
  Copy,
  User as UserIcon,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Permission options organized by group for clean 3-column layout
const PERMISSION_GROUPS = [
  {
    title: "Core",
    permissions: [
      { key: "dashboard", label: "Dashboard", always: true },
      { key: "admissions", label: "Admissions" },
      { key: "students", label: "Students" },
      { key: "teachers", label: "Teachers" },
    ],
  },
  {
    title: "Operations",
    permissions: [
      { key: "finance", label: "Finance" },
      { key: "gatekeeper", label: "Gatekeeper" },
      { key: "frontdesk", label: "Front Desk" },
      { key: "inquiries", label: "Inquiries" },
    ],
  },
  {
    title: "Academic",
    permissions: [
      { key: "classes", label: "Classes" },
      { key: "timetable", label: "Timetable" },
      { key: "sessions", label: "Sessions" },
      { key: "lectures", label: "Lectures" },
      { key: "exams", label: "Exams" },
    ],
  },
  {
    title: "Admin",
    permissions: [
      { key: "configuration", label: "Configuration" },
      { key: "reports", label: "Reports" },
    ],
  },
];

// Flat list for compatibility
const ALL_CHECKBOX_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

interface User {
  _id: string;
  userId: string;
  username: string;
  fullName: string;
  role: "OWNER" | "PARTNER" | "STAFF" | "TEACHER";
  permissions: string[];
  isActive: boolean;
  phone?: string;
  email?: string;
  createdAt: string;
  canBeDeleted: boolean;
  teacherPassword?: string | null;
  teacherUsername?: string | null;
  teacherId?: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<string>("STAFF");
  const [formPermissions, setFormPermissions] = useState<string[]>([
    "dashboard",
  ]);
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Check if current user is OWNER
  if (currentUser?.role !== "OWNER") {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Shield className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only OWNER can access User Management.
          </p>
          <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/users`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const users: User[] = usersData?.data || [];

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User Created", { description: data.message });
      setAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to Create User", { description: error.message });
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: any }) => {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User Updated", { description: data.message });
      setEditModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to Update User", { description: error.message });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User Deleted", { description: data.message });
      setDeleteConfirmOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error("Failed to Delete User", { description: error.message });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/users/${id}/toggle-status`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to toggle status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Status Updated", { description: data.message });
    },
    onError: (error: any) => {
      toast.error("Failed to Toggle Status", { description: error.message });
    },
  });

  const resetForm = () => {
    setFormName("");
    setFormUsername("");
    setFormPassword("");
    setFormRole("STAFF");
    setFormPermissions(["dashboard"]);
    setFormPhone("");
    setFormEmail("");
    setShowPassword(false);
    setSelectedUser(null);
  };

  const handleAddUser = () => {
    if (!formName || !formUsername || !formPassword) {
      toast.error("Missing Fields", {
        description: "Please fill in all required fields",
      });
      return;
    }
    if (formPassword.length < 8) {
      toast.error("Password Too Short", {
        description: "Password must be at least 8 characters",
      });
      return;
    }

    createMutation.mutate({
      fullName: formName,
      username: formUsername,
      password: formPassword,
      role: formRole,
      permissions: formPermissions,
      phone: formPhone || undefined,
      email: formEmail || undefined,
    });
  };

  const handleEditUser = () => {
    if (!selectedUser || !formName) {
      toast.error("Missing Fields", {
        description: "Please fill in required fields",
      });
      return;
    }

    const userData: any = {
      fullName: formName,
      role: formRole,
      permissions: formPermissions,
      phone: formPhone || undefined,
      email: formEmail || undefined,
    };

    // Only include password if it was changed
    if (formPassword && formPassword.length >= 8) {
      userData.password = formPassword;
    }

    updateMutation.mutate({ id: selectedUser._id, userData });
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormName(user.fullName);
    setFormUsername(user.username);
    setFormPassword("");
    setFormRole(user.role);
    setFormPermissions(user.permissions || ["dashboard"]);
    setFormPhone(user.phone || "");
    setFormEmail(user.email || "");
    setEditModalOpen(true);
  };

  const handlePermissionToggle = (permission: string) => {
    if (permission === "dashboard") return; // Can't toggle dashboard

    setFormPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const getRoleBadge = (role: string) => {
    // Normalize role for case-insensitive matching
    const normalizedRole = role?.toUpperCase();

    switch (normalizedRole) {
      case "OWNER":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 gap-1">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        );
      case "PARTNER":
        return <Badge className="bg-purple-100 text-purple-800">Partner</Badge>;
      case "STAFF":
        return <Badge className="bg-blue-100 text-blue-800">Staff</Badge>;
      case "TEACHER":
        return <Badge className="bg-blue-100 text-blue-800">Teacher</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Create staff accounts and control their access permissions
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setAddModalOpen(true);
            }}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Crown className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Owners</p>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.role === "OWNER").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Partners</p>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.role === "PARTNER").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {users.filter((u) => u.isActive).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.role === "OWNER" ? (
                            <Badge variant="outline" className="text-xs">
                              All Access
                            </Badge>
                          ) : (
                            user.permissions?.slice(0, 3).map((p) => (
                              <Badge
                                key={p}
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {p}
                              </Badge>
                            ))
                          )}
                          {user.permissions?.length > 3 &&
                            user.role !== "OWNER" && (
                              <Badge variant="outline" className="text-xs">
                                +{user.permissions.length - 3} more
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role !== "OWNER" &&
                            user._id !== currentUser?.userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleStatusMutation.mutate(user._id)
                                }
                                title={
                                  user.isActive ? "Deactivate" : "Activate"
                                }
                              >
                                <Power
                                  className={`h-4 w-4 ${user.isActive ? "text-green-600" : "text-gray-400"}`}
                                />
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user.canBeDeleted &&
                            user._id !== currentUser?.userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new staff account with specific permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="e.g., Ali Khan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  placeholder="e.g., alikhan"
                  value={formUsername}
                  onChange={(e) =>
                    setFormUsername(e.target.value.toLowerCase())
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formRole} onValueChange={setFormRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input
                  placeholder="e.g., 0333-1234567"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email (Optional)</Label>
                <Input
                  type="email"
                  placeholder="e.g., ali@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Sidebar Permissions
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormPermissions([...ALL_CHECKBOX_PERMISSIONS])
                  }
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.title}
                      </h4>
                      {group.permissions.map((perm) => (
                        <div
                          key={perm.key}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`add-${perm.key}`}
                            checked={formPermissions.includes(perm.key)}
                            onCheckedChange={() =>
                              handlePermissionToggle(perm.key)
                            }
                            disabled={perm.always}
                          />
                          <Label
                            htmlFor={`add-${perm.key}`}
                            className="text-sm cursor-pointer"
                          >
                            {perm.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Selected permissions determine which sidebar tabs this user can
                see
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-primary" />
              Edit User — {selectedUser?.fullName}
            </DialogTitle>
            <DialogDescription>
              Update user information, credentials, and permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Current Credentials Banner (for TEACHER users) */}
            {selectedUser?.role === "TEACHER" && selectedUser?.teacherPassword && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Current Login Credentials</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Username</p>
                      <p className="text-sm font-mono font-semibold text-slate-900 truncate">{selectedUser?.username}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser?.username || "");
                        toast.success("Username copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-100">
                    <Key className="h-4 w-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Password</p>
                      <p className="text-sm font-mono font-semibold text-slate-900 truncate">{selectedUser.teacherPassword}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser?.teacherPassword || "");
                        toast.success("Password copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                <UserIcon className="h-4 w-4" />
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Full Name *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Username</Label>
                  <Input value={formUsername} disabled className="bg-slate-50 text-slate-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g., 0333-1234567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g., user@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                <Shield className="h-4 w-4" />
                Security & Role
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Leave blank to keep current"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">Min 8 characters. Only fills if you want to change it.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Role</Label>
                  <Select
                    value={formRole}
                    onValueChange={setFormRole}
                    disabled={selectedUser?.role === "OWNER" || selectedUser?.role === "TEACHER"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="PARTNER">Partner</SelectItem>
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                      {selectedUser?.role === "OWNER" && (
                        <SelectItem value="OWNER">Owner</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedUser?.role === "TEACHER" && (
                    <p className="text-[10px] text-slate-400">Teacher role is managed from Teachers page</p>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions Section */}
            {selectedUser?.role !== "OWNER" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Sidebar Permissions
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormPermissions([...ALL_CHECKBOX_PERMISSIONS])
                    }
                    className="h-7 text-xs"
                  >
                    Select All
                  </Button>
                </div>
                <div className="border rounded-xl p-4 bg-slate-50/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.title} className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {group.title}
                        </h4>
                        {group.permissions.map((perm) => (
                          <div
                            key={perm.key}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`edit-${perm.key}`}
                              checked={formPermissions.includes(perm.key)}
                              onCheckedChange={() =>
                                handlePermissionToggle(perm.key)
                              }
                              disabled={perm.always}
                            />
                            <Label
                              htmlFor={`edit-${perm.key}`}
                              className="text-sm cursor-pointer"
                            >
                              {perm.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Permissions control which sidebar tabs this user can access
                </p>
              </div>
            )}

            {selectedUser?.role === "OWNER" && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Crown className="h-5 w-5" />
                  <span className="font-semibold">Owner Account</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Owner accounts have full access to all features automatically.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedUser?.fullName}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                selectedUser && deleteMutation.mutate(selectedUser._id)
              }
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
