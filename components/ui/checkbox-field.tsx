"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps extends React.ComponentProps<typeof Checkbox> {
  label: string | React.ReactNode;
  description?: string | React.ReactNode;
  error?: string;
  required?: boolean;
}

const CheckboxField = React.forwardRef<HTMLButtonElement, CheckboxFieldProps>(
  ({ className, label, description, error, required, id, ...props }, ref) => {
    const uniqueId = React.useId();
    const checkboxId = id || uniqueId;

    return (
      <div className={cn("flex flex-col gap-1.5 w-full", className)}>
        <div className="flex items-start gap-3">
          <Checkbox
            id={checkboxId}
            ref={ref}
            required={required}
            aria-invalid={!!error}
            className={cn(
              error && "border-status-error data-[state=checked]:bg-status-error data-[state=checked]:border-status-error"
            )}
            {...props}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor={checkboxId}
              className="font-heading text-body-sm font-semibold tracking-tight text-foreground cursor-pointer select-none"
            >
              {label}
              {required && <span className="ml-1 text-status-error" aria-hidden="true">*</span>}
            </Label>
            {description && (
              <div className="text-body-sm text-muted-foreground leading-normal">
                {description}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div 
            className="flex items-start gap-1.5 text-body-sm text-status-error font-medium pl-7 animate-in fade-in slide-in-from-top-1 duration-150"
            role="alert"
          >
            <TriangleAlert className="size-4 shrink-0 mt-0.5" />
            <span className="leading-normal">{error}</span>
          </div>
        )}
      </div>
    );
  }
);

CheckboxField.displayName = "CheckboxField";

export { CheckboxField };
export type { CheckboxFieldProps };
