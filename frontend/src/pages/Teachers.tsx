import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBanner } from "@/components/dashboard/HeaderBanner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Loader2, Trash2, Wallet } from "lucide-react";
// Import the Modals and API
import { AddTeacherModal } from "@/components/dashboard/AddTeacherModal";
import { ViewEditTeacherModal } from "@/components/dashboard/ViewEditTeacherModal";
import { DeleteTeacherDialog } from "@/components/dashboard/DeleteTeacherDialog";
import { TeacherFinanceModal } from "@/components/dashboard/TeacherFinanceModal";
import { teacherApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Helper function to format numbers with k suffix
const formatCurrency = (amount: number) => {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}k`;
  }
  return amount.toLocaleString();
};

// Helper function to format compensation display with premium styling
const formatCompensation = (compensation: any) => {
  // Only use default if compensation object doesn't exist at all
  if (!compensation || !compensation.type) {
    return "70 : 30 %";
  }

  const {
    type,
    teacherShare,
    academyShare,
    fixedSalary,
    baseSalary,
    profitShare,
  } = compensation;

  if (type === "percentage") {
    // Check for null/undefined, NOT falsy (0 is valid!)
    if (
      teacherShare !== null &&
      teacherShare !== undefined &&
      academyShare !== null &&
      academyShare !== undefined
    ) {
      // Display ACTUAL values, even if 0
      return `${teacherShare} : ${academyShare} %`;
    }
    // Only fall back if values are truly missing
    return "70 : 30 %";
  } else if (type === "fixed") {
    if (fixedSalary) {
      return `PKR ${formatCurrency(fixedSalary)}`;
    }
    return "Fixed Salary";
  } else if (type === "hybrid") {
    if (baseSalary && profitShare) {
      return `PKR ${formatCurrency(baseSalary)} + ${profitShare}%`;
    }
    return "Hybrid Package";
  }

  return "Not Set";
};

// Helper function to capitalize subject names
const capitalizeSubject = (subject: string) => {
  const subjectMap: Record<string, string> = {
    biology: "Biology",
    chemistry: "Chemistry",
    physics: "Physics",
    math: "Mathematics",
    english: "English",
  };
  return (
    subjectMap[subject] || subject.charAt(0).toUpperCase() + subject.slice(1)
  );
};

const Teachers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [viewEditMode, setViewEditMode] = useState<"view" | "edit">("view");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);

  // Fetch teachers from MongoDB using React Query
  const { data: teachersResponse, isLoading } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => teacherApi.getAll(),
  });

  const teachers = (teachersResponse as any)?.data || [];
  const teacherCount = (teachersResponse as any)?.count || 0;

  // Delete mutation
  const deleteTeacherMutation = useMutation({
    mutationFn: teacherApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "✅ Teacher Deleted",
        description: "Teacher record has been removed successfully.",
        className: "bg-green-50 border-green-200",
      });
      setIsDeleteDialogOpen(false);
      setSelectedTeacher(null);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Delete Failed",
        description: error.message || "Could not delete teacher.",
        variant: "destructive",
      });
    },
  });

  const handleView = (teacher: any) => {
    // Navigate to full Teacher Profile page
    navigate(`/teachers/${teacher._id}`);
  };

  const handleQuickView = (teacher: any) => {
    // Quick modal view (for backward compatibility)
    setSelectedTeacher(teacher);
    setViewEditMode("view");
    setIsViewEditModalOpen(true);
  };

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setViewEditMode("edit");
    setIsViewEditModalOpen(true);
  };

  const handleDelete = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const handleWallet = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsFinanceModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTeacher?._id) {
      deleteTeacherMutation.mutate(selectedTeacher._id);
    }
  };

  return (
    <DashboardLayout title="Teachers">
      <HeaderBanner
        title="Teacher Management"
        subtitle={
          isLoading
            ? "Loading teachers..."
            : `Total Teachers: ${teacherCount} | ${teacherCount > 0 ? "All Active" : "No Teachers Yet"}`
        }
      >
        {/* Updated Button to match Hub Design */}
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          style={{ borderRadius: "0.75rem" }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </HeaderBanner>

      {/* Teacher Stats - Premium Grid with Dynamic Subjects */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-4 card-shadow animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                    <div className="h-5 bg-muted rounded w-24"></div>
                  </div>
                  <div className="h-10 w-10 bg-muted rounded-lg"></div>
                </div>
                <div className="mt-2 h-4 bg-muted rounded w-32"></div>
              </div>
            ))
          : (() => {
              // Extract unique subjects from teachers (only show subjects with teachers)
              const uniqueSubjects = Array.from(
                new Set(teachers.map((t: any) => t.subject).filter(Boolean)),
              );

              // Capitalize subject names properly
              const formatSubjectName = (subject: string) => {
                const subjectMap: Record<string, string> = {
                  biology: "Biology",
                  chemistry: "Chemistry",
                  physics: "Physics",
                  math: "Mathematics",
                  english: "English",
                };
                return (
                  subjectMap[subject] ||
                  subject.charAt(0).toUpperCase() + subject.slice(1)
                );
              };

              return uniqueSubjects.map((subjectKey: string) => {
                const teacher = teachers.find(
                  (t: any) => t.subject === subjectKey,
                );
                const displayName = formatSubjectName(subjectKey);

                return (
                  <div
                    key={subjectKey}
                    className="rounded-xl border border-border bg-card p-4 card-shadow"
                    style={{ borderRadius: "0.75rem" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {displayName}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {teacher ? teacher.name.split(" ").slice(-1) : "—"}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light">
                        <span className="text-lg font-bold text-primary">
                          {teacher ? "✓" : "—"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {teacher ? (
                        <>
                          Compensation:{" "}
                          <span className="font-medium text-success">
                            {teacher.compensation?.type === "percentage" &&
                            teacher.compensation?.teacherShare !== null &&
                            teacher.compensation?.teacherShare !== undefined &&
                            teacher.compensation?.academyShare !== null &&
                            teacher.compensation?.academyShare !== undefined ? (
                              <span>
                                {teacher.compensation.teacherShare} :{" "}
                                <span className="text-muted-foreground">
                                  {teacher.compensation.academyShare}
                                </span>{" "}
                                %
                              </span>
                            ) : (
                              formatCompensation(teacher.compensation)
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          No teacher assigned
                        </span>
                      )}
                    </p>
                  </div>
                );
              });
            })()}
      </div>

      {/* Teachers Table */}
      <div className="mt-6 rounded-xl border border-border bg-card card-shadow overflow-hidden">
        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Loading teachers...
            </span>
          </div>
        ) : teachers.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
              <UserPlus className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Teachers Found
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Get started by adding your first teacher to the system. They will
              appear here once registered.
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              style={{ borderRadius: "0.75rem" }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Teacher
            </Button>
          </div>
        ) : (
          // Table with Data
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary hover:bg-secondary">
                <TableHead className="font-semibold">Teacher</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Joining Date</TableHead>
                <TableHead className="font-semibold">Compensation</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher: any) => (
                <TableRow key={teacher._id} className="hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {teacher.profileImage ? (
                        <img
                          src={teacher.profileImage}
                          alt={teacher.name}
                          className="h-9 w-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-success-foreground font-medium">
                          {teacher.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p
                          className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                          onClick={() => handleView(teacher)}
                        >
                          {teacher.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {teacher.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-medium text-primary">
                      {capitalizeSubject(teacher.subject)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      {teacher.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(teacher.joiningDate).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="font-medium text-success text-sm">
                        {teacher.compensation?.type === "percentage" &&
                        teacher.compensation?.teacherShare !== null &&
                        teacher.compensation?.teacherShare !== undefined &&
                        teacher.compensation?.academyShare !== null &&
                        teacher.compensation?.academyShare !== undefined ? (
                          <span>
                            {teacher.compensation.teacherShare} :{" "}
                            <span className="text-muted-foreground">
                              {teacher.compensation.academyShare}
                            </span>{" "}
                            %
                          </span>
                        ) : (
                          formatCompensation(teacher.compensation)
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {teacher.compensation?.type || "Not Set"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={teacher.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {/* Wallet Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-green-100 hover:text-green-600"
                        onClick={() => handleWallet(teacher)}
                        title="Finance Manager"
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>

                      {/* View Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleView(teacher)}
                        title="View Details"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </Button>

                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleEdit(teacher)}
                        title="Edit Teacher"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(teacher)}
                        title="Delete Teacher"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      <AddTeacherModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        defaultMode="percentage"
        defaultTeacherShare="70"
        defaultAcademyShare="30"
        defaultFixedSalary=""
      />

      <ViewEditTeacherModal
        open={isViewEditModalOpen}
        onOpenChange={setIsViewEditModalOpen}
        teacher={selectedTeacher}
        mode={viewEditMode}
      />

      <DeleteTeacherDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDelete}
        teacherName={selectedTeacher?.name || ""}
        isDeleting={deleteTeacherMutation.isPending}
      />

      <TeacherFinanceModal
        open={isFinanceModalOpen}
        onOpenChange={setIsFinanceModalOpen}
        teacher={selectedTeacher}
      />
    </DashboardLayout>
  );
};

export default Teachers;
