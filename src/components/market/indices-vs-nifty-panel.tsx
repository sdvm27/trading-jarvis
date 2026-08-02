"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RS_STRONG_THRESHOLD, isStrongRs } from "@/lib/sector-rs";
import {
  SECTOR_PERIOD_LABELS,
  type SectorPeriod,
} from "@/lib/nse-sectors";
import type { SectorPerformanceResult } from "@/lib/sector-performance";
import { FadeIn, ShimmerBar, Stagger } from "@/components/ui/motion";
import { RsSlider } from "@/components/ui/rs-slider";
import { InlineErrorCard } from "@/components/ui/inline-error-card";
import { parseFetchErrorBody } from "@/lib/parse-fetch-error";
import type { ReactNode } from "react";
import { cn, formatNumber } from "@/lib/utils";
import type { IndicesVsNiftyCategory } from "@/lib/nse-index-categories";
import { OutperformingCategoryStocksPanel } from "@/components/market/outperforming-category-stocks";

const PERIODS: SectorPeriod[] = ["1d", "1w", "1m", "3m", "6m", "1y"];

function pctClass(n: number) {
  if (!Number.isFinite(n)) return "text-zinc-500";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-red-400";
  return "text-zinc-400";
}

function RsBadge({
  score,
  threshold,
}: {
  score: number;
  threshold: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[2.25rem] justify-center rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums transition-all duration-200",
        isStrongRs(score, threshold)
          ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
          : "bg-zinc-800 text-zinc-400",
      )}
    >
      {score}
    </span>
  );
}

