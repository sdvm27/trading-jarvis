import { NextResponse } from "next/server";
import { fetchNseIndexHistory } from "@/lib/nse-client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const index = searchParams.get("index")?.trim();
  if (!index || index.length > 64) {
    return NextResponse.json({ error: "Missing index" }, { status: 400 });
  }
  if (!/^[A-Z0-9][A-Z0-9 &.\-'/]{0,63}$/i.test(index)) {
    return NextResponse.json({ error: "Invalid index name" }, { status: 400 });
  }

  const range = searchParams.get("range") ?? "1y";
  const label = searchParams.get("label")?.trim() || index;

  try {
    const points = await fetchNseIndexHistory(index, range);
    const latest = points.length ? points[points.length - 1].value : null;
    return NextResponse.json({
      id: `nse:${index}`,
      label,
      unit: "pts",
      description: `NSE India index (${index}, daily close)`,
      latest,
      points,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "NSE fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
