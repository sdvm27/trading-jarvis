/** NSE sectoral indices (Yahoo Finance symbols). */
export const NIFTY_50_YAHOO = "^NSEI";

export type NseSectorDef = {
  id: string;
  name: string;
  yahoo: string;
};

export const NSE_SECTOR_INDICES: NseSectorDef[] = [
  { id: "bank", name: "Nifty Bank", yahoo: "^NSEBANK" },
  { id: "it", name: "Nifty IT", yahoo: "^CNXIT" },
  { id: "auto", name: "Nifty Auto", yahoo: "^CNXAUTO" },
  { id: "pharma", name: "Nifty Pharma", yahoo: "^CNXPHARMA" },
  { id: "fmcg", name: "Nifty FMCG", yahoo: "^CNXFMCG" },
  { id: "metal", name: "Nifty Metal", yahoo: "^CNXMETAL" },
  { id: "realty", name: "Nifty Realty", yahoo: "^CNXREALTY" },
  { id: "energy", name: "Nifty Energy", yahoo: "^CNXENERGY" },
  { id: "media", name: "Nifty Media", yahoo: "^CNXMEDIA" },
  { id: "psu-bank", name: "Nifty PSU Bank", yahoo: "^CNXPSUBANK" },
  { id: "consumption", name: "Nifty Consumption", yahoo: "^CNXCONSUM" },
  { id: "infra", name: "Nifty Infra", yahoo: "^CNXINFRA" },
];

export type SectorPeriod = "1d" | "1w" | "1m" | "3m" | "6m" | "1y";

export const SECTOR_PERIOD_LABELS: Record<SectorPeriod, string> = {
  "1d": "1 day",
  "1w": "1 week",
  "1m": "1 month",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
};

export function periodToYahooRange(period: SectorPeriod): "5d" | "1mo" | "3mo" | "6mo" | "1y" {
  switch (period) {
    case "1d":
    case "1w":
      return "5d";
    case "1m":
      return "1mo";
    case "3m":
      return "3mo";
    case "6m":
      return "6mo";
    case "1y":
      return "1y";
  }
}
