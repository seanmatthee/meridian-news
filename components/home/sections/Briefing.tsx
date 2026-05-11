/**
 * Briefing — AI-generated daily intelligence summary.
 * Fetches the briefing server-side and renders editorial paragraphs.
 * Used by: app/page.tsx
 */

// 3. Internal
import { generateBriefing } from "@/lib/briefing";
import { formatBriefingDate } from "@/lib/utils";

// ─── CONSTANTS ───────────────────────────────────
export const revalidate = 1800; // 30 minutes

// ─── COMPONENT ───────────────────────────────────
export async function Briefing() {
  // ─── HOOKS & DATA ──────────────────────────────
  const briefing = await generateBriefing();
  const dateStr = formatBriefingDate(new Date());

  // ─── DERIVED ───────────────────────────────────
  // Parse the briefing content into paragraphs and the focus section
  const lines = briefing.content.split("\n").filter((l) => l.trim());
  const focusIndex = lines.findIndex((l) =>
    l.toLowerCase().includes("today's focus") ||
    l.toLowerCase().includes("today\u2019s focus")
  );

  const paragraphs = focusIndex > -1 ? lines.slice(0, focusIndex) : lines;
  const focusItems =
    focusIndex > -1
      ? lines
          .slice(focusIndex + 1)
          .filter((l) => l.trim().startsWith("•") || l.trim().startsWith("-"))
          .map((l) => l.replace(/^[•\-]\s*/, "").trim())
      : [];

  // ─── RENDER ────────────────────────────────────
  return (
    <section
      id="daily-briefing"
      aria-labelledby="briefing-title"
      className="border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        {/* Eyebrow */}
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-4">
          BRIEFING · {dateStr}
        </p>

        {/* Headline */}
        <h2
          id="briefing-title"
          className="font-serif font-semibold text-2xl md:text-3xl text-foreground mb-8"
        >
          What you should know today
        </h2>

        {/* Briefing body */}
        <div className="max-w-3xl space-y-5">
          {paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className="font-sans text-[15px] md:text-base leading-[1.7] text-foreground"
              dangerouslySetInnerHTML={{
                __html: paragraph
                  .replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="font-semibold">$1</strong>'
                  ),
              }}
            />
          ))}
        </div>

        {/* Today's focus */}
        {focusItems.length > 0 && (
          <div className="max-w-3xl mt-10 pt-6 border-t border-border">
            <h3 className="font-serif font-semibold text-lg text-foreground mb-4">
              Today&rsquo;s focus
            </h3>
            <ul className="space-y-2">
              {focusItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 font-sans text-[15px] md:text-base leading-[1.6] text-foreground"
                >
                  <span className="text-accent font-mono text-xs mt-1.5 shrink-0">
                    ▸
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
