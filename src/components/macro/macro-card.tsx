"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";
import { macroDetailHref, macroSparkApiUrl } from "@/lib/macro-keys";

export function MacroCard({
  id,
  href,
  fallbackLabel,
}: {
  id: string;
  href?: string;
  fallbackLabel?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["macro-spark", id],
    queryFn: async () => {
      const res = await fetch(macroSparkApiUrl(id, "6m"));
      if (!res.ok) throw new Error("macro fetch failed");
      return res.json() as Promise<{
        label: string;
        unit: string;
        latest: number | null;
        points: { date: string; value: number }[];
      }>;
    },
  });

  const latest = data?.latest;
  const spark = data?.points?.slice(-30) ?? [];
  const min = Math.min(...spark.map((p) => p.value), latest ?? 0);
  const max = Math.max(...spark.map((p) => p.value), latest ?? 0);
  const range = max - min || 1;

  return (
    <Link
      href={href ?? macroDetailHref(id)}
      className="jarvis-card-hover block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-emerald-900/40"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {data?.label ?? fallbackLabel ?? id}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
        {isLoading ? "…" : latest != null ? formatNumber(latest) : "—"}
        {data?.unit && data.unit !== "x" ? (
          <span className="ml-1 text-sm font-normal text-zinc-500">{data.unit}</span>
        ) : null}
      </p>
      <svg
        className="mt-3 h-10 w-full text-emerald-500"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        aria-hidden
      >
        {spark.length > 1 && (
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            points={spark
              .map((p, i) => {
                const x = (i / (spark.length - 1)) * 100;
                const y = 22 - ((p.value - min) / range) * 20;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        )}
      </svg>
    </Link>
  );
}
