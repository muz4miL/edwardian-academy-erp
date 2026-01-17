import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CalendarClock, Plus, Loader2, Edit, Trash2, Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@/lib/api";
import { toast } from "sonner";

const Sessions = () => {
  const queryClient = useQueryClient();

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Form states
  const [formSessionName, setFormSessionName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // Fetch sessions
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sessions", { status: statusFilter }],
    queryFn: () => sessionApi.getAll({ status: statusFilter !== "all" ? statusFilter : undefined }),
  });

  const sessions = data?.data || [];

  // Create mutation
  const createSessionMutation = useMutation({
    mutationFn: sessionApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session Created", {
        description: `${data.data.sessionName} has been created successfully.`,
      });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create session", { description: error.message });
    },
  });

  // Update mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sessionApi.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session Updated", {
        description: `${data.data.sessionName} has been updated successfully.`,
      });
      resetForm();
      setIsEditModalOpen(false);
      setSelectedSession(null);
    },
    onError: (error: any) => {
      toast.error("Failed to update session", { description: error.message });
    },
  });

  // Delete mutation
  const deleteSessionMutation = useMutation({
    mutationFn: sessionApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session Deleted", { description: "Session has been removed." });
      setIsDeleteDialogOpen(false);
      setSelectedSession(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete session", { description: error.message });
    },
  });

  // Reset form
  const resetForm = () => {
    setFormSessionName("");
    setFormDescription("");
    setFormStartDate("");
    setFormEndDate("");
  };

  // Populate form for edit
  const populateFormForEdit = (session: any) => {
    setFormSessionName(session.sessionName || "");
    setFormDescription(session.description || "");
    setFormStartDate(session.startDate ? session.startDate.split('T')[0] : "");
    setFormEndDate(session.endDate ? session.endDate.split('T')[0] : "");
  };

  // Handlers
  const handleEdit = (session: any) => {
    setSelectedSession(session);
    populateFormForEdit(session);
    setIsEditModalOpen(true);
  };

  const handleDelete = (session: any) => {
    setSelectedSession(session);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = () => {
    if (!formSessionName || !formStartDate || !formEndDate) {
      toast.error("Missing required fields");
      return;
    }
    createSessionMutation.mutate({
      sessionName: formSessionName,
      description: formDescription,
      startDate: formStartDate,
      endDate: formEndDate,
    });
  };

  const handleSubmitEdit = () => {
    if (!selectedSession?._id) return;
    updateSessionMutation.mutate({
      id: selectedSession._id,
      data: {
        sessionName: formSessionName,
        description: formDescription,
        startDate: formStartDate,
        endDate: formEndDate,
      },
    });
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // TASK 3: Calculate progress percentage for active sessions
  const calculateProgress = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;

    return Math.round((elapsed / totalDuration) * 100);
  };

  // Calculate days remaining
  const calculateDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Get status color and icon
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          glow: 'shadow-green-500/20',
          text: 'text-green-700 dark:text-green-400',
          badgeBg: 'bg-green-100 dark:bg-green-900/50',
          progressColor: 'bg-gradient-to-r from-sky-500 to-sky-400',
          progressTrack: 'bg-sky-100',
          icon: CheckCircle2,
          label: 'Current Session'
        };
      case 'upcoming':
        return {
          bg: 'bg-sky-50 dark:bg-sky-900/20',
          border: 'border-sky-200 dark:border-sky-800',
          glow: 'shadow-sky-500/20',
          text: 'text-sky-700 dark:text-sky-400',
          badgeBg: 'bg-sky-100 dark:bg-sky-900/50',
          progressColor: 'bg-slate-300',
          progressTrack: 'bg-slate-100',
          icon: Clock,
          label: 'Upcoming'
        };
      case 'completed':
        return {
          bg: 'bg-slate-50 dark:bg-slate-800/50',
          border: 'border-slate-200 dark:border-slate-700',
          glow: 'shadow-slate-500/10',
          text: 'text-slate-500 dark:text-slate-400',
          badgeBg: 'bg-slate-100 dark:bg-slate-800',
          progressColor: 'bg-slate-400',
          progressTrack: 'bg-slate-200',
          icon: AlertCircle,
          label: 'Completed'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          glow: '',
          text: 'text-slate-500',
          badgeBg: 'bg-slate-100',
          progressColor: 'bg-slate-300',
          progressTrack: 'bg-slate-100',
          icon: Calendar,
          label: status
        };
    }
  };

  // Stats
  const activeSessions = sessions.filter((s: any) => s.status === 'active').length;
  const upcomingSessions = sessions.filter((s: any) => s.status === 'upcoming').length;

  return (
    <DashboardLayout title="Sessions">
      <HeaderBanner
        title="Academic Sessions"
        subtitle={`Total Sessions: ${sessions.length} | Active: ${activeSessions} | Upcoming: ${upcomingSessions}`}
      >
        <Button
          className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          style={{ borderRadius: "0.75rem" }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </HeaderBanner>

      {/* Filters */}
      <div className="mt-6 flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Session Cards Grid */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center p-12 text-destructive">
            Error loading sessions. Please try again.
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-card rounded-xl border border-border">
            <CalendarClock className="h-12 w-12 mb-4 opacity-50" />
            <p>No sessions found. Create your first academic session!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session: any) => {
              const styles = getStatusStyles(session.status);
              const StatusIcon = styles.icon;
              const progress = session.status === 'active'
                ? calculateProgress(session.startDate, session.endDate)
                : session.status === 'completed' ? 100 : 0;
              const daysRemaining = calculateDaysRemaining(session.endDate);

              return (
                <div
                  key={session._id}
                  className={`relative rounded-xl border-2 p-6 pb-4 transition-all duration-300 hover:scale-[1.02] overflow-hidden ${styles.bg} ${styles.border} ${session.status === 'active' ? 'shadow-lg shadow-green-500/20' : 'shadow-md'
                    }`}
                  style={{ borderRadius: '0.75rem' }}
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${styles.badgeBg} ${styles.text}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {styles.label}
                    </span>
                  </div>

                  {/* Session ID */}
                  <span className="inline-block px-2 py-1 rounded bg-white/80 dark:bg-slate-800 text-xs font-mono text-muted-foreground mb-3">
                    {session.sessionId}
                  </span>

                  {/* Session Name */}
                  <h3 className="text-xl font-bold text-foreground mb-2 pr-20">
                    {session.sessionName}
                  </h3>

                  {/* Description */}
                  {session.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {/* Date Range */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(session.startDate)} — {formatDate(session.endDate)}</span>
                  </div>

                  {/* Duration & Days Remaining */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{session.durationDays || 0} days total</span>
                    </div>
                    {session.status === 'active' && (
                      <div className="flex items-center gap-1 text-sky-600 font-medium">
                        <TrendingUp className="h-4 w-4" />
                        <span>{daysRemaining} days left</span>
                      </div>
                    )}
                  </div>

                  {/* TASK 3: Progress Bar for Active/Completed Sessions */}
                  {(session.status === 'active' || session.status === 'completed') && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Progress</span>
                        <span className={session.status === 'active' ? 'text-sky-600 font-semibold' : ''}>
                          {progress}%
                        </span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${styles.progressTrack}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${styles.progressColor}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => handleEdit(session)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(session)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-sky-100 p-2 rounded-lg">
                <Plus className="h-5 w-5 text-sky-600" />
              </div>
              New Academic Session
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new academic session or enrollment cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Session Name *</Label>
              <Input
                placeholder="e.g., ECAT 2026, Academic Year 2025-26"
                value={formSessionName}
                onChange={(e) => setFormSessionName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={createSessionMutation.isPending}
              className="bg-sky-600 text-white hover:bg-sky-700"
              style={{ borderRadius: "0.75rem" }}
            >
              {createSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Session"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <div className="bg-sky-100 p-2 rounded-lg">
                <Edit className="h-5 w-5 text-sky-600" />
              </div>
              Edit Session
              {selectedSession?.sessionId && (
                <span className="ml-2 px-3 py-1 rounded-full bg-sky-600 text-white text-sm font-mono">
                  {selectedSession.sessionId}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Session Name *</Label>
              <Input
                value={formSessionName}
                onChange={(e) => setFormSessionName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={updateSessionMutation.isPending}
              className="bg-sky-600 text-white hover:bg-sky-700"
              style={{ borderRadius: "0.75rem" }}
            >
              {updateSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-bold text-sky-600">{selectedSession?.sessionName}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSessionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedSession?._id) deleteSessionMutation.mutate(selectedSession._id);
              }}
              disabled={deleteSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSessionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Session"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Sessions;
