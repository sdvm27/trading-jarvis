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
import {
  mergeScreeners,
  SCREENERS,
  isScreenerSlug,
  applyScreenerPinOverrides,
  type ScreenerDef,
} from "@/lib/screeners";
import {
  readCustomScreeners,
  readHiddenScreenerSlugs,
  readScreenerPinOverrides,
  writeCustomScreeners,
  writeHiddenScreenerSlugs,
  writeScreenerPinOverrides,
  type CustomScreener,
  type ScreenerPinOverrides,
} from "@/lib/user-dashboard-prefs";

type ScreenerPrefsContextValue = {
  custom: CustomScreener[];
  all: ScreenerDef[];
  pinned: ScreenerDef[];
  add: (item: Omit<CustomScreener, "custom">) => void;
  remove: (slug: string) => void;
  togglePin: (slug: string, currentlyPinned: boolean) => void;
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
  const [pinOverrides, setPinOverrides] = useState<ScreenerPinOverrides>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCustom(readCustomScreeners());
    setHidden(readHiddenScreenerSlugs());
    setPinOverrides(readScreenerPinOverrides());
    setReady(true);
  }, []);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const add = useCallback((item: Omit<CustomScreener, "custom">) => {
    const slug = item.slug.trim().toLowerCase();
    if (!isScreenerSlug(slug)) return;

    setCustom((prev) => {
      const entry: CustomScreener = {
        ...item,
        slug,
        custom: true,
        pinned: item.pinned ?? false,
      };
      const idx = prev.findIndex((s) => s.slug === slug);
      const next =
        idx >= 0
          ? prev.map((s, i) => (i === idx ? { ...s, ...entry } : s))
          : [...prev, entry];
      writeCustomScreeners(next);
      return next;
    });
    setHidden((prev) => {
      if (!prev.includes(slug)) return prev;
      const next = prev.filter((s) => s !== slug);
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
    setPinOverrides((prev) => {
      if (!(slug in prev)) return prev;
      const next = { ...prev };
      delete next[slug];
      writeScreenerPinOverrides(next);
      return next;
    });
  }, []);

  const togglePin = useCallback((slug: string, currentlyPinned: boolean) => {
    setPinOverrides((prev) => {
      const next = { ...prev, [slug]: !currentlyPinned };
      writeScreenerPinOverrides(next);
      return next;
    });
    setCustom((prev) => {
      const idx = prev.findIndex((s) => s.slug === slug);
      if (idx < 0) return prev;
      const next = prev.map((s, i) =>
        i === idx ? { ...s, pinned: !currentlyPinned } : s,
      );
      writeCustomScreeners(next);
      return next;
    });
  }, []);

  const isCustomScreener = useCallback(
    (slug: string) => custom.some((s) => s.slug === slug),
    [custom],
  );

  const all = useMemo(() => {
    const merged = mergeScreeners(custom, hiddenSet);
    return applyScreenerPinOverrides(merged, pinOverrides);
  }, [custom, hiddenSet, pinOverrides]);

  const pinned = useMemo(
    () => all.filter((s) => s.pinned === true),
    [all],
  );

  const value = useMemo(
    () => ({
      custom,
      all,
      pinned,
      add,
      remove,
      togglePin,
      isCustomScreener,
      hidden,
      ready,
    }),
    [
      custom,
      all,
      pinned,
      add,
      remove,
      togglePin,
      isCustomScreener,
      hidden,
      ready,
    ],
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
