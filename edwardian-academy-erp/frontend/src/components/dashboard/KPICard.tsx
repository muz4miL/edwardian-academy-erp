import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: {
    iconBg: "bg-secondary",
    iconColor: "text-muted-foreground",
  },
  primary: {
    iconBg: "bg-primary-light",
    iconColor: "text-primary",
  },
  success: {
    iconBg: "bg-success-light",
    iconColor: "text-success",
  },
  warning: {
    iconBg: "bg-warning-light",
    iconColor: "text-warning",
  },
  danger: {
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow transition-all duration-200 hover:card-shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            styles.iconBg
          )}
        >
          <Icon className={cn("h-6 w-6", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}
