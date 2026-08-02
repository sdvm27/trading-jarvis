"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useCustomScreeners } from "@/hooks/use-dashboard-prefs";
import {
  chartinkStockUrl,
  findScreenerByQuery,
  parseScreenerInput,
  parseStockSymbol,
} from "@/lib/screeners";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  autoFocus?: boolean;
};

type DropdownRect = {
  top: number;
  left: number;
  width: number;
};

export function ScreenerSearchBar({ compact, autoFocus }: Props) {
  const router = useRouter();
  const { custom } = useCustomScreeners();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  const symbol = parseStockSymbol(query);
  const screenerSlug = parseScreenerInput(query);
  const screenerMatches = findScreenerByQuery(query, custom).slice(0, 8);

  const suggestions: Array<{
    key: string;
    label: string;
    hint: string;
    action: () => void;
  }> = [];

  if (symbol) {
    suggestions.push({
      key: `stock-${symbol}`,
      label: symbol,
      hint: "ChartInk stock + screener check",
      action: () => {
        router.push(`/screeners/stock/${encodeURIComponent(symbol)}`);
        setOpen(false);
        setQuery("");
      },
    });
    suggestions.push({
      key: `stock-ext-${symbol}`,
      label: `Open ${symbol} on ChartInk`,
      hint: "New tab",
      action: () => window.open(chartinkStockUrl(symbol), "_blank", "noopener"),
    });
  }

  if (screenerSlug) {
    suggestions.push({
      key: `scr-${screenerSlug}`,
      label: "Open screener in app",
      hint: screenerSlug,
      action: () => {
        router.push(`/screeners/${screenerSlug}`);
        setOpen(false);
        setQuery("");
      },
    });
  }

  if (query.trim()) {
    for (const s of screenerMatches) {
      if (suggestions.some((x) => x.key === `scr-${s.slug}`)) continue;
      suggestions.push({
        key: `match-${s.slug}`,
        label: s.title,
        hint: s.slug,
        action: () => {
          router.push(`/screeners/${s.slug}`);
          setOpen(false);
          setQuery("");
        },
      });
    }
  }

  if (query.trim() && parseScreenerInput(query) === null && query.includes("chartink")) {
    suggestions.push({
      key: "paste-url",
      label: "Open pasted ChartInk URL",
      hint: "External",
      action: () => {
        const url = query.trim().startsWith("http") ? query.trim() : `https://${query.trim()}`;
        window.open(url, "_blank", "noopener");
      },
    });
  }

  const updateDropdownPosition = useCallback(() => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const submit = useCallback(() => {
    if (!query.trim()) return;
    if (symbol) {
      router.push(`/screeners/stock/${encodeURIComponent(symbol)}`);
      setQuery("");
      setOpen(false);
      return;
    }
    const slug = parseScreenerInput(query);
    if (slug) {
      router.push(`/screeners/${slug}`);
      setQuery("");
      setOpen(false);
      return;
    }
    const matches = findScreenerByQuery(query);
    if (matches.length === 1) {
      router.push(`/screeners/${matches[0].slug}`);
      setQuery("");
      setOpen(false);
      return;
    }
    router.push(`/screeners?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  }, [query, router, symbol]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) {
      setDropdownRect(null);
      return;
    }
    updateDropdownPosition();
  }, [open, suggestions.length, query, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateDropdownPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      const portal = document.getElementById("screener-search-dropdown-portal");
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const showDropdown = open && suggestions.length > 0 && dropdownRect && mounted;

  const dropdown = showDropdown ? (
    <ul
      id="screener-search-dropdown-portal"
      className="fixed z-[9999] max-h-72 overflow-auto rounded-lg border border-zinc-600 bg-zinc-950 py-1 shadow-2xl ring-1 ring-zinc-700/80"
      style={{
        top: dropdownRect.top,
        left: dropdownRect.left,
        width: dropdownRect.width,
      }}
      role="listbox"
    >
      {suggestions.map((s, i) => (
        <li key={s.key}>
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            className={cn(
              "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
              i === active ? "bg-zinc-800" : "hover:bg-zinc-800",
            )}
            onMouseEnter={() => setActive(i)}
            onClick={() => s.action()}
          >
            <span className="font-medium text-zinc-100">{s.label}</span>
            <span className="text-xs text-zinc-500">{s.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div ref={wrapRef} className="relative isolate z-[60] w-full">
      <div
        ref={inputWrapRef}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3",
          compact ? "py-1.5" : "py-2",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
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
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (open && suggestions[active]) suggestions[active].action();
              else submit();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Symbol, screener name, or ChartInk URL…"
          className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          autoFocus={autoFocus}
          aria-label="Search stocks and screeners"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="screener-search-dropdown-portal"
        />
      </div>
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

export function ScreenerSearchHero() {
  return (
    <div className="relative z-30 overflow-visible rounded-xl border border-zinc-800 bg-zinc-950 p-6 jarvis-card-hover transition-colors">
      <h2 className="mb-1 text-lg font-medium text-zinc-100">Screener search</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Enter a symbol (e.g. RELIANCE), screener name, slug, or paste a ChartInk screener URL.
      </p>
      <div className="relative z-30 overflow-visible">
        <ScreenerSearchBar />
      </div>
    </div>
  );
}
