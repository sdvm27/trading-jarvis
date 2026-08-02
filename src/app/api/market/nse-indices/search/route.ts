import { NextResponse } from "next/server";
import { searchNseIndices } from "@/lib/nse-index-search";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ indices: [] });
  }

  try {
    const indices = await searchNseIndices(q, 12);
    return NextResponse.json({ indices });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Index search failed";
    return NextResponse.json({ indices: [], error: message });
  }
}
