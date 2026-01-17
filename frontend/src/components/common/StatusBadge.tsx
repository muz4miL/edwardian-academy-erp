import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "paid" | "pending" | "partial" | "active" | "inactive" | "success" | "warning" | "default" | "upcoming" | "completed";
  children?: React.ReactNode;
}

const statusStyles: Record<StatusBadgeProps["status"], { bg: string; text: string; label: string }> = {
  paid: {
    bg: "bg-success-light",
    text: "text-success",
    label: "Paid",
  },
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    label: "Pending",
  },
  partial: {
    bg: "bg-warning-light",
    text: "text-warning",
    label: "Partial",
  },
  active: {
    bg: "bg-success-light",
    text: "text-success",
    label: "Active",
  },
  inactive: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    label: "Inactive",
  },
  success: {
    bg: "bg-success-light",
    text: "text-success",
    label: "Success",
  },
  warning: {
    bg: "bg-warning-light",
    text: "text-warning",
    label: "Warning",
  },
  default: {
    bg: "bg-secondary",
    text: "text-muted-foreground",
    label: "Default",
  },
  upcoming: {
    bg: "bg-warning-light",
    text: "text-warning",
    label: "Upcoming",
  },
  completed: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    label: "Completed",
  },
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const styles = statusStyles[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        styles.bg,
        styles.text
      )}
    >
      {children || styles.label}
    </span>
  );
}
