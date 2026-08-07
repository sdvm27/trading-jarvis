export type ScreenerDef = {
  slug: string;
  title: string;
  pinned?: boolean;
};

export const SCREENERS: ScreenerDef[] = [
  {
    slug: "momentum-stocks-with-strong-uptrend",
    title: "Momentum — Strong Uptrend",
    pinned: true,
  },
  {
    slug: "copy-vcp-chartink-scanner-sunil-gurjar-1103",
    title: "VCP Scanner (Sunil Gurjar)",
    pinned: true,
  },
  {
    slug: "undervalued-trend-reversal-screener",
    title: "Undervalued Trend Reversal",
  },
  {
    slug: "swing-trading-sceener-by-techno-charts",
    title: "Swing Trading (Techno Charts)",
  },
  {
    slug: "copy-bullish-check-list-261",
    title: "Bullish Checklist",
  },
  {
    slug: "high-probability-setups",
    title: "High Probability Setups",
    pinned: true,
  },
  {
    slug: "rpci-screener",
    title: "RPCI Screener",
  },
  {
    slug: "rcpi-scanner-ii",
    title: "RCPI Scanner II",
  },
  {
    slug: "rcpi-screener-iii",
    title: "RCPI Screener III",
  },
];

export function screenerUrl(slug: string): string {
  return `https://chartink.com/screener/${slug}`;
}

export function chartinkStockUrl(symbol: string): string {
  return `https://chartink.com/stock/${encodeURIComponent(symbol.toUpperCase())}`;
}

/** Parse ChartInk screener URL or slug into slug */
export function parseScreenerInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes("chartink.com")) {
    try {
      const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("screener");
      if (idx >= 0 && parts[idx + 1]) {
        const segment = parts[idx + 1]!.toLowerCase();
        if (segment !== "process" && isScreenerSlug(segment)) return segment;
      }
    } catch {
      return null;
    }
    return null;
  }

  const slug = trimmed.toLowerCase();
  if (isScreenerSlug(slug)) return slug;
  return null;
}

/** Stock ticker: letters, numbers, & (e.g. M&M) */
export function parseStockSymbol(input: string): string | null {
  const s = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!s) return null;
  if (s.includes("chartink.com") || s.includes("/")) return null;
  if (/^[A-Z0-9&.-]{1,20}$/.test(s) && !s.includes("--")) return s;
  return null;
}

export function findScreenerByQuery(
  q: string,
  extra: ScreenerDef[] = [],
  hiddenSlugs: ReadonlySet<string> = new Set(),
): ScreenerDef[] {
  const lower = q.trim().toLowerCase();
  const all = mergeScreeners(extra, hiddenSlugs);
  if (!lower) return all;
  return all.filter(
    (s) =>
      s.slug.includes(lower) ||
      s.title.toLowerCase().includes(lower),
  );
}

export function mergeScreeners(
  extra: ScreenerDef[] = [],
  hiddenSlugs: ReadonlySet<string> = new Set(),
): ScreenerDef[] {
  const extraBySlug = new Map(extra.map((s) => [s.slug, s]));
  const builtinSlugs = new Set(SCREENERS.map((s) => s.slug));
  const out: ScreenerDef[] = [];

  for (const s of SCREENERS) {
    if (hiddenSlugs.has(s.slug)) continue;
    const override = extraBySlug.get(s.slug);
    out.push(override ? { ...s, ...override } : s);
  }

  for (const s of extra) {
    if (builtinSlugs.has(s.slug) || hiddenSlugs.has(s.slug)) continue;
    out.push(s);
  }

  return out;
}

export function getScreener(
  slug: string,
  extra: ScreenerDef[] = [],
  hiddenSlugs: ReadonlySet<string> = new Set(),
): ScreenerDef | undefined {
  return mergeScreeners(extra, hiddenSlugs).find((s) => s.slug === slug);
}

export function isScreenerSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,}$/i.test(slug);
}
