import type { ReactNode } from "react";
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
          <h1 className="font-heading text-h3 font-bold tracking-tight text-foreground md:text-h2">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 text-body-md text-muted-foreground">{description}</p>
          ) : null}
        </header>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
