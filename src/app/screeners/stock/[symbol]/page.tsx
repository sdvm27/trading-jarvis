"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ScreenerPanel } from "@/components/screeners/screener-panel";
import {
  SCREENERS,
  chartinkStockUrl,
  screenerUrl,
} from "@/lib/screeners";
import { rowMatchesSymbol } from "@/lib/chartink";
import { StockChart } from "@/components/charts/stock-chart";

export default function StockScreenerPage() {
  const params = useParams();
  const symbol = decodeURIComponent(String(params.symbol ?? "")).toUpperCase();
  const pinned = SCREENERS.filter((s) => s.pinned);

  const checks = useQuery({
    queryKey: ["stock-screener-check", symbol],
    queryFn: async () => {
      const results: Array<{ slug: string; title: string; match: boolean }> = [];
      await Promise.all(
        pinned.map(async (s) => {
          const res = await fetch(`/api/screeners/${s.slug}`);
          let match = false;
          if (res.ok) {
            const json = (await res.json()) as { rows: Record<string, unknown>[] };
            match = (json.rows ?? []).some((r) =>
              rowMatchesSymbol(r as Record<string, string | number>, symbol),
            );
          }
          results.push({ slug: s.slug, title: s.title, match });
        }),
      );
      return results;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Stock</p>
          <h1 className="text-3xl font-semibold text-zinc-50">{symbol}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            ChartInk stock page + pinned screener membership
          </p>
        </div>
        <a
          href={chartinkStockUrl(symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-600/30"
        >
          Open on ChartInk
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-300">
          Pinned screener matches
        </h2>
        {checks.isLoading && (
          <p className="text-sm text-zinc-500">Checking screeners…</p>
        )}
        <ul className="space-y-2">
          {(checks.data ?? []).map((r) => (
            <li
              key={r.slug}
              className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <Link
                href={`/screeners/${r.slug}`}
                className="text-zinc-200 hover:text-emerald-400"
              >
                {r.title}
              </Link>
              <span
                className={
                  r.match
                    ? "text-emerald-400"
                    : "text-zinc-600"
                }
              >
                {r.match ? "In scan" : "Not in scan / unknown"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-600">
          Membership uses in-app ChartInk results when available; otherwise open
          the screener on ChartInk.
        </p>
      </div>

      <StockChart symbol={symbol} height={420} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">
          Open a screener for this stock
        </h2>
        <div className="flex flex-wrap gap-2">
          {SCREENERS.map((s) => (
            <a
              key={s.slug}
              href={screenerUrl(s.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {pinned[0] && (
        <ScreenerPanel
          slug={pinned[0].slug}
          title={`${pinned[0].title} (highlight ${symbol})`}
          highlightSymbol={symbol}
        />
      )}
    </div>
  );
}
