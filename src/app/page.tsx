import { MacroPulseSection } from "@/components/dashboard/macro-pulse-section";
import { PinnedScreenersSection } from "@/components/dashboard/pinned-screeners-section";
import { ScreenerSearchHero } from "@/components/screener-search-bar";
import { FadeIn } from "@/components/ui/motion";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Trading Jarvis
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Macro context, market rotation, and ChartInk screeners in one place.
        </p>
      </FadeIn>

      <FadeIn delay={50} className="relative z-20 overflow-visible">
        <ScreenerSearchHero />
      </FadeIn>

      <MacroPulseSection />

      <PinnedScreenersSection />
    </div>
  );
}
