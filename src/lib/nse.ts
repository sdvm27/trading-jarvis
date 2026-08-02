const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

let cachedCookie = "";
let cookieAt = 0;

async function nseCookie(): Promise<string> {
  if (cachedCookie && Date.now() - cookieAt < 10 * 60 * 1000) {
    return cachedCookie;
  }
  const res = await fetch("https://www.nseindia.com", {
    headers: { "User-Agent": UA },
  });
  cachedCookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  cookieAt = Date.now();
  return cachedCookie;
}

export async function fetchNseAllIndices(): Promise<{
  data: NseIndexRow[];
}> {
  const cookie = await nseCookie();
  const res = await fetch("https://www.nseindia.com/api/allIndices", {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://www.nseindia.com/market-data/live-market-indices",
      Cookie: cookie,
    },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`NSE allIndices ${res.status}`);
  return res.json() as Promise<{ data: NseIndexRow[] }>;
}

export type NseIndexRow = {
  key: string;
  index: string;
  indexSymbol: string;
  last: number;
  variation: number;
  percentChange: number;
  advances?: string;
  declines?: string;
  unchanged?: string;
};

export async function fetchNifty500Symbols(): Promise<string[]> {
  const res = await fetch(
    "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
    { headers: { "User-Agent": UA }, next: { revalidate: 86400 } },
  );
  if (!res.ok) throw new Error("Nifty 500 list fetch failed");
  const text = await res.text();
  const lines = text.trim().split("\n").slice(1);
  const symbols: string[] = [];
  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length >= 3) {
      const sym = parts[2]?.trim();
      if (sym && sym !== "Symbol") symbols.push(sym);
    }
  }
  return [...new Set(symbols)];
}
