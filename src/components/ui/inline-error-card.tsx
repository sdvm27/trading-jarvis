import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  message?: string;
  hints?: string[];
  children?: ReactNode;
  className?: string;
};

export function InlineErrorCard({
  title,
  message,
  hints,
  children,
  className,
}: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-900/50 bg-red-950/25 px-4 py-4",
        className,
      )}
    >
      <div className="flex gap-3">
        <CircleAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium text-red-200">{title}</p>
          {message && (
            <p className="text-sm leading-relaxed text-red-200/80">{message}</p>
          )}
          {hints && hints.length > 0 && (
            <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-400">
              {hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
