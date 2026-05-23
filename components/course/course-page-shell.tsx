import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { SimulatorWidget } from "./simulator-widget";

export type CoursePageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  headingTier?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
};

export function CoursePageShell({
  title,
  description,
  eyebrow,
  headingTier = "secondary",
  children,
  className,
  hideHeader = false,
}: CoursePageShellProps) {
  return (
    <div className={cn("relative pb-8", className)}>
      <div className={cn("marketing-container", hideHeader ? "pt-4 md:pt-5" : "pt-6 md:pt-8")}>
        {!hideHeader ? (
          <header className="max-w-4xl landing-stagger [&>*:nth-child(1)]:[animation-delay:0ms] [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms]">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
            ) : null}
            <SectionHeading
              as="h1"
              tier={headingTier}
              className={cn(
                "text-foreground",
                headingTier === "primary" ? "text-h3 md:text-h2" : "text-h4 md:text-h3",
                eyebrow ? "mt-1" : undefined,
              )}
            >
              {title}
            </SectionHeading>
            {description ? (
              <div className="mt-2 max-w-3xl text-body-sm text-muted-foreground md:text-body-base">{description}</div>
            ) : null}
          </header>
        ) : null}
        <div className={cn(!hideHeader && "mt-5 md:mt-6")}>{children}</div>
      </div>
      <SimulatorWidget />
    </div>
  );
}
