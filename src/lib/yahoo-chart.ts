import { getCached, setCached } from "./cache";

export type SeriesPoint = { date: string; value: number };

export type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

type YahooRange = "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "max";

function rangeToYahoo(range: string): YahooRange {
  const map: Record<string, YahooRange> = {
    "1m": "1mo",
    "3m": "3mo",
    "6m": "6mo",
    "1y": "1y",
    "2y": "2y",
    "5y": "5y",
    max: "max",
    "5d": "5d",
  };
  return map[range] ?? "1y";
}

export async function fetchYahooCloseSeries(
  yahooSymbol: string,
  range: YahooRange,
): Promise<SeriesPoint[]> {
  const { series } = await fetchYahooChart(yahooSymbol, range);
  return series;
}

async function fetchYahooChart(
  yahooSymbol: string,
  range: YahooRange,
): Promise<{ series: SeriesPoint[]; ohlc: OhlcBar[] }> {
  const cacheKey = `yahoo:${yahooSymbol}:${range}`;
  const cached = getCached<{ series: SeriesPoint[]; ohlc: OhlcBar[] }>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`Yahoo chart error ${res.status}`);

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
          }>;
        };
      }>;
    };
  };

  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  if (!quote?.close?.length) {
    throw new Error("No chart data");
  }

  const ohlc: OhlcBar[] = [];
  const series: SeriesPoint[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = quote.close?.[i];
    if (close == null || !Number.isFinite(close)) continue;
    const d = new Date(timestamps[i]! * 1000).toISOString().slice(0, 10);
    series.push({ date: d, value: close });
    const open = quote.open?.[i] ?? close;
    const high = quote.high?.[i] ?? close;
    const low = quote.low?.[i] ?? close;
    ohlc.push({
      date: d,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
    });
  }

  const out = { series, ohlc };
  return setCached(cacheKey, out, 15 * 60 * 1000);
}

export async function fetchYahooSeries(
  yahooSymbol: string,
  range = "1y",
): Promise<SeriesPoint[]> {
  const { series } = await fetchYahooChart(yahooSymbol, rangeToYahoo(range));
  return series;
}

export async function fetchIndiaVixSeries(
  range = "1y",
): Promise<SeriesPoint[]> {
  return fetchYahooSeries("^INDIAVIX", range);
}

export function nseYahooSymbol(ticker: string): string {
  const t = ticker.toUpperCase().replace(/\.NS$/, "");
  return `${t}.NS`;
}

export async function fetchNseStockChart(
  ticker: string,
  range = "1y",
): Promise<{ symbol: string; yahooSymbol: string; series: SeriesPoint[]; ohlc: OhlcBar[] }> {
  const yahooSymbol = nseYahooSymbol(ticker);
  const { series, ohlc } = await fetchYahooChart(yahooSymbol, rangeToYahoo(range));
  return { symbol: ticker.toUpperCase(), yahooSymbol, series, ohlc };
}
