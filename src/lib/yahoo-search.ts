const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export type YahooSearchQuote = {
  symbol: string;
  label: string;
  type: string;
  score: number;
};

const BLOCKED_TYPES = new Set([
  "MUTUALFUND",
  "OPTION",
  "WARRANT",
  "CRYPTOCURRENCY",
]);

const TYPE_PRIORITY: Record<string, number> = {
  INDEX: 0,
  CURRENCY: 1,
  FUTURE: 2,
  ETF: 3,
  EQUITY: 4,
};

export async function searchYahooFinance(
  query: string,
  limit = 12,
): Promise<YahooSearchQuote[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", q);
  url.searchParams.set("quotesCount", String(Math.min(limit * 2, 25)));
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("listsCount", "0");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Yahoo search ${res.status}`);

  const json = (await res.json()) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      quoteType?: string;
      score?: number;
    }>;
  };

  const out: YahooSearchQuote[] = [];
  const seen = new Set<string>();

  for (const row of json.quotes ?? []) {
    const symbol = row.symbol?.trim();
    if (!symbol || seen.has(symbol)) continue;
    const type = row.quoteType ?? "";
    if (type && BLOCKED_TYPES.has(type)) continue;
    const label =
      row.shortname?.trim() ||
      row.longname?.trim() ||
      symbol;
    seen.add(symbol);
    out.push({
      symbol,
      label,
      type,
      score: Number(row.score) || 0,
    });
  }

  out.sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] ?? 5;
    const pb = TYPE_PRIORITY[b.type] ?? 5;
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });

  return out.slice(0, limit);
}

export async function searchYahooFinanceMerged(
  queries: string[],
  limit = 12,
): Promise<YahooSearchQuote[]> {
  const merged: YahooSearchQuote[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const batch = await searchYahooFinance(q, limit);
    for (const row of batch) {
      if (seen.has(row.symbol)) continue;
      seen.add(row.symbol);
      merged.push(row);
    }
  }

  merged.sort((a, b) => {
    const pa = TYPE_PRIORITY[a.type] ?? 5;
    const pb = TYPE_PRIORITY[b.type] ?? 5;
    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });

  return merged.slice(0, limit);
}
