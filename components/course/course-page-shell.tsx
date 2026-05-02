import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export type CoursePageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  headingTier?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
};

export function CoursePageShell({
  title,
  description,
  eyebrow,
  headingTier = "secondary",
  children,
  className,
}: CoursePageShellProps) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="marketing-container pt-10 md:pt-14">
        <header className="max-w-3xl landing-stagger [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms]">
          {eyebrow ? (
            <p className="text-xs tracking-widest uppercase text-muted-foreground">{eyebrow}</p>
          ) : null}
          <SectionHeading
            as="h1"
            tier={headingTier}
            className={cn("text-foreground", eyebrow ? "mt-1" : undefined)}
          >
            {title}
          </SectionHeading>
          {description ? (
            <div className="mt-3 text-body-md text-muted-foreground">{description}</div>
          ) : null}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
