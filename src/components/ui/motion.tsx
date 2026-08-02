import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

/** Fade + slide in on mount */
export function FadeIn({
  children,
  className,
  delay = 0,
}: Props) {
  return (
    <div
      className={cn("jarvis-fade-in motion-reduce:opacity-100", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("jarvis-stagger", className)}>{children}</div>;
}

export function PulseDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 jarvis-pulse-dot",
        className,
      )}
      aria-hidden
    />
  );
}

export function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-2 overflow-hidden rounded-full bg-zinc-800",
        className,
      )}
    >
      <div className="jarvis-shimmer h-full w-1/2 rounded-full bg-zinc-700/80" />
    </div>
  );
}
