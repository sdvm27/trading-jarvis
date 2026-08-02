"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectorsVsNiftyPanel } from "@/components/market/sectors-vs-nifty";
import {
  EmaCrossoverPanel,
  NiftyHeatmapPanel,
} from "@/components/market/ema-heatmap-panels";

type MarketTab = "sectors" | "ema" | "heatmap";

const TABS: { id: MarketTab; label: string }[] = [
  { id: "sectors", label: "Sectors vs Nifty" },
  { id: "ema", label: "EMA crossovers" },
  { id: "heatmap", label: "Nifty heatmap" },
];

export default function MarketPageClient() {
  const [tab, setTab] = useState<MarketTab>("sectors");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Market data</h1>
        <p className="text-sm text-zinc-500">
          Sector RS, Nifty 500 EMA scans, and NSE index heatmap
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm transition-colors",
              tab === t.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sectors" && <SectorsVsNiftyPanel />}
      {tab === "ema" && <EmaCrossoverPanel />}
      {tab === "heatmap" && <NiftyHeatmapPanel />}
    </div>
  );
}
