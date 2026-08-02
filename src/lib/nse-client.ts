import { getCached, setCached } from "./cache";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export type NseIndexRow = {
  key: string;
  index: string;
  indexSymbol: string;
  last: number;
  percentChange: number;
  advances?: string;
  declines?: string;
};

async function nseCookie(): Promise<string> {
  const cached = getCached<string>("nse:cookie");
  if (cached) return cached;
  const res = await fetch("https://www.nseindia.com", {
    headers: { "User-Agent": UA },
  });
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  return setCached("nse:cookie", cookie, 10 * 60 * 1000);
}

export async function fetchNseAllIndices(): Promise<NseIndexRow[]> {
  const cacheKey = "nse:allIndices";
  const cached = getCached<NseIndexRow[]>(cacheKey);
  if (cached) return cached;

  const cookie = await nseCookie();
  const res = await fetch("https://www.nseindia.com/api/allIndices", {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://www.nseindia.com/market-data/live-market-indices",
      Cookie: cookie,
    },
  });
  if (!res.ok) throw new Error(`NSE allIndices ${res.status}`);
  const json = (await res.json()) as { data?: NseIndexRow[] };
  const rows = (json.data ?? []).map((r) => ({
    ...r,
    last: Number(r.last),
    percentChange: Number(r.percentChange),
  }));
  return setCached(cacheKey, rows, 5 * 60 * 1000);
}

export async function fetchNifty500Symbols(): Promise<string[]> {
  const cacheKey = "nse:nifty500-symbols";
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
    { headers: { "User-Agent": UA } },
  );
  if (!res.ok) throw new Error("Failed to fetch Nifty 500 list");
  const text = await res.text();
  const symbols = text
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",")[2]?.trim())
    .filter((s): s is string => Boolean(s));

  return setCached(cacheKey, symbols, 24 * 60 * 60 * 1000);
}

export type NseIndexHistoryRow = {
  EOD_INDEX_NAME: string;
  EOD_CLOSE_INDEX_VAL: number;
  EOD_TIMESTAMP: string;
};

function formatNseDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseNseEodDate(raw: string): string {
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const months: Record<string, string> = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };
    const mon = months[m[2].toUpperCase()];
    if (mon) {
      return `${m[3]}-${mon}-${m[1].padStart(2, "0")}`;
    }
  }
  return raw;
}

export function macroRangeToNseDates(range: string): {
  from: string;
  to: string;
} {
  const to = new Date();
  const days: Record<string, number> = {
    "1m": 31,
    "3m": 93,
    "6m": 186,
    "1y": 366,
    "5y": 366 * 5,
    max: 366 * 15,
  };
  const d = days[range] ?? 366;
  const from = new Date(to.getTime() - d * 86400000);
  return { from: formatNseDate(from), to: formatNseDate(to) };
}

export async function fetchNseIndexHistory(
  indexType: string,
  range = "1y",
): Promise<Array<{ date: string; value: number }>> {
  const cacheKey = `nse:index-hist:${indexType}:${range}`;
  const cached = getCached<Array<{ date: string; value: number }>>(cacheKey);
  if (cached) return cached;

  const { from, to } = macroRangeToNseDates(range);
  const cookie = await nseCookie();
  const url = new URL(
    "https://www.nseindia.com/api/historicalOR/indicesHistory",
  );
  url.searchParams.set("indexType", indexType);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://www.nseindia.com/reports-indices-historical-index-data",
      Cookie: cookie,
    },
  });
  if (!res.ok) throw new Error(`NSE index history ${res.status}`);

  const json = (await res.json()) as { data?: NseIndexHistoryRow[] };
  const points = (json.data ?? [])
    .map((row) => ({
      date: parseNseEodDate(row.EOD_TIMESTAMP),
      value: Number(row.EOD_CLOSE_INDEX_VAL),
    }))
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => a.date.localeCompare(b.date));

  return setCached(cacheKey, points, 30 * 60 * 1000);
}
