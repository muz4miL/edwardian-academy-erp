import { ReactNode } from "react";

interface HeaderBannerProps {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function HeaderBanner({ title, subtitle, children }: HeaderBannerProps) {
  return (
    <div className="header-gradient rounded-xl p-6 text-primary-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-primary-foreground/80">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
