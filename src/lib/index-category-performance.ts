import { getCached, setCached } from "./cache";
import { fetchNseIndexHistory } from "./nse-client";
import {
  periodToNseRange,
  type SectorPeriod,
} from "./nse-sectors";
import type { SectorPerformanceResult, SectorPerformanceRow } from "./sector-performance";
import { assignSectorRsScores, isStrongRs } from "./sector-rs";
import type { NseCategoryIndex } from "./nse-index-categories";
import { listNseIndicesByCategory } from "./nse-index-categories";

const NIFTY_50_INDEX = "NIFTY 50";
const CONCURRENCY = 4;

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

async function closesForNseIndex(
  indexName: string,
  period: SectorPeriod,
): Promise<number[]> {
  const range = periodToNseRange(period);
  const points = await fetchNseIndexHistory(indexName, range);
  return points.map((p) => p.value);
}

async function mapPool<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()),
  );
  return results;
}

async function rowForIndex(
  index: NseCategoryIndex,
  period: SectorPeriod,
  niftyReturn: number,
): Promise<SectorPerformanceRow> {
  try {
    const closes = await closesForNseIndex(index.name, period);
    const returnPct = computeReturn(closes, period);
    if (returnPct == null || !Number.isFinite(returnPct)) {
      return {
        id: index.id,
        name: index.name,
        yahoo: index.indexSymbol,
        returnPct: NaN,
        vsNifty: NaN,
        outperforming: false,
        rsScore: 0,
        error: "Insufficient data",
      };
    }
    const vsNifty = returnPct - niftyReturn;
    return {
      id: index.id,
      name: index.name,
      yahoo: index.indexSymbol,
      returnPct,
      vsNifty,
      outperforming: vsNifty > 0,
      rsScore: 0,
    };
  } catch {
    return {
      id: index.id,
      name: index.name,
      yahoo: index.indexSymbol,
      returnPct: NaN,
      vsNifty: NaN,
      outperforming: false,
      rsScore: 0,
      error: "Fetch failed",
    };
  }
}

export async function fetchIndexCategoryPerformance(
  categoryKey: string,
  period: SectorPeriod,
): Promise<SectorPerformanceResult> {
  const cacheKey = `nse-cat-vs-nifty:${categoryKey}:${period}`;
  const cached = getCached<SectorPerformanceResult>(cacheKey);
  if (cached) return cached;

  const indices = await listNseIndicesByCategory(categoryKey);
  if (!indices.length) {
    throw new Error(`No indices found for category ${categoryKey}`);
  }

  let niftyReturn: number | null = null;
  try {
    const niftyCloses = await closesForNseIndex(NIFTY_50_INDEX, period);
    niftyReturn = computeReturn(niftyCloses, period);
  } catch {
    niftyReturn = null;
  }

  if (niftyReturn == null || !Number.isFinite(niftyReturn)) {
    throw new Error("Could not load Nifty 50 performance");
  }

  const rows = await mapPool(indices, (idx) =>
    rowForIndex(idx, period, niftyReturn!),
  );

  const validSectors = assignSectorRsScores(
    rows
      .filter((s) => Number.isFinite(s.returnPct))
      .sort((a, b) => b.vsNifty - a.vsNifty),
  );

  const outperformers = validSectors.filter((s) => s.outperforming);
  const result: SectorPerformanceResult = {
    period,
    nifty: { name: "Nifty 50", returnPct: niftyReturn },
    sectors: validSectors,
    outperformers,
    underperformers: validSectors.filter((s) => !s.outperforming),
    strongRsOutperformers: outperformers.filter((s) => isStrongRs(s.rsScore)),
    asOf: new Date().toISOString(),
  };

  return setCached(cacheKey, result, 15 * 60 * 1000);
}
