"use client";

import { useEffect, useRef } from "react";

type Props = {
  symbol: string;
  height?: number;
};

export function TradingViewChart({ symbol, height = 400 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com",
    });
    ref.current.appendChild(script);
  }, [symbol]);

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-800"
      style={{ height }}
    >
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}
