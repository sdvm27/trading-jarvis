"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  LineSeries,
} from "lightweight-charts";
import type { SeriesPoint } from "@/lib/macro-series";

type Props = {
  data: SeriesPoint[];
  height?: number;
  color?: string;
};

export function TimeSeriesChart({
  data,
  height = 220,
  color = "#34d399",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    let chart: IChartApi | null = null;
    let series: ISeriesApi<"Line"> | null = null;

    chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" },
      },
      rightPriceScale: { borderColor: "#3f3f46" },
      timeScale: { borderColor: "#3f3f46" },
    });

    series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
    });

    series.setData(
      data.map((d) => ({
        time: d.date as `${number}-${number}-${number}`,
        value: d.value,
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
  }, [data, height, color]);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-500"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}
