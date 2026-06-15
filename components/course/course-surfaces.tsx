import { cn } from "@/lib/utils";

/** Base / static student card (dashboard panels, calendar panels, static lists) */
export function studentCardClass(className?: string) {
  return cn(
    "rounded-2xl border border-border/60 bg-card/65 p-6 shadow-xs backdrop-blur-md",
    className,
  );
}

/** Interactive / hoverable / link card (course catalog, interactive tiles, list rows) */
export function studentInteractiveCardClass(className?: string) {
  return cn(
    "group relative flex flex-col rounded-2xl border border-border/60 bg-card/65 p-6 shadow-sm backdrop-blur-md",
    "transition-all duration-300",
    "hover:-translate-y-1 hover:border-brand-primary/45 hover:bg-card hover:shadow-md hover:shadow-brand-primary/5",
    className,
  );
}

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
    "rounded-2xl border border-border/60 bg-card/65 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-primary/30 hover:bg-card hover:shadow-md",
    className,
  );
}
