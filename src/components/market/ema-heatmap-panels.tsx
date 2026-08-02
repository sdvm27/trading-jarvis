"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FadeIn, ShimmerBar } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import type { EmaScanResult } from "@/lib/ema-crossover";

type Timeframe = "daily" | "weekly";
type Direction = "bullish" | "bearish";

function heatColor(pct: number): string {
  if (pct >= 2) return "bg-emerald-600/90";
  if (pct >= 1) return "bg-emerald-600/60";
  if (pct >= 0.25) return "bg-emerald-700/40";
  if (pct > -0.25) return "bg-zinc-700/60";
  if (pct > -1) return "bg-red-900/40";
  if (pct > -2) return "bg-red-800/60";
  return "bg-red-700/90";
}

export function EmaCrossoverPanel() {
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [direction, setDirection] = useState<Direction>("bullish");

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["ema-crossover", timeframe, direction],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/ema-crossover?timeframe=${timeframe}&direction=${direction}`,
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<EmaScanResult>;
    },
    staleTime: 6 * 60 * 60 * 1000,
  });

  return (
    <div className="space-y-4">
      <FadeIn>
        <p className="text-sm text-zinc-500">
          Nifty 500 · 50 EMA vs 200 EMA crossover on the{" "}
          <strong className="font-medium text-zinc-300">latest</strong> bar
          {direction === "bullish"
            ? " (50 crosses above 200)"
            : " (50 crosses below 200)"}
        </p>
      </FadeIn>

      <div className="flex flex-wrap gap-2">
        {(["daily", "weekly"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTimeframe(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs capitalize transition-all",
              timeframe === t
                ? "bg-emerald-600/25 text-emerald-300"
                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t}
          </button>
        ))}
        {(["bullish", "bearish"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs capitalize transition-all",
              direction === d
                ? d === "bullish"
                  ? "bg-emerald-600/30 text-emerald-200"
                  : "bg-red-900/40 text-red-300"
                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      {(isLoading || isFetching) && !data && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">
            Scanning Nifty 500 (first run may take 1–3 min)…
          </p>
          <ShimmerBar />
        </div>
      )}
      {error && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "Scan failed"}
        </p>
      )}

      {data && (
        <FadeIn className="rounded-xl border border-zinc-800 bg-zinc-900/30">
          <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-400">
            <span className="text-zinc-100">{data.matches.length}</span> matches
            · scanned {data.scanned} symbols
            {data.note && (
              <span className="mt-1 block text-xs text-zinc-600">{data.note}</span>
            )}
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-900 text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Symbol</th>
                  <th className="px-4 py-2 text-right">Close</th>
                  <th className="px-4 py-2 text-right">EMA 50</th>
                  <th className="px-4 py-2 text-right">EMA 200</th>
                </tr>
              </thead>
              <tbody>
                {data.matches.map((m) => (
                  <tr
                    key={m.symbol}
                    className="border-t border-zinc-800/60 jarvis-row-in"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/screeners/stock/${encodeURIComponent(m.symbol)}`}
                        className="font-medium text-emerald-400 hover:underline"
                      >
                        {m.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {m.close.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-300">
                      {m.ema50.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-400">
                      {m.ema200.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.matches.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No fresh crossovers on this timeframe today.
              </p>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

export function NiftyHeatmapPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["nse-heatmap"],
    queryFn: async () => {
      const res = await fetch("/api/market/heatmap");
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{
        groups: Array<{
          category: string;
          indices: Array<{
            name: string;
            percentChange: number;
            last: number;
          }>;
        }>;
        asOf: string;
      }>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-zinc-500">Loading NSE index heatmap…</p>
        <ShimmerBar />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        {error instanceof Error ? error.message : "Heatmap failed"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        NSE live indices by category (% change). Inspired by{" "}
        <a
          href="https://www.nseindia.com/market-data/live-market-indices/heatmap"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          NSE heatmap
        </a>
        .
      </p>
      {data?.groups.map((group, gi) => (
        <FadeIn key={group.category} delay={gi * 30}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {group.category}
          </h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.indices.map((idx) => (
              <div
                key={idx.name}
                className={cn(
                  "jarvis-card-hover rounded-md p-2.5 transition-transform",
                  heatColor(idx.percentChange),
                )}
                title={`${idx.name}: ${idx.percentChange}%`}
              >
                <p className="truncate text-[11px] font-medium text-zinc-100">
                  {idx.name}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
                  {idx.percentChange >= 0 ? "+" : ""}
                  {idx.percentChange.toFixed(2)}%
                </p>
                <p className="text-[10px] tabular-nums text-zinc-200/80">
                  {idx.last.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      ))}
      <p className="text-[10px] text-zinc-600">
        Updated {data?.asOf ? new Date(data.asOf).toLocaleString("en-IN") : "—"}
        · Cached ~5 min
      </p>
    </div>
  );
}
