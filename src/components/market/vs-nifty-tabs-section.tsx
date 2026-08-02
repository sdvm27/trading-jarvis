"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectorsVsNiftyPanel } from "@/components/market/sectors-vs-nifty";
import { IndicesVsNiftyPanel } from "@/components/market/indices-vs-nifty-panel";

type VsNiftyTab = "sectors" | "broader" | "thematic";

const VS_NIFTY_TABS: { id: VsNiftyTab; label: string }[] = [
  { id: "sectors", label: "Sectoral" },
  { id: "broader", label: "Broader market" },
  { id: "thematic", label: "Thematic" },
];

export function VsNiftyTabsSection() {
  const [tab, setTab] = useState<VsNiftyTab>("sectors");

  return (
    <div className="space-y-4">
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40 p-1"
        role="tablist"
        aria-label="Index group vs Nifty 50"
      >
        {VS_NIFTY_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "sectors" && <SectorsVsNiftyPanel />}
      {tab === "broader" && (
        <IndicesVsNiftyPanel
          category="broad"
          title="Broader market indices"
          subtitle={
            <>
              NSE <span className="text-zinc-300">Broad Market Indices</span> vs{" "}
              <span className="text-zinc-300">Nifty 50</span> (price return)
            </>
          }
          rsPeerLabel="other broad indices in this group"
        />
      )}
      {tab === "thematic" && (
        <IndicesVsNiftyPanel
          category="thematic"
          title="Thematic indices"
          subtitle={
            <>
              NSE <span className="text-zinc-300">Thematic Indices</span> vs{" "}
              <span className="text-zinc-300">Nifty 50</span> (price return)
            </>
          }
          rsPeerLabel="other thematic indices in this group"
        />
      )}
    </div>
  );
}
