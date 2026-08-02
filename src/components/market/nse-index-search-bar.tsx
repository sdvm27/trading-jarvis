"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Hit = {
  index: string;
  indexSymbol: string;
  category: string;
  last: number;
  percentChange: number;
};

type Props = {
  value: string;
  onChange: (indexName: string) => void;
};

export function NseIndexSearchBar({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["nse-index-search", debounced],
    queryFn: async () => {
      const res = await fetch(
        `/api/market/nse-indices/search?q=${encodeURIComponent(debounced)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json() as Promise<{ indices: Hit[] }>;
    },
    enabled: open && debounced.length >= 1,
    staleTime: 60_000,
  });

  const hits = data?.indices ?? [];
  const loading = debounced !== query.trim() || isFetching;

  const pick = (name: string) => {
    onChange(name);
    setQuery("");
    setDebounced("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Index
        </span>
        <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-sm text-zinc-100">
          {value}
        </span>
        {value !== "NIFTY 500" && (
          <button
            type="button"
            onClick={() => onChange("NIFTY 500")}
            className="text-xs text-emerald-400 hover:underline"
          >
            Reset to Nifty 500
          </button>
        )}
      </div>
      <div className="relative max-w-md">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (query.trim()) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && hits[active]) {
                e.preventDefault();
                pick(hits[active].index);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Search NSE index (e.g. NIFTY BANK)…"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            aria-label="Search NSE indices"
            aria-expanded={open && hits.length > 0}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebounced("");
                setOpen(false);
              }}
              className="text-zinc-500 hover:text-zinc-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {open && debounced && (
          <ul
            className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
            role="listbox"
          >
            {loading && (
              <li className="px-3 py-2 text-xs text-zinc-500">Searching…</li>
            )}
            {!loading && hits.length === 0 && (
              <li className="px-3 py-2 text-xs text-zinc-500">
                No NSE indices found.
              </li>
            )}
            {!loading &&
              hits.map((hit, i) => (
                <li key={hit.index}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(hit.index)}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                      i === active ? "bg-zinc-800" : "hover:bg-zinc-800/80",
                    )}
                  >
                    <span className="font-medium text-zinc-100">{hit.index}</span>
                    <span className="text-xs text-zinc-500">
                      {hit.category} · {hit.last.toLocaleString("en-IN")} (
                      {hit.percentChange >= 0 ? "+" : ""}
                      {hit.percentChange.toFixed(2)}%)
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
