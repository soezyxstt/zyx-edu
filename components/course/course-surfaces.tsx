import { cn } from "@/lib/utils";

/** List row / interactive link card */
export function courseListRowClass(className?: string) {
  return cn(
    "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/65 px-4 py-3 backdrop-blur-md",
    "transition-all duration-200",
    "hover:border-primary/30 hover:bg-card hover:shadow-xs",
    className,
  );
}

/** Static card (quiz grid, overview tiles inner) */
export function courseCardClass(className?: string) {
  return cn(
    "rounded-2xl border border-border/60 bg-card/65 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-primary/30 hover:bg-card hover:shadow-md",
    className,
  );
}
