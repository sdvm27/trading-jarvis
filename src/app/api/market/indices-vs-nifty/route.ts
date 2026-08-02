import { NextResponse } from "next/server";
import {
  NSE_CATEGORY_BROAD,
  NSE_CATEGORY_THEMATIC,
  type IndicesVsNiftyCategory,
} from "@/lib/nse-index-categories";
import { fetchIndexCategoryPerformance } from "@/lib/index-category-performance";
import { type SectorPeriod } from "@/lib/nse-sectors";

const PERIODS = new Set<SectorPeriod>(["1d", "1w", "1m", "3m", "6m", "1y"]);

const CATEGORIES: Record<IndicesVsNiftyCategory, string> = {
  broad: NSE_CATEGORY_BROAD,
  thematic: NSE_CATEGORY_THEMATIC,
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "1m") as SectorPeriod;
  const category = searchParams.get("category") as IndicesVsNiftyCategory | null;

  if (!category || !(category in CATEGORIES)) {
    return NextResponse.json(
      { error: "Invalid category (use broad or thematic)" },
      { status: 400 },
    );
  }
  if (!PERIODS.has(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const data = await fetchIndexCategoryPerformance(
      CATEGORIES[category],
      period,
    );
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Index data failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
