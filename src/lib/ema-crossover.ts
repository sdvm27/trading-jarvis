import { getCached, setCached } from "./cache";
import { detectEmaCrossover, aggregateToWeekly, ema, type CrossoverDirection } from "./ema";
import { fetchNifty500Symbols } from "./nse";
import { fetchYahooCloseSeries, nseYahooSymbol } from "./yahoo-chart";

export type EmaTimeframe = "daily" | "weekly";

export type EmaCrossoverHit = {
  symbol: string;
  close: number;
  ema50: number;
  ema200: number;
};

export type EmaScanResult = {
  timeframe: EmaTimeframe;
  direction: CrossoverDirection;
  scanned: number;
  matches: EmaCrossoverHit[];
  asOf: string;
  note?: string;
};

const CONCURRENCY = 8;

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
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()),
  );
  return results;
}

async function closesForSymbol(
  symbol: string,
  timeframe: EmaTimeframe,
): Promise<number[]> {
  const yahoo = nseYahooSymbol(symbol);
  const range = timeframe === "daily" ? "2y" : "5y";
  const series = await fetchYahooCloseSeries(
    yahoo,
    range as "1y" | "2y" | "5y",
  );
  if (timeframe === "weekly") {
    return aggregateToWeekly(series);
  }
  return series.map((p) => p.value);
}

async function scanOne(
  symbol: string,
  timeframe: EmaTimeframe,
  direction: CrossoverDirection,
): Promise<EmaCrossoverHit | null> {
  try {
    const closes = await closesForSymbol(symbol, timeframe);
    if (!detectEmaCrossover(closes, direction)) return null;
    const e50 = ema(closes, 50);
    const e200 = ema(closes, 200);
    const n = closes.length - 1;
    return {
      symbol,
      close: closes[n]!,
      ema50: e50[n]!,
      ema200: e200[n]!,
    };
  } catch {
    return null;
  }
}

export async function runEmaCrossoverScan(
  timeframe: EmaTimeframe,
  direction: CrossoverDirection,
): Promise<EmaScanResult> {
  const cacheKey = `ema-x:${timeframe}:${direction}`;
  const cached = getCached<EmaScanResult>(cacheKey);
  if (cached) return cached;

  const symbols = await fetchNifty500Symbols();
  const matches = await mapPool(symbols, (sym) =>
    scanOne(sym, timeframe, direction),
  );

  matches.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const result: EmaScanResult = {
    timeframe,
    direction,
    scanned: symbols.length,
    matches,
    asOf: new Date().toISOString(),
    note:
      "Crossover = 50 EMA crossed 200 EMA on the latest bar (Nifty 500 universe). First scan may take 1–3 minutes; cached 6h.",
  };

  return setCached(cacheKey, result, 6 * 60 * 60 * 1000);
}
