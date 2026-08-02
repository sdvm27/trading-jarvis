"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScreenerSearchBar } from "@/components/screener-search-bar";

const links = [
  { href: "/", label: "Home" },
  { href: "/macro", label: "Macro" },
  { href: "/market", label: "Market" },
  { href: "/screeners", label: "Screeners" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 isolate border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-emerald-400">
              Trading Jarvis
            </Link>
            <nav className="flex gap-1 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 transition-all duration-200",
                    pathname === l.href
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="relative z-[60] w-full sm:max-w-md">
            <ScreenerSearchBar compact />
          </div>
        </div>
      </header>
      <main className="jarvis-main-enter mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        Macro data via Tigzig / NSE. Not investment advice.
      </footer>
    </div>
  );
}
