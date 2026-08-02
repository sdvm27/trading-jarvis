import { Suspense } from "react";
import ScreenersPageClient from "./screeners-page";

export default function ScreenersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <ScreenersPageClient />
    </Suspense>
  );
}
