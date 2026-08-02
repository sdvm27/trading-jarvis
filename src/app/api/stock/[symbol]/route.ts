import { NextResponse } from "next/server";
import { fetchNseStockChart } from "@/lib/yahoo-chart";

const RANGES = new Set(["1m", "6m", "1y", "5y", "max"]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await ctx.params;
  const ticker = decodeURIComponent(symbol).trim().toUpperCase();
  if (!/^[A-Z0-9&.-]{1,20}$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "1y";
  const yahooRange = RANGES.has(range) ? range : "1y";

  try {
    const data = await fetchNseStockChart(ticker, yahooRange);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chart fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
