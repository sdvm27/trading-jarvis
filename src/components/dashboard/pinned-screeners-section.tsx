"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AddScreenerForm } from "@/components/dashboard/add-screener-form";
import { useCustomScreeners } from "@/hooks/use-dashboard-prefs";
import { findScreenerByQuery, screenerUrl } from "@/lib/screeners";

export function PinnedScreenersSection() {
  const { all, add, remove, isCustomScreener } = useCustomScreeners();
  const [adding, setAdding] = useState(false);

  const pinned = all.filter((s) => s.pinned);

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Pinned screeners
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {pinned.map((s) => (
          <li key={s.slug} className="relative">
            <Link
              href={`/screeners/${s.slug}`}
              className="jarvis-card-hover block rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 pr-10 text-sm hover:border-emerald-800/50"
            >
              <span className="font-medium text-zinc-100">{s.title}</span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">
                {s.slug}
              </span>
            </Link>
            <button
              type="button"
              title={
                isCustomScreener(s.slug)
                  ? "Delete screener"
                  : "Remove from pinned list"
              }
              onClick={() => remove(s.slug)}
              className="absolute right-2 top-2 rounded p-1 text-zinc-500 hover:bg-red-950/50 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {adding ? (
          <li className="sm:col-span-2">
            <AddScreenerForm
              defaultPinned
              onAdd={(item) => {
                add(item);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </li>
        ) : (
          <li>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-full min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/20 text-sm text-zinc-400 transition hover:border-emerald-800/50 hover:text-emerald-400"
            >
              <Plus className="h-4 w-4" />
              Add new
            </button>
          </li>
        )}
      </ul>
      <div className="mt-3 flex flex-wrap gap-4">
        <Link
          href="/screeners"
          className="text-sm text-emerald-400 hover:underline"
        >
          All screeners →
        </Link>
        <Link
          href="/market"
          className="text-sm text-emerald-400 hover:underline"
        >
          Sector rotation →
        </Link>
      </div>
    </section>
  );
}
