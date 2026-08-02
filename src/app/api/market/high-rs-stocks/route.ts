import { NextResponse } from "next/server";
import { fetchChartinkScreener } from "@/lib/chartink";
import { extractHighRsStocks } from "@/lib/high-rs-stocks";
import { getCached, setCached } from "@/lib/cache";

const RS_SCANNER_SLUGS = [
  "rpci-screener",
  "rcpi-scanner-ii",
  "rcpi-screener-iii",
] as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const minRs = Number(searchParams.get("minRs") ?? "80");
  const threshold = Number.isFinite(minRs) ? minRs : 80;

  const cacheKey = `high-rs-stocks:${threshold}`;
  const cached = getCached<{
    stocks: ReturnType<typeof extractHighRsStocks>;
    warning?: string;
  }>(cacheKey);
  if (cached) {
    return NextResponse.json({ minRs: threshold, ...cached });
  }

  const allStocks: ReturnType<typeof extractHighRsStocks> = [];
  let warning: string | undefined;

  for (const slug of RS_SCANNER_SLUGS) {
    try {
      const result = await fetchChartinkScreener(slug);
      if (result.warning) warning = result.warning;
      allStocks.push(...extractHighRsStocks(result.rows, threshold));
    } catch {
      /* try next scanner */
    }
  }

  const bySymbol = new Map<string, (typeof allStocks)[0]>();
  for (const s of allStocks) {
    const prev = bySymbol.get(s.symbol);
    if (!prev || s.rs > prev.rs) bySymbol.set(s.symbol, s);
  }
  const stocks = [...bySymbol.values()].sort((a, b) => b.rs - a.rs);

  if (!stocks.length && !warning) {
    warning =
      "No RS stock rows from ChartInk (use RCPI screeners on ChartInk or try later).";
  }

  const payload = { stocks, warning };
  setCached(cacheKey, payload, 10 * 60 * 1000);

  return NextResponse.json({ minRs: threshold, ...payload });
}