function IndexTable({
  title,
  rows,
  empty,
  hideTitle,
  rsThreshold,
  filterByRs,
  nameColumnLabel = "Index",
}: {
  title: string;
  rows: SectorPerformanceResult["sectors"];
  empty: string;
  hideTitle?: boolean;
  rsThreshold: number;
  filterByRs?: boolean;
  nameColumnLabel?: string;
}) {
  const display = filterByRs
    ? rows.filter((r) => r.rsScore >= rsThreshold)
    : rows;

  return (
    <div className="jarvis-card-hover rounded-xl border border-zinc-800 bg-zinc-900/30">
      {!hideTitle && (
        <h3 className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200">
          {title}
          <span className="ml-2 font-normal text-zinc-500">
            ({display.length}
            {filterByRs ? ` · RS≥${rsThreshold}` : ""})
          </span>
        </h3>
      )}
      {display.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="px-4 py-2 font-medium">{nameColumnLabel}</th>
                <th className="px-4 py-2 font-medium text-center">RS</th>
                <th className="px-4 py-2 font-medium text-right">Return</th>
                <th className="px-4 py-2 font-medium text-right">vs Nifty 50</th>
              </tr>
            </thead>
            <tbody>
              {display.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-zinc-800/60 last:border-0 jarvis-row-in transition-colors duration-200",
                    isStrongRs(row.rsScore, rsThreshold) && "bg-emerald-950/20",
                  )}
                  style={{ animationDelay: `${i * 30}ms`, opacity: 0 }}
                >
                  <td className="px-4 py-2.5 text-zinc-100">{row.name}</td>
                  <td className="px-4 py-2.5 text-center">
                    <RsBadge score={row.rsScore} threshold={rsThreshold} />
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums",
                      pctClass(row.returnPct),
                    )}
                  >
                    {formatNumber(row.returnPct, 2)}%
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums font-medium",
                      pctClass(row.vsNifty),
                    )}
                  >
                    {row.vsNifty >= 0 ? "+" : ""}
                    {formatNumber(row.vsNifty, 2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Props = {
  category: IndicesVsNiftyCategory;
  title: string;
  subtitle: ReactNode;
  rsPeerLabel: string;
};

export function IndicesVsNiftyPanel({
  category,
  title,
  subtitle,
  rsPeerLabel,
}: Props) {
  const [period, setPeriod] = useState<SectorPeriod>("1m");
  const [rsThreshold, setRsThreshold] = useState(RS_STRONG_THRESHOLD);
  const [filterOutperformers, setFilterOutperformers] = useState(true);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["indices-vs-nifty", category, period],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/indices-vs-nifty?category=${category}&period=${period}`,
      );
      if (!res.ok) {
        throw new Error(parseFetchErrorBody(await res.text()));
      }
      return res.json() as Promise<SectorPerformanceResult>;
    },
  });

  const strongOutperformers = useMemo(() => {
    if (!data) return [];
    return data.outperformers.filter((s) => s.rsScore >= rsThreshold);
  }, [data, rsThreshold]);

  return (
    <div className="space-y-4">
      <FadeIn className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-300">{title}</p>
          <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
          {data && (
            <p className="mt-1 text-xs text-zinc-600">
              Nifty 50:{" "}
              <span className={pctClass(data.nifty.returnPct)}>
                {formatNumber(data.nifty.returnPct, 2)}%
              </span>{" "}
              over {SECTOR_PERIOD_LABELS[period]} · RS = cross-sectional rank
              vs {rsPeerLabel} (0–100)
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs uppercase transition-all duration-200",
                period === p
                  ? "bg-emerald-600/25 text-emerald-300 scale-105"
                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={40}>
        <RsSlider
          value={rsThreshold}
          onChange={setRsThreshold}
          label="Minimum relative strength (RS)"
          className="max-w-md"
        />
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={filterOutperformers}
            onChange={(e) => setFilterOutperformers(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-900 transition-colors"
          />
          Filter outperforming table by slider
        </label>
      </FadeIn>

      {(isLoading || isFetching) && !data && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">Loading NSE index data…</p>
          <ShimmerBar />
        </div>
      )}
      {error && (
        <InlineErrorCard
          title="Could not load index performance"
          message={error instanceof Error ? error.message : "Failed to load"}
          hints={[
            "NSE history APIs can be rate-limited—wait a moment and retry.",
            "Try a shorter period (1m) if longer ranges time out.",
          ]}
        />
      )}

      {data && strongOutperformers.length > 0 && (
        <FadeIn delay={60}>
          <IndexTable
            title={`Strong RS (≥${rsThreshold}) & beating Nifty`}
            rows={strongOutperformers}
            empty=""
            rsThreshold={rsThreshold}
          />
        </FadeIn>
      )}

      {data && data.outperformers.length > 0 && (
        <OutperformingCategoryStocksPanel
          category={category}
          period={period}
          rsThreshold={rsThreshold}
        />
      )}

      {data && (
        <Stagger className="grid gap-4 lg:grid-cols-2">
          <IndexTable
            title="Outperforming Nifty 50"
            rows={data.outperformers}
            empty="No indices ahead of Nifty for this period."
            filterByRs={filterOutperformers}
            rsThreshold={rsThreshold}
          />
          <IndexTable
            title="Underperforming Nifty 50"
            rows={[...data.underperformers].sort(
              (a, b) => a.vsNifty - b.vsNifty,
            )}
            empty="All tracked indices are beating Nifty for this period."
            rsThreshold={rsThreshold}
          />
        </Stagger>
      )}

      {data && (
        <details className="jarvis-card-hover rounded-xl border border-zinc-800 bg-zinc-900/20 transition-colors">
          <summary className="cursor-pointer px-4 py-3 text-sm text-zinc-400 transition-colors hover:text-zinc-300">
            All indices (ranked by relative strength)
          </summary>
          <IndexTable
            title="All indices"
            hideTitle
            rows={data.sectors}
            empty=""
            rsThreshold={rsThreshold}
          />
        </details>
      )}

      <p className="text-[10px] text-zinc-600">
        Source: NSE India index history (daily close). Universe from NSE live
        index categories. RS = percentile of vs-Nifty within this group.
        Cached ~15 min. Not investment advice.
      </p>
    </div>
  );
}
