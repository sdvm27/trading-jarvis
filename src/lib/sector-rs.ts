import type { SectorPerformanceRow } from "./sector-performance";

/** Cross-sectional RS rank (0–100) from vs-Nifty spread across sectors. */
export function assignSectorRsScores(
  sectors: SectorPerformanceRow[],
): SectorPerformanceRow[] {
  const n = sectors.length;
  if (n === 0) return sectors;

  const sorted = [...sectors].sort((a, b) => a.vsNifty - b.vsNifty);
  const scoreById = new Map<string, number>();
  sorted.forEach((s, i) => {
    const rsScore = n === 1 ? 50 : Math.round((i / (n - 1)) * 100);
    scoreById.set(s.id, rsScore);
  });

  return sectors.map((s) => ({
    ...s,
    rsScore: scoreById.get(s.id) ?? 0,
  }));
}

export const RS_STRONG_THRESHOLD = 50;

export function isStrongRs(rsScore: number, threshold = RS_STRONG_THRESHOLD): boolean {
  return rsScore >= threshold;
}

export function meetsRsThreshold(rsScore: number, threshold: number): boolean {
  return rsScore >= threshold;
}
