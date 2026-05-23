"use client";

import { useEffect, useState } from "react";
import { Settings, RefreshCw, Sparkles, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SimulatorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<string>("essential");
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    const savedPlan = localStorage.getItem("zyx-user-plan");
    if (savedPlan) {
      setPlan(savedPlan);
    } else {
      localStorage.setItem("zyx-user-plan", "essential");
    }
  }, []);

  function handlePlanChange(newPlan: string) {
    setPlan(newPlan);
    localStorage.setItem("zyx-user-plan", newPlan);
    // Trigger custom event to notify other components
    window.dispatchEvent(new Event("zyx-plan-changed"));
  }

  function resetDailyQuiz() {
    // Clear all daily quiz local storage keys
    const keys = Object.keys(localStorage);
    let count = 0;
    for (const key of keys) {
      if (key.startsWith("zyx-daily-quiz-")) {
        localStorage.removeItem(key);
        count++;
      }
    }
    window.dispatchEvent(new Event("zyx-daily-quiz-reset"));
    alert(`Berhasil mereset kuis harian! (${count} kuis direset)`);
  }

  function resetTryoutAttempts() {
    const keys = Object.keys(localStorage);
    let count = 0;
    for (const key of keys) {
      if (key.startsWith("zyx-tryout-attempts-")) {
        localStorage.removeItem(key);
        count++;
      }
    }
    window.dispatchEvent(new Event("zyx-tryout-attempts-reset"));
    alert(`Berhasil mereset percobaan tryout! (${count} riwayat direset)`);
  }

  function copyActivationToken() {
    navigator.clipboard.writeText("TPB-CALC1-2026");
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {isOpen ? (
        <div className="w-80 rounded-3xl border border-brand-secondary/40 bg-card/95 p-5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-heading text-body-base font-bold text-brand-secondary flex items-center gap-2">
              <Sparkles className="size-4 animate-pulse" />
              Simulasi Pengaturan
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <span className="sr-only">Tutup</span>
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Plan Tiers selector */}
            <div className="space-y-1.5">
              <label htmlFor="sim-plan" className="text-body-xs font-semibold text-foreground flex items-center gap-1.5">
                Paket Berlangganan:
              </label>
              <select
                id="sim-plan"
                value={plan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-body-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value="free">Gratis (Free)</option>
                <option value="minimal">Minimal (Terkunci Video)</option>
                <option value="essential">Essential (Terbuka Video)</option>
                <option value="premium">Premium (Terbuka Video)</option>
              </select>
              <p className="text-[11px] text-muted-foreground leading-normal flex items-start gap-1">
                <Info className="size-3 text-brand-primary shrink-0 mt-0.5" />
                <span>Pembahasan video hanya terbuka untuk paket <b>Essential</b> atau lebih tinggi.</span>
              </p>
            </div>

            {/* Quick resets */}
            <div className="space-y-2">
              <span className="text-body-xs font-semibold text-foreground block">
                Reset State (Local Storage):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetDailyQuiz}
                  className="text-body-xs gap-1 py-1 h-auto rounded-xl"
                >
                  <RefreshCw className="size-3" />
                  Kuis Harian
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetTryoutAttempts}
                  className="text-body-xs gap-1 py-1 h-auto rounded-xl"
                >
                  <RefreshCw className="size-3" />
                  Tryout 2x
                </Button>
              </div>
            </div>

            {/* Enrollment Helper */}
            <div className="rounded-xl bg-brand-primary/5 border border-brand-primary/20 p-3 text-body-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1">
                Token Kelas TPB:
              </span>
              <p className="leading-relaxed">Gunakan token di bawah pada pratinjau kelas untuk membuka modul berbayar:</p>
              <button
                type="button"
                onClick={copyActivationToken}
                className="mt-1 flex w-full items-center justify-between rounded-lg bg-background border border-border px-2 py-1 font-mono text-[11px] hover:bg-muted text-foreground transition-colors"
              >
                <span>TPB-CALC1-2026</span>
                {copiedText ? (
                  <span className="text-status-success flex items-center gap-0.5">
                    <Check className="size-3" /> Copied
                  </span>
                ) : (
                  <span className="text-brand-primary">Copy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex size-12 items-center justify-center rounded-full bg-linear-to-r from-brand-secondary to-brand-primary text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          title="Buka panel simulasi"
        >
          <Settings className="size-6 animate-spin-slow" />
        </button>
      )}
    </div>
  );
}
