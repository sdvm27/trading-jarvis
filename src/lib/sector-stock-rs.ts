import { getCached, setCached } from "./cache";
import { isStrongRs } from "./sector-rs";
import { symbolsForSector } from "./sector-constituents";
import type { SectorPeriod } from "./nse-sectors";
import { fetchSectorPerformance, type SectorPerformanceRow } from "./sector-performance";
import { fetchYahooCloseSeries, nseYahooSymbol } from "./yahoo-chart";
import { periodToYahooRange } from "./nse-sectors";

export type SectorStockRow = {
  symbol: string;
  returnPct: number;
  vsNifty: number;
  rsScore: number;
};

export type OutperformingSectorStocks = {
  sector: SectorPerformanceRow;
  stocks: SectorStockRow[];
  strongRsStocks: SectorStockRow[];
};

export type SectorStocksRsResult = {
  period: SectorPeriod;
  niftyReturnPct: number;
  sectors: OutperformingSectorStocks[];
  asOf: string;
};

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
  rows: Omit<SectorStockRow, "rsScore">[],
): SectorStockRow[] {
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
): Promise<Omit<SectorStockRow, "rsScore"> | null> {
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

export async function fetchSectorStocksRs(
  period: SectorPeriod,
): Promise<SectorStocksRsResult> {
  const cacheKey = `sector-stocks-rs:${period}`;
  const cached = getCached<SectorStocksRsResult>(cacheKey);
  if (cached) return cached;

  const sectorPerf = await fetchSectorPerformance(period);
  const niftyReturn = sectorPerf.nifty.returnPct;
  const outperformers = sectorPerf.outperformers;

  const sectors: OutperformingSectorStocks[] = [];

  for (const sector of outperformers) {
    const symbols = symbolsForSector(sector.id);
    if (!symbols.length) continue;

    const metrics = await Promise.all(
      symbols.map((sym) => stockMetrics(sym, period, niftyReturn)),
    );
    const valid = metrics.filter(
      (m): m is Omit<SectorStockRow, "rsScore"> => m != null,
    );
    const stocks = scoreStocks(valid);
    const strongRsStocks = stocks.filter((s) => isStrongRs(s.rsScore));

    sectors.push({
      sector,
      stocks,
      strongRsStocks,
    });
  }

  const result: SectorStocksRsResult = {
    period,
    niftyReturnPct: niftyReturn,
    sectors: sectors.sort(
      (a, b) => b.sector.rsScore - a.sector.rsScore,
    ),
    asOf: new Date().toISOString(),
  };

  return setCached(cacheKey, result, 20 * 60 * 1000);
}
