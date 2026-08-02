"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { isStrongRs } from "@/lib/sector-rs";
import type { SectorPeriod } from "@/lib/nse-sectors";
import type { IndicesVsNiftyCategory } from "@/lib/nse-index-categories";
import type { IndexCategoryStocksRsResult } from "@/lib/index-category-stock-rs";
import { FadeIn, ShimmerBar } from "@/components/ui/motion";
import { InlineErrorCard } from "@/components/ui/inline-error-card";
import { parseFetchErrorBody } from "@/lib/parse-fetch-error";
import { cn, formatNumber } from "@/lib/utils";

const TOP_STOCKS_SHOWN = 12;

function pctClass(n: number) {
  if (!Number.isFinite(n)) return "text-zinc-500";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-zinc-400";
}

type Props = {
  category: IndicesVsNiftyCategory;
  period: SectorPeriod;
  rsThreshold: number;
};

const CATEGORY_LABEL: Record<IndicesVsNiftyCategory, string> = {
  broad: "broad market",
  thematic: "thematic",
};

export function OutperformingCategoryStocksPanel({
  category,
  period,
  rsThreshold,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["index-category-stocks-rs", category, period],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/index-category-stocks?category=${category}&period=${period}`,
      );
      if (!res.ok) {
        throw new Error(parseFetchErrorBody(await res.text()));
      }
      return res.json() as Promise<IndexCategoryStocksRsResult>;
    },
    staleTime: 15 * 60 * 1000,
  });

  const blocks = useMemo(() => {
    if (!data) return [];
    return data.indices.map((block) => ({
      ...block,
      filtered: block.stocks
        .filter((s) => s.rsScore >= rsThreshold)
        .slice(0, TOP_STOCKS_SHOWN),
    }));
  }, [data, rsThreshold]);

  const blocksWithStocks = blocks.filter((b) => b.filtered.length > 0);

  if (isLoading) {
    return (
      <FadeIn className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm text-zinc-500">
          <span className="jarvis-pulse-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Loading top stocks for outperforming {CATEGORY_LABEL[category]}{" "}
          indices…
        </p>
        <ShimmerBar />
      </FadeIn>
    );
  }

  if (error) {
    return (
      <InlineErrorCard
        title="Stock RS unavailable"
        message={error instanceof Error ? error.message : "Failed to load"}
        hints={[
          "First load can take a few minutes (Yahoo + NSE constituents).",
          "Retry after the index tables above have loaded.",
        ]}
      />
    );
  }

  if (!blocksWithStocks.length) {
    return (
      <p className="text-sm text-zinc-500">
        No constituent stocks at RS ≥ {rsThreshold} for outperforming{" "}
        {CATEGORY_LABEL[category]} indices this period. Lower the RS slider or
        try another timeframe.
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
          Top stocks in outperforming {CATEGORY_LABEL[category]} indices
        </h3>
        <p className="text-xs text-zinc-500">
          Constituents from NSE (live index basket or archive CSV) · Nifty{" "}
          {formatNumber(data!.niftyReturnPct, 2)}% over period · only stocks
          with RS ≥ {rsThreshold}
        </p>
      </div>

      <div className="space-y-2 px-2 pb-3">
        {blocksWithStocks.map((block, i) => {
          const list = block.filtered;
          const open = expanded[block.index.id] ?? i < 2;

          return (
            <FadeIn
              key={block.index.id}
              delay={120 + i * 40}
              className="jarvis-card-hover rounded-lg border border-zinc-800/80 bg-zinc-950/40"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/50"
                onClick={() =>
                  setExpanded((e) => ({
                    ...e,
                    [block.index.id]: !open,
                  }))
                }
              >
                <span className="text-sm font-medium text-zinc-200">
                  {block.index.name}
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    index RS {block.index.rsScore} · vs Nifty{" "}
                    {block.index.vsNifty >= 0 ? "+" : ""}
                    {formatNumber(block.index.vsNifty, 2)}%
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
                    {list.length} shown
                  </span>
                </span>
              </button>

              <div
                className="jarvis-accordion-grid border-t border-zinc-800/80"
                data-open={open ? "true" : "false"}
              >
                <div className="jarvis-accordion-inner">
                  <div className="overflow-x-auto">
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
                                  "inline-block min-w-[2rem] rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums",
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
                  </div>
                  <p className="px-3 py-2 text-[10px] text-zinc-600">
                    {block.constituentsScanned} constituents from NSE · RS vs
                    Nifty within this index basket.
                  </p>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </FadeIn>
  );
}
