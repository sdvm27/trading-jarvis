"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { MacroCard } from "@/components/macro/macro-card";
import { Stagger } from "@/components/ui/motion";
import { useMacroPulse } from "@/hooks/use-dashboard-prefs";
import {
  macroDetailHref,
  nseMacroKey,
  yahooMacroKey,
} from "@/lib/macro-keys";
import { isMacroSeriesId } from "@/lib/macro-series";
import { cn } from "@/lib/utils";

type SearchResult =
  | { kind: "builtin"; id: string; label: string; hint: string }
  | { kind: "nse"; index: string; label: string; hint: string }
  | { kind: "yahoo"; symbol: string; label: string; hint: string }
  | { kind: "direct-nse"; index: string; label: string; hint: string }
  | { kind: "direct-yahoo"; symbol: string; label: string; hint: string };

type SearchPayload = {
  builtin: Array<{ id: string; label: string; hint: string }>;
  nse: Array<{
    index: string;
    indexSymbol: string;
    category: string;
    last: number;
    percentChange: number;
  }>;
  yahoo: Array<{ symbol: string; label: string; type: string }>;
  directNseIndex: string | null;
  directYahooSymbol: string | null;
  error?: string;
};

function resultKey(item: SearchResult): string {
  switch (item.kind) {
    case "builtin":
      return `b-${item.id}`;
    case "nse":
    case "direct-nse":
      return `n-${item.index}`;
    case "yahoo":
    case "direct-yahoo":
      return `y-${item.symbol}`;
  }
}

function buildResults(
  ids: string[],
  searchData: SearchPayload | undefined,
  debounced: string,
): SearchResult[] {
  if (!debounced || !searchData) return [];

  const results: SearchResult[] = [];
  const seenNse = new Set<string>();
  const seenYahoo = new Set<string>();

  if (searchData.directYahooSymbol) {
    const symbol = searchData.directYahooSymbol;
    const key = yahooMacroKey(symbol);
    if (!ids.includes(key) && !seenYahoo.has(symbol)) {
      seenYahoo.add(symbol);
      results.push({
        kind: "direct-yahoo",
        symbol,
        label: `Use ticker ${symbol}`,
        hint: "Yahoo Finance · add directly",
      });
    }
  }

  if (searchData.directNseIndex) {
    const index = searchData.directNseIndex;
    const key = nseMacroKey(index);
    if (!ids.includes(key) && !seenNse.has(index)) {
      seenNse.add(index);
      results.push({
        kind: "direct-nse",
        index,
        label: index,
        hint: "NSE India · add by index name",
      });
    }
  }

  for (const b of searchData.builtin) {
    if (ids.includes(b.id)) continue;
    results.push({
      kind: "builtin",
      id: b.id,
      label: b.label,
      hint: b.hint,
    });
  }

  for (const row of searchData.nse ?? []) {
    if (seenNse.has(row.index)) continue;
    const key = nseMacroKey(row.index);
    if (ids.includes(key)) continue;
    seenNse.add(row.index);
    const chg =
      row.percentChange >= 0
        ? `+${row.percentChange.toFixed(2)}%`
        : `${row.percentChange.toFixed(2)}%`;
    results.push({
      kind: "nse",
      index: row.index,
      label: row.index,
      hint: `NSE · ${row.category} · ${row.last.toLocaleString("en-IN")} (${chg})`,
    });
  }

  for (const row of searchData.yahoo ?? []) {
    if (seenYahoo.has(row.symbol)) continue;
    const key = yahooMacroKey(row.symbol);
    if (ids.includes(key)) continue;
    seenYahoo.add(row.symbol);
    results.push({
      kind: "yahoo",
      symbol: row.symbol,
      label: row.label,
      hint: row.type
        ? `Yahoo · ${row.symbol} · ${row.type}`
        : `Yahoo · ${row.symbol}`,
    });
  }

  return results;
}

function sourceBadge(kind: SearchResult["kind"]) {
  switch (kind) {
    case "builtin":
      return (
        <span className="ml-2 text-[10px] font-normal uppercase text-emerald-600/90">
          Tigzig
        </span>
      );
    case "nse":
    case "direct-nse":
      return (
        <span className="ml-2 text-[10px] font-normal uppercase text-sky-600/90">
          NSE
        </span>
      );
    case "yahoo":
    case "direct-yahoo":
      return (
        <span className="ml-2 text-[10px] font-normal uppercase text-violet-500/90">
          Yahoo
        </span>
      );
  }
}

