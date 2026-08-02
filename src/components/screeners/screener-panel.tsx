"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { ChartinkRow } from "@/lib/chartink";
import { screenerUrl } from "@/lib/screeners";
import { cn, formatNumber } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
  highlightSymbol?: string;
};

function pickColumns(row: ChartinkRow): { symbol: string; extras: string[] } {
  const entries = Object.entries(row);
  let symbol = "—";
  const extras: string[] = [];
  for (const [, v] of entries) {
    const s = String(v);
    if (symbol === "—" && /^[A-Z][A-Z0-9&.-]{0,15}$/.test(s)) {
      symbol = s;
      continue;
    }
    if (typeof v === "number") extras.push(formatNumber(v));
    else if (s.length < 40) extras.push(s);
  }
  return { symbol, extras: extras.slice(0, 4) };
}

export function ScreenerPanel({ slug, title, highlightSymbol }: Props) {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["screener", slug],
    queryFn: async () => {
      const res = await fetch(`/api/screeners/${slug}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{
        rows: ChartinkRow[];
        warning?: string;
        fetchedAt: string;
      }>;
    },
  });

  const rows = data?.rows ?? [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="font-medium text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-500">{slug}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
          <a
            href={screenerUrl(slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/30"
          >
            Open on ChartInk
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {data?.warning && (
        <p className="border-b border-amber-900/50 bg-amber-950/30 px-4 py-2 text-xs text-amber-200/90">
          {data.warning}
        </p>
      )}

      {isLoading && (
        <p className="p-6 text-sm text-zinc-500">Loading screener…</p>
      )}
      {error && (
        <p className="p-6 text-sm text-red-400">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Symbol</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                    No rows in-app — use ChartInk for full scan.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => {
                  const { symbol, extras } = pickColumns(row);
                  const hi =
                    highlightSymbol &&
                    symbol.toUpperCase() === highlightSymbol.toUpperCase();
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-zinc-800/60",
                        hi && "bg-emerald-950/40",
                      )}
                    >
                      <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                      <td className="px-4 py-2 font-medium">
                        <Link
                          href={`/screeners/stock/${encodeURIComponent(symbol)}`}
                          className="text-emerald-400 hover:underline"
                        >
                          {symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-xs text-zinc-400">
                        {extras.join(" · ")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {data?.fetchedAt && (
        <p className="px-4 py-2 text-[10px] text-zinc-600">
          Fetched {new Date(data.fetchedAt).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}
