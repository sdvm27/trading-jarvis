import { getCached, setCached } from "./cache";
import type { SectorPeriod } from "./nse-sectors";
import { periodToYahooRange } from "./nse-sectors";
import type { SectorPerformanceRow } from "./sector-performance";
import { fetchYahooCloseSeries, nseYahooSymbol } from "./yahoo-chart";
import { tryFetchNseIndexConstituents } from "./nse-index-constituents";
import type { IndicesVsNiftyCategory } from "./nse-index-categories";
import {
  NSE_CATEGORY_BROAD,
  NSE_CATEGORY_THEMATIC,
} from "./nse-index-categories";
import { fetchIndexCategoryPerformance } from "./index-category-performance";

export type IndexStockRow = {
  symbol: string;
  returnPct: number;
  vsNifty: number;
  rsScore: number;
};

export type OutperformingIndexStocks = {
  index: SectorPerformanceRow;
  stocks: IndexStockRow[];
  constituentsScanned: number;
  skipped?: string;
};

export type IndexCategoryStocksRsResult = {
  period: SectorPeriod;
  category: IndicesVsNiftyCategory;
  niftyReturnPct: number;
  indices: OutperformingIndexStocks[];
  asOf: string;
};

const MAX_OUTPERFORMERS_TO_SCAN = 12;
const MAX_CONSTITUENTS_PER_INDEX = 60;
const STOCK_CONCURRENCY = 6;

function computeReturn(
  closes: number[],
  period: SectorPeriod,
): number | null {
  const valid = closes.filter((c) => Number.isFinite(c));
  if (valid.length < 2) return null;
  const last = valid[valid.length - 1]!;

  if (period === "1d") {
    const prev = valid[valid.length - 2]!;
    return ((last - prev) / prev) * 100;
  }
  if (period === "1w") {
    const idx = Math.max(0, valid.length - 6);
    return ((last - valid[idx]!) / valid[idx]!) * 100;
  }
  const start = valid[0]!;
  return ((last - start) / start) * 100;
}

function scoreStocks(
  rows: Omit<IndexStockRow, "rsScore">[],
): IndexStockRow[] {
  const n = rows.length;
  if (n === 0) return [];
  const sorted = [...rows].sort((a, b) => a.vsNifty - b.vsNifty);
  const scoreBySymbol = new Map<string, number>();
  sorted.forEach((r, i) => {
    const rsScore = n === 1 ? 50 : Math.round((i / (n - 1)) * 100);
    scoreBySymbol.set(r.symbol, rsScore);
  });
  return rows
    .map((r) => ({ ...r, rsScore: scoreBySymbol.get(r.symbol) ?? 0 }))
    .sort((a, b) => b.rsScore - a.rsScore);
}

async function stockMetrics(
  symbol: string,
  period: SectorPeriod,
  niftyReturn: number,
): Promise<Omit<IndexStockRow, "rsScore"> | null> {
  try {
    const range = periodToYahooRange(period);
    const series = await fetchYahooCloseSeries(nseYahooSymbol(symbol), range);
    const closes = series.map((p) => p.value);
    const returnPct = computeReturn(closes, period);
    if (returnPct == null || !Number.isFinite(returnPct)) return null;
    return {
      symbol,
      returnPct,
      vsNifty: returnPct - niftyReturn,
    };
  } catch {
    return null;
  }
}

async function mapPool<T, R>(
  items: T[],
  fn: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx]!);
      if (r != null) results.push(r);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(STOCK_CONCURRENCY, items.length) },
      () => worker(),
    ),
  );
  return results;
}

const CATEGORY_KEYS: Record<IndicesVsNiftyCategory, string> = {
  broad: NSE_CATEGORY_BROAD,
  thematic: NSE_CATEGORY_THEMATIC,
};

export async function fetchIndexCategoryStocksRs(
  category: IndicesVsNiftyCategory,
  period: SectorPeriod,
): Promise<IndexCategoryStocksRsResult> {
  const cacheKey = `index-cat-stocks-rs:v3:${category}:${period}`;
  const cached = getCached<IndexCategoryStocksRsResult>(cacheKey);
  if (cached) return cached;

  const perf = await fetchIndexCategoryPerformance(
    CATEGORY_KEYS[category],
    period,
  );
  const niftyReturn = perf.nifty.returnPct;

  const candidates = [...perf.outperformers].sort(
    (a, b) => b.rsScore - a.rsScore,
  );

  const indices: OutperformingIndexStocks[] = [];

  for (const index of candidates.slice(0, MAX_OUTPERFORMERS_TO_SCAN)) {
    const symbols = await tryFetchNseIndexConstituents(index.name);
    if (!symbols?.length) continue;

    const sample = symbols.slice(0, MAX_CONSTITUENTS_PER_INDEX);
    const metrics = await mapPool(sample, (sym) =>
      stockMetrics(sym, period, niftyReturn),
    );
    const stocks = scoreStocks(metrics);
    if (!stocks.length) continue;

    indices.push({
      index,
      stocks,
      constituentsScanned: sample.length,
    });
  }

  const result: IndexCategoryStocksRsResult = {
    period,
    category,
    niftyReturnPct: niftyReturn,
    indices,
    asOf: new Date().toISOString(),
  };

  return setCached(cacheKey, result, 20 * 60 * 1000);
}
