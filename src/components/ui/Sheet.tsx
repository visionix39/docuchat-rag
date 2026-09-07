"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  side?: "right" | "center";
  width?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  side = "center",
  width = "max-w-lg",
  children,
  footer,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isSide = side === "right";

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-sm"
      />
      <div
        className={
          isSide
            ? `slide-in-right relative ml-auto flex h-full w-full ${width} flex-col border-l border-white/10 bg-ink-900/95 shadow-2xl`
            : `rise relative m-auto flex max-h-[88vh] w-full ${width} flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl`
        }
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-white">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-mist-400">{subtitle}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <footer className="border-t border-white/10 bg-ink-950/40 px-5 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
