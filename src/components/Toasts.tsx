"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useStore } from "@/lib/store";

const TONE = {
  error: { icon: AlertTriangle, className: "border-rose-400/30 bg-rose-500/12 text-rose-100" },
  success: { icon: CheckCircle2, className: "border-lime-400/25 bg-lime-400/10 text-lime-50" },
  info: { icon: Info, className: "border-white/12 bg-ink-800/95 text-mist-100" },
} as const;

export function Toasts() {
  const toasts = useStore((state) => state.toasts);
  const dismiss = useStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const { icon: Icon, className } = TONE[toast.tone];
        return (
          <div
            key={toast.id}
            className={`rise pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-snug shadow-xl backdrop-blur ${className}`}
          >
            <Icon className="mt-px h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 break-words">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="focus-ring -mr-1 rounded p-0.5 opacity-60 transition hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
