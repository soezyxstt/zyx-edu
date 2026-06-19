"use client";

import * as React from "react";
import { CircleCheck, Info, AlertTriangle, AlertCircle, Loader2, X } from "lucide-react";

export interface Toast {
  id: string;
  message: string;
  description?: string;
  type: "success" | "error" | "info" | "warning" | "default" | "loading";
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

const TOAST_ADD_EVENT = "zyx-toast-add";
const TOAST_UPDATE_EVENT = "zyx-toast-update";
const TOAST_DISMISS_EVENT = "zyx-toast-dismiss";

export const toast = (message: string, options?: ToastOptions) => {
  if (typeof window === "undefined") return "";
  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent(TOAST_ADD_EVENT, {
    detail: { id, message, type: "default", ...options },
  });
  window.dispatchEvent(event);
  return id;
};

toast.success = (message: string, options?: ToastOptions) => {
  if (typeof window === "undefined") return "";
  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent(TOAST_ADD_EVENT, {
    detail: { id, message, type: "success", ...options },
  });
  window.dispatchEvent(event);
  return id;
};

toast.error = (message: string, options?: ToastOptions) => {
  if (typeof window === "undefined") return "";
  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent(TOAST_ADD_EVENT, {
    detail: { id, message, type: "error", ...options },
  });
  window.dispatchEvent(event);
  return id;
};

toast.info = (message: string, options?: ToastOptions) => {
  if (typeof window === "undefined") return "";
  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent(TOAST_ADD_EVENT, {
    detail: { id, message, type: "info", ...options },
  });
  window.dispatchEvent(event);
  return id;
};

toast.warning = (message: string, options?: ToastOptions) => {
  if (typeof window === "undefined") return "";
  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent(TOAST_ADD_EVENT, {
    detail: { id, message, type: "warning", ...options },
  });
  window.dispatchEvent(event);
  return id;
};

toast.promise = <T,>(
  promise: Promise<T>,
  options: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  if (typeof window === "undefined") return;
  const id = Math.random().toString(36).substring(2, 9);

  const loadingEvent = new CustomEvent(TOAST_ADD_EVENT, {
    detail: { id, message: options.loading, type: "loading", duration: 100000 },
  });
  window.dispatchEvent(loadingEvent);

  promise
    .then((data) => {
      const msg = typeof options.success === "function" ? options.success(data) : options.success;
      const successEvent = new CustomEvent(TOAST_UPDATE_EVENT, {
        detail: { id, message: msg, type: "success", duration: 4000 },
      });
      window.dispatchEvent(successEvent);
    })
    .catch((err) => {
      const msg = typeof options.error === "function" ? options.error(err) : options.error;
      const errorEvent = new CustomEvent(TOAST_UPDATE_EVENT, {
        detail: { id, message: msg, type: "error", duration: 4000 },
      });
      window.dispatchEvent(errorEvent);
    });
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const activeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

    const addTimeout = (id: string, duration: number) => {
      if (activeTimeouts.has(id)) {
        clearTimeout(activeTimeouts.get(id));
      }
      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        activeTimeouts.delete(id);
      }, duration);
      activeTimeouts.set(id, timeout);
    };

    const handleAdd = (e: Event) => {
      const customEvent = e as CustomEvent<Toast>;
      const newToast = customEvent.detail;
      const duration = newToast.duration ?? 4000;

      setToasts((prev) => [...prev, newToast]);
      addTimeout(newToast.id, duration);
    };

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<Toast> & { id: string }>;
      const updatedToast = customEvent.detail;

      setToasts((prev) =>
        prev.map((t) => (t.id === updatedToast.id ? { ...t, ...updatedToast } : t))
      );

      const duration = updatedToast.duration ?? 4000;
      addTimeout(updatedToast.id, duration);
    };

    const handleDismiss = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      const { id } = customEvent.detail;
      setToasts((prev) => prev.filter((t) => t.id !== id));
      if (activeTimeouts.has(id)) {
        clearTimeout(activeTimeouts.get(id));
        activeTimeouts.delete(id);
      }
    };

    window.addEventListener(TOAST_ADD_EVENT, handleAdd);
    window.addEventListener(TOAST_UPDATE_EVENT, handleUpdate);
    window.addEventListener(TOAST_DISMISS_EVENT, handleDismiss);

    return () => {
      window.removeEventListener(TOAST_ADD_EVENT, handleAdd);
      window.removeEventListener(TOAST_UPDATE_EVENT, handleUpdate);
      window.removeEventListener(TOAST_DISMISS_EVENT, handleDismiss);
      activeTimeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 z-[100] flex w-full max-w-[420px] -translate-x-1/2 flex-col gap-2 px-4 pointer-events-none">
      {toasts.map((t) => {
        let Icon = Info;
        let iconClass = "text-foreground";

        if (t.type === "success") {
          Icon = CircleCheck;
          iconClass = "text-status-success";
        } else if (t.type === "error") {
          Icon = AlertCircle;
          iconClass = "text-status-error";
        } else if (t.type === "warning") {
          Icon = AlertTriangle;
          iconClass = "text-status-warning";
        } else if (t.type === "info") {
          Icon = Info;
          iconClass = "text-status-info";
        } else if (t.type === "loading") {
          Icon = Loader2;
          iconClass = "text-muted-foreground animate-spin";
        }

        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className="pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <Icon className={`size-5 shrink-0 ${iconClass}`} />
            <div className="flex-grow space-y-1">
              <div className="text-body-sm font-sans font-semibold text-foreground">
                {t.message}
              </div>
              {t.description && (
                <div className="text-body-sm font-sans text-muted-foreground">
                  {t.description}
                </div>
              )}
              {t.action && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      t.action?.onClick();
                      const dismissEvent = new CustomEvent(TOAST_DISMISS_EVENT, {
                        detail: { id: t.id },
                      });
                      window.dispatchEvent(dismissEvent);
                    }}
                    className="text-body-sm font-sans font-semibold text-primary hover:underline pointer-events-auto cursor-pointer"
                  >
                    {t.action.label}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                const dismissEvent = new CustomEvent(TOAST_DISMISS_EVENT, {
                  detail: { id: t.id },
                });
                window.dispatchEvent(dismissEvent);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors rounded p-0.5"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
