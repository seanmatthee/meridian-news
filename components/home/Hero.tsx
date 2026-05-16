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
import { CyclingTagline } from "@/components/home/CyclingTagline";
import { OrbitingGlobes } from "@/components/home/OrbitingGlobes";

const LightPillar = dynamic(() => import("@/components/home/LightPillar"), {
  ssr: false,
});

// ─── CONSTANTS ───────────────────────────────────
const DotGlobeHero = dynamic(
  () =>
    import("@/components/home/DotGlobe").then((mod) => ({
      default: mod.DotGlobe,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: "calc(100vh - 4.5rem)" }}
        className="bg-black flex items-center justify-center"
      >
        <div className="flex flex-col items-center justify-center gap-6 px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/70">
            THE DAILY INTELLIGENCE BRIEF
          </p>
          <h1 className="font-serif font-extrabold text-[clamp(3rem,10vw,8rem)] leading-[0.9] tracking-[0.04em] text-white text-center uppercase">
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
      className="relative isolate overflow-hidden bg-white"
    >
      {/* Ambient light pillar — sits behind everything as background. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ height: "calc(100vh - 4.5rem)", minHeight: 600 }}
      >
        <LightPillar
          topColor="#000000"
          bottomColor="#ffffff"
          intensity={0.4}
          rotationSpeed={0.4}
          glowAmount={0.005}
          pillarWidth={3.4}
          pillarHeight={0.7}
          noiseIntensity={0}
          pillarRotation={89}
          interactive={false}
          mixBlendMode="multiply"
        />
      </div>

      <DotGlobeHero
        rotationSpeed={0.0025}
        globeRadius={1.4}
        className="relative z-10 h-[calc(100vh-4.5rem)] min-h-[600px]"
        overlay={<OrbitingGlobes />}
      >
        <div className="flex flex-col items-center justify-center gap-4 md:gap-6 px-6 text-center select-none">
          {/* Eyebrow */}
          <p className="font-mono text-[11px] md:text-[12px] uppercase tracking-[0.08em] text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            THE DAILY INTELLIGENCE BRIEF
          </p>

          {/* Wordmark */}
          <h1
            id="hero-title"
            className="font-serif font-extrabold text-[clamp(3rem,10vw,8rem)] leading-[0.9] tracking-[0.04em] text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          >
            MERIDIAN
          </h1>

          {/* Sub-headline */}
          <CyclingTagline />

          {/* Date strip */}
          <p
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/70 mt-2 mb-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
            suppressHydrationWarning
          >
            {dateStr}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 pointer-events-auto">
            <a href="/the-world" className="hero-cta">
              <span>The World</span>
            </a>
            <a href="/my-world" className="hero-cta">
              <span>My World</span>
            </a>
          </div>
        </div>
      </DotGlobeHero>
    </section>
  );
}
