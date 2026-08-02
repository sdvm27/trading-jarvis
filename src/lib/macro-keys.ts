import { isMacroSeriesId, MACRO_META, type MacroSeriesId } from "./macro-series";

export const NSE_MACRO_PREFIX = "nse:";
export const YAHOO_MACRO_PREFIX = "yahoo:";

export type MacroPulseKey =
  | MacroSeriesId
  | `${typeof NSE_MACRO_PREFIX}${string}`
  | `${typeof YAHOO_MACRO_PREFIX}${string}`;

export function nseMacroKey(indexName: string): MacroPulseKey {
  return `${NSE_MACRO_PREFIX}${indexName}`;
}

export function yahooMacroKey(symbol: string): MacroPulseKey {
  return `${YAHOO_MACRO_PREFIX}${symbol}`;
}

export function parseNseMacroKey(key: string): string | null {
  if (!key.startsWith(NSE_MACRO_PREFIX)) return null;
  const index = key.slice(NSE_MACRO_PREFIX.length);
  return index.length > 0 ? index : null;
}

export function parseYahooMacroKey(key: string): string | null {
  if (!key.startsWith(YAHOO_MACRO_PREFIX)) return null;
  const symbol = key.slice(YAHOO_MACRO_PREFIX.length);
  return symbol.length > 0 ? symbol : null;
}

export function isMacroPulseKey(key: string): boolean {
  return (
    isMacroSeriesId(key) ||
    parseNseMacroKey(key) !== null ||
    parseYahooMacroKey(key) !== null
  );
}

export function macroSparkApiUrl(key: string, range = "6m"): string {
  const yahoo = parseYahooMacroKey(key);
  if (yahoo) {
    return `/api/macro/custom?symbol=${encodeURIComponent(yahoo)}&range=${range}`;
  }
  const index = parseNseMacroKey(key);
  if (index) {
    return `/api/macro/nse-index?index=${encodeURIComponent(index)}&range=${range}`;
  }
  return `/api/macro/${encodeURIComponent(key)}?range=${range}`;
}

export function macroDetailHref(key: string): string {
  const yahoo = parseYahooMacroKey(key);
  if (yahoo) {
    return `/macro?yahoo=${encodeURIComponent(yahoo)}`;
  }
  const index = parseNseMacroKey(key);
  if (index) {
    return `/macro?nseIndex=${encodeURIComponent(index)}`;
  }
  return `/macro?series=${encodeURIComponent(key)}`;
}

export function searchBuiltinMacros(q: string): MacroSeriesId[] {
  const lower = q.trim().toLowerCase();
  if (!lower) return [];
  const tokens = lower.split(/\s+/).filter(Boolean);
  const ids = Object.keys(MACRO_META) as MacroSeriesId[];

  const scored = ids
    .map((id) => {
      const label = MACRO_META[id].label.toLowerCase();
      const desc = MACRO_META[id].description.toLowerCase();
      let score = 0;
      if (id === lower || label === lower) score += 100;
      if (id.includes(lower) || label.includes(lower)) score += 40;
      if (desc.includes(lower)) score += 20;
      for (const t of tokens) {
        if (id.includes(t)) score += 15;
        if (label.includes(t)) score += 12;
        if (desc.includes(t)) score += 6;
      }
      return { id, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.id);
}

export function parseYahooSymbolInput(input: string): string | null {
  const t = input.trim();
  if (t.length < 1 || t.length > 24) return null;
  if (/\s/.test(t)) return null;
  if (/^[A-Z0-9^=$.@%-]{1,24}$/i.test(t)) return t;
  return null;
}

const YAHOO_SEARCH_ALIASES: Record<string, string> = {
  wti: "CL=F",
  crude: "CL=F",
  oil: "CL=F",
  dow: "^DJI",
  sp500: "^GSPC",
  "s&p": "^GSPC",
  nasdaq: "^IXIC",
  gold: "GC=F",
  silver: "SI=F",
  brent: "BZ=F",
  usdinr: "INR=X",
};

export function resolveYahooSearchQueries(q: string): string[] {
  const trimmed = q.trim();
  const lower = trimmed.toLowerCase();
  const set = new Set<string>();
  if (trimmed) set.add(trimmed);
  const alias = YAHOO_SEARCH_ALIASES[lower];
  if (alias) set.add(alias);
  return [...set];
}

export { parseNseIndexInput, resolveNseIndexAlias } from "./nse-index-search";
