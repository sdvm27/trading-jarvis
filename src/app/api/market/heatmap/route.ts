import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/cache";
import { fetchNseAllIndices } from "@/lib/nse";

export type HeatmapGroup = {
  category: string;
  indices: Array<{
    name: string;
    symbol: string;
    last: number;
    percentChange: number;
    variation: number;
    advances?: string;
    declines?: string;
  }>;
};

export async function GET() {
  const cacheKey = "nse-heatmap";
  const cached = getCached<{ groups: HeatmapGroup[]; asOf: string }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const json = await fetchNseAllIndices();
    const byKey = new Map<string, HeatmapGroup["indices"]>();

    for (const row of json.data) {
      if (row.percentChange == null || !Number.isFinite(row.percentChange)) continue;
      const list = byKey.get(row.key) ?? [];
      list.push({
        name: row.index,
        symbol: row.indexSymbol,
        last: row.last,
        percentChange: row.percentChange,
        variation: row.variation,
        advances: row.advances,
        declines: row.declines,
      });
      byKey.set(row.key, list);
    }

    const groups: HeatmapGroup[] = [...byKey.entries()]
      .map(([category, indices]) => ({
        category,
        indices: indices.sort(
          (a, b) => b.percentChange - a.percentChange,
        ),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));

    const payload = { groups, asOf: new Date().toISOString() };
    setCached(cacheKey, payload, 5 * 60 * 1000);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Heatmap failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
