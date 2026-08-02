export type ChartinkRow = Record<string, string | number>;

export type ScreenerResult = {
  rows: ChartinkRow[];
  scanLink?: string;
  warning?: string;
  fetchedAt: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeScanJson(html: string): { atlas_query: string; id: number } | null {
  const match = html.match(/:scan-json="([^"]+)"/);
  if (!match) return null;
  try {
    const decoded = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    const scan = JSON.parse(decoded) as { atlas_query?: string; id: number };
    if (!scan.atlas_query) return null;
    return { atlas_query: scan.atlas_query, id: scan.id };
  } catch {
    return null;
  }
}

async function chartinkSession(slug: string) {
  const pageUrl = `https://chartink.com/screener/${slug}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    cache: "no-store",
  });
  const html = await res.text();
  const csrf = html.match(/name="csrf-token" content="([^"]+)"/)?.[1];
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  const scan = decodeScanJson(html);
  if (!csrf || !scan) {
    throw new Error("Could not parse ChartInk screener page");
  }
  return { pageUrl, csrf, cookie, scan };
}

function normalizeRows(data: unknown[]): ChartinkRow[] {
  return data.map((row) => {
    if (Array.isArray(row)) {
      const obj: ChartinkRow = {};
      row.forEach((cell, i) => {
        obj[`col_${i}`] = cell as string | number;
      });
      return obj;
    }
    return row as ChartinkRow;
  });
}

export async function fetchChartinkScreener(slug: string): Promise<ScreenerResult> {
  const { pageUrl, csrf, cookie, scan } = await chartinkSession(slug);
  const headers: Record<string, string> = {
    "x-csrf-token": csrf,
    "x-requested-with": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Cookie: cookie,
    Referer: pageUrl,
  };

  const baseBody: Record<string, string> = {
    scan_clause: scan.atlas_query,
    draw: "1",
    start: "0",
    length: "100",
  };

  let scanLink: string | undefined;
  let rows: ChartinkRow[] = [];
  let warning: string | undefined;

  for (let attempt = 0; attempt < 4; attempt++) {
    const body = new URLSearchParams({ ...baseBody });
    if (scanLink) body.set("scan_link", scanLink);

    const res = await fetch("https://chartink.com/screener/process", {
      method: "POST",
      headers,
      body: body.toString(),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      data?: unknown[];
      link?: string;
      recordsTotal?: number;
    };

    if (json.link?.startsWith("scanlink:")) {
      scanLink = json.link.replace("scanlink:", "");
    }

    if (json.data?.length) {
      rows = normalizeRows(json.data);
      break;
    }

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  if (!rows.length) {
    warning =
      "ChartInk returned no rows (delayed data, market closed, or API change). Use “Open on ChartInk” for full results.";
  }

  return {
    rows,
    scanLink,
    warning,
    fetchedAt: new Date().toISOString(),
  };
}

/** Check if symbol appears in screener results (case-insensitive on common fields). */
export function rowMatchesSymbol(row: ChartinkRow, symbol: string): boolean {
  const sym = symbol.toUpperCase();
  for (const v of Object.values(row)) {
    const s = String(v).toUpperCase();
    if (s === sym || s.startsWith(`${sym},`) || s.includes(`(${sym})`)) return true;
  }
  return false;
}
