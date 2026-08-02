"use client";

import { useParams } from "next/navigation";
import { ScreenerPanel } from "@/components/screeners/screener-panel";
import { useCustomScreeners } from "@/hooks/use-dashboard-prefs";
import { getScreener, isScreenerSlug } from "@/lib/screeners";

export default function ScreenerDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { custom, ready } = useCustomScreeners();

  const screener = slug ? getScreener(slug, custom) : undefined;
  const valid = screener ?? (isScreenerSlug(slug) ? { slug, title: slug } : null);

  if (!ready) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!valid) {
    return (
      <p className="text-sm text-zinc-500">Screener not found.</p>
    );
  }

  return (
    <div className="space-y-4">
      <ScreenerPanel slug={valid.slug} title={valid.title} />
    </div>
  );
}
