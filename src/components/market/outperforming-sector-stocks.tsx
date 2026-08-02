"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RS_STRONG_THRESHOLD, isStrongRs } from "@/lib/sector-rs";
import type { SectorPeriod } from "@/lib/nse-sectors";
import type { SectorStocksRsResult } from "@/lib/sector-stock-rs";
import { FadeIn, ShimmerBar } from "@/components/ui/motion";
import { cn, formatNumber } from "@/lib/utils";
import Link from "next/link";

function pctClass(n: number) {
  if (!Number.isFinite(n)) return "text-zinc-500";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-zinc-400";
}

type Props = {
  period: SectorPeriod;
  rsThreshold: number;
};

export function OutperformingSectorStocksPanel({ period, rsThreshold }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["sector-stocks-rs", period],
    queryFn: async () => {
      const res = await fetch(`/api/market/sector-stocks?period=${period}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<SectorStocksRsResult>;
    },
  });

  const sectorsWithFiltered = useMemo(() => {
    if (!data) return [];
    return data.sectors.map((block) => ({
      ...block,
      filtered: block.stocks.filter((s) => s.rsScore >= rsThreshold),
    }));
  }, [data, rsThreshold]);

  if (isLoading) {
    return (
      <FadeIn className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <span className="jarvis-pulse-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Loading stock RS for outperforming sectors…
        </p>
        <ShimmerBar />
      </FadeIn>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">
        {error instanceof Error ? error.message : "Failed to load stock RS"}
      </p>
    );
  }

  if (!data?.sectors.length) {
    return (
      <p className="text-sm text-zinc-500">
        No outperforming sectors for this period — no stock RS to show.
      </p>
    );
  }

  return (
    <FadeIn
      delay={80}
      className={cn(
        "space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/30 transition-opacity duration-300",
        isFetching && "opacity-80",
      )}
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-medium text-zinc-100">
          Stock RS in outperforming sectors
        </h3>
        <p className="text-xs text-zinc-500">
          RS (0–100) ranks each stock vs Nifty within its sector basket ·
          Nifty {formatNumber(data.niftyReturnPct, 2)}% over period · showing
          RS ≥ {rsThreshold}
        </p>
      </div>

      <div className="space-y-2 px-2 pb-3">
        {sectorsWithFiltered.map((block, i) => {
          const list = block.filtered;
          const open = expanded[block.sector.id] ?? true;

          return (
            <FadeIn
              key={block.sector.id}
              delay={120 + i * 40}
              className="jarvis-card-hover rounded-lg border border-zinc-800/80 bg-zinc-950/40"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/50"
                onClick={() =>
                  setExpanded((e) => ({
                    ...e,
                    [block.sector.id]: !open,
                  }))
                }
              >
                <span className="text-sm font-medium text-zinc-200">
                  {block.sector.name}
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    sector RS {block.sector.rsScore} · vs Nifty{" "}
                    {block.sector.vsNifty >= 0 ? "+" : ""}
                    {formatNumber(block.sector.vsNifty, 2)}%
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  <span
                    className={cn(
                      "transition-transform duration-300",
                      open && "rotate-180",
                    )}
                  >
                    ▾
                  </span>
                  <span className="text-emerald-400/80 tabular-nums">
                    {list.length} stocks
                  </span>
                </span>
              </button>

              <div
                className="jarvis-accordion-grid border-t border-zinc-800/80"
                data-open={open ? "true" : "false"}
              >
                <div className="jarvis-accordion-inner">
                  <div className="overflow-x-auto">
                    {list.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-zinc-500">
                        No stocks with RS ≥ {rsThreshold} in this sector basket.
                      </p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-xs text-zinc-500">
                            <th className="px-3 py-2 font-medium">Symbol</th>
                            <th className="px-3 py-2 font-medium text-center">
                              RS
                            </th>
                            <th className="px-3 py-2 font-medium text-right">
                              Return
                            </th>
                            <th className="px-3 py-2 font-medium text-right">
                              vs Nifty
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((st, ri) => (
                            <tr
                              key={st.symbol}
                              className={cn(
                                "border-t border-zinc-800/50 jarvis-row-in",
                                isStrongRs(st.rsScore, rsThreshold) &&
                                  "bg-emerald-950/15",
                              )}
                              style={{
                                animationDelay: `${ri * 25}ms`,
                                opacity: 0,
                              }}
                            >
                              <td className="px-3 py-2">
                                <Link
                                  href={`/screeners/stock/${encodeURIComponent(st.symbol)}`}
                                  className="font-medium text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
                                >
                                  {st.symbol}
                                </Link>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={cn(
                                    "inline-block min-w-[2rem] rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums transition-colors duration-200",
                                    isStrongRs(st.rsScore, rsThreshold)
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-zinc-800 text-zinc-400",
                                  )}
                                >
                                  {st.rsScore}
                                </span>
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 text-right tabular-nums",
                                  pctClass(st.returnPct),
                                )}
                              >
                                {formatNumber(st.returnPct, 2)}%
                              </td>
                              <td
                                className={cn(
                                  "px-3 py-2 text-right tabular-nums",
                                  pctClass(st.vsNifty),
                                )}
                              >
                                {st.vsNifty >= 0 ? "+" : ""}
                                {formatNumber(st.vsNifty, 2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>

      <p className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600">
        Constituents: liquid Nifty sector index names (subset). RS = percentile
        of vs-Nifty return within that sector&apos;s basket.
      </p>
    </FadeIn>
  );
}
