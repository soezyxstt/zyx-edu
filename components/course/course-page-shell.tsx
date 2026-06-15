import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CoursePageShellProps = {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  headingTier?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
  fullWidth?: boolean;
};

export function CoursePageShell({
  children,
  className,
  fullWidth = false,
}: CoursePageShellProps) {
  return (
    <div className={cn("relative pb-8", className, fullWidth && "pb-0 h-full flex flex-col")}>
      <div className={cn(fullWidth ? "w-full h-full flex flex-col" : "marketing-container pt-6 md:pt-8")}>
        <div className={cn(fullWidth && "w-full h-full flex flex-col")}>{children}</div>
      </div>
    </div>
  );
}


