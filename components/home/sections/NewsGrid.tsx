/**
 * NewsGrid — Container for the 5-lane intelligence grid.
 * Fetches all feeds, computes triangulation, and renders them into Lane components.
 * Used by: app/page.tsx
 */

// 3. Internal
import { getAllLanes } from "@/lib/feeds";

// 4. Relative
import { Lane } from "../ui/Lane";

// 5. Types
import type { LaneCategory, NewsItem } from "@/lib/feeds";

// ─── CONSTANTS ───────────────────────────────────
const LANE_ORDER: LaneCategory[] = [
  "ai",
  "world",
  "business",
  "finance",
  "south-africa",
];

// ─── HELPERS ─────────────────────────────────────
function getWords(text: string) {
  return new Set(text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));
}

function jaccard(setA: Set<string>, setB: Set<string>) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// ─── COMPONENT ───────────────────────────────────
export async function NewsGrid() {
  // ─── DATA ──────────────────────────────────────
  const lanes = await getAllLanes();

  // ─── TRIANGULATION ─────────────────────────────
  const allItems = Object.values(lanes).flat();
  const wordSets = allItems.map(item => getWords(item.title));
  
  const processedLanes = {} as Record<LaneCategory, NewsItem[]>;
  
  for (const cat of LANE_ORDER) {
    processedLanes[cat] = lanes[cat].map((item) => {
      const myWords = getWords(item.title);
      const matchedSources = new Set<string>();
      matchedSources.add(item.source);

      for (let i = 0; i < allItems.length; i++) {
        const other = allItems[i];
        if (other.url === item.url || other.source === item.source) continue;
        
        const otherWords = wordSets[i];
        if (jaccard(myWords, otherWords) >= 0.6) {
          matchedSources.add(other.source);
        }
      }
      
      // We pass it dynamically since we're casting it in the UI anyway.
      return {
        ...item,
        triangulationCount: matchedSources.size
      };
    });
  }

  // ─── RENDER ────────────────────────────────────
  return (
    <section
      id="news-grid"
      aria-labelledby="news-grid-title"
      className="border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-0 md:px-0">
        {/* Section header */}
        <div className="px-6 md:px-10 py-6 border-b border-border">
          <h2
            id="news-grid-title"
            className="font-serif font-semibold text-2xl md:text-3xl text-foreground"
          >
            Today&rsquo;s Intelligence
          </h2>
        </div>

        {/* Desktop: 5-column grid with vertical dividers */}
        <div className="hidden lg:grid grid-cols-5 divide-x divide-border">
          {LANE_ORDER.map((category) => (
            <Lane
              key={category}
              category={category}
              items={processedLanes[category]}
            />
          ))}
        </div>

        {/* Mobile: stacked collapsible lanes */}
        <div className="lg:hidden divide-y divide-border">
          {LANE_ORDER.map((category) => (
            <Lane
              key={category}
              category={category}
              items={processedLanes[category]}
              collapsible
            />
          ))}
        </div>
      </div>
    </section>
  );
}

