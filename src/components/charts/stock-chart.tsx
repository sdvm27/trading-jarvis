"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  ColorType,
} from "lightweight-charts";
import { ExternalLink } from "lucide-react";
import type { OhlcBar } from "@/lib/yahoo-chart";

type Props = {
  symbol: string;
  height?: number;
};

export function StockChart({ symbol, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-chart", symbol],
    queryFn: async () => {
      const res = await fetch(
        `/api/stock/${encodeURIComponent(symbol)}?range=1y`,
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<{ ohlc: OhlcBar[]; yahooSymbol: string }>;
    },
  });

  useEffect(() => {
    if (!containerRef.current || !data?.ohlc?.length) return;

    let chart: IChartApi | null = null;

    chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#18181b" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#34d399",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#34d399",
      wickDownColor: "#f87171",
    });

    series.setData(
      data.ohlc.map((b) => ({
        time: b.date as `${number}-${number}-${number}`,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart?.remove();
    };
  }, [data, height]);

  const tvUrl = `https://www.tradingview.com/chart/?symbol=NSE%3A${encodeURIComponent(symbol)}`;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <p className="text-sm text-zinc-400">
          Daily OHLC · {data?.yahooSymbol ?? `${symbol}.NS`}
        </p>
        <a
          href={tvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
        >
          Open on TradingView
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {isLoading && (
        <p className="p-8 text-center text-sm text-zinc-500">Loading chart…</p>
      )}
      {error && (
        <p className="p-8 text-center text-sm text-red-400">
          Could not load chart for this symbol.
        </p>
      )}
      {!isLoading && !error && (
        <div ref={containerRef} className="w-full" style={{ height }} />
      )}
    </div>
  );
}
