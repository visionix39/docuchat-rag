"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-iris-500 to-iris-600 text-white shadow-[0_6px_20px_-8px_rgba(124,58,237,0.9)] hover:from-iris-400 hover:to-iris-500 disabled:from-ink-700 disabled:to-ink-700 disabled:text-mist-500 disabled:shadow-none",
  ghost: "text-mist-300 hover:bg-white/5 hover:text-mist-100 disabled:text-ink-500",
  outline:
    "border border-white/10 bg-white/[0.03] text-mist-200 hover:bg-white/[0.07] hover:text-white disabled:text-ink-500",
  danger: "text-rose-400 hover:bg-rose-400/10 disabled:text-ink-500",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  icon: "h-8 w-8 justify-center",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = "outline",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`focus-ring inline-flex shrink-0 items-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
