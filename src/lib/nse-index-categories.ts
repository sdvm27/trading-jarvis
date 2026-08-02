import { fetchNseAllIndices } from "./nse-client";

export const NSE_CATEGORY_BROAD = "BROAD MARKET INDICES";
export const NSE_CATEGORY_THEMATIC = "THEMATIC INDICES";
export const NSE_CATEGORY_SECTORAL = "SECTORAL INDICES";

export type IndicesVsNiftyCategory = "broad" | "thematic";

const BENCHMARK_EXCLUDE = new Set(["NIFTY 50", "INDIA VIX"]);

export type NseCategoryIndex = {
  id: string;
  name: string;
  indexSymbol: string;
};

function slugifyIndexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function listNseIndicesByCategory(
  categoryKey: string,
): Promise<NseCategoryIndex[]> {
  const rows = await fetchNseAllIndices();
  return rows
    .filter((r) => r.key === categoryKey)
    .filter((r) => !BENCHMARK_EXCLUDE.has(r.index.toUpperCase()))
    .map((r) => ({
      id: slugifyIndexName(r.index),
      name: r.index,
      indexSymbol: r.indexSymbol,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
