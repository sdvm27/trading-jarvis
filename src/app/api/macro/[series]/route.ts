import { NextResponse } from "next/server";
import {
  fetchMacroSeries,
  isMacroSeriesId,
  MACRO_META,
} from "@/lib/macro-series";

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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ series: string }> },
) {
  const { series } = await ctx.params;
  if (!isMacroSeriesId(series)) {
    return NextResponse.json({ error: "Unknown series" }, { status: 404 });
  }
  const id = series;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "1y";
  const from = rangeToFrom(range);

  try {
    const points = await fetchMacroSeries(id, from, range);
    const latest = points.length ? points[points.length - 1].value : null;
    const meta = MACRO_META[id];
    return NextResponse.json({
      id,
      label: meta.label,
      unit: meta.unit,
      description: meta.description,
      latest,
      points,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Macro fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
