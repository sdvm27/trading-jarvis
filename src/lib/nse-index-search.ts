import { fetchNseAllIndices } from "./nse-client";
import type { NseIndexRow } from "./nse-client";

export type NseIndexSearchHit = {
  index: string;
  indexSymbol: string;
  category: string;
  last: number;
  percentChange: number;
};

const NSE_INDEX_ALIASES: Record<string, string> = {
  nifty: "NIFTY 50",
  "nifty 50": "NIFTY 50",
  banknifty: "NIFTY BANK",
  "bank nifty": "NIFTY BANK",
  vix: "INDIA VIX",
  "india vix": "INDIA VIX",
  midcap: "NIFTY MIDCAP 50",
  smallcap: "NIFTY SMALLCAP 50",
  it: "NIFTY IT",
  pharma: "NIFTY PHARMA",
  auto: "NIFTY AUTO",
};

export function resolveNseIndexAlias(query: string): string | null {
  const lower = query.trim().toLowerCase();
  return NSE_INDEX_ALIASES[lower] ?? null;
}

export function normalizeNseIndexName(input: string): string {
  return input.trim().replace(/\s+/g, " ").toUpperCase();
}

export function parseNseIndexInput(input: string): string | null {
  const t = normalizeNseIndexName(input);
  if (t.length < 2 || t.length > 64) return null;
  if (!/^[A-Z0-9][A-Z0-9 &.\-'/]*$/.test(t)) return null;
  return t;
}

function scoreIndex(row: NseIndexRow, lower: string, tokens: string[]): number {
  const name = row.index.toLowerCase();
  const sym = row.indexSymbol.toLowerCase();
  const cat = row.key.toLowerCase();
  let score = 0;
  if (name === lower || sym === lower) score += 120;
  if (name.includes(lower) || sym.includes(lower)) score += 50;
  if (cat.includes(lower)) score += 10;
  for (const t of tokens) {
    if (name.includes(t)) score += 20;
    if (sym.includes(t)) score += 18;
    if (cat.includes(t)) score += 4;
  }
  return score;
}

export async function searchNseIndices(
  query: string,
  limit = 12,
): Promise<NseIndexSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  const alias = resolveNseIndexAlias(trimmed);
  const rows = await fetchNseAllIndices();

  const scored = rows
    .map((row) => ({ row, score: scoreIndex(row, lower, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const hits: NseIndexSearchHit[] = [];
  const seen = new Set<string>();

  if (alias) {
    const row = rows.find(
      (r) =>
        r.index.toUpperCase() === alias || r.indexSymbol.toUpperCase() === alias,
    );
    if (row && !seen.has(row.index)) {
      seen.add(row.index);
      hits.push({
        index: row.index,
        indexSymbol: row.indexSymbol,
        category: row.key,
        last: row.last,
        percentChange: row.percentChange,
      });
    }
  }

  for (const { row } of scored) {
    if (seen.has(row.index)) continue;
    seen.add(row.index);
    hits.push({
      index: row.index,
      indexSymbol: row.indexSymbol,
      category: row.key,
      last: row.last,
      percentChange: row.percentChange,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}
