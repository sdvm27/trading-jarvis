import { NextResponse } from "next/server";
import { fetchChartinkScreener } from "@/lib/chartink";
import { getCached, setCached } from "@/lib/cache";
import { getScreener, isScreenerSlug } from "@/lib/screeners";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!getScreener(slug) && !isScreenerSlug(slug)) {
    return NextResponse.json({ error: "Unknown screener" }, { status: 404 });
  }

  const cacheKey = `chartink:${slug}`;
  const cached = getCached<Awaited<ReturnType<typeof fetchChartinkScreener>>>(
    cacheKey,
  );
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const result = await fetchChartinkScreener(slug);
    setCached(cacheKey, result, 5 * 60 * 1000);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "ChartInk fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
