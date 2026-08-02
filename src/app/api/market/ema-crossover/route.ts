import { NextResponse } from "next/server";
import {
  runEmaCrossoverScan,
  type EmaTimeframe,
} from "@/lib/ema-crossover";
import type { CrossoverDirection } from "@/lib/ema";

export const maxDuration = 300;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") ?? "daily") as EmaTimeframe;
  const direction = (searchParams.get("direction") ??
    "bullish") as CrossoverDirection;
  const index = searchParams.get("index")?.trim() || null;

  if (timeframe !== "daily" && timeframe !== "weekly") {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }
  if (direction !== "bullish" && direction !== "bearish") {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  try {
    const data = await runEmaCrossoverScan(timeframe, direction, index);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "EMA scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
