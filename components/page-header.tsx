import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: ReactNode;
  divider?: boolean;
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  divider = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-6",
        divider && "border-b border-border pb-6 mb-8",
        className
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary shrink-0 shadow-xs border border-brand-primary/5">
            <Icon className="size-6 shrink-0" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-heading text-h3 font-bold tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-body-sm text-muted-foreground leading-normal">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-center">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
