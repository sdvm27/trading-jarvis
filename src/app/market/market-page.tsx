"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { VsNiftyTabsSection } from "@/components/market/vs-nifty-tabs-section";
import {
  EmaCrossoverPanel,
  NiftyHeatmapPanel,
} from "@/components/market/ema-heatmap-panels";

type MarketTab = "vs-nifty" | "ema" | "heatmap";

const TABS: { id: MarketTab; label: string }[] = [
  { id: "vs-nifty", label: "Indices vs Nifty 50" },
  { id: "ema", label: "EMA crossovers" },
  { id: "heatmap", label: "Nifty heatmap" },
];

export default function MarketPageClient() {
  const [tab, setTab] = useState<MarketTab>("vs-nifty");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Market data</h1>
        <p className="text-sm text-zinc-500">
          Sectoral, broad & thematic RS vs Nifty 50, EMA scans, and NSE heatmap
        </p>
      </div>

      <div
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-zinc-800 px-4 pb-px sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Market views"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-t-md px-4 py-2 text-sm transition-colors",
              tab === t.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "vs-nifty" && <VsNiftyTabsSection />}
      {tab === "ema" && <EmaCrossoverPanel />}
      {tab === "heatmap" && <NiftyHeatmapPanel />}
    </div>
  );
}
