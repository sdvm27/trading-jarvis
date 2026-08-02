import { isMacroPulseKey } from "./macro-keys";
import type { MacroSeriesId } from "./macro-series";
import type { ScreenerDef } from "./screeners";

export const MACRO_PULSE_STORAGE_KEY = "jarvis-macro-pulse";
export const CUSTOM_MACRO_LABELS_KEY = "jarvis-custom-macro-labels";
export const CUSTOM_SCREENERS_STORAGE_KEY = "jarvis-custom-screeners";

export const DEFAULT_MACRO_PULSE: MacroSeriesId[] = [
  "nifty-pb",
  "usd-inr",
  "india-vix",
  "brent",
];

export type CustomScreener = ScreenerDef & { custom?: true };

export type CustomMacroLabels = Record<string, string>;

export function readMacroPulse(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MACRO_PULSE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (x): x is string => typeof x === "string" && isMacroPulseKey(x),
    );
  } catch {
    return null;
  }
}

export function writeMacroPulse(ids: string[]): void {
  localStorage.setItem(MACRO_PULSE_STORAGE_KEY, JSON.stringify(ids));
}

export function readCustomMacroLabels(): CustomMacroLabels {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOM_MACRO_LABELS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: CustomMacroLabels = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeCustomMacroLabels(labels: CustomMacroLabels): void {
  localStorage.setItem(CUSTOM_MACRO_LABELS_KEY, JSON.stringify(labels));
}

export function readCustomScreeners(): CustomScreener[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_SCREENERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CustomScreener =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as CustomScreener).slug === "string" &&
        typeof (x as CustomScreener).title === "string",
    );
  } catch {
    return [];
  }
}

export function writeCustomScreeners(screeners: CustomScreener[]): void {
  localStorage.setItem(CUSTOM_SCREENERS_STORAGE_KEY, JSON.stringify(screeners));
}