export function MacroPulseSection() {
  const { ids, addBuiltin, addNseIndex, addYahoo, remove, labelFor, ready } =
    useMacroPulse();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const trimmed = query.trim();
  const waitingDebounce = trimmed.length > 0 && trimmed !== debounced;

  const { data: searchData, isFetching, isError } = useQuery({
    queryKey: ["macro-search", debounced],
    queryFn: async () => {
      const res = await fetch(
        `/api/macro/search?q=${encodeURIComponent(debounced)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<SearchPayload>;
    },
    enabled: adding && debounced.length >= 1,
    staleTime: 60_000,
  });

  const results = useMemo(
    () => buildResults(ids, searchData, debounced),
    [ids, searchData, debounced],
  );

  useEffect(() => {
    setActive(0);
  }, [debounced, results.length]);

  const pick = (item: SearchResult) => {
    if (item.kind === "builtin" && isMacroSeriesId(item.id)) {
      addBuiltin(item.id);
    } else if (
      item.kind === "nse" ||
      item.kind === "direct-nse"
    ) {
      addNseIndex(item.index, item.label);
    } else if (
      item.kind === "yahoo" ||
      item.kind === "direct-yahoo"
    ) {
      const label =
        item.kind === "direct-yahoo" ? item.symbol : item.label;
      addYahoo(item.symbol, label);
    }
    setQuery("");
    setDebounced("");
    setAdding(false);
  };

  const showPanel = adding && trimmed.length > 0;
  const loading = waitingDebounce || isFetching;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Macro pulse
      </h2>
      <Stagger
        className={cn(
          "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
          !ready && "opacity-0",
        )}
      >
        {ids.map((id) => (
          <div key={id} className="group relative">
            <MacroCard
              id={id}
              href={macroDetailHref(id)}
              fallbackLabel={labelFor(id)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                remove(id);
              }}
              className="absolute right-2 top-2 rounded-md border border-zinc-700 bg-zinc-950/90 p-1 text-zinc-400 opacity-0 transition hover:text-zinc-100 group-hover:opacity-100"
              aria-label={`Remove ${labelFor(id)}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {adding ? (
          <div className="rounded-xl border border-dashed border-emerald-800/60 bg-zinc-900/40 p-4 sm:col-span-2 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Search metrics
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Tigzig macros, NSE indices (NIFTY BANK, INDIA VIX), or global
              tickers via Yahoo (^GSPC, CL=F, INR=X).
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (results[active]) pick(results[active]);
                  } else if (e.key === "Escape") {
                    setAdding(false);
                    setQuery("");
                    setDebounced("");
                  }
                }}
                placeholder="Search name or ticker…"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                aria-label="Search macro metrics"
                aria-expanded={showPanel && results.length > 0}
              />
            </div>
            {showPanel && (
              <ul
                className="mt-2 max-h-52 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 py-1"
                role="listbox"
              >
                {loading && (
                  <li className="px-3 py-2 text-xs text-zinc-500">Searching…</li>
                )}
                {!loading && isError && (
                  <li className="px-3 py-2 text-xs text-amber-400">
                    Search failed — try a full NSE name or Yahoo ticker.
                  </li>
                )}
                {!loading && searchData?.error && results.length > 0 && (
                  <li className="px-3 py-2 text-xs text-amber-500/90">
                    {searchData.error} (partial results shown)
                  </li>
                )}
                {!loading && !isError && results.length === 0 && (
                  <li className="px-3 py-2 text-xs text-zinc-500">
                    No matches — try &ldquo;bank nifty&rdquo;, &ldquo;dow&rdquo;,
                    or &ldquo;^GSPC&rdquo;.
                  </li>
                )}
                {!loading &&
                  results.map((item, i) => (
                    <li key={resultKey(item)}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(item)}
                        className={cn(
                          "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                          i === active ? "bg-zinc-800" : "hover:bg-zinc-800/80",
                        )}
                      >
                        <span className="font-medium text-zinc-100">
                          {item.label}
                          {sourceBadge(item.kind)}
                        </span>
                        <span className="text-xs text-zinc-500">{item.hint}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setQuery("");
                  setDebounced("");
                }}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/20 text-sm text-zinc-400 transition hover:border-emerald-800/50 hover:text-emerald-400"
          >
            <Plus className="h-5 w-5" />
            Add new
          </button>
        )}
      </Stagger>
    </section>
  );
}
