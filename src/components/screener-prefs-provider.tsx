"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mergeScreeners, SCREENERS, type ScreenerDef } from "@/lib/screeners";
import {
  readCustomScreeners,
  readHiddenScreenerSlugs,
  writeCustomScreeners,
  writeHiddenScreenerSlugs,
  type CustomScreener,
} from "@/lib/user-dashboard-prefs";

type ScreenerPrefsContextValue = {
  custom: CustomScreener[];
  all: ScreenerDef[];
  add: (item: Omit<CustomScreener, "custom">) => void;
  remove: (slug: string) => void;
  isCustomScreener: (slug: string) => boolean;
  hidden: string[];
  ready: boolean;
};

const ScreenerPrefsContext = createContext<ScreenerPrefsContextValue | null>(
  null,
);

export function ScreenerPrefsProvider({ children }: { children: ReactNode }) {
  const [custom, setCustom] = useState<CustomScreener[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCustom(readCustomScreeners());
    setHidden(readHiddenScreenerSlugs());
    setReady(true);
  }, []);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const add = useCallback((item: Omit<CustomScreener, "custom">) => {
    setCustom((prev) => {
      if (prev.some((s) => s.slug === item.slug)) return prev;
      const next: CustomScreener[] = [
        ...prev,
        { ...item, custom: true, pinned: item.pinned ?? true },
      ];
      writeCustomScreeners(next);
      return next;
    });
    setHidden((prev) => {
      if (!prev.includes(item.slug)) return prev;
      const next = prev.filter((s) => s !== item.slug);
      writeHiddenScreenerSlugs(next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setCustom((prev) => {
      if (!prev.some((s) => s.slug === slug)) return prev;
      const next = prev.filter((s) => s.slug !== slug);
      writeCustomScreeners(next);
      return next;
    });
    setHidden((prev) => {
      const isBuiltin = SCREENERS.some((s) => s.slug === slug);
      if (!isBuiltin || prev.includes(slug)) return prev;
      const next = [...prev, slug];
      writeHiddenScreenerSlugs(next);
      return next;
    });
  }, []);

  const isCustomScreener = useCallback(
    (slug: string) => custom.some((s) => s.slug === slug),
    [custom],
  );

  const all = useMemo(
    () => mergeScreeners(custom, hiddenSet),
    [custom, hiddenSet],
  );

  const value = useMemo(
    () => ({
      custom,
      all,
      add,
      remove,
      isCustomScreener,
      hidden,
      ready,
    }),
    [custom, all, add, remove, isCustomScreener, hidden, ready],
  );

  return (
    <ScreenerPrefsContext.Provider value={value}>
      {children}
    </ScreenerPrefsContext.Provider>
  );
}

export function useScreenerPrefs(): ScreenerPrefsContextValue {
  const ctx = useContext(ScreenerPrefsContext);
  if (!ctx) {
    throw new Error("useScreenerPrefs must be used within ScreenerPrefsProvider");
  }
  return ctx;
}
