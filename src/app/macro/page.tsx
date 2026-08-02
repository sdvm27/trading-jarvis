import { Suspense } from "react";
import MacroPageClient from "./macro-page";

export default function MacroPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <MacroPageClient />
    </Suspense>
  );
}
