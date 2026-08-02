import { getCached, setCached } from "./cache";

export type SeriesPoint = { date: string; value: number };

export type MacroSeriesId =
  | "nifty-pb"
  | "nifty-pe"
  | "usd-inr"
  | "brent"
  | "india-vix"
  | "nifty-50"
  | "gold";

export const MACRO_SERIES_IDS: MacroSeriesId[] = [
  "nifty-pb",
  "nifty-pe",
  "usd-inr",
  "india-vix",
  "brent",
  "nifty-50",
  "gold",
];

const TIGZIG_IDS: Record<string, string> = {
  "nifty-pb": "in_nifty50_pb",
  "nifty-pe": "in_nifty50_pe",
  "usd-inr": "INR=X",
  brent: "BZ=F",
};

const YAHOO_MACRO: Record<string, string> = {
  "india-vix": "^INDIAVIX",
  "nifty-50": "^NSEI",
  gold: "GC=F",
};

export function isMacroSeriesId(id: string): id is MacroSeriesId {
  return (MACRO_SERIES_IDS as string[]).includes(id);
}

export async function fetchMacroSeries(
  id: MacroSeriesId,
  from?: string,
  range = "1y",
): Promise<SeriesPoint[]> {
  const cacheKey = `macro:${id}:${from ?? "default"}:${range}`;
  const cached = getCached<SeriesPoint[]>(cacheKey);
  if (cached) return cached;

  const yahooId = YAHOO_MACRO[id];
  if (yahooId) {
    const { fetchYahooSeries } = await import("./yahoo-chart");
    let points = await fetchYahooSeries(yahooId, range);
    if (from) {
      points = points.filter((p) => p.date >= from);
    }
    return setCached(cacheKey, points, 30 * 60 * 1000);
  }

  const tigzigId = TIGZIG_IDS[id];
  if (!tigzigId) throw new Error(`Unknown macro series: ${id}`);
  const fromDate =
    from ??
    (id === "nifty-pb" || id === "nifty-pe"
      ? "2015-01-01"
      : new Date(Date.now() - 365 * 5 * 86400000).toISOString().slice(0, 10));

  const url = `https://api.tigzig.com/v2/series?ids=${encodeURIComponent(tigzigId)}&from=${fromDate}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Tigzig error ${res.status}`);
  const json = (await res.json()) as {
    data: Array<Record<string, string | number>>;
  };
  const points: SeriesPoint[] = (json.data ?? [])
    .map((row) => {
      const date = String(row.date);
      const value = Number(row[tigzigId]);
      return { date, value };
    })
    .filter((p) => Number.isFinite(p.value));
  return setCached(cacheKey, points, 60 * 60 * 1000);
}

export const MACRO_META: Record<
  MacroSeriesId,
  { label: string; unit: string; description: string }
> = {
  "nifty-pb": {
    label: "Nifty 50 P/B",
    unit: "x",
    description: "NSE Nifty 50 price-to-book (valuation)",
  },
  "nifty-pe": {
    label: "Nifty 50 P/E",
    unit: "x",
    description: "NSE Nifty 50 price-to-earnings (valuation)",
  },
  "usd-inr": {
    label: "USD / INR",
    unit: "₹",
    description: "USDINR daily",
  },
  brent: {
    label: "Brent crude",
    unit: "$",
    description: "Brent futures (daily)",
  },
  "india-vix": {
    label: "India VIX",
    unit: "",
    description: "India VIX (^INDIAVIX, daily)",
  },
  "nifty-50": {
    label: "Nifty 50",
    unit: "pts",
    description: "Nifty 50 index (^NSEI, daily)",
  },
  gold: {
    label: "Gold",
    unit: "$",
    description: "Gold futures (GC=F, daily)",
  },
};
