/**
 * Hero — The main ambient hero section of the landing page.
 * Renders the wireframe globe, two orbiting mini globes, wordmark, and date.
 * Used by: app/page.tsx
 */
"use client";

// 1. React & Next
import dynamic from "next/dynamic";

// 3. Internal
import { formatHeroDate } from "@/lib/utils";
import { CyclingTagline } from "@/components/home/ui/CyclingTagline";
import { OrbitingGlobes } from "@/components/home/ui/OrbitingGlobes";

// ─── CONSTANTS ───────────────────────────────────
const DotGlobeHero = dynamic(
  () =>
    import("@/components/home/ui/DotGlobe").then((mod) => ({
      default: mod.DotGlobe,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: "calc(100vh - 4.5rem)" }}
        className="bg-white flex items-center justify-center"
      >
        <div className="flex flex-col items-center justify-center gap-6 px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            THE DAILY INTELLIGENCE BRIEF
          </p>
          <h1 className="font-serif font-extrabold text-[clamp(3rem,10vw,8rem)] leading-[0.9] tracking-[0.04em] text-foreground text-center uppercase">
            MERIDIAN
          </h1>
        </div>
      </div>
    ),
  }
);

// ─── COMPONENT ───────────────────────────────────
export function Hero() {
  // ─── DERIVED ───────────────────────────────────
  const now = new Date();
  const dateStr = formatHeroDate(now);

  // ─── RENDER ────────────────────────────────────
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative"
    >
      <DotGlobeHero
        rotationSpeed={0.0025}
        globeRadius={1.4}
        className="h-[calc(100vh-4.5rem)] min-h-[600px]"
        overlay={<OrbitingGlobes />}
      >
        <div className="flex flex-col items-center justify-center gap-4 md:gap-6 px-6 text-center select-none">
          {/* Eyebrow */}
          <p className="font-mono text-[11px] md:text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
            THE DAILY INTELLIGENCE BRIEF
          </p>

          {/* Wordmark */}
          <h1
            id="hero-title"
            className="font-serif font-extrabold text-[clamp(3rem,10vw,8rem)] leading-[0.9] tracking-[0.04em] text-foreground uppercase"
          >
            MERIDIAN
          </h1>

          {/* Sub-headline */}
          <CyclingTagline />

          {/* Date strip */}
          <p
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mt-2 mb-8"
            suppressHydrationWarning
          >
            {dateStr}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 pointer-events-auto">
            <a
              href="/briefing"
              className="px-8 py-4 bg-foreground text-background font-mono text-sm uppercase tracking-widest hover:bg-foreground/90 transition-colors"
            >
              The World
            </a>
            <a
              href="/my-world"
              className="px-8 py-4 border border-foreground text-foreground font-mono text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
            >
              My World
            </a>
          </div>
        </div>
      </DotGlobeHero>
    </section>
  );
}
