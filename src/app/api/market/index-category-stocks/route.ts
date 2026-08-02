import { NextResponse } from "next/server";
import type { SectorPeriod } from "@/lib/nse-sectors";
import type { IndicesVsNiftyCategory } from "@/lib/nse-index-categories";
import { fetchIndexCategoryStocksRs } from "@/lib/index-category-stock-rs";

export const maxDuration = 300;

const PERIODS = new Set<SectorPeriod>(["1d", "1w", "1m", "3m", "6m", "1y"]);
const CATEGORIES = new Set<IndicesVsNiftyCategory>(["broad", "thematic"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "1m") as SectorPeriod;
  const category = searchParams.get("category") as IndicesVsNiftyCategory | null;

  if (!category || !CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: "Invalid category (use broad or thematic)" },
      { status: 400 },
    );
  }
  if (!PERIODS.has(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const data = await fetchIndexCategoryStocksRs(category, period);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Index stocks failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
