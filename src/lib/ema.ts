import type { SeriesPoint } from "./yahoo-chart";

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (i === 0) {
      out.push(v);
      prev = v;
      continue;
    }
    prev = v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export type CrossoverDirection = "bullish" | "bearish";

/** Detect fresh crossover on the latest bar vs previous bar. */
export function detectEmaCrossover(
  closes: number[],
  direction: CrossoverDirection,
): boolean {
  if (closes.length < 210) return false;
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const n = closes.length - 1;
  const prev = n - 1;
  if (prev < 0) return false;

  const s0 = e50[prev]!;
  const s1 = e50[n]!;
  const l0 = e200[prev]!;
  const l1 = e200[n]!;

  if (direction === "bullish") {
    return s0 <= l0 && s1 > l1;
  }
  return s0 >= l0 && s1 < l1;
}

export function aggregateToWeekly(daily: SeriesPoint[]): number[] {
  const weeks = new Map<string, number>();
  for (const p of daily) {
    const d = new Date(p.date);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    const key = d.toISOString().slice(0, 10);
    weeks.set(key, p.value);
  }
  return [...weeks.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v);
}
