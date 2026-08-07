"use client";

import { useState } from "react";
import { parseScreenerInput } from "@/lib/screeners";

type Props = {
  onAdd: (item: { slug: string; title: string; pinned?: boolean }) => void;
  onCancel: () => void;
  defaultPinned?: boolean;
};

export function AddScreenerForm({ onAdd, onCancel, defaultPinned }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const slug = parseScreenerInput(url);
    if (!slug) {
      setError(
        "Paste a full ChartInk screener URL (chartink.com/screener/…) or a valid slug.",
      );
      return;
    }
    const name = title.trim() || slug;
    onAdd({ slug, title: name, pinned: defaultPinned });
    setTitle("");
    setUrl("");
    setError(null);
  };

  return (
    <form
      className="rounded-xl border border-dashed border-emerald-800/60 bg-zinc-900/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Add screener
      </p>
      <label className="mt-3 block text-xs text-zinc-500">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My momentum scan"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        />
      </label>
      <label className="mt-3 block text-xs text-zinc-500">
        ChartInk URL or slug
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="https://chartink.com/screener/…"
          className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        />
      </label>
      {error && <p className="mt-2 text-xs text-amber-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
