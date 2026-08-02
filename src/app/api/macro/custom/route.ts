import { NextResponse } from "next/server";
import { fetchYahooSeries } from "@/lib/yahoo-chart";

function rangeToFrom(range: string | null): string | undefined {
  const now = Date.now();
  const days: Record<string, number> = {
    "1m": 31,
    "6m": 186,
    "1y": 366,
    "5y": 366 * 5,
    max: 366 * 15,
  };
  const d = days[range ?? "1y"] ?? 366;
  return new Date(now - d * 86400000).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();
  if (!symbol || symbol.length > 32) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!/^[A-Z0-9^=$.@%-]{1,32}$/i.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const range = searchParams.get("range") ?? "1y";
  const from = rangeToFrom(range);
  const label = searchParams.get("label")?.trim() || symbol;

  try {
    let points = await fetchYahooSeries(symbol, range);
    if (from) {
      points = points.filter((p) => p.date >= from);
    }
    const latest = points.length ? points[points.length - 1].value : null;
    return NextResponse.json({
      id: `yahoo:${symbol}`,
      label,
      unit: "",
      description: `Yahoo Finance (${symbol}, daily close)`,
      latest,
      points,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Macro fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
