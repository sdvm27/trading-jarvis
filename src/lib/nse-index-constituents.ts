import { getCached, setCached } from "./cache";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

/** NSE archive CSV overrides when slug heuristic fails. */
const ARCHIVE_CSV_OVERRIDES: Record<string, string> = {
  "NIFTY 500": "ind_nifty500list.csv",
  "NIFTY FIN SERVICE": "ind_niftyfinancelist.csv",
  "NIFTY FINANCIAL SERVICES": "ind_niftyfinancelist.csv",
};

export function indexNameToArchiveCsv(indexName: string): string {
  const normalized = indexName.trim().replace(/\s+/g, " ").toUpperCase();
  const override = ARCHIVE_CSV_OVERRIDES[normalized];
  if (override) return override;
  const slug =
    "ind_" +
    normalized
      .toLowerCase()
      .replace(/^nifty\s+/, "nifty")
      .replace(/\s+/g, "") +
    "list.csv";
  return slug;
}

function parseConstituentCsv(text: string): string[] {
  const lines = text.trim().split("\n").slice(1);
  const symbols: string[] = [];
  for (const line of lines) {
    const parts = line.split(",");
    const sym = parts[2]?.trim();
    if (sym && sym !== "Symbol") symbols.push(sym);
  }
  return [...new Set(symbols)];
}

export async function fetchNseIndexConstituents(
  indexName: string,
): Promise<string[]> {
  const normalized = indexName.trim().replace(/\s+/g, " ").toUpperCase();
  const cacheKey = `nse:constituents:${normalized}`;
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const file = indexNameToArchiveCsv(normalized);
  const url = `https://nsearchives.nseindia.com/content/indices/${file}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(
      `No NSE constituent list for “${indexName}”. Try another index (e.g. NIFTY BANK, NIFTY IT).`,
    );
  }
  const text = await res.text();
  const symbols = parseConstituentCsv(text);
  if (!symbols.length) {
    throw new Error(`Empty constituent list for ${indexName}`);
  }
  return setCached(cacheKey, symbols, 24 * 60 * 60 * 1000);
}

export async function resolveEmaScanSymbols(
  indexName?: string | null,
): Promise<{ label: string; symbols: string[] }> {
  const label = indexName?.trim() || "NIFTY 500";
  const normalized = label.replace(/\s+/g, " ").toUpperCase();
  if (!indexName?.trim() || normalized === "NIFTY 500") {
    const { fetchNifty500Symbols } = await import("./nse");
    return { label: "NIFTY 500", symbols: await fetchNifty500Symbols() };
  }
  return {
    label: normalized,
    symbols: await fetchNseIndexConstituents(normalized),
  };
}
