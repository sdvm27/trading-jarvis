"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { MACRO_META, MACRO_SERIES_IDS, type MacroSeriesId } from "@/lib/macro-series";
import { macroSparkApiUrl } from "@/lib/macro-keys";
import { cn } from "@/lib/utils";

const SERIES: MacroSeriesId[] = MACRO_SERIES_IDS;
const RANGES = ["1m", "6m", "1y", "5y", "max"] as const;

export default function MacroPageClient() {
  const searchParams = useSearchParams();
  const yahooParam = searchParams.get("yahoo")?.trim() ?? "";
  const nseParam = searchParams.get("nseIndex")?.trim() ?? "";
  const seriesParam = searchParams.get("series") ?? "nifty-pb";
  const initialBuiltin = SERIES.includes(seriesParam as MacroSeriesId)
    ? (seriesParam as MacroSeriesId)
    : "nifty-pb";

  const [activeBuiltin, setActiveBuiltin] =
    useState<MacroSeriesId>(initialBuiltin);
  const [yahooSymbol, setYahooSymbol] = useState(yahooParam);
  const [nseIndex, setNseIndex] = useState(nseParam);
  const [range, setRange] = useState<(typeof RANGES)[number]>("1y");

  const activeKey = yahooSymbol
    ? `yahoo:${yahooSymbol}`
    : nseIndex
      ? `nse:${nseIndex}`
      : activeBuiltin;

  const { data, isLoading, error } = useQuery({
    queryKey: ["macro", activeKey, range],
    queryFn: async () => {
      const res = await fetch(macroSparkApiUrl(activeKey, range));
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{
        label: string;
        unit: string;
        description: string;
        latest: number | null;
        points: { date: string; value: number }[];
      }>;
    },
  });

  const meta = yahooSymbol
    ? {
        label: data?.label ?? yahooSymbol,
        description:
          data?.description ?? `Yahoo Finance (${yahooSymbol}, daily close)`,
      }
    : nseIndex
      ? {
          label: data?.label ?? nseIndex,
          description:
            data?.description ?? `NSE India index (${nseIndex}, daily close)`,
        }
      : MACRO_META[activeBuiltin];

  const customActive = Boolean(yahooSymbol || nseIndex);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Macro</h1>
        <p className="text-sm text-zinc-500">{meta.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SERIES.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setYahooSymbol("");
              setNseIndex("");
              setActiveBuiltin(id);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm",
              !customActive && activeBuiltin === id
                ? "bg-emerald-600/25 text-emerald-300"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200",
            )}
          >
            {MACRO_META[id].label}
          </button>
        ))}
        {yahooSymbol && (
          <span className="rounded-lg bg-violet-600/20 px-3 py-1.5 text-sm text-violet-200">
            {data?.label ?? yahooSymbol}
          </span>
        )}
        {nseIndex && (
          <span className="rounded-lg bg-sky-600/20 px-3 py-1.5 text-sm text-sky-200">
            {data?.label ?? nseIndex}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs uppercase",
              range === r
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
        {error && (
          <p className="text-sm text-red-400">
            {error instanceof Error ? error.message : "Error"}
          </p>
        )}
        {data && (
          <>
            <p className="mb-4 text-3xl font-semibold tabular-nums">
              {data.latest?.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              }) ?? "—"}
              <span className="ml-2 text-base font-normal text-zinc-500">
                {data.unit}
              </span>
            </p>
            <TimeSeriesChart data={data.points} height={360} />
          </>
        )}
      </div>
    </div>
  );
}
