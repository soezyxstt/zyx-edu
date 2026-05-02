import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

type ShellPageProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function ShellPage({ title, description, children, className }: ShellPageProps) {
  return (
    <div className={cn("bg-background", className)}>
      <div className="marketing-container py-10 md:py-14">
        <header className="max-w-3xl">
          <SectionHeading as="h1" tier="primary" className="text-foreground">
            {title}
          </SectionHeading>
          {description ? (
            <p className="mt-3 text-body-md text-muted-foreground">{description}</p>
          ) : null}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
