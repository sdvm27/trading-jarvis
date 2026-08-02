import { NextResponse } from "next/server";
import {
  parseNseIndexInput,
  parseYahooSymbolInput,
  resolveNseIndexAlias,
  resolveYahooSearchQueries,
  searchBuiltinMacros,
} from "@/lib/macro-keys";
import { MACRO_META } from "@/lib/macro-series";
import { searchNseIndices } from "@/lib/nse-index-search";
import { searchYahooFinanceMerged } from "@/lib/yahoo-search";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({
      builtin: [],
      nse: [],
      yahoo: [],
      directNseIndex: null,
      directYahooSymbol: null,
    });
  }

  const builtin = searchBuiltinMacros(q).map((id) => ({
    id,
    label: MACRO_META[id].label,
    hint: `${MACRO_META[id].description} · Tigzig`,
  }));

  const directNseIndex = parseNseIndexInput(q) ?? resolveNseIndexAlias(q);
  const directYahooSymbol = parseYahooSymbolInput(q);

  let nse: Awaited<ReturnType<typeof searchNseIndices>> = [];
  let yahoo: Awaited<ReturnType<typeof searchYahooFinanceMerged>> = [];
  let error: string | undefined;

  const [nseResult, yahooResult] = await Promise.allSettled([
    searchNseIndices(q, 8),
    searchYahooFinanceMerged(resolveYahooSearchQueries(q), 10),
  ]);

  if (nseResult.status === "fulfilled") {
    nse = nseResult.value;
  } else {
    error = nseResult.reason instanceof Error ? nseResult.reason.message : "NSE search failed";
  }

  if (yahooResult.status === "fulfilled") {
    yahoo = yahooResult.value;
  } else if (!error) {
    error =
      yahooResult.reason instanceof Error
        ? yahooResult.reason.message
        : "Yahoo search failed";
  }

  return NextResponse.json({
    builtin,
    nse,
    yahoo,
    directNseIndex,
    directYahooSymbol,
    error,
  });
}
