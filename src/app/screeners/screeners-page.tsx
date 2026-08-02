"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { AddScreenerForm } from "@/components/dashboard/add-screener-form";
import { ScreenerSearchHero } from "@/components/screener-search-bar";
import { useCustomScreeners } from "@/hooks/use-dashboard-prefs";
import { findScreenerByQuery, screenerUrl } from "@/lib/screeners";

export default function ScreenersPageClient() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { custom, all, add } = useCustomScreeners();
  const [adding, setAdding] = useState(false);
  const list = q ? findScreenerByQuery(q, custom) : all;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Screeners</h1>
        <p className="text-sm text-zinc-500">
          Your ChartInk scans — open in-app or on ChartInk.
        </p>
      </div>

      <ScreenerSearchHero />

      {adding ? (
        <AddScreenerForm
          onAdd={(item) => {
            add(item);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-emerald-800/50 hover:text-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Add new screener
        </button>
      )}

      {q && (
        <p className="text-sm text-zinc-400">
          Results for &ldquo;{q}&rdquo; ({list.length})
        </p>
      )}

      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {list.map((s) => (
          <li
            key={s.slug}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-zinc-900/40"
          >
            <div>
              <Link
                href={`/screeners/${s.slug}`}
                className="font-medium text-emerald-400 hover:underline"
              >
                {s.title}
              </Link>
              <p className="text-xs text-zinc-500">{s.slug}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/screeners/${s.slug}`}
                className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Open in app
              </Link>
              <a
                href={screenerUrl(s.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                ChartInk
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
