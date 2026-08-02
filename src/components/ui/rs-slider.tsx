"use client";

import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  compact?: boolean;
};

export function RsSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label = "Min RS",
  className,
  compact,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50",
        compact ? "px-3 py-2" : "px-4 py-3",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span
          key={value}
          className="jarvis-rs-pop text-sm font-semibold tabular-nums text-emerald-400"
        >
          ≥ {value}
        </span>
      </div>
      <div className="relative flex items-center">
        <div
          className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-emerald-500/35 transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="jarvis-rs-slider relative z-10 w-full cursor-pointer appearance-none bg-transparent"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={`${label}: ${value}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
