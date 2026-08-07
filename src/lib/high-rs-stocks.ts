import type { ChartinkRow } from "./chartink";

export type HighRsStock = {
  symbol: string;
  rs: number;
  sectorHint?: string;
};

function parseNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function pickSymbol(row: ChartinkRow): string | null {
  for (const v of Object.values(row)) {
    const s = String(v).trim().toUpperCase();
    if (/^[A-Z][A-Z0-9&.-]{0,15}$/.test(s)) return s;
  }
  return null;
}

function pickRs(row: ChartinkRow): number | null {
  let best: number | null = null;
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase();
    const n = parseNumber(val);
    if (n == null) continue;
    if (
      k.includes("relative") ||
      k.includes("strength") ||
      k === "rs" ||
      k.includes("rs ") ||
      k.includes("rpci") ||
      k.includes("rcpi")
    ) {
      if (n >= 0 && n <= 100 && (best == null || n > best)) best = n;
    }
  }
  for (const val of Object.values(row)) {
    const n = parseNumber(val);
    if (n != null && n >= 80 && n <= 100 && (best == null || n > best)) {
      best = n;
    }
  }
  return best;
}

function pickSectorHint(row: ChartinkRow): string | undefined {
  for (const [key, val] of Object.entries(row)) {
    const k = key.toLowerCase();
    if (
      k.includes("sector") ||
      k.includes("industry") ||
      k.includes("segment")
    ) {
      const s = String(val).trim();
      if (s.length > 1 && s.length < 80) return s;
    }
  }
  return undefined;
}

export function extractHighRsStocks(
  rows: ChartinkRow[],
  minRs = 50,
): HighRsStock[] {
  const map = new Map<string, HighRsStock>();
  for (const row of rows) {
    const symbol = pickSymbol(row);
    const rs = pickRs(row);
    if (!symbol || rs == null || rs < minRs) continue;
    const existing = map.get(symbol);
    if (!existing || rs > existing.rs) {
      map.set(symbol, {
        symbol,
        rs,
        sectorHint: pickSectorHint(row),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.rs - a.rs);
}
