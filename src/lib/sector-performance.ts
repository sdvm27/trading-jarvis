import { getCached, setCached } from "./cache";
import {
  NIFTY_50_YAHOO,
  NSE_SECTOR_INDICES,
  periodToYahooRange,
  type SectorPeriod,
} from "./nse-sectors";
import { fetchYahooCloseSeries } from "./yahoo-chart";
import { assignSectorRsScores, isStrongRs } from "./sector-rs";

export type SectorPerformanceRow = {
  id: string;
  name: string;
  yahoo: string;
  returnPct: number;
  vsNifty: number;
  outperforming: boolean;
  rsScore: number;
  error?: string;
};

export type SectorPerformanceResult = {
  period: SectorPeriod;
  nifty: { name: string; returnPct: number };
  sectors: SectorPerformanceRow[];
  outperformers: SectorPerformanceRow[];
  underperformers: SectorPerformanceRow[];
  /** Outperforming Nifty with cross-sectional RS ≥ default threshold */
  strongRsOutperformers: SectorPerformanceRow[];
  asOf: string;
};

function computeReturn(closes: number[], period: SectorPeriod): number | null {
  const valid = closes.filter((c) => Number.isFinite(c));
  if (valid.length < 2) return null;
  const last = valid[valid.length - 1]!;

  if (period === "1d") {
    const prev = valid[valid.length - 2]!;
    return ((last - prev) / prev) * 100;
  }

  if (period === "1w") {
    const idx = Math.max(0, valid.length - 6);
    const start = valid[idx]!;
    return ((last - start) / start) * 100;
  }

  const start = valid[0]!;
  return ((last - start) / start) * 100;
}

async function closesForSymbol(
  yahoo: string,
  period: SectorPeriod,
): Promise<number[]> {
  const range = periodToYahooRange(period);
  const series = await fetchYahooCloseSeries(yahoo, range);
  return series.map((p) => p.value);
}

export async function fetchSectorPerformance(
  period: SectorPeriod,
): Promise<SectorPerformanceResult> {
  const cacheKey = `sectors:${period}`;
  const cached = getCached<SectorPerformanceResult>(cacheKey);
  if (cached) return cached;

  let niftyReturn: number | null = null;
  try {
    const niftyCloses = await closesForSymbol(NIFTY_50_YAHOO, period);
    niftyReturn = computeReturn(niftyCloses, period);
  } catch {
    niftyReturn = null;
  }

  if (niftyReturn == null || !Number.isFinite(niftyReturn)) {
    throw new Error("Could not load Nifty 50 performance");
  }

  const sectors: SectorPerformanceRow[] = await Promise.all(
    NSE_SECTOR_INDICES.map(async (sector) => {
      try {
        const closes = await closesForSymbol(sector.yahoo, period);
        const returnPct = computeReturn(closes, period);
        if (returnPct == null || !Number.isFinite(returnPct)) {
          return {
            ...sector,
            returnPct: NaN,
            vsNifty: NaN,
            outperforming: false,
            rsScore: 0,
            error: "Insufficient data",
          };
        }
        const vsNifty = returnPct - niftyReturn;
        return {
          ...sector,
          returnPct,
          vsNifty,
          outperforming: vsNifty > 0,
          rsScore: 0,
        };
      } catch {
        return {
          ...sector,
          returnPct: NaN,
          vsNifty: NaN,
          outperforming: false,
          rsScore: 0,
          error: "Fetch failed",
        };
      }
    }),
  );

  const validSectors = assignSectorRsScores(
    sectors
      .filter((s) => Number.isFinite(s.returnPct))
      .sort((a, b) => b.vsNifty - a.vsNifty),
  );

  const outperformers = validSectors.filter((s) => s.outperforming);
  const strongRsOutperformers = outperformers.filter((s) =>
    isStrongRs(s.rsScore),
  );

  const result: SectorPerformanceResult = {
    period,
    nifty: { name: "Nifty 50", returnPct: niftyReturn },
    sectors: validSectors,
    outperformers,
    underperformers: validSectors.filter((s) => !s.outperforming),
    strongRsOutperformers,
    asOf: new Date().toISOString(),
  };

  return setCached(cacheKey, result, 15 * 60 * 1000);
}
