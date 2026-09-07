"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
  action,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-mist-200">{label}</span>
        {action}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-mist-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-lg border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 transition-colors hover:border-white/20";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; title?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-lg border border-white/10 bg-ink-900/80 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`focus-ring flex-1 rounded-[7px] px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
            value === option.value
              ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "text-mist-400 hover:text-mist-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-mist-200">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-mist-500">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`focus-ring relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-iris-500" : "bg-ink-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className="focus-ring h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-600 accent-iris-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-iris-400 [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(139,92,246,0.25)]"
    />
  );
}
