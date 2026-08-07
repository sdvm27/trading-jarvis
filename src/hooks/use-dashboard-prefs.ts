"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isMacroSeriesId,
  MACRO_META,
  type MacroSeriesId,
} from "@/lib/macro-series";
import {
  parseNseMacroKey,
  parseYahooMacroKey,
  nseMacroKey,
  yahooMacroKey,
} from "@/lib/macro-keys";
import { useScreenerPrefs } from "@/components/screener-prefs-provider";
import {
  DEFAULT_MACRO_PULSE,
  readCustomMacroLabels,
  readMacroPulse,
  writeCustomMacroLabels,
  writeMacroPulse,
} from "@/lib/user-dashboard-prefs";

export function useMacroPulse() {
  const [ids, setIds] = useState<string[]>(DEFAULT_MACRO_PULSE);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readMacroPulse();
    if (stored?.length) {
      setIds(stored);
    }
    setLabels(readCustomMacroLabels());
    setReady(true);
  }, []);

  const add = useCallback((key: string, label?: string) => {
    const nseIndex = parseNseMacroKey(key);
    const yahooSymbol = parseYahooMacroKey(key);
    const labelKey = nseIndex ?? yahooSymbol;
    if (labelKey && label) {
      setLabels((prev) => {
        const next = { ...prev, [labelKey]: label };
        writeCustomMacroLabels(next);
        return next;
      });
    }
    setIds((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      writeMacroPulse(next);
      return next;
    });
  }, []);

  const addBuiltin = useCallback((id: MacroSeriesId) => add(id), [add]);

  const addNseIndex = useCallback(
    (indexName: string, label: string) => add(nseMacroKey(indexName), label),
    [add],
  );

  const addYahoo = useCallback(
    (symbol: string, label: string) => add(yahooMacroKey(symbol), label),
    [add],
  );

  const remove = useCallback((key: string) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== key);
      const safe = next.length ? next : [...DEFAULT_MACRO_PULSE];
      writeMacroPulse(safe);
      return safe;
    });
  }, []);

  const labelFor = useCallback(
    (key: string) => {
      const nseIndex = parseNseMacroKey(key);
      if (nseIndex) return labels[nseIndex] ?? nseIndex;
      const yahooSymbol = parseYahooMacroKey(key);
      if (yahooSymbol) return labels[yahooSymbol] ?? yahooSymbol;
      if (isMacroSeriesId(key)) return MACRO_META[key].label;
      return key;
    },
    [labels],
  );

  return {
    ids,
    add,
    addBuiltin,
    addNseIndex,
    addYahoo,
    remove,
    labels,
    labelFor,
    ready,
  };
}

/** @deprecated use useScreenerPrefs from screener-prefs-provider */
export function useCustomScreeners() {
  return useScreenerPrefs();
}
