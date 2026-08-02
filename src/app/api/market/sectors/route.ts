import { NextResponse } from "next/server";
import { type SectorPeriod } from "@/lib/nse-sectors";
import { fetchSectorPerformance } from "@/lib/sector-performance";

const PERIODS = new Set<SectorPeriod>(["1d", "1w", "1m", "3m", "6m", "1y"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "1m") as SectorPeriod;
  if (!PERIODS.has(period)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const data = await fetchSectorPerformance(period);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sector data failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
